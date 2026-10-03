from rest_framework import serializers

from .models import Note, Reminder, Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "due_date",
            "priority",
            "status",
            "tags",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Title cannot be empty.")
        return val


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ["id", "time", "message", "delivered", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_message(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Message cannot be empty.")
        return val


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "title", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Title cannot be empty.")
        return val
