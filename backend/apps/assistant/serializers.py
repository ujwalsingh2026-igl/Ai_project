from django.conf import settings
from rest_framework import serializers

from .models import AssistantMemory, Conversation, Message


class AssistantMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantMemory
        fields = ["id", "key", "content", "category", "source", "created_at", "updated_at"]
        read_only_fields = ["id", "source", "created_at", "updated_at"]


class CreateMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantMemory
        fields = ["key", "content", "category"]

    def create(self, validated_data):
        user = self.context["request"].user
        return AssistantMemory.objects.create(user=user, source="explicit", **validated_data)


class UpdateMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantMemory
        fields = ["key", "content", "category"]
        extra_kwargs = {
            "key": {"required": False},
            "content": {"required": False},
            "category": {"required": False},
        }



class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=settings.CHAT_MESSAGE_MAX_LENGTH, trim_whitespace=True)
    conversation_id = serializers.UUIDField(required=False)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "metadata", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]


class ConversationDetailSerializer(ConversationSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ["messages"]


class ConfirmRequestSerializer(serializers.Serializer):
    # Only the ID and the decision. Tool name and arguments are NEVER accepted here.
    action_id = serializers.UUIDField()
    decision = serializers.ChoiceField(choices=["approve", "deny"])


from apps.permissions.models import AuditLog, PendingApproval  # noqa: E402


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "tool_name", "risk_level", "decision", "status", "reason", "details", "created_at"]


class PendingApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingApproval
        fields = ["id", "tool_name", "args", "status", "created_at", "expires_at", "resolved_at"]
