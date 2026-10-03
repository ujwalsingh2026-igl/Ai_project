from config.logging_utils import request_id_var
from core.tools import AuditEvent

from .models import AuditLog


class DjangoAuditSink:
    """Plugs Django's database into core's AuditSink interface."""

    def record(self, event: AuditEvent) -> None:
        AuditLog.objects.create(
            user_id=event.user_id,
            request_id=request_id_var.get(),
            tool_name=event.tool_name,
            risk_level=event.risk_level,
            decision=event.decision,
            status=event.status,
            reason=event.reason,
            details={"arg_names": list(event.arg_names)},
        )
