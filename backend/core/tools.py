"""Tool registry + executor (pure Python).

Registry = the list of tools that exist.
Executor = the ONLY way to run a tool. It always does:
    permission check -> input validation -> run -> output validation -> audit
so no tool can run without passing the permission engine.
"""
from __future__ import annotations

import enum
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Protocol

from .permissions import Decision, PermissionContext, PermissionEngine, RiskLevel
from .schema import SchemaError, validate

logger = logging.getLogger("core.tools")
_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{2,63}$")


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    risk_level: RiskLevel
    required_permission: str          # e.g. "device.read"
    input_schema: dict
    output_schema: dict
    allowed_operations: tuple[str, ...]   # e.g. ("read",)
    triggers: tuple[str, ...] = ()        # regexes used by the rule-based intent router

    def __post_init__(self):
        if not _NAME_RE.match(self.name):
            raise ValueError(f"Invalid tool name: {self.name!r}")
        object.__setattr__(self, "risk_level", RiskLevel(self.risk_level))
        if "." not in self.required_permission:
            raise ValueError("required_permission must look like 'area.action'")
        if not self.allowed_operations:
            raise ValueError("allowed_operations must not be empty")

    def to_public_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "risk_level": int(self.risk_level),
            "risk_label": self.risk_level.name,
            "required_permission": self.required_permission,
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
            "allowed_operations": list(self.allowed_operations),
        }


class Tool(ABC):
    spec: ToolSpec

    @abstractmethod
    def run(self, args: dict) -> dict: ...

    @abstractmethod
    def summarize(self, result: dict) -> str:
        """Human-readable text of the result."""

    def infer_args(self, message: str) -> dict:
        return {}


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if tool.spec.name in self._tools:
            raise ValueError(f"Tool already registered: {tool.spec.name}")
        self._tools[tool.spec.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def all(self) -> list[Tool]:
        return list(self._tools.values())

    def specs(self) -> list[ToolSpec]:
        return [t.spec for t in self._tools.values()]


class OutcomeStatus(str, enum.Enum):
    EXECUTED = "executed"
    NEEDS_APPROVAL = "needs_approval"
    BLOCKED = "blocked"
    INVALID_INPUT = "invalid_input"
    UNKNOWN_TOOL = "unknown_tool"
    ERROR = "error"


@dataclass
class ToolOutcome:
    tool_name: str
    status: OutcomeStatus
    decision: Decision
    reason: str
    result: dict | None = None
    summary: str | None = None


@dataclass
class AuditEvent:
    tool_name: str
    risk_level: int | None
    decision: str
    status: str
    reason: str
    user_id: Any = None
    arg_names: tuple[str, ...] = ()   # only argument NAMES, never values (values may be sensitive)


class AuditSink(Protocol):
    def record(self, event: AuditEvent) -> None: ...


@dataclass
class InMemoryAuditSink:
    events: list[AuditEvent] = field(default_factory=list)

    def record(self, event: AuditEvent) -> None:
        self.events.append(event)


class ToolExecutor:
    def __init__(self, registry: ToolRegistry, engine: PermissionEngine, audit: AuditSink | None = None):
        self._registry = registry
        self._engine = engine
        self._audit = audit or InMemoryAuditSink()

    def execute(self, tool_name: str, args: dict | None, context: PermissionContext) -> ToolOutcome:
        args = args or {}
        tool = self._registry.get(tool_name)
        if tool is None:
            return self._finish(None, ToolOutcome(tool_name, OutcomeStatus.UNKNOWN_TOOL, Decision.BLOCK,
                                                  "Tool is not registered."), context, args)
        spec = tool.spec
        perm = self._engine.evaluate(spec, context)

        if perm.decision is Decision.ASK:
            outcome = ToolOutcome(tool_name, OutcomeStatus.NEEDS_APPROVAL, perm.decision, perm.reason)
        elif perm.decision is Decision.BLOCK:
            outcome = ToolOutcome(tool_name, OutcomeStatus.BLOCKED, perm.decision, perm.reason)
        else:
            outcome = self._run_allowed(tool, args, perm.decision, perm.reason, context=context)
        return self._finish(spec, outcome, context, args)

    def record_user_denial(self, tool_name: str, context: PermissionContext, args: dict | None = None) -> None:
        """The user said NO to a pending action: write that to the audit log."""
        tool = self._registry.get(tool_name)
        outcome = ToolOutcome(tool_name, OutcomeStatus.BLOCKED, Decision.BLOCK, "User denied the action.")
        self._finish(tool.spec if tool else None, outcome, context, args or {})

    def _run_allowed(self, tool: Tool, args: dict, decision: Decision, reason: str,
                     context: PermissionContext | None = None) -> ToolOutcome:
        spec = tool.spec
        try:
            validate(args, spec.input_schema)
        except SchemaError as exc:
            return ToolOutcome(spec.name, OutcomeStatus.INVALID_INPUT, decision, f"Invalid input: {exc}")
        try:
            import inspect
            sig = inspect.signature(tool.run)
            if "context" in sig.parameters:
                result = tool.run(args, context=context)
            else:
                result = tool.run(args)
        except Exception:  # a broken tool must never crash the assistant
            logger.exception("tool_failed", extra={"tool": spec.name})
            return ToolOutcome(spec.name, OutcomeStatus.ERROR, decision, "The tool failed while running.")
        try:
            validate(result, spec.output_schema)
        except SchemaError as exc:
            logger.error("tool_output_invalid", extra={"tool": spec.name})
            return ToolOutcome(spec.name, OutcomeStatus.ERROR, decision, f"Tool output failed validation: {exc}")
        return ToolOutcome(spec.name, OutcomeStatus.EXECUTED, decision, reason, result, tool.summarize(result))

    def _finish(self, spec: ToolSpec | None, outcome: ToolOutcome, context: PermissionContext, args: dict) -> ToolOutcome:
        try:
            self._audit.record(AuditEvent(
                tool_name=outcome.tool_name,
                risk_level=int(spec.risk_level) if spec else None,
                decision=outcome.decision.value,
                status=outcome.status.value,
                reason=outcome.reason,
                user_id=context.user_id,
                arg_names=tuple(sorted(args)),
            ))
        except Exception:
            logger.exception("audit_write_failed")  # TECHNICAL DEBT: should audit failure block execution?
        return outcome
