"""Models for the Defensive Security Center: scan findings, quarantine vault, incidents, and firewall rules."""
from django.conf import settings
from django.db import models


class ScanFinding(models.Model):
    """Stores the defensive static analysis result of a user-inspected file."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scan_findings",
    )
    file_path = models.CharField(max_length=1024, help_text="Original or inspected path of the file")
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    sha256 = models.CharField(max_length=64, db_index=True)
    md5 = models.CharField(max_length=32, blank=True, default="")
    entropy = models.FloatField(default=0.0)
    verdict = models.CharField(
        max_length=32,
        choices=[
            ("clean", "Clean"),
            ("suspicious", "Suspicious"),
            ("likely_malicious", "Likely Malicious"),
        ],
        default="clean",
    )
    threat_score = models.IntegerField(default=0, help_text="Score from 0 (clean) to 100 (high risk)")
    evidence = models.JSONField(default=list, blank=True, help_text="List of fact/inference/confidence items")
    file_metadata = models.JSONField(default=dict, blank=True, help_text="PE sections, hashes, archive stats")
    is_quarantined = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["sha256"]),
        ]

    def __str__(self) -> str:
        return f"ScanFinding({self.file_name} - {self.verdict} [{self.threat_score}/100])"


class QuarantineItem(models.Model):
    """Tracks a quarantined file moved into isolated storage with stripped permissions."""

    STATUS_CHOICES = [
        ("quarantined", "Quarantined"),
        ("restored", "Restored"),
        ("deleted", "Deleted"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quarantine_items",
    )
    original_path = models.CharField(max_length=1024)
    quarantine_filename = models.CharField(max_length=255)
    quarantine_path = models.CharField(max_length=1024)
    sha256 = models.CharField(max_length=64, db_index=True)
    file_size = models.BigIntegerField(default=0)
    verdict = models.CharField(max_length=64, default="quarantined")
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="quarantined")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    restored_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "-created_at"]),
            models.Index(fields=["sha256"]),
        ]

    def __str__(self) -> str:
        return f"QuarantineItem({self.quarantine_filename} - {self.status})"


class SecurityIncident(models.Model):
    """Tracks detected defensive security threats, anomalies, and active incident workflows."""

    SEVERITY_CHOICES = [
        ("critical", "Critical"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
        ("info", "Info"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("investigating", "Investigating"),
        ("contained", "Contained"),
        ("resolved", "Resolved"),
        ("false_positive", "False Positive"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="security_incidents",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=32, choices=SEVERITY_CHOICES, default="medium")
    category = models.CharField(
        max_length=64,
        default="threat",
        help_text="brute_force | suspicious_process | port_anomaly | persistence_detected | file_threat",
    )
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="open")
    source_type = models.CharField(max_length=32, default="ip", help_text="ip | process | port | file | registry")
    source_val = models.CharField(max_length=255, default="")
    evidence = models.JSONField(default=list, blank=True)
    mitre_tactics = models.JSONField(default=list, blank=True)
    playbook_id = models.CharField(max_length=64, default="", blank=True)
    playbook_progress = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "-created_at"]),
            models.Index(fields=["user", "severity"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self) -> str:
        return f"SecurityIncident({self.title} [{self.severity.upper()} - {self.status.upper()}])"


class IncidentTimeline(models.Model):
    """Audit log of investigation steps, mitigations, and user actions on an incident."""

    incident = models.ForeignKey(
        SecurityIncident,
        on_delete=models.CASCADE,
        related_name="timeline",
    )
    action = models.CharField(max_length=64)
    actor = models.CharField(max_length=128, default="User")
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Timeline({self.incident_id} - {self.action} by {self.actor})"


class FirewallRule(models.Model):
    """Tracks host firewall rules created via Level 4 defensive responses with rollback capability."""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("removed", "Removed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="firewall_rules",
    )
    rule_name = models.CharField(max_length=128, db_index=True)
    ip_address = models.CharField(max_length=64)
    direction = models.CharField(max_length=16, default="inbound")
    action = models.CharField(max_length=16, default="block")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="active")
    rollback_cmd = models.CharField(max_length=512, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "-created_at"]),
            models.Index(fields=["ip_address"]),
        ]

    def __str__(self) -> str:
        return f"FirewallRule({self.rule_name} - {self.ip_address} [{self.status}])"
