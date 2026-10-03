from datetime import timedelta

from django.utils import timezone

from core.approvals import ClaimResult, PendingAction

from .models import PendingApproval


def _to_core(row: PendingApproval) -> PendingAction:
    return PendingAction(str(row.id), row.user_id, row.tool_name, row.args, row.created_at, row.expires_at, row.status)


class DjangoApprovalStore:
    """Plugs the database into core's ApprovalStore interface."""

    def __init__(self, ttl_seconds: int = 300):
        self._ttl = ttl_seconds

    def create(self, user_id, tool_name: str, args: dict) -> PendingAction:
        row = PendingApproval.objects.create(
            user_id=user_id, tool_name=tool_name, args=args,
            expires_at=timezone.now() + timedelta(seconds=self._ttl))
        return _to_core(row)

    def claim(self, action_id: str, user_id, new_status: str) -> ClaimResult:
        # Filtering by user_id means "not yours" looks exactly like "does not exist".
        mine = PendingApproval.objects.filter(pk=action_id, user_id=user_id)
        row = mine.first()
        if row is None:
            return ClaimResult(None, "not_found")
        if row.status != PendingApproval.Status.PENDING:
            return ClaimResult(None, "not_pending")
        now = timezone.now()
        if row.expires_at <= now:
            mine.filter(status=PendingApproval.Status.PENDING).update(status=PendingApproval.Status.EXPIRED, resolved_at=now)
            return ClaimResult(None, "expired")
        # ONE atomic UPDATE ... WHERE status='pending': if two requests race, only one gets updated == 1.
        updated = mine.filter(status=PendingApproval.Status.PENDING, expires_at__gt=now).update(status=new_status, resolved_at=now)
        if updated != 1:
            return ClaimResult(None, "not_pending")
        row.refresh_from_db()
        return ClaimResult(_to_core(row), "ok")
