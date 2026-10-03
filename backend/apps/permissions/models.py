import uuid

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """One row per tool decision (allowed, asked, blocked, failed). Append-only by convention."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs")
    request_id = models.CharField(max_length=64, blank=True)
    tool_name = models.CharField(max_length=100)
    risk_level = models.SmallIntegerField(null=True, blank=True)
    decision = models.CharField(max_length=10)
    status = models.CharField(max_length=20)
    reason = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)    # e.g. {"arg_names": [...]}; never secrets
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["tool_name", "-created_at"]), models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.tool_name}:{self.decision}:{self.status}"


class PendingApproval(models.Model):
    """A tool call waiting for the user's approve/deny. Tool + args are stored HERE (server side),
    so the confirm request can never change what will run."""

    class Status(models.TextChoices):
        PENDING = "pending"
        APPROVED = "approved"
        DENIED = "denied"
        EXPIRED = "expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)   # not guessable
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pending_approvals")
    conversation = models.ForeignKey("assistant.Conversation", null=True, blank=True,
                                     on_delete=models.CASCADE, related_name="+")
    tool_name = models.CharField(max_length=100)
    args = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "status"])]

    def __str__(self):
        return f"{self.tool_name}:{self.status}"
