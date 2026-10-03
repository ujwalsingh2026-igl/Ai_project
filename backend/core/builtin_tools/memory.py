"""Assistant Memory core tools: store, recall, and manage user preferences and facts.

Pure Python logic with no Django imports. Wires into storage via the MemoryStore protocol.
- memory_recall: RiskLevel.SAFE (0) -> ALLOW
- memory_store: RiskLevel.USER_DATA (1) -> ALLOW under default policy
"""
from __future__ import annotations

import datetime
import re
from typing import Any, Protocol

from ..permissions import PermissionContext, RiskLevel
from ..tools import Tool, ToolSpec


class MemoryStore(Protocol):
    """Protocol decoupling memory tools from the database."""

    def list_memories(
        self,
        user_id: Any,
        category: str | None = None,
        search: str | None = None,
    ) -> list[dict]: ...

    def get_memory(self, user_id: Any, memory_id: int) -> dict | None: ...

    def add_memory(
        self,
        user_id: Any,
        key: str,
        content: str,
        category: str = "preference",
        source: str = "explicit",
    ) -> dict: ...

    def update_memory(
        self,
        user_id: Any,
        memory_id: int,
        key: str | None = None,
        content: str | None = None,
        category: str | None = None,
    ) -> dict | None: ...

    def delete_memory(self, user_id: Any, memory_id: int) -> bool: ...

    def clear_memories(self, user_id: Any) -> int: ...


class InMemoryMemoryStore:
    """In-memory implementation of MemoryStore for pure-Python unittests."""

    def __init__(self):
        self._memories: list[dict] = []
        self._next_id = 1

    def list_memories(
        self,
        user_id: Any,
        category: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        results = [m for m in self._memories if m.get("user_id") == user_id]
        if category and category != "all":
            results = [m for m in results if m.get("category") == category]
        if search:
            q = search.lower()
            results = [
                m for m in results
                if q in m.get("key", "").lower() or q in m.get("content", "").lower()
            ]
        return sorted(results, key=lambda m: m.get("updated_at", ""), reverse=True)

    def get_memory(self, user_id: Any, memory_id: int) -> dict | None:
        for m in self._memories:
            if m.get("user_id") == user_id and m.get("id") == memory_id:
                return m
        return None

    def add_memory(
        self,
        user_id: Any,
        key: str,
        content: str,
        category: str = "preference",
        source: str = "explicit",
    ) -> dict:
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        memory = {
            "id": self._next_id,
            "user_id": user_id,
            "key": key.strip(),
            "content": content.strip(),
            "category": category,
            "source": source,
            "created_at": now_str,
            "updated_at": now_str,
        }
        self._next_id += 1
        self._memories.append(memory)
        return memory

    def update_memory(
        self,
        user_id: Any,
        memory_id: int,
        key: str | None = None,
        content: str | None = None,
        category: str | None = None,
    ) -> dict | None:
        mem = self.get_memory(user_id, memory_id)
        if not mem:
            return None
        if key is not None:
            mem["key"] = key.strip()
        if content is not None:
            mem["content"] = content.strip()
        if category is not None:
            mem["category"] = category
        mem["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return mem

    def delete_memory(self, user_id: Any, memory_id: int) -> bool:
        before = len(self._memories)
        self._memories = [
            m for m in self._memories
            if not (m.get("user_id") == user_id and m.get("id") == memory_id)
        ]
        return len(self._memories) < before

    def clear_memories(self, user_id: Any) -> int:
        initial = len(self._memories)
        self._memories = [m for m in self._memories if m.get("user_id") != user_id]
        return initial - len(self._memories)


class MemoryStoreTool(Tool):
    spec = ToolSpec(
        name="memory_store",
        description="Store a user preference, project fact, or workflow rule into assistant memory.",
        risk_level=RiskLevel.SAFE,
        required_permission="assistant.memory.write",
        input_schema={
            "type": "object",
            "properties": {
                "key": {"type": "string", "maxLength": 120},
                "content": {"type": "string"},
                "category": {
                    "type": "string",
                    "enum": ["preference", "workflow", "project", "security_policy", "fact"],
                },
            },
            "required": ["key", "content"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "memory": {"type": "object"},
                "stored": {"type": "boolean"},
            },
            "required": ["memory", "stored"],
            "additionalProperties": False,
        },
        allowed_operations=("create",),
        triggers=(
            r"\b(remember\s+that|save\s+memory|store\s+memory|remember\s+this|save\s+preference|set\s+preference)\b",
        ),
    )

    def __init__(self, store: MemoryStore):
        self._store = store

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        user_id = context.user_id if context else None
        key = args["key"].strip()
        content = args["content"].strip()
        category = args.get("category", "preference")
        memory = self._store.add_memory(
            user_id=user_id,
            key=key,
            content=content,
            category=category,
            source="chat",
        )
        return {"memory": memory, "stored": True}

    def infer_args(self, message: str) -> dict:
        # Example: "remember that I prefer dark theme and python"
        # Example: "remember that homelab subnet is 192.168.1.0/24"
        match = re.search(
            r"\b(?:remember\s+that|save\s+memory|store\s+memory|remember\s+this|save\s+preference|set\s+preference)[:\s]+(.+)",
            message,
            re.IGNORECASE,
        )
        raw = match.group(1).strip() if match else message.strip()

        # Categorize
        category = "preference"
        m_lower = raw.lower()
        if any(w in m_lower for w in ("subnet", "ip", "port", "firewall", "security", "threat")):
            category = "security_policy"
        elif any(w in m_lower for w in ("workflow", "deploy", "build", "pipeline", "git")):
            category = "workflow"
        elif any(w in m_lower for w in ("project", "repo", "stack", "architecture")):
            category = "project"

        # Generate a concise key
        words = raw.split()
        key_words = words[:4]
        key = " ".join(key_words).rstrip(".,;:")

        return {
            "key": key if key else "User Preference",
            "content": raw,
            "category": category,
        }

    def summarize(self, result: dict) -> str:
        mem = result.get("memory", {})
        return f"Stored in assistant memory: [{mem.get('category', 'preference').upper()}] {mem.get('key')}: '{mem.get('content')}'."


class MemoryRecallTool(Tool):
    spec = ToolSpec(
        name="memory_recall",
        description="Recall stored preferences, workflow rules, or facts from assistant memory.",
        risk_level=RiskLevel.SAFE,
        required_permission="assistant.memory.read",
        input_schema={
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["all", "preference", "workflow", "project", "security_policy", "fact"],
                },
                "search": {"type": "string"},
            },
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "memories": {"type": "array"},
                "count": {"type": "integer"},
            },
            "required": ["memories", "count"],
            "additionalProperties": False,
        },
        allowed_operations=("read",),
        triggers=(
            r"\b(what\s+do\s+you\s+remember|recall\s+memory|list\s+memories|show\s+memories|my\s+memories|my\s+preferences)\b",
        ),
    )

    def __init__(self, store: MemoryStore):
        self._store = store

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        user_id = context.user_id if context else None
        category = args.get("category", "all")
        search = args.get("search")
        memories = self._store.list_memories(user_id=user_id, category=category, search=search)
        return {"memories": memories, "count": len(memories)}

    def infer_args(self, message: str) -> dict:
        m = message.lower()
        if "security" in m:
            return {"category": "security_policy"}
        if "workflow" in m:
            return {"category": "workflow"}
        if "project" in m:
            return {"category": "project"}
        if "preference" in m:
            return {"category": "preference"}
        return {"category": "all"}

    def summarize(self, result: dict) -> str:
        count = result.get("count", 0)
        memories = result.get("memories", [])
        if count == 0:
            return "No stored memories found for your account."
        lines = [f"I have {count} memory item(s) on file for you:"]
        for m in memories:
            cat = m.get("category", "preference").upper()
            lines.append(f"- [{cat}] {m.get('key')}: {m.get('content')}")
        return "\n".join(lines)
