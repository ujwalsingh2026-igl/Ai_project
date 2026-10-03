from __future__ import annotations

from typing import Any

from django.db.models import Q

from apps.assistant.models import AssistantMemory
from core.builtin_tools.memory import MemoryStore


class DjangoMemoryStore:
    """Production Django ORM implementation of MemoryStore."""

    def list_memories(
        self,
        user_id: Any,
        category: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        qs = AssistantMemory.objects.filter(user_id=user_id)
        if category and category != "all":
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(Q(key__icontains=search) | Q(content__icontains=search))
        return [self._serialize(m) for m in qs]

    def get_memory(self, user_id: Any, memory_id: int) -> dict | None:
        try:
            m = AssistantMemory.objects.get(user_id=user_id, id=memory_id)
            return self._serialize(m)
        except AssistantMemory.DoesNotExist:
            return None

    def add_memory(
        self,
        user_id: Any,
        key: str,
        content: str,
        category: str = "preference",
        source: str = "explicit",
    ) -> dict:
        m = AssistantMemory.objects.create(
            user_id=user_id,
            key=key.strip(),
            content=content.strip(),
            category=category,
            source=source,
        )
        return self._serialize(m)

    def update_memory(
        self,
        user_id: Any,
        memory_id: int,
        key: str | None = None,
        content: str | None = None,
        category: str | None = None,
    ) -> dict | None:
        try:
            m = AssistantMemory.objects.get(user_id=user_id, id=memory_id)
            if key is not None:
                m.key = key.strip()
            if content is not None:
                m.content = content.strip()
            if category is not None:
                m.category = category
            m.save()
            return self._serialize(m)
        except AssistantMemory.DoesNotExist:
            return None

    def delete_memory(self, user_id: Any, memory_id: int) -> bool:
        deleted_count, _ = AssistantMemory.objects.filter(user_id=user_id, id=memory_id).delete()
        return deleted_count > 0

    def clear_memories(self, user_id: Any) -> int:
        deleted_count, _ = AssistantMemory.objects.filter(user_id=user_id).delete()
        return deleted_count

    @staticmethod
    def _serialize(m: AssistantMemory) -> dict:
        return {
            "id": m.id,
            "user_id": m.user_id,
            "key": m.key,
            "content": m.content,
            "category": m.category,
            "source": m.source,
            "created_at": m.created_at.isoformat(),
            "updated_at": m.updated_at.isoformat(),
        }
