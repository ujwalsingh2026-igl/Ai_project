import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)   # not guessable
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations")
    title = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["user", "-updated_at"])]

    def __str__(self):
        return self.title or str(self.id)


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user"
        ASSISTANT = "assistant"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)   # intent, tool, decision, provider...
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["conversation", "created_at"])]


class AssistantMemory(models.Model):
    class Category(models.TextChoices):
        PREFERENCE = "preference", "Preference"
        WORKFLOW = "workflow", "Workflow"
        PROJECT = "project", "Project"
        SECURITY_POLICY = "security_policy", "Security Policy"
        FACT = "fact", "Fact"

    class Source(models.TextChoices):
        EXPLICIT = "explicit", "Explicit"
        CHAT = "chat", "Chat"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assistant_memories")
    key = models.CharField(max_length=120, db_index=True)
    content = models.TextField()
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.PREFERENCE)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.EXPLICIT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "-updated_at"]),
            models.Index(fields=["user", "category"]),
        ]

    def __str__(self):
        return f"[{self.category}] {self.key}: {self.content[:40]}"

