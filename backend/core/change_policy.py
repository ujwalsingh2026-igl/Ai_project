"""Change-request gate (pure Python).

Users can ask the assistant to change how it behaves ("be shorter", "forget X", "ask me before level 2 tools").
A model may PARSE the sentence into a ChangeRequest, but THIS CODE decides what is allowed.
Fail-closed: unknown kinds are blocked.

  ALLOW         reversible, personal, low-risk (style, language, remember/forget, export)
  ASK           needs an explicit confirmation step (maybe step-up login) before it happens
  PROPOSE_ONLY  the assistant may draft it for a human to review/test/apply; it never applies it to itself
  BLOCK         never allowed from chat (weakens safety, hides evidence, or harms others)
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field

from .permissions import DEFAULT_POLICY, Decision, RiskLevel


class ChangeDecision(str, enum.Enum):
    ALLOW = "allow"
    ASK = "ask"
    PROPOSE_ONLY = "propose_only"
    BLOCK = "block"


@dataclass(frozen=True)
class ChangeRequest:
    kind: str
    target: str = ""
    value: dict = field(default_factory=dict)


@dataclass(frozen=True)
class ChangeResult:
    decision: ChangeDecision
    reason: str


_ALLOW = {
    "set_style": "Style is a personal, reversible preference.",
    "set_language": "Language is a personal, reversible preference.",
    "remember_fact": "Remembering is allowed (the memory filter still rejects secrets).",
    "forget_fact": "Forgetting is always allowed.",
    "view_memory": "You can always see what is stored.",
    "export_memory": "You can always export your data.",
    "delete_conversation": "You can always delete your conversations.",
    "shorten_warnings": "Warnings may be made shorter but not removed.",
}
_ASK = {
    "delete_all_memory": "Deleting everything is irreversible; confirm first.",
    "enable_training_on_my_data": "Training on your data needs explicit opt-in and a scope.",
    "change_model": "Changing the AI model changes behaviour and where data goes; confirm first.",
    "ingest_source": "Fetching and learning from an external source is an external call; confirm first.",
    "enable_scheduled_job": "A background job acts without you watching; confirm first.",
    "update_threat_rules": "Downloading threat feeds is an external call; confirm first.",
    "enable_external_provider": "Sending data to a cloud AI provider needs approval each time.",
}
_PROPOSE = {
    "add_tool": "New tools are drafted for human review, tested, then registered by a developer.",
    "modify_code": "The assistant may draft a patch; it never edits or reloads its own code.",
    "add_detection_rule": "New detection rules are proposed for your review, never silently activated.",
}
_BLOCK = {
    "disable_audit": "The audit log cannot be turned off.",
    "delete_audit_log": "Audit records cannot be deleted from chat.",
    "disable_permission_engine": "The permission engine cannot be disabled.",
    "disable_approval": "Approvals cannot be skipped.",
    "approve_all_automatically": "Blanket auto-approval is not allowed.",
    "suppress_safety_warnings": "Safety warnings can be shortened, not removed.",
    "disable_honest_feedback": "The assistant will not agree with everything or stop pointing out real problems.",
    "train_on_others_data": "Training on other people's data without their consent is not allowed.",
    "reveal_secrets": "Secrets are never revealed.",
}
_STRICTNESS = {Decision.ALLOW: 0, Decision.ASK: 1, Decision.BLOCK: 2}
_PROTECTED_CODE_TARGETS = {"safety", "permissions", "audit", "approvals", "memory_filter", "change_policy"}


def evaluate_change(req: ChangeRequest) -> ChangeResult:
    kind = req.kind
    if kind in _ALLOW:
        return ChangeResult(ChangeDecision.ALLOW, _ALLOW[kind])
    if kind in _BLOCK:
        return ChangeResult(ChangeDecision.BLOCK, _BLOCK[kind])
    if kind in _ASK:
        return ChangeResult(ChangeDecision.ASK, _ASK[kind])
    if kind == "modify_code" and req.target in _PROTECTED_CODE_TARGETS:
        return ChangeResult(ChangeDecision.BLOCK, "Code that guards safety, permissions, audit or approvals cannot be changed from chat.")
    if kind in _PROPOSE:
        return ChangeResult(ChangeDecision.PROPOSE_ONLY, _PROPOSE[kind])
    if kind == "set_permission_override":
        return _permission_override(req.value)
    return ChangeResult(ChangeDecision.BLOCK, "Unknown change type (blocked by default).")


def _permission_override(value: dict) -> ChangeResult:
    try:
        level = RiskLevel(int(value["level"]))
        wanted = Decision(str(value["decision"]).lower())
    except (KeyError, ValueError, TypeError):
        return ChangeResult(ChangeDecision.BLOCK, "Invalid permission change.")
    current = DEFAULT_POLICY[level]
    if level is RiskLevel.HIGH_RISK and wanted is not Decision.BLOCK:
        return ChangeResult(ChangeDecision.BLOCK, "Level 5 always stays blocked.")
    if _STRICTNESS[wanted] >= _STRICTNESS[current]:
        return ChangeResult(ChangeDecision.ALLOW, "Making a rule stricter (or equal) is safe.")
    if level >= RiskLevel.EXTERNAL_COMMUNICATION:
        return ChangeResult(ChangeDecision.BLOCK, "Levels 3 and 4 can never be loosened to auto-allow.")
    return ChangeResult(ChangeDecision.ASK, "Loosening a rule needs explicit confirmation.")
