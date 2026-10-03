"""Approval flow (pure Python).

Simple idea: when the permission engine says ASK, we do NOT run the tool.
We save a PendingAction (tool + args, stored on the SERVER) and give the user
an action ID. Later the user says approve or deny:
  approve -> tool runs (still re-checked by the permission engine)
  deny    -> nothing runs, denial goes to the audit log

Safety rules built in:
  * args come from the stored action, never from the confirm request
  * only the owner can resolve it (anyone else gets "not_found")
  * single use: the first approve/deny wins, even with simultaneous requests
  * it expires (store decides the time limit)
"""
from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone
from typing import Callable, Protocol

from .permissions import PermissionContext
from .tools import OutcomeStatus, ToolExecutor, ToolOutcome


@dataclass(frozen=True)
class PendingAction:
    id: str
    user_id: object
    tool_name: str
    args: dict
    created_at: datetime
    expires_at: datetime
    status: str = "pending"      # pending | approved | denied | expired


@dataclass(frozen=True)
class ClaimResult:
    action: PendingAction | None
    reason: str                  # ok | not_found | not_pending | expired


class ApprovalStore(Protocol):
    def create(self, user_id, tool_name: str, args: dict) -> PendingAction: ...

    def claim(self, action_id: str, user_id, new_status: str) -> ClaimResult:
        """ATOMICALLY move pending -> new_status if it belongs to user and is not expired."""


class InMemoryApprovalStore:
    """For tests and demos. The lock proves the 'single use' rule even with threads."""

    def __init__(self, ttl_seconds: int = 300, clock: Callable[[], datetime] | None = None):
        self._ttl = ttl_seconds
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._items: dict[str, PendingAction] = {}
        self._lock = threading.Lock()

    def create(self, user_id, tool_name: str, args: dict) -> PendingAction:
        now = self._clock()
        action = PendingAction(str(uuid.uuid4()), user_id, tool_name, dict(args), now,
                               now + timedelta(seconds=self._ttl))
        with self._lock:
            self._items[action.id] = action
        return action

    def get(self, action_id: str) -> PendingAction | None:
        return self._items.get(action_id)

    def claim(self, action_id: str, user_id, new_status: str) -> ClaimResult:
        with self._lock:
            action = self._items.get(action_id)
            if action is None or action.user_id != user_id:
                return ClaimResult(None, "not_found")      # same answer for "not yours": no leak
            if action.status != "pending":
                return ClaimResult(None, "not_pending")
            if action.expires_at <= self._clock():
                self._items[action_id] = replace(action, status="expired")
                return ClaimResult(None, "expired")
            updated = replace(action, status=new_status)
            self._items[action_id] = updated
            return ClaimResult(updated, "ok")


@dataclass
class ResolveResult:
    status: str        # executed | denied | blocked | invalid_input | error | unknown_tool | not_found | not_pending | expired
    message: str
    tool_name: str | None = None
    outcome: ToolOutcome | None = None


_CLAIM_MESSAGES = {
    "not_found": "No such pending action.",
    "not_pending": "This action was already approved, denied, or has expired.",
    "expired": "This action expired. Please ask again.",
}


class ApprovalService:
    def __init__(self, store: ApprovalStore, executor: ToolExecutor):
        self._store = store
        self._executor = executor

    def request(self, user_id, tool_name: str, args: dict) -> PendingAction:
        return self._store.create(user_id, tool_name, args)

    def resolve(self, action_id: str, user_id, approve: bool,
                denied_permissions: frozenset[str] = frozenset()) -> ResolveResult:
        claim = self._store.claim(action_id, user_id, "approved" if approve else "denied")
        if claim.action is None:
            return ResolveResult(claim.reason, _CLAIM_MESSAGES.get(claim.reason, "Cannot resolve this action."))

        action = claim.action
        if not approve:
            self._executor.record_user_denial(action.tool_name, PermissionContext(user_id=user_id), action.args)
            return ResolveResult("denied", f"Denied. I did not run '{action.tool_name}'.", action.tool_name)

        # Approval is NOT a free pass: the executor still checks the engine (level 5 stays blocked,
        # revoked permissions stay blocked) and re-validates the stored args.
        context = PermissionContext(user_id=user_id, approved_once=True, denied_permissions=denied_permissions)
        outcome = self._executor.execute(action.tool_name, action.args, context)
        if outcome.status is OutcomeStatus.EXECUTED:
            message = f"Approved. Result of '{action.tool_name}':\n{outcome.summary}"
        else:
            message = f"Approved, but I could not run '{action.tool_name}' ({outcome.status.value}): {outcome.reason}"
        return ResolveResult(outcome.status.value, message, action.tool_name, outcome)
