"""Django ORM adapters for defensive security stores:
1. QuarantineStore (file threat quarantine vault)
2. IncidentStore (security incident log and triage)
3. FirewallStore (host firewall rules and rollbacks)
"""
from __future__ import annotations

import datetime
from pathlib import Path
from typing import Any

from django.utils import timezone

from .models import FirewallRule, IncidentTimeline, QuarantineItem, ScanFinding, SecurityIncident


class DjangoQuarantineStore:
    """Implements QuarantineStore protocol using Django ORM."""

    def record_quarantine(
        self,
        user_id: Any,
        original_path: str,
        quarantine_path: str,
        sha256: str,
        file_size: int,
        verdict: str,
    ) -> dict:
        filename = Path(quarantine_path).name
        item = QuarantineItem.objects.create(
            user_id=user_id,
            original_path=original_path,
            quarantine_filename=filename,
            quarantine_path=quarantine_path,
            sha256=sha256,
            file_size=file_size,
            verdict=verdict,
            status="quarantined",
        )
        return {
            "id": item.id,
            "user_id": item.user_id,
            "original_path": item.original_path,
            "quarantine_filename": item.quarantine_filename,
            "quarantine_path": item.quarantine_path,
            "sha256": item.sha256,
            "file_size": item.file_size,
            "verdict": item.verdict,
            "status": item.status,
            "created_at": item.created_at.isoformat(),
        }

    def get_quarantine_item(self, item_id: Any, user_id: Any) -> dict | None:
        item = QuarantineItem.objects.filter(id=item_id, user_id=user_id).first()
        if not item:
            return None
        return {
            "id": item.id,
            "user_id": item.user_id,
            "original_path": item.original_path,
            "quarantine_filename": item.quarantine_filename,
            "quarantine_path": item.quarantine_path,
            "sha256": item.sha256,
            "file_size": item.file_size,
            "verdict": item.verdict,
            "status": item.status,
            "notes": item.notes,
            "created_at": item.created_at.isoformat(),
        }

    def mark_restored(self, item_id: Any, user_id: Any) -> bool:
        item = QuarantineItem.objects.filter(id=item_id, user_id=user_id).first()
        if not item:
            return False
        item.status = "restored"
        item.restored_at = timezone.now()
        item.save(update_fields=["status", "restored_at"])
        return True

    def mark_deleted(self, item_id: Any, user_id: Any) -> bool:
        item = QuarantineItem.objects.filter(id=item_id, user_id=user_id).first()
        if not item:
            return False
        item.status = "deleted"
        item.deleted_at = timezone.now()
        item.save(update_fields=["status", "deleted_at"])
        return True


class DjangoIncidentStore:
    """Implements IncidentStore protocol using Django ORM."""

    def create_incident(
        self,
        title: str,
        description: str,
        severity: str,
        category: str,
        source_type: str,
        source_val: str,
        evidence: list[dict],
        mitre_tactics: list[str],
        playbook_id: str,
        user_id: Any = None,
    ) -> dict:
        inc = SecurityIncident.objects.create(
            user_id=user_id,
            title=title,
            description=description,
            severity=severity,
            category=category,
            status="open",
            source_type=source_type,
            source_val=source_val,
            evidence=evidence,
            mitre_tactics=mitre_tactics,
            playbook_id=playbook_id,
            playbook_progress=[],
        )
        # Create initial timeline record
        IncidentTimeline.objects.create(
            incident=inc,
            action="incident_created",
            actor="ThreatDetector",
            details={"title": title, "severity": severity},
        )
        return self._to_dict(inc)

    def list_incidents(
        self,
        status: str | None = None,
        severity: str | None = None,
        category: str | None = None,
        limit: int = 50,
        user_id: Any = None,
    ) -> list[dict]:
        qs = SecurityIncident.objects.all()
        if user_id is not None:
            qs = qs.filter(user_id=user_id)
        if status:
            qs = qs.filter(status=status)
        if severity:
            qs = qs.filter(severity=severity)
        if category:
            qs = qs.filter(category=category)
        return [self._to_dict(inc) for inc in qs.order_by("-created_at")[:limit]]

    def get_incident(self, incident_id: int | str, user_id: Any = None) -> dict | None:
        try:
            iid = int(incident_id)
        except ValueError:
            return None
        qs = SecurityIncident.objects.filter(id=iid)
        if user_id is not None:
            qs = qs.filter(user_id=user_id)
        inc = qs.first()
        if not inc:
            return None
        res = self._to_dict(inc)
        res["timeline"] = [
            {
                "id": t.id,
                "action": t.action,
                "actor": t.actor,
                "details": t.details,
                "created_at": t.created_at.isoformat(),
            }
            for t in inc.timeline.all().order_by("created_at")
        ]
        return res

    def update_incident(
        self,
        incident_id: int | str,
        status: str | None = None,
        notes: str | None = None,
        playbook_progress: list[str] | None = None,
        user_id: Any = None,
    ) -> dict | None:
        try:
            iid = int(incident_id)
        except ValueError:
            return None
        qs = SecurityIncident.objects.filter(id=iid)
        if user_id is not None:
            qs = qs.filter(user_id=user_id)
        inc = qs.first()
        if not inc:
            return None

        update_fields = ["updated_at"]
        if status:
            inc.status = status
            update_fields.append("status")
            if status in ("resolved", "false_positive"):
                inc.resolved_at = timezone.now()
                update_fields.append("resolved_at")
        if notes is not None:
            inc.notes = notes
            update_fields.append("notes")
        if playbook_progress is not None:
            inc.playbook_progress = list(playbook_progress)
            update_fields.append("playbook_progress")

        inc.save(update_fields=update_fields)
        return self._to_dict(inc)

    def add_timeline_event(
        self,
        incident_id: int | str,
        action: str,
        actor: str,
        details: dict | None = None,
    ) -> dict:
        try:
            iid = int(incident_id)
        except ValueError:
            return {}
        inc = SecurityIncident.objects.filter(id=iid).first()
        if not inc:
            return {}
        ev = IncidentTimeline.objects.create(
            incident=inc,
            action=action,
            actor=actor,
            details=details or {},
        )
        return {
            "id": ev.id,
            "incident_id": inc.id,
            "action": ev.action,
            "actor": ev.actor,
            "details": ev.details,
            "created_at": ev.created_at.isoformat(),
        }

    def get_summary(self, user_id: Any = None) -> dict:
        qs = SecurityIncident.objects.all()
        if user_id is not None:
            qs = qs.filter(user_id=user_id)

        open_incidents = qs.filter(status__in=["open", "investigating"]).count()
        critical_incidents = qs.filter(status__in=["open", "investigating"], severity="critical").count()
        high_incidents = qs.filter(status__in=["open", "investigating"], severity="high").count()
        total_incidents = qs.count()

        quarantine_count = QuarantineItem.objects.filter(status="quarantined")
        if user_id is not None:
            quarantine_count = quarantine_count.filter(user_id=user_id)

        findings_count = ScanFinding.objects.all()
        if user_id is not None:
            findings_count = findings_count.filter(user_id=user_id)

        return {
            "open_incidents": open_incidents,
            "critical_incidents": critical_incidents,
            "high_incidents": high_incidents,
            "total_incidents": total_incidents,
            "quarantined_files": quarantine_count.count(),
            "scanned_files": findings_count.count(),
        }

    def _to_dict(self, inc: SecurityIncident) -> dict:
        return {
            "id": inc.id,
            "user_id": inc.user_id,
            "title": inc.title,
            "description": inc.description,
            "severity": inc.severity,
            "category": inc.category,
            "status": inc.status,
            "source_type": inc.source_type,
            "source_val": inc.source_val,
            "evidence": inc.evidence,
            "mitre_tactics": inc.mitre_tactics,
            "playbook_id": inc.playbook_id,
            "playbook_progress": inc.playbook_progress,
            "notes": inc.notes,
            "created_at": inc.created_at.isoformat(),
            "updated_at": inc.updated_at.isoformat(),
            "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        }


class DjangoFirewallStore:
    """Implements FirewallStore protocol using Django ORM."""

    def add_rule(
        self,
        rule_name: str,
        ip_address: str,
        direction: str,
        action: str,
        rollback_cmd: str,
        user_id: Any = None,
    ) -> dict:
        rule = FirewallRule.objects.create(
            user_id=user_id,
            rule_name=rule_name,
            ip_address=ip_address,
            direction=direction,
            action=action,
            status="active",
            rollback_cmd=rollback_cmd,
        )
        return {
            "id": rule.id,
            "user_id": rule.user_id,
            "rule_name": rule.rule_name,
            "ip_address": rule.ip_address,
            "direction": rule.direction,
            "action": rule.action,
            "status": rule.status,
            "rollback_cmd": rule.rollback_cmd,
            "created_at": rule.created_at.isoformat(),
        }

    def list_rules(self, status: str = "active", user_id: Any = None) -> list[dict]:
        qs = FirewallRule.objects.all()
        if user_id is not None:
            qs = qs.filter(user_id=user_id)
        if status:
            qs = qs.filter(status=status)
        return [
            {
                "id": r.id,
                "user_id": r.user_id,
                "rule_name": r.rule_name,
                "ip_address": r.ip_address,
                "direction": r.direction,
                "action": r.action,
                "status": r.status,
                "rollback_cmd": r.rollback_cmd,
                "created_at": r.created_at.isoformat(),
            }
            for r in qs.order_by("-created_at")
        ]

    def remove_rule(self, rule_id: int | str, user_id: Any = None) -> dict | None:
        try:
            rid = int(rule_id)
        except ValueError:
            return None
        qs = FirewallRule.objects.filter(id=rid)
        if user_id is not None:
            qs = qs.filter(user_id=user_id)
        rule = qs.first()
        if not rule:
            return None
        rule.status = "removed"
        rule.removed_at = timezone.now()
        rule.save(update_fields=["status", "removed_at"])
        return {
            "id": rule.id,
            "user_id": rule.user_id,
            "rule_name": rule.rule_name,
            "ip_address": rule.ip_address,
            "direction": rule.direction,
            "action": rule.action,
            "status": rule.status,
            "rollback_cmd": rule.rollback_cmd,
            "created_at": rule.created_at.isoformat(),
        }
