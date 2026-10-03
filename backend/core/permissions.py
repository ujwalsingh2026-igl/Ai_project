"""Permission engine (pure Python, no Django).

Simple idea: every tool has a risk level (0-5). Before a tool runs, the engine
answers ONE question: ALLOW, ASK the user, or BLOCK?

WHY it is separate from Django: the safety rules must be easy to test and must
not depend on a web framework.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Mapping


class RiskLevel(enum.IntEnum):
    SAFE = 0                    # app's own config
    USER_DATA = 1               # files/data the user selected
    DEVICE_INFO = 2             # read-only system information
    EXTERNAL_COMMUNICATION = 3  # network requests, emails, API calls
    SECURITY_RESPONSE = 4       # firewall, kill process, isolate device
    HIGH_RISK = 5               # could affect other people/systems/accounts


class Decision(str, enum.Enum):
    ALLOW = "allow"
    ASK = "ask"
    BLOCK = "block"


# Default policy. Level 2 is ALLOW in Phase 1 only because the one level-2 tool
# is read-only and runs only when the user explicitly asks for it.
DEFAULT_POLICY: dict[RiskLevel, Decision] = {
    RiskLevel.SAFE: Decision.ALLOW,
    RiskLevel.USER_DATA: Decision.ASK,
    RiskLevel.DEVICE_INFO: Decision.ALLOW,
    RiskLevel.EXTERNAL_COMMUNICATION: Decision.ASK,
    RiskLevel.SECURITY_RESPONSE: Decision.ASK,
    RiskLevel.HIGH_RISK: Decision.BLOCK,
}


@dataclass(frozen=True)
class PermissionContext:
    """Who is asking, and what the user has said about this request."""
    user_id: int | str | None = None
    user_selected_resource: bool = False   # user explicitly picked the file/data (level 1)
    approved_once: bool = False            # user approved THIS exact action (approval flow is PLANNED)
    denied_permissions: frozenset[str] = field(default_factory=frozenset)  # user-revoked permissions


@dataclass(frozen=True)
class PermissionResult:
    decision: Decision
    reason: str

    @property
    def allowed(self) -> bool:
        return self.decision is Decision.ALLOW


class PermissionEngine:
    """Decides ALLOW / ASK / BLOCK. Fail-closed: anything unclear is BLOCK."""

    def __init__(self, policy_overrides: Mapping[RiskLevel, Decision] | None = None):
        self._policy = dict(DEFAULT_POLICY)
        if policy_overrides:
            self._policy.update(policy_overrides)

    def evaluate(self, spec, context: PermissionContext) -> PermissionResult:
        try:
            level = RiskLevel(spec.risk_level)
        except ValueError:
            return PermissionResult(Decision.BLOCK, "Unknown risk level.")

        if spec.required_permission in context.denied_permissions:
            return PermissionResult(Decision.BLOCK, f"Permission '{spec.required_permission}' was revoked by the user.")

        # Hard rule: level 5 is never executed in Phase 1, not even with approval.
        if level is RiskLevel.HIGH_RISK:
            return PermissionResult(Decision.BLOCK, "High-risk actions are blocked.")

        decision = self._policy.get(level, Decision.BLOCK)

        # Hard cap: config can never auto-ALLOW level 3 or 4.
        if decision is Decision.ALLOW and level >= RiskLevel.EXTERNAL_COMMUNICATION:
            decision = Decision.ASK

        if decision is Decision.ASK:
            if level is RiskLevel.USER_DATA and context.user_selected_resource:
                return PermissionResult(Decision.ALLOW, "User selected this resource explicitly.")
            if context.approved_once:
                return PermissionResult(Decision.ALLOW, "User approved this action.")
            return PermissionResult(Decision.ASK, f"Level {int(level)} action needs user approval.")

        if decision is Decision.ALLOW:
            return PermissionResult(Decision.ALLOW, f"Level {int(level)} is allowed by policy.")
        return PermissionResult(Decision.BLOCK, f"Level {int(level)} is blocked by policy.")


def parse_policy_overrides(text: str | None) -> dict[RiskLevel, Decision]:
    """Parse 'level:decision' pairs, e.g. '2:ask' or '1:allow,2:ask'.

    Invalid text raises ValueError so a typo in .env fails loudly at startup
    instead of silently using a weaker policy. (The engine's hard caps for
    levels 3/4/5 still apply to whatever is parsed here.)
    """
    result: dict[RiskLevel, Decision] = {}
    for part in (text or "").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            level_text, decision_text = part.split(":", 1)
            result[RiskLevel(int(level_text))] = Decision(decision_text.strip().lower())
        except ValueError as exc:
            raise ValueError(f"Invalid PERMISSION_OVERRIDES entry {part!r}; use e.g. '2:ask'") from exc
    return result
