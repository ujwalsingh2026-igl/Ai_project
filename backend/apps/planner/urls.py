from django.urls import path

from . import views

urlpatterns = [
    # Tasks
    path("tasks/", views.TaskListCreateView.as_view(), name="planner-task-list-create"),
    path("tasks/<int:pk>/", views.TaskDetailView.as_view(), name="planner-task-detail"),
    # Reminders
    path("reminders/", views.ReminderListCreateView.as_view(), name="planner-reminder-list-create"),
    path("reminders/<int:pk>/", views.ReminderDetailView.as_view(), name="planner-reminder-detail"),
    # Notes
    path("notes/", views.NoteListCreateView.as_view(), name="planner-note-list-create"),
    path("notes/<int:pk>/", views.NoteDetailView.as_view(), name="planner-note-detail"),
    # Daily brief, export, clear
    path("brief/", views.DailyBriefView.as_view(), name="planner-daily-brief"),
    path("export/", views.PlannerExportView.as_view(), name="planner-export"),
    path("clear/", views.PlannerClearView.as_view(), name="planner-clear"),
]
