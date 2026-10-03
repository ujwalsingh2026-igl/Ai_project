import threading
import unittest
from datetime import datetime, timedelta, timezone

from core.approvals import ApprovalService, InMemoryApprovalStore
from core.builtin_tools.system_information import SystemInformationTool
from core.intent import RuleBasedIntentRouter
from core.orchestrator import Orchestrator
from core.permissions import Decision, PermissionContext, PermissionEngine, RiskLevel
from core.providers import AIProvider, ProviderResponse
from core.tools import InMemoryAuditSink, OutcomeStatus, Tool, ToolExecutor, ToolRegistry, ToolSpec


class CountingTool(Tool):
    """run() count proves whether the tool really executed."""

    def __init__(self, name="counting_tool", level=3):
        self.calls = 0
        self.last_args = None
        self.spec = ToolSpec(
            name=name, description="d", risk_level=level, required_permission="test.use",
            input_schema={"type": "object", "properties": {"x": {"type": "integer"}}, "additionalProperties": False},
            output_schema={"type": "object", "required": ["ok"], "properties": {"ok": {"type": "boolean"}}},
            allowed_operations=("read",))

    def run(self, args):
        self.calls += 1
        self.last_args = args
        return {"ok": True}

    def summarize(self, result):
        return "did the thing"


class Clock:
    def __init__(self):
        self.now = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self):
        return self.now


def build(level=3, ttl=300):
    tool = CountingTool(level=level)
    registry = ToolRegistry()
    registry.register(tool)
    audit = InMemoryAuditSink()
    executor = ToolExecutor(registry, PermissionEngine(), audit)
    clock = Clock()
    store = InMemoryApprovalStore(ttl_seconds=ttl, clock=clock)
    return tool, ApprovalService(store, executor), store, audit, clock


class ApprovalServiceTests(unittest.TestCase):
    def test_approve_runs_tool_once_with_stored_args(self):
        tool, service, _, audit, _ = build()
        action = service.request(1, "counting_tool", {"x": 5})
        self.assertEqual(tool.calls, 0)                       # requesting does NOT run it
        result = service.resolve(action.id, 1, approve=True)
        self.assertEqual(result.status, "executed")
        self.assertEqual((tool.calls, tool.last_args), (1, {"x": 5}))
        self.assertIn("did the thing", result.message)
        self.assertEqual(audit.events[-1].status, "executed")

    def test_deny_does_not_run_and_is_audited(self):
        tool, service, _, audit, _ = build()
        action = service.request(1, "counting_tool", {})
        result = service.resolve(action.id, 1, approve=False)
        self.assertEqual(result.status, "denied")
        self.assertEqual(tool.calls, 0)
        self.assertEqual((audit.events[-1].status, audit.events[-1].reason), ("blocked", "User denied the action."))

    def test_second_resolve_is_rejected(self):
        tool, service, _, _, _ = build()
        action = service.request(1, "counting_tool", {})
        service.resolve(action.id, 1, approve=True)
        again = service.resolve(action.id, 1, approve=True)
        self.assertEqual(again.status, "not_pending")
        self.assertEqual(tool.calls, 1)

    def test_deny_then_approve_does_not_run(self):
        tool, service, _, _, _ = build()
        action = service.request(1, "counting_tool", {})
        service.resolve(action.id, 1, approve=False)
        self.assertEqual(service.resolve(action.id, 1, approve=True).status, "not_pending")
        self.assertEqual(tool.calls, 0)

    def test_other_user_cannot_resolve(self):
        tool, service, store, _, _ = build()
        action = service.request(1, "counting_tool", {})
        self.assertEqual(service.resolve(action.id, 2, approve=True).status, "not_found")
        self.assertEqual(tool.calls, 0)
        self.assertEqual(store.get(action.id).status, "pending")   # attacker did not burn the owner's action

    def test_unknown_id(self):
        _, service, _, _, _ = build()
        self.assertEqual(service.resolve("nope", 1, approve=True).status, "not_found")

    def test_expired_action_does_not_run(self):
        tool, service, _, _, clock = build(ttl=60)
        action = service.request(1, "counting_tool", {})
        clock.now += timedelta(seconds=61)
        self.assertEqual(service.resolve(action.id, 1, approve=True).status, "expired")
        self.assertEqual(tool.calls, 0)

    def test_approval_does_not_unblock_level_5(self):
        tool, service, _, _, _ = build(level=5)
        action = service.request(1, "counting_tool", {})        # even if someone created it by mistake
        result = service.resolve(action.id, 1, approve=True)
        self.assertEqual(result.status, "blocked")
        self.assertEqual(tool.calls, 0)

    def test_revoked_permission_still_blocks_after_approval(self):
        tool, service, _, _, _ = build()
        action = service.request(1, "counting_tool", {})
        result = service.resolve(action.id, 1, approve=True, denied_permissions=frozenset({"test.use"}))
        self.assertEqual(result.status, "blocked")
        self.assertEqual(tool.calls, 0)

    def test_stored_args_are_revalidated(self):
        tool, service, _, _, _ = build()
        action = service.request(1, "counting_tool", {"x": "not-an-int"})
        self.assertEqual(service.resolve(action.id, 1, approve=True).status, "invalid_input")
        self.assertEqual(tool.calls, 0)

    def test_simultaneous_approvals_run_tool_only_once(self):
        tool, service, _, _, _ = build()
        action = service.request(1, "counting_tool", {})
        results = []
        barrier = threading.Barrier(10)

        def worker():
            barrier.wait()
            results.append(service.resolve(action.id, 1, approve=True).status)

        threads = [threading.Thread(target=worker) for _ in range(10)]
        [t.start() for t in threads]
        [t.join() for t in threads]
        self.assertEqual(tool.calls, 1)
        self.assertEqual(results.count("executed"), 1)
        self.assertEqual(results.count("not_pending"), 9)


class _Provider(AIProvider):
    name = "rec"

    def __init__(self):
        self.calls = 0

    def generate(self, messages, *, system=None):
        self.calls += 1
        return ProviderResponse("ok", self.name, "m")


class OrchestratorApprovalTests(unittest.TestCase):
    def setUp(self):
        registry = ToolRegistry()
        registry.register(SystemInformationTool())
        self.audit = InMemoryAuditSink()
        # Make level 2 require approval, so the real tool exercises the flow.
        executor = ToolExecutor(registry, PermissionEngine({RiskLevel.DEVICE_INFO: Decision.ASK}), self.audit)
        self.store = InMemoryApprovalStore()
        self.service = ApprovalService(self.store, executor)
        self.provider = _Provider()
        self.orch = Orchestrator(self.provider, RuleBasedIntentRouter(registry), executor, approvals=self.service)

    def test_ask_creates_pending_action_and_does_not_run_tool(self):
        r = self.orch.handle("How much RAM do I have?", [], PermissionContext(user_id=1))
        self.assertEqual(r.tool_outcome.status, OutcomeStatus.NEEDS_APPROVAL)
        self.assertTrue(r.pending_action_id)
        self.assertIn(r.pending_action_id, r.reply)
        self.assertEqual(self.provider.calls, 0)
        self.assertNotIn("RAM:", r.reply)
        pending = self.store.get(r.pending_action_id)
        self.assertEqual((pending.user_id, pending.tool_name, pending.args), (1, "system_information", {"sections": ["memory"]}))
        self.assertEqual(r.metadata()["pending_action_id"], r.pending_action_id)

    def test_full_roundtrip_approve(self):
        r = self.orch.handle("What system am I running?", [], PermissionContext(user_id=1))
        result = self.service.resolve(r.pending_action_id, 1, approve=True)
        self.assertEqual(result.status, "executed")
        self.assertIn("OS:", result.message)
        self.assertEqual([e.status for e in self.audit.events], ["needs_approval", "executed"])

    def test_without_approval_service_message(self):
        registry = ToolRegistry()
        registry.register(SystemInformationTool())
        executor = ToolExecutor(registry, PermissionEngine({RiskLevel.DEVICE_INFO: Decision.ASK}))
        orch = Orchestrator(_Provider(), RuleBasedIntentRouter(registry), executor)
        r = orch.handle("What system am I running?", [], PermissionContext(user_id=1))
        self.assertIsNone(r.pending_action_id)
        self.assertIn("not configured", r.reply)


if __name__ == "__main__":
    unittest.main()
