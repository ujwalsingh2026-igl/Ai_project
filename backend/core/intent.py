"""Rule-based intent router (Phase 1).

Looks at the user's message and decides: "chat" or "run tool X".
LIMITATION: regex rules can be wrong (e.g. "how much memory does my python list
use" may look like a system question). The tool is read-only and permission
checked, so a wrong guess is low-risk. LLM-based intent detection is PLANNED.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .tools import ToolRegistry


@dataclass(frozen=True)
class Intent:
    kind: str                       # "chat" or "tool"
    tool_name: str | None = None
    args: dict = field(default_factory=dict)


class RuleBasedIntentRouter:
    def __init__(self, registry: ToolRegistry):
        self._registry = registry

    def route(self, message: str) -> Intent:
        for tool in self._registry.all():
            for pattern in tool.spec.triggers:
                if re.search(pattern, message, re.IGNORECASE):
                    return Intent("tool", tool.spec.name, tool.infer_args(message))
        return Intent("chat")
