"""Views for the Defensive Security Center: file scanner, findings, quarantine, incidents, and firewall rules."""
from __future__ import annotations

import hashlib
import logging
import os
import sys
import tempfile
from pathlib import Path

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.assistant.services import build_tool_runtime
from core.builtin_tools.file_scanner import analyze_file
from core.permissions import PermissionContext
from core.tools import OutcomeStatus

from .models import FirewallRule, IncidentTimeline, QuarantineItem, ScanFinding, SecurityIncident
from .serializers import (
    BlockIpRequestSerializer,
    FileScanRequestSerializer,
    FirewallRuleSerializer,
    HashLookupSerializer,
    IncidentTimelineSerializer,
    IncidentUpdateSerializer,
    KillProcessRequestSerializer,
    QuarantineItemSerializer,
    QuarantineRequestSerializer,
    ScanFindingSerializer,
    SecurityIncidentSerializer,
    SecuritySummarySerializer,
)
from .store import DjangoIncidentStore

logger = logging.getLogger("security.api")

# Known benign and reference signatures for offline reputation lookup
KNOWN_HASH_DATABASE = {
    # Harmless standard EICAR test string
    "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f": {
        "verdict": "likely_malicious",
        "description": "Standard EICAR Harmless Antivirus Verification Test String",
        "threat_level": "test_sample",
        "confidence": "high",
    },
    # Common harmless empty file SHA-256
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855": {
        "verdict": "clean",
        "description": "Zero-byte Empty File Hash",
        "threat_level": "none",
        "confidence": "high",
    },
}


class FileScanView(APIView):
    """POST /api/security/scan/
    Performs static defensive analysis on an uploaded file or a user-selected local filepath.
    Never executes the file.
    """

    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        ser = FileScanRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uploaded_file = request.FILES.get("file")
        input_path = ser.validated_data.get("path")

        target_path: Path | None = None
        is_upload = False

        display_name = ""
        if uploaded_file:
            # Save uploaded file safely into scans storage directory
            scans_dir = Path("data/scans")
            scans_dir.mkdir(parents=True, exist_ok=True)
            safe_name = "".join(c for c in uploaded_file.name if c.isalnum() or c in "._- ")
            target_path = scans_dir / f"scan_{int(timezone.now().timestamp())}_{safe_name}"
            with open(target_path, "wb") as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)
            is_upload = True
            display_name = uploaded_file.name
        elif input_path:
            p = Path(input_path).resolve()
            if not p.is_file():
                raise ValidationError({"path": f"File does not exist or is not a regular file: {input_path}"})
            target_path = p
            display_name = target_path.name

        if not target_path:
            raise ValidationError({"error": "No file or valid path provided for analysis."})

        # Run static defensive analysis
        try:
            analysis = analyze_file(str(target_path))
        except Exception as e:
            logger.error("file_scan_failed", extra={"path": str(target_path), "error": str(e)})
            raise ValidationError({"error": f"Failed to analyze file: {str(e)}"})

        # Record scan finding in database
        hashes = analysis.get("hashes", {})
        finding = ScanFinding.objects.create(
            user=request.user,
            file_path=str(target_path),
            file_name=display_name,
            file_size=analysis.get("file_size", 0),
            sha256=hashes.get("sha256", ""),
            md5=hashes.get("md5", ""),
            entropy=analysis.get("entropy", 0.0),
            verdict=analysis.get("verdict", "clean"),
            threat_score=analysis.get("threat_score", 0),
            evidence=analysis.get("evidence", []),
            file_metadata={
                "pe_info": analysis.get("pe_info", {}),
                "archive_info": analysis.get("archive_info", {}),
                "script_info": analysis.get("script_info", {}),
                "yara_matches": analysis.get("yara_matches", []),
                "disclaimer": analysis.get("limitations", ""),
                "is_upload": is_upload,
            },
        )

        return Response(ScanFindingSerializer(finding).data, status=status.HTTP_201_CREATED)


class ScanFindingListView(APIView):
    """GET /api/security/findings/ -> Lists defensive scan findings for current user."""

    def get(self, request):
        qs = ScanFinding.objects.filter(user=request.user).order_by("-created_at")[:50]
        return Response(ScanFindingSerializer(qs, many=True).data)


class ScanFindingDetailView(APIView):
    """GET /api/security/findings/<int:pk>/ -> Get detailed finding for current user."""

    def get(self, request, pk):
        finding = get_object_or_404(ScanFinding, pk=pk, user=request.user)
        return Response(ScanFindingSerializer(finding).data)


class QuarantineListView(APIView):
    """GET /api/security/quarantine/ -> Lists all quarantined items for current user."""

    def get(self, request):
        qs = QuarantineItem.objects.filter(user=request.user).order_by("-created_at")
        return Response(QuarantineItemSerializer(qs, many=True).data)


class QuarantineActionView(APIView):
    """POST /api/security/quarantine/
    Initiates quarantine for a suspicious file via the ToolExecutor and PermissionEngine.
    Because RiskLevel is 4 (SECURITY_RESPONSE), returns 'needs_approval' with a pending action ID.
    """

    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        ser = QuarantineRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        path = ser.validated_data["path"]
        notes = ser.validated_data.get("notes", "")

        # Execute through standard permission & approval engine
        registry, executor, approvals = build_tool_runtime()
        context = PermissionContext(user_id=request.user.pk)
        outcome = executor.execute("security_file_quarantine", {"path": path, "notes": notes}, context)

        if outcome.status is OutcomeStatus.NEEDS_APPROVAL:
            pending = approvals.request(request.user.pk, "security_file_quarantine", {"path": path, "notes": notes})
            return Response(
                {
                    "status": "needs_approval",
                    "decision": outcome.decision.value,
                    "reason": outcome.reason,
                    "pending_action_id": pending.id,
                    "pending_expires_at": pending.expires_at.isoformat(),
                    "message": "Quarantine is a sensitive action (Risk Level 4). Explicit approval is required.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if outcome.status is OutcomeStatus.EXECUTED:
            return Response({"status": "executed", "result": outcome.result, "summary": outcome.summary})

        return Response({"status": "blocked", "reason": outcome.reason}, status=status.HTTP_403_FORBIDDEN)


class QuarantineRestoreView(APIView):
    """POST /api/security/quarantine/<int:pk>/restore/
    Initiates restore of a quarantined file via ToolExecutor. Requires Level 4 approval.
    """

    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request, pk):
        item = get_object_or_404(QuarantineItem, pk=pk, user=request.user)
        registry, executor, approvals = build_tool_runtime()
        context = PermissionContext(user_id=request.user.pk)
        outcome = executor.execute("security_file_restore", {"quarantine_id": item.id}, context)

        if outcome.status is OutcomeStatus.NEEDS_APPROVAL:
            pending = approvals.request(request.user.pk, "security_file_restore", {"quarantine_id": item.id})
            return Response(
                {
                    "status": "needs_approval",
                    "decision": outcome.decision.value,
                    "reason": outcome.reason,
                    "pending_action_id": pending.id,
                    "pending_expires_at": pending.expires_at.isoformat(),
                    "message": "File restoration is a sensitive action (Risk Level 4). Explicit approval is required.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if outcome.status is OutcomeStatus.EXECUTED:
            return Response({"status": "executed", "result": outcome.result, "summary": outcome.summary})

        return Response({"status": "blocked", "reason": outcome.reason}, status=status.HTTP_403_FORBIDDEN)


class QuarantineDeleteView(APIView):
    """POST /api/security/quarantine/<int:pk>/delete/
    Permanently purges a quarantined file. Requires Level 4 approval.
    """

    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request, pk):
        item = get_object_or_404(QuarantineItem, pk=pk, user=request.user)
        registry, executor, approvals = build_tool_runtime()
        context = PermissionContext(user_id=request.user.pk)
        outcome = executor.execute("security_file_delete", {"quarantine_id": item.id}, context)

        if outcome.status is OutcomeStatus.NEEDS_APPROVAL:
            pending = approvals.request(request.user.pk, "security_file_delete", {"quarantine_id": item.id})
            return Response(
                {
                    "status": "needs_approval",
                    "decision": outcome.decision.value,
                    "reason": outcome.reason,
                    "pending_action_id": pending.id,
                    "pending_expires_at": pending.expires_at.isoformat(),
                    "message": "Permanent file deletion is a sensitive action (Risk Level 4). Approval required.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if outcome.status is OutcomeStatus.EXECUTED:
            return Response({"status": "executed", "result": outcome.result, "summary": outcome.summary})

        return Response({"status": "blocked", "reason": outcome.reason}, status=status.HTTP_403_FORBIDDEN)


class HashLookupView(APIView):
    """POST /api/security/hash-lookup/
    Performs safe local lookup of a file hash against known signatures and past scan records.
    Never uploads hashes or files to third-party services without explicit user consent.
    """

    def post(self, request):
        ser = HashLookupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        query_hash = ser.validated_data["hash"].lower().strip()

        # Check known signature database
        if query_hash in KNOWN_HASH_DATABASE:
            entry = KNOWN_HASH_DATABASE[query_hash]
            return Response({
                "status": "found",
                "source": "known_signatures_database",
                "hash": query_hash,
                "verdict": entry["verdict"],
                "description": entry["description"],
                "threat_level": entry["threat_level"],
                "confidence": entry["confidence"],
            })

        # Check previous scan findings in user history
        finding = ScanFinding.objects.filter(sha256__iexact=query_hash).first() or \
                  ScanFinding.objects.filter(md5__iexact=query_hash).first()

        if finding:
            return Response({
                "status": "found",
                "source": "previous_scans",
                "hash": query_hash,
                "file_name": finding.file_name,
                "verdict": finding.verdict,
                "threat_score": finding.threat_score,
                "confidence": "high",
                "scanned_at": finding.created_at.isoformat(),
            })

        return Response({
            "status": "not_found",
            "source": "local_database",
            "hash": query_hash,
            "message": "No match found in local signature or previous scan database. (Note: External cloud reputation lookups are disabled by default for privacy).",
        })


# ==============================================================================
# INCIDENT RESPONSE & THREAT TRIAGE VIEWS
# ==============================================================================

class IncidentListView(APIView):
    """GET /api/security/incidents/ -> List security incidents for current user with optional filters."""

    def get(self, request):
        qs = SecurityIncident.objects.filter(user=request.user)
        status_param = request.query_params.get("status")
        severity_param = request.query_params.get("severity")
        category_param = request.query_params.get("category")
        if status_param:
            qs = qs.filter(status=status_param)
        if severity_param:
            qs = qs.filter(severity=severity_param)
        if category_param:
            qs = qs.filter(category=category_param)
        return Response(SecurityIncidentSerializer(qs[:100], many=True).data)


class IncidentDetailView(APIView):
    """GET /api/security/incidents/<int:pk>/ -> Get single incident detail with full timeline."""

    def get(self, request, pk):
        inc = get_object_or_404(SecurityIncident, pk=pk, user=request.user)
        return Response(SecurityIncidentSerializer(inc).data)


class IncidentUpdateView(APIView):
    """PATCH /api/security/incidents/<int:pk>/ -> Update status, notes, or playbook progress."""

    def patch(self, request, pk):
        inc = get_object_or_404(SecurityIncident, pk=pk, user=request.user)
        ser = IncidentUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        old_status = inc.status
        new_status = ser.validated_data.get("status")
        notes = ser.validated_data.get("notes")
        playbook_progress = ser.validated_data.get("playbook_progress")

        update_fields = ["updated_at"]
        if new_status and new_status != old_status:
            inc.status = new_status
            update_fields.append("status")
            if new_status in ("resolved", "false_positive"):
                inc.resolved_at = timezone.now()
                update_fields.append("resolved_at")
            IncidentTimeline.objects.create(
                incident=inc,
                action="status_changed",
                actor=request.user.username or "User",
                details={"from": old_status, "to": new_status},
            )

        if notes is not None:
            inc.notes = notes
            update_fields.append("notes")

        if playbook_progress is not None:
            inc.playbook_progress = playbook_progress
            update_fields.append("playbook_progress")
            IncidentTimeline.objects.create(
                incident=inc,
                action="playbook_updated",
                actor=request.user.username or "User",
                details={"progress": playbook_progress},
            )

        inc.save(update_fields=update_fields)
        return Response(SecurityIncidentSerializer(inc).data)


class RunThreatDetectorView(APIView):
    """POST /api/security/incidents/run-detector/
    Runs threat detection heuristics on host telemetry through ToolExecutor.
    """

    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        registry, executor, approvals = build_tool_runtime()
        context = PermissionContext(user_id=request.user.pk)
        outcome = executor.execute("security_run_threat_detection", {}, context)
        if outcome.status is OutcomeStatus.EXECUTED:
            return Response(outcome.result)
        return Response({"error": outcome.reason}, status=status.HTTP_400_BAD_REQUEST)


class KillProcessActionView(APIView):
    """POST /api/security/actions/kill-process/
    Initiates Level 4 process termination.
    Evaluates to ASK -> returns needs_approval with pending_action_id for ApprovalCard.
    """

    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        ser = KillProcessRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        args = {"pid": ser.validated_data["pid"]}
        if ser.validated_data.get("process_name"):
            args["process_name"] = ser.validated_data["process_name"]
        if ser.validated_data.get("incident_id") is not None:
            args["incident_id"] = ser.validated_data["incident_id"]

        registry, executor, approvals = build_tool_runtime()
        context = PermissionContext(user_id=request.user.pk)
        outcome = executor.execute("security_kill_process", args, context)

        if outcome.status is OutcomeStatus.NEEDS_APPROVAL:
            pending = approvals.request(request.user.pk, "security_kill_process", args)
            return Response(
                {
                    "status": "needs_approval",
                    "decision": outcome.decision.value,
                    "reason": outcome.reason,
                    "pending_action_id": pending.id,
                    "pending_expires_at": pending.expires_at.isoformat(),
                    "message": f"Terminating process (PID {args['pid']}) is a sensitive response action (Level 4). Explicit approval is required.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if outcome.status is OutcomeStatus.EXECUTED:
            return Response({"status": "executed", "result": outcome.result, "summary": outcome.summary})

        return Response({"status": "blocked", "reason": outcome.reason}, status=status.HTTP_403_FORBIDDEN)


class BlockIpActionView(APIView):
    """POST /api/security/actions/block-ip/
    Initiates Level 4 IP blocking via host firewall.
    Evaluates to ASK -> returns needs_approval with pending_action_id for ApprovalCard.
    """

    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        ser = BlockIpRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        args = {
            "ip_address": ser.validated_data["ip_address"],
            "direction": ser.validated_data.get("direction", "inbound"),
            "reason": ser.validated_data.get("reason", "Defensive incident response block"),
        }
        if ser.validated_data.get("incident_id") is not None:
            args["incident_id"] = ser.validated_data["incident_id"]

        registry, executor, approvals = build_tool_runtime()
        context = PermissionContext(user_id=request.user.pk)
        outcome = executor.execute("security_block_ip", args, context)

        if outcome.status is OutcomeStatus.NEEDS_APPROVAL:
            pending = approvals.request(request.user.pk, "security_block_ip", args)
            return Response(
                {
                    "status": "needs_approval",
                    "decision": outcome.decision.value,
                    "reason": outcome.reason,
                    "pending_action_id": pending.id,
                    "pending_expires_at": pending.expires_at.isoformat(),
                    "message": f"Blocking IP {args['ip_address']} is a sensitive response action (Level 4). Explicit approval is required.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if outcome.status is OutcomeStatus.EXECUTED:
            return Response({"status": "executed", "result": outcome.result, "summary": outcome.summary})

        return Response({"status": "blocked", "reason": outcome.reason}, status=status.HTTP_403_FORBIDDEN)


class FirewallRuleListView(APIView):
    """GET /api/security/firewall-rules/ -> Lists host firewall rules for current user."""

    def get(self, request):
        status_param = request.query_params.get("status", "active")
        qs = FirewallRule.objects.filter(user=request.user)
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(FirewallRuleSerializer(qs[:100], many=True).data)


class FirewallRuleRollbackView(APIView):
    """POST /api/security/firewall-rules/<int:pk>/rollback/
    Removes the firewall rule and executes rollback command if on Windows.
    """

    def post(self, request, pk):
        rule = get_object_or_404(FirewallRule, pk=pk, user=request.user)
        if rule.status == "removed":
            return Response({"status": "already_removed", "message": "Rule was already removed."})

        # Run rollback command on Windows if applicable
        if sys.platform == "win32" and rule.rollback_cmd:
            try:
                import subprocess
                subprocess.run(rule.rollback_cmd, shell=True, capture_output=True, text=True)
            except Exception:
                pass

        rule.status = "removed"
        rule.removed_at = timezone.now()
        rule.save(update_fields=["status", "removed_at"])
        return Response({
            "status": "removed",
            "rule_name": rule.rule_name,
            "message": f"Firewall rule '{rule.rule_name}' removed successfully.",
        })


class SecuritySummaryView(APIView):
    """GET /api/security/summary/ -> Aggregated security posture and incident counts."""

    def get(self, request):
        store = DjangoIncidentStore()
        summary = store.get_summary(user_id=request.user.pk)
        return Response(summary)
