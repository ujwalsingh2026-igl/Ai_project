"""Django ORM adapter for PlannerStore protocol."""
from __future__ import annotations

import datetime
from typing import Any

from core.builtin_tools.learning_data import get_daily_learning_tips
from core.builtin_tools.planner import PlannerStore

from .models import Reminder, Task


class DjangoPlannerStore:
    """Implements core.builtin_tools.planner.PlannerStore using Django models."""

    def list_tasks(self, user_id: Any, status: str | None = None) -> list[dict]:
        qs = Task.objects.filter(user_id=user_id)
        if status and status != "all":
            qs = qs.filter(status=status)
        qs = qs.order_by("status", "due_date", "-created_at")[:100]

        return [
            {
                "id": t.id,
                "title": t.title,
                "priority": t.priority,
                "status": t.status,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "tags": t.tags,
                "created_at": t.created_at.isoformat(),
            }
            for t in qs
        ]

    def add_task(
        self,
        user_id: Any,
        title: str,
        priority: str = "medium",
        due_date: str | None = None,
        tags: list[str] | None = None,
    ) -> dict:
        parsed_due = None
        if due_date:
            try:
                parsed_due = datetime.datetime.fromisoformat(due_date)
            except ValueError:
                parsed_due = None

        task = Task.objects.create(
            user_id=user_id,
            title=title,
            priority=priority,
            status=Task.Status.PENDING,
            due_date=parsed_due,
            tags=tags or [],
        )
        return {
            "id": task.id,
            "title": task.title,
            "priority": task.priority,
            "status": task.status,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "tags": task.tags,
            "created_at": task.created_at.isoformat(),
        }

    def get_daily_brief(self, user_id: Any) -> dict:
        pending_count = Task.objects.filter(user_id=user_id, status=Task.Status.PENDING).count()
        reminders_count = Reminder.objects.filter(user_id=user_id, delivered=False).count()
        tips = get_daily_learning_tips()

        return {
            "date": datetime.date.today().isoformat(),
            "tasks_pending": pending_count,
            "reminders_count": reminders_count,
            "terminal_shortcut": f"{tips['terminal_shortcut']['command']}: {tips['terminal_shortcut']['description']}",
            "security_tip": f"{tips['security_tip']['title']}: {tips['security_tip']['tip']}",
            "python_tip": f"{tips['python_tip']['title']}: {tips['python_tip']['tip']}",
        }
