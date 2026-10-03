"""Unit tests for core planner tools (pure Python, no Django)."""
import unittest

from core.builtin_tools.planner import (
    InMemoryPlannerStore,
    PlannerDailyBriefTool,
    PlannerTaskAddTool,
    PlannerTaskListTool,
)
from core.intent import RuleBasedIntentRouter
from core.permissions import Decision, PermissionContext, PermissionEngine, RiskLevel
from core.tools import OutcomeStatus, ToolExecutor, ToolRegistry


class PlannerToolsTests(unittest.TestCase):
    def setUp(self):
        self.store = InMemoryPlannerStore()
        self.list_tool = PlannerTaskListTool(self.store)
        self.add_tool = PlannerTaskAddTool(self.store)
        self.brief_tool = PlannerDailyBriefTool(self.store)

        self.registry = ToolRegistry()
        self.registry.register(self.list_tool)
        self.registry.register(self.add_tool)
        self.registry.register(self.brief_tool)

        self.engine = PermissionEngine()
        self.executor = ToolExecutor(self.registry, self.engine)
        self.router = RuleBasedIntentRouter(self.registry)
        self.context = PermissionContext(user_id=42)

    def test_add_task_and_list_tasks(self):
        # 1. Add a task
        add_outcome = self.executor.execute(
            "planner_task_add",
            {"title": "Review firewall rules", "priority": "high"},
            self.context,
        )
        self.assertEqual(add_outcome.status, OutcomeStatus.EXECUTED)
        self.assertEqual(add_outcome.decision, Decision.ALLOW)
        self.assertTrue(add_outcome.result["created"])
        self.assertEqual(add_outcome.result["task"]["title"], "Review firewall rules")
        self.assertIn("Review firewall rules", add_outcome.summary)

        # 2. List tasks
        list_outcome = self.executor.execute(
            "planner_task_list",
            {"status": "pending"},
            self.context,
        )
        self.assertEqual(list_outcome.status, OutcomeStatus.EXECUTED)
        self.assertEqual(list_outcome.result["count"], 1)
        self.assertEqual(list_outcome.result["tasks"][0]["title"], "Review firewall rules")
        self.assertIn("[ ] (HIGH) Review firewall rules", list_outcome.summary)

    def test_user_isolation_in_store(self):
        self.store.add_task(user_id=1, title="User 1 Task")
        self.store.add_task(user_id=2, title="User 2 Task")

        tasks_user1 = self.store.list_tasks(user_id=1)
        tasks_user2 = self.store.list_tasks(user_id=2)

        self.assertEqual(len(tasks_user1), 1)
        self.assertEqual(tasks_user1[0]["title"], "User 1 Task")
        self.assertEqual(len(tasks_user2), 1)
        self.assertEqual(tasks_user2[0]["title"], "User 2 Task")

    def test_daily_brief_tool(self):
        self.store.add_task(user_id=42, title="Morning audit")
        brief_outcome = self.executor.execute(
            "planner_daily_brief",
            {},
            self.context,
        )
        self.assertEqual(brief_outcome.status, OutcomeStatus.EXECUTED)
        self.assertEqual(brief_outcome.result["tasks_pending"], 1)
        self.assertTrue(len(brief_outcome.result["terminal_shortcut"]) > 0)
        self.assertTrue(len(brief_outcome.result["security_tip"]) > 0)
        self.assertTrue(len(brief_outcome.result["python_tip"]) > 0)
        self.assertIn("Daily Brief for", brief_outcome.summary)

    def test_intent_routing_for_planner(self):
        # List tasks triggers
        intent1 = self.router.route("what are my tasks for today?")
        self.assertEqual(intent1.kind, "tool")
        self.assertEqual(intent1.tool_name, "planner_task_list")

        # Add task triggers
        intent2 = self.router.route("add task urgent: patch openvpn vulnerability")
        self.assertEqual(intent2.kind, "tool")
        self.assertEqual(intent2.tool_name, "planner_task_add")
        self.assertEqual(intent2.args["priority"], "high")
        self.assertIn("patch openvpn vulnerability", intent2.args["title"])

        # Brief triggers
        intent3 = self.router.route("show me my daily brief")
        self.assertEqual(intent3.kind, "tool")
        self.assertEqual(intent3.tool_name, "planner_daily_brief")


if __name__ == "__main__":
    unittest.main()
