import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.permissions.models import AuditLog, PendingApproval
from config.exceptions import ApprovalConflict, ApprovalExpired, UpstreamAIError
from core.permissions import PermissionContext
from core.providers import ChatMessage, ProviderConfigError, ProviderError
from core.tools import OutcomeStatus

from .models import AssistantMemory, Conversation, Message
from .serializers import (AssistantMemorySerializer, AuditLogSerializer, ChatRequestSerializer,
                          ConfirmRequestSerializer, ConversationDetailSerializer, ConversationSerializer,
                          CreateMemorySerializer, MessageSerializer, PendingApprovalSerializer,
                          UpdateMemorySerializer)
from .services import build_approval_service, build_orchestrator, build_registry, build_tool_runtime

logger = logging.getLogger("assistant.api")


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok"})      # no version/config details on purpose


class ChatView(APIView):
    """POST {message, conversation_id?} -> assistant reply. Flow:
    save user msg -> orchestrator (intent/tool/permission/provider) -> save reply."""
    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        ser = ChatRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        text = ser.validated_data["message"]

        conv_id = ser.validated_data.get("conversation_id")
        if conv_id:
            # Filtering by user means other users' conversations look like "not found" (authorization).
            conversation = get_object_or_404(Conversation, pk=conv_id, user=request.user)
        else:
            conversation = Conversation.objects.create(user=request.user, title=text[:80])

        recent = list(conversation.messages.order_by("-created_at", "-id")[:settings.CHAT_HISTORY_LIMIT])
        history = [ChatMessage(m.role, m.content) for m in reversed(recent)]

        Message.objects.create(conversation=conversation, role=Message.Role.USER, content=text)

        try:
            result = build_orchestrator().handle(text, history, PermissionContext(user_id=request.user.pk))
        except ProviderConfigError:
            logger.error("ai_provider_misconfigured")
            raise UpstreamAIError("The AI provider is not configured correctly.")
        except ProviderError:
            logger.warning("ai_provider_failed")
            raise UpstreamAIError()

        if result.pending_action_id:
            # Remember which conversation asked, so the later answer lands in the same chat.
            PendingApproval.objects.filter(pk=result.pending_action_id, user=request.user).update(conversation=conversation)

        reply = Message.objects.create(conversation=conversation, role=Message.Role.ASSISTANT,
                                       content=result.reply, metadata=result.metadata())
        conversation.save(update_fields=["updated_at"])
        return Response({"conversation_id": str(conversation.id), "reply": MessageSerializer(reply).data})


class ConfirmView(APIView):
    """POST {action_id, decision: approve|deny}. Runs (or refuses) a tool that was waiting for approval."""
    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "confirm"

    def post(self, request):
        ser = ConfirmRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action_id = ser.validated_data["action_id"]

        result = build_approval_service().resolve(
            str(action_id), request.user.pk, approve=ser.validated_data["decision"] == "approve")

        if result.status == "not_found":
            raise NotFound("No such pending action.")
        if result.status == "not_pending":
            raise ApprovalConflict()
        if result.status == "expired":
            raise ApprovalExpired()

        reply = None
        row = PendingApproval.objects.filter(pk=action_id, user=request.user).first()
        if row and row.conversation_id:
            reply = Message.objects.create(
                conversation=row.conversation, role=Message.Role.ASSISTANT, content=result.message,
                metadata={"intent": "tool", "tool": result.tool_name, "tool_status": result.status,
                          "approval": ser.validated_data["decision"]})
            row.conversation.save(update_fields=["updated_at"])
        return Response({"status": result.status, "message": result.message,
                         "reply": MessageSerializer(reply).data if reply else None})


class ConversationListView(APIView):
    def get(self, request):
        qs = Conversation.objects.filter(user=request.user)[:100]
        return Response(ConversationSerializer(qs, many=True).data)


class ConversationDetailView(APIView):
    def get(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk, user=request.user)
        return Response(ConversationDetailSerializer(conversation).data)


class ToolListView(APIView):
    def get(self, request):
        return Response([spec.to_public_dict() for spec in build_registry().specs()])


class AssistantStatusView(APIView):
    """GET /api/assistant/status/ -> returns backend/AI runtime status and pending approvals count."""
    def get(self, request):
        pending_count = PendingApproval.objects.filter(
            user=request.user, status=PendingApproval.Status.PENDING
        ).count()
        return Response({
            "status": "ok",
            "ai": {
                "provider": settings.AI_CONFIG.provider,
                "model": settings.AI_CONFIG.model,
            },
            "pending_approvals_count": pending_count,
        })


class PendingApprovalListView(APIView):
    """GET /api/assistant/approvals/ -> list active pending approvals for the current user."""
    def get(self, request):
        status_filter = request.query_params.get("status", PendingApproval.Status.PENDING)
        qs = PendingApproval.objects.filter(user=request.user)
        if status_filter:
            qs = qs.filter(status=status_filter)
        qs = qs.order_by("-created_at")[:50]
        return Response(PendingApprovalSerializer(qs, many=True).data)


class AuditLogListView(APIView):
    """GET /api/audit/ -> list recent audit log events for the current user."""
    def get(self, request):
        qs = AuditLog.objects.filter(user=request.user).order_by("-created_at", "-id")[:50]
        return Response(AuditLogSerializer(qs, many=True).data)


class ToolRunView(APIView):
    """POST /api/tools/<name>/run/
    Runs a tool directly through the PermissionEngine, ToolExecutor, and AuditSink.
    If the decision is ASK, creates a PendingApproval and returns needs_approval.
    If the decision is ALLOW, executes the tool and returns the result and summary.
    If the decision is BLOCK, returns 403 Forbidden.
    """
    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request, name):
        registry, executor, approvals = build_tool_runtime()
        tool = registry.get(name)
        if tool is None:
            raise NotFound(f"Tool '{name}' is not registered.")

        args = request.data.get("args") if isinstance(request.data, dict) and "args" in request.data else request.data
        if not isinstance(args, dict):
            args = {}

        context = PermissionContext(user_id=request.user.pk)
        outcome = executor.execute(name, args, context)

        if outcome.status is OutcomeStatus.EXECUTED:
            return Response({
                "status": "executed",
                "decision": outcome.decision.value,
                "result": outcome.result,
                "summary": outcome.summary,
            })

        if outcome.status is OutcomeStatus.NEEDS_APPROVAL:
            pending = approvals.request(request.user.pk, name, args)
            return Response({
                "status": "needs_approval",
                "decision": outcome.decision.value,
                "reason": outcome.reason,
                "pending_action_id": pending.id,
                "pending_expires_at": pending.expires_at.isoformat(),
            })

        if outcome.status is OutcomeStatus.BLOCKED:
            return Response({
                "status": "blocked",
                "decision": outcome.decision.value,
                "reason": outcome.reason,
            }, status=403)

        if outcome.status is OutcomeStatus.INVALID_INPUT:
            return Response({
                "status": "invalid_input",
                "reason": outcome.reason,
            }, status=400)

        return Response({
            "status": "error",
            "reason": outcome.reason,
        }, status=500)


class MemoryListCreateView(APIView):
    """GET /api/assistant/memories/ - list/filter user memories
    POST /api/assistant/memories/ - add new memory"""

    def get(self, request):
        qs = AssistantMemory.objects.filter(user=request.user)
        cat = request.query_params.get("category")
        if cat and cat != "all":
            qs = qs.filter(category=cat)
        q = request.query_params.get("search")
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(key__icontains=q) | Q(content__icontains=q))
        return Response(AssistantMemorySerializer(qs, many=True).data)

    def post(self, request):
        ser = CreateMemorySerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        memory = ser.save()
        return Response(AssistantMemorySerializer(memory).data, status=201)


class MemoryDetailView(APIView):
    """GET, PATCH, DELETE /api/assistant/memories/<id>/"""

    def get(self, request, pk):
        mem = get_object_or_404(AssistantMemory, pk=pk, user=request.user)
        return Response(AssistantMemorySerializer(mem).data)

    def patch(self, request, pk):
        mem = get_object_or_404(AssistantMemory, pk=pk, user=request.user)
        ser = UpdateMemorySerializer(mem, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        updated = ser.save()
        return Response(AssistantMemorySerializer(updated).data)

    def delete(self, request, pk):
        mem = get_object_or_404(AssistantMemory, pk=pk, user=request.user)
        mem.delete()
        return Response({"status": "deleted", "id": pk})


class MemoryClearView(APIView):
    """POST /api/assistant/memories/clear/ - delete all memories for current user"""

    def post(self, request):
        count, _ = AssistantMemory.objects.filter(user=request.user).delete()
        return Response({"status": "cleared", "count": count})

