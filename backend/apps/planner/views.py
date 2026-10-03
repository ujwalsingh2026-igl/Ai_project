import datetime
import platform
import shutil
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.builtin_tools.learning_data import get_daily_learning_tips

from .models import Note, Reminder, Task
from .serializers import NoteSerializer, ReminderSerializer, TaskSerializer

try:
    import psutil
except ImportError:
    psutil = None


class TaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Task.objects.filter(user=request.user)
        status_param = request.query_params.get("status")
        if status_param and status_param != "all":
            qs = qs.filter(status=status_param)
        priority_param = request.query_params.get("priority")
        if priority_param:
            qs = qs.filter(priority=priority_param)
        return Response(TaskSerializer(qs, many=True).data)

    def post(self, request):
        ser = TaskSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        task = ser.save(user=request.user)
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user)
        return Response(TaskSerializer(task).data)

    def patch(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user)
        ser = TaskSerializer(task, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReminderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Reminder.objects.filter(user=request.user)
        delivered_param = request.query_params.get("delivered")
        if delivered_param is not None:
            is_delivered = delivered_param.lower() in ("true", "1")
            qs = qs.filter(delivered=is_delivered)
        return Response(ReminderSerializer(qs, many=True).data)

    def post(self, request):
        ser = ReminderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        reminder = ser.save(user=request.user)
        return Response(ReminderSerializer(reminder).data, status=status.HTTP_201_CREATED)


class ReminderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        reminder = get_object_or_404(Reminder, pk=pk, user=request.user)
        ser = ReminderSerializer(reminder, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        reminder = get_object_or_404(Reminder, pk=pk, user=request.user)
        reminder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Note.objects.filter(user=request.user)
        query = request.query_params.get("q")
        if query:
            qs = qs.filter(title__icontains=query) | qs.filter(content__icontains=query)
        return Response(NoteSerializer(qs, many=True).data)

    def post(self, request):
        ser = NoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        note = ser.save(user=request.user)
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)


class NoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        note = get_object_or_404(Note, pk=pk, user=request.user)
        return Response(NoteSerializer(note).data)

    def patch(self, request, pk):
        note = get_object_or_404(Note, pk=pk, user=request.user)
        ser = NoteSerializer(note, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        note = get_object_or_404(Note, pk=pk, user=request.user)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DailyBriefView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        tasks = Task.objects.filter(user=request.user)
        total_tasks = tasks.count()
        pending_tasks = tasks.filter(status=Task.Status.PENDING).count()
        completed_tasks = tasks.filter(status=Task.Status.COMPLETED).count()
        overdue_tasks = tasks.filter(status=Task.Status.PENDING, due_date__lt=now).count()

        # Reminders active or due soon
        reminders = Reminder.objects.filter(user=request.user, delivered=False)[:10]

        # System health overview
        sys_status = {
            "os": f"{platform.system()} {platform.release()}",
            "cpu_usage": psutil.cpu_percent(interval=None) if psutil else None,
            "ram_usage": psutil.virtual_memory().percent if psutil else None,
            "status": "healthy",
        }

        # Security alerts posture
        security_alerts = {
            "open_count": 0,
            "status": "nominal",
            "message": "Defensive posture normal. 0 active security alerts.",
        }

        # Daily tips
        tips = get_daily_learning_tips()

        return Response({
            "date": datetime.date.today().isoformat(),
            "tasks_summary": {
                "total": total_tasks,
                "pending": pending_tasks,
                "completed": completed_tasks,
                "overdue": overdue_tasks,
            },
            "today_tasks": TaskSerializer(tasks[:15], many=True).data,
            "upcoming_reminders": ReminderSerializer(reminders, many=True).data,
            "security_alerts": security_alerts,
            "system_status": sys_status,
            "learning_tips": tips,
        })


class PlannerExportView(APIView):
    """Export all user tasks, reminders, and notes as a local JSON document."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = Task.objects.filter(user=request.user)
        reminders = Reminder.objects.filter(user=request.user)
        notes = Note.objects.filter(user=request.user)

        data = {
            "exported_at": timezone.now().isoformat(),
            "user_id": str(request.user.pk),
            "tasks": TaskSerializer(tasks, many=True).data,
            "reminders": ReminderSerializer(reminders, many=True).data,
            "notes": NoteSerializer(notes, many=True).data,
        }
        return Response(data)


class PlannerClearView(APIView):
    """Clear all planner data (tasks, reminders, notes) for the authenticated user only."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        t_count, _ = Task.objects.filter(user=request.user).delete()
        r_count, _ = Reminder.objects.filter(user=request.user).delete()
        n_count, _ = Note.objects.filter(user=request.user).delete()

        return Response({
            "status": "cleared",
            "deleted": {
                "tasks": t_count,
                "reminders": r_count,
                "notes": n_count,
            },
        })
