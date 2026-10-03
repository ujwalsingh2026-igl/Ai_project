"""Serializers for Defensive Security Center: scan findings, quarantine vault, incidents, and firewall rules."""
from rest_framework import serializers

from .models import FirewallRule, IncidentTimeline, QuarantineItem, ScanFinding, SecurityIncident


class ScanFindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanFinding
        fields = [
            "id",
            "file_path",
            "file_name",
            "file_size",
            "sha256",
            "md5",
            "entropy",
            "verdict",
            "threat_score",
            "evidence",
            "file_metadata",
            "is_quarantined",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "file_size",
            "sha256",
            "md5",
            "entropy",
            "verdict",
            "threat_score",
            "evidence",
            "file_metadata",
            "created_at",
        ]


class QuarantineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuarantineItem
        fields = [
            "id",
            "original_path",
            "quarantine_filename",
            "quarantine_path",
            "sha256",
            "file_size",
            "verdict",
            "status",
            "notes",
            "created_at",
            "restored_at",
            "deleted_at",
        ]
        read_only_fields = [
            "id",
            "quarantine_filename",
            "quarantine_path",
            "sha256",
            "file_size",
            "verdict",
            "created_at",
            "restored_at",
            "deleted_at",
        ]


class FileScanRequestSerializer(serializers.Serializer):
    path = serializers.CharField(required=False, allow_blank=True, max_length=1024)
    file = serializers.FileField(required=False)

    def validate(self, attrs):
        if not attrs.get("path") and not attrs.get("file"):
            raise serializers.ValidationError("Either a local file path or an uploaded file must be provided.")
        return attrs


class QuarantineRequestSerializer(serializers.Serializer):
    path = serializers.CharField(max_length=1024)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class HashLookupSerializer(serializers.Serializer):
    hash = serializers.CharField(min_length=32, max_length=64)


class IncidentTimelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentTimeline
        fields = ["id", "incident_id", "action", "actor", "details", "created_at"]
        read_only_fields = ["id", "incident_id", "created_at"]


class SecurityIncidentSerializer(serializers.ModelSerializer):
    timeline = IncidentTimelineSerializer(many=True, read_only=True)

    class Meta:
        model = SecurityIncident
        fields = [
            "id",
            "title",
            "description",
            "severity",
            "category",
            "status",
            "source_type",
            "source_val",
            "evidence",
            "mitre_tactics",
            "playbook_id",
            "playbook_progress",
            "notes",
            "timeline",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "resolved_at",
        ]


class IncidentUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=SecurityIncident.STATUS_CHOICES,
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    playbook_progress = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )


class FirewallRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FirewallRule
        fields = [
            "id",
            "rule_name",
            "ip_address",
            "direction",
            "action",
            "status",
            "rollback_cmd",
            "notes",
            "created_at",
            "removed_at",
        ]
        read_only_fields = [
            "id",
            "rule_name",
            "status",
            "rollback_cmd",
            "created_at",
            "removed_at",
        ]


class KillProcessRequestSerializer(serializers.Serializer):
    pid = serializers.IntegerField(min_value=1)
    process_name = serializers.CharField(required=False, allow_blank=True, default="")
    incident_id = serializers.IntegerField(required=False, allow_null=True)


class BlockIpRequestSerializer(serializers.Serializer):
    ip_address = serializers.CharField(max_length=64)
    direction = serializers.ChoiceField(choices=["inbound", "outbound"], default="inbound")
    reason = serializers.CharField(required=False, allow_blank=True, default="Defensive incident response block")
    incident_id = serializers.IntegerField(required=False, allow_null=True)


class SecuritySummarySerializer(serializers.Serializer):
    open_incidents = serializers.IntegerField()
    critical_incidents = serializers.IntegerField()
    high_incidents = serializers.IntegerField()
    total_incidents = serializers.IntegerField()
    quarantined_files = serializers.IntegerField()
    scanned_files = serializers.IntegerField()
