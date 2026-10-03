from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Note, Reminder, Task

User = get_user_model()


class PlannerAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="password123")
        self.other_user = User.objects.create_user(username="bob", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_unauthenticated_access_denied(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/planner/tasks/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_task_crud_and_user_isolation(self):
        # 1. Create task
        res = self.client.post("/api/planner/tasks/", {
            "title": "Configure local firewall",
            "priority": "high",
            "tags": ["security", "network"],
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        task_id = res.data["id"]
        self.assertEqual(res.data["title"], "Configure local firewall")
        self.assertEqual(res.data["priority"], "high")
        self.assertEqual(res.data["status"], "pending")

        # 2. List tasks
        res = self.client.get("/api/planner/tasks/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

        # 3. Patch task (mark completed)
        res = self.client.patch(f"/api/planner/tasks/{task_id}/", {"status": "completed"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "completed")

        # 4. Filter by status
        res = self.client.get("/api/planner/tasks/?status=pending")
        self.assertEqual(len(res.data), 0)
        res = self.client.get("/api/planner/tasks/?status=completed")
        self.assertEqual(len(res.data), 1)

        # 5. Isolation: bob cannot view or patch alice's task
        self.client.force_authenticate(user=self.other_user)
        res = self.client.get(f"/api/planner/tasks/{task_id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        res = self.client.patch(f"/api/planner/tasks/{task_id}/", {"title": "Hacked"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # 6. Delete task as alice
        self.client.force_authenticate(user=self.user)
        res = self.client.delete(f"/api/planner/tasks/{task_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Task.objects.count(), 0)

    def test_reminder_crud(self):
        due = timezone.now() + timedelta(hours=2)
        # 1. Create reminder
        res = self.client.post("/api/planner/reminders/", {
            "time": due.isoformat(),
            "message": "Review IDS alerts",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        rem_id = res.data["id"]
        self.assertEqual(res.data["delivered"], False)

        # 2. Patch reminder (delivered=True)
        res = self.client.patch(f"/api/planner/reminders/{rem_id}/", {"delivered": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["delivered"])

        # 3. Delete reminder
        res = self.client.delete(f"/api/planner/reminders/{rem_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Reminder.objects.count(), 0)

    def test_note_crud_and_search(self):
        # 1. Create notes
        self.client.post("/api/planner/notes/", {
            "title": "Firewall notes",
            "content": "# Port knocking\nNotes on defensive iptables.",
        }, format="json")
        self.client.post("/api/planner/notes/", {
            "title": "Python setup",
            "content": "Use venv and pip-audit.",
        }, format="json")

        # 2. Search notes
        res = self.client.get("/api/planner/notes/?q=iptables")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["title"], "Firewall notes")

    def test_daily_brief_endpoint(self):
        Task.objects.create(user=self.user, title="Pending Task", status=Task.Status.PENDING)
        Reminder.objects.create(user=self.user, time=timezone.now(), message="Test alert")

        res = self.client.get("/api/planner/brief/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["tasks_summary"]["pending"], 1)
        self.assertIn("terminal_shortcut", res.data["learning_tips"])
        self.assertIn("security_tip", res.data["learning_tips"])
        self.assertIn("python_tip", res.data["learning_tips"])
        self.assertEqual(res.data["security_alerts"]["status"], "nominal")

    def test_export_and_clear_all(self):
        Task.objects.create(user=self.user, title="Alice Task")
        Task.objects.create(user=self.other_user, title="Bob Task")
        Note.objects.create(user=self.user, title="Alice Note", content="Secret")

        # Export
        res = self.client.get("/api/planner/export/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["tasks"]), 1)
        self.assertEqual(len(res.data["notes"]), 1)

        # Clear
        res = self.client.post("/api/planner/clear/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "cleared")
        self.assertEqual(res.data["deleted"]["tasks"], 1)

        # Bob's task must still exist!
        self.assertEqual(Task.objects.filter(user=self.other_user).count(), 1)


class ToolRunEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_run_planner_task_add_via_tool_api(self):
        res = self.client.post("/api/tools/planner_task_add/run/", {
            "args": {"title": "Update SSL certificates", "priority": "high"}
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "executed")
        self.assertTrue(res.data["result"]["created"])
        self.assertIn("Update SSL certificates", res.data["summary"])

        # Check DB
        self.assertTrue(Task.objects.filter(user=self.user, title="Update SSL certificates").exists())

    def test_run_planner_task_list_via_tool_api(self):
        Task.objects.create(user=self.user, title="Task 1")
        res = self.client.post("/api/tools/planner_task_list/run/", {
            "args": {"status": "pending"}
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "executed")
        self.assertEqual(res.data["result"]["count"], 1)

    def test_run_planner_daily_brief_via_tool_api(self):
        res = self.client.post("/api/tools/planner_daily_brief/run/", {
            "args": {}
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "executed")
        self.assertIn("tasks_pending", res.data["result"])

    def test_run_unknown_tool_returns_404(self):
        res = self.client.post("/api/tools/nonexistent_tool/run/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
