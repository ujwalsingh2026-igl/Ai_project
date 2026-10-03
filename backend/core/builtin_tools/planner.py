"""Planner core tools: list tasks, add tasks, read daily brief.

Pure Python logic with no Django imports. Wires into storage via the PlannerStore protocol.
All tools operate at RiskLevel.SAFE (0) which evaluates to ALLOW under default policy.
"""
from __future__ import annotations

import datetime
import re
from typing import Any, Protocol

from ..permissions import PermissionContext, RiskLevel
from ..tools import Tool, ToolSpec
from .learning_data import get_daily_learning_tips


class PlannerStore(Protocol):
    """Protocol decoupling planner tools from the database."""

    def list_tasks(self, user_id: Any, status: str | None = None) -> list[dict]: ...

    def add_task(
        self,
        user_id: Any,
        title: str,
        priority: str = "medium",
        due_date: str | None = None,
        tags: list[str] | None = None,
    ) -> dict: ...

    def get_daily_brief(self, user_id: Any) -> dict: ...


class InMemoryPlannerStore:
    """In-memory implementation of PlannerStore for pure Python testing."""

    def __init__(self):
        self._tasks: list[dict] = []
        self._next_id = 1

    def list_tasks(self, user_id: Any, status: str | None = None) -> list[dict]:
        user_tasks = [t for t in self._tasks if t.get("user_id") == user_id]
        if status and status != "all":
            user_tasks = [t for t in user_tasks if t.get("status") == status]
        return user_tasks

    def add_task(
        self,
        user_id: Any,
        title: str,
        priority: str = "medium",
        due_date: str | None = None,
        tags: list[str] | None = None,
    ) -> dict:
        task = {
            "id": self._next_id,
            "user_id": user_id,
            "title": title,
            "priority": priority,
            "status": "pending",
            "due_date": due_date,
            "tags": tags or [],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self._next_id += 1
        self._tasks.append(task)
        return task

    def get_daily_brief(self, user_id: Any) -> dict:
        user_tasks = self.list_tasks(user_id)
        pending = [t for t in user_tasks if t.get("status") == "pending"]
        tips = get_daily_learning_tips()
        return {
            "date": datetime.date.today().isoformat(),
            "tasks_pending": len(pending),
            "reminders_count": 0,
            "terminal_shortcut": f"{tips['terminal_shortcut']['command']}: {tips['terminal_shortcut']['description']}",
            "security_tip": f"{tips['security_tip']['title']}: {tips['security_tip']['tip']}",
            "python_tip": f"{tips['python_tip']['title']}: {tips['python_tip']['tip']}",
        }


class PlannerTaskListTool(Tool):
    spec = ToolSpec(
        name="planner_task_list",
        description="List current tasks in the user's daily planner.",
        risk_level=RiskLevel.SAFE,
        required_permission="planner.read",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["pending", "completed", "all"]},
            },
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "tasks": {"type": "array"},
                "count": {"type": "integer"},
            },
            "required": ["tasks", "count"],
            "additionalProperties": False,
        },
        allowed_operations=("read",),
        triggers=(
            r"\b(my\s+tasks|list\s+tasks|show\s+tasks|what\s+are\s+my\s+tasks|pending\s+tasks|todo\s+list)\b",
        ),
    )

    def __init__(self, store: PlannerStore):
        self._store = store

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        user_id = context.user_id if context else None
        status = args.get("status", "pending")
        tasks = self._store.list_tasks(user_id, status=status)
        return {"tasks": tasks, "count": len(tasks)}

    def infer_args(self, message: str) -> dict:
        m = message.lower()
        if "completed" in m or "done" in m:
            return {"status": "completed"}
        if "all" in m:
            return {"status": "all"}
        return {"status": "pending"}

    def summarize(self, result: dict) -> str:
        count = result.get("count", 0)
        tasks = result.get("tasks", [])
        if not count:
            return "No tasks found in your planner."
        lines = [f"You have {count} task(s):"]
        for t in tasks:
            status_symbol = "[x]" if t.get("status") == "completed" else "[ ]"
            prio = t.get("priority", "medium").upper()
            lines.append(f"  {status_symbol} ({prio}) {t.get('title')}")
        return "\n".join(lines)


class PlannerTaskAddTool(Tool):
    spec = ToolSpec(
        name="planner_task_add",
        description="Add a new task to the user's daily planner.",
        risk_level=RiskLevel.SAFE,
        required_permission="planner.write",
        input_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "maxLength": 255},
                "priority": {"type": "string", "enum": ["low", "medium", "high"]},
            },
            "required": ["title"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "task": {"type": "object"},
                "created": {"type": "boolean"},
            },
            "required": ["task", "created"],
            "additionalProperties": False,
        },
        allowed_operations=("create",),
        triggers=(
            r"\b(add\s+task|create\s+task|new\s+task|add\s+a\s+task)\b",
        ),
    )

    def __init__(self, store: PlannerStore):
        self._store = store

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        user_id = context.user_id if context else None
        title = args["title"].strip()
        priority = args.get("priority", "medium")
        task = self._store.add_task(user_id=user_id, title=title, priority=priority)
        return {"task": task, "created": True}

    def infer_args(self, message: str) -> dict:
        # Extract title from phrases like "add task buy milk" or "new task high: review logs"
        match = re.search(r"\b(?:add\s+task|create\s+task|new\s+task|add\s+a\s+task)[:\s]+(.+)", message, re.IGNORECASE)
        if not match:
            return {"title": "New Task"}
        raw = match.group(1).strip()
        prio = "medium"
        if re.search(r"\b(urgent|critical|high)\b", raw, re.IGNORECASE):
            prio = "high"
            raw = re.sub(r"\b(priority\s+high|high\s+priority|urgent|critical|high:?)\b", "", raw, flags=re.IGNORECASE).strip()
        elif re.search(r"\b(low)\b", raw, re.IGNORECASE):
            prio = "low"
            raw = re.sub(r"\b(priority\s+low|low\s+priority|low:?)\b", "", raw, flags=re.IGNORECASE).strip()
        return {"title": raw or "New Task", "priority": prio}

    def summarize(self, result: dict) -> str:
        t = result.get("task", {})
        return f"Created task: '{t.get('title')}' (Priority: {t.get('priority')})."


class PlannerDailyBriefTool(Tool):
    spec = ToolSpec(
        name="planner_daily_brief",
        description="Read the daily brief summary including tasks, alerts, and learning tips.",
        risk_level=RiskLevel.SAFE,
        required_permission="planner.read",
        input_schema={
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "date": {"type": "string"},
                "tasks_pending": {"type": "integer"},
                "reminders_count": {"type": "integer"},
                "terminal_shortcut": {"type": "string"},
                "security_tip": {"type": "string"},
                "python_tip": {"type": "string"},
            },
            "required": ["date", "tasks_pending", "reminders_count", "terminal_shortcut", "security_tip", "python_tip"],
            "additionalProperties": False,
        },
        allowed_operations=("read",),
        triggers=(
            r"\b(daily\s+brief|my\s+brief|brief\s+me|morning\s+brief|today'?s\s+brief|what'?s\s+(my\s+|the\s+)?brief|what\s+is\s+my\s+brief)\b",
        ),
    )

    def __init__(self, store: PlannerStore):
        self._store = store

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        user_id = context.user_id if context else None
        return self._store.get_daily_brief(user_id)

    def summarize(self, result: dict) -> str:
        lines = [
            f"Daily Brief for {result['date']}:",
            f"- Pending Tasks: {result['tasks_pending']}",
            f"- Active Reminders: {result['reminders_count']}",
            f"- Terminal Tip: {result['terminal_shortcut']}",
            f"- Security Tip: {result['security_tip']}",
            f"- Python Tip: {result['python_tip']}",
        ]
        return "\n".join(lines)
