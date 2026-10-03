import unittest

from core.permissions import PermissionContext, PermissionEngine
from core.tools import InMemoryAuditSink, OutcomeStatus, Tool, ToolExecutor, ToolRegistry, ToolSpec


class CountingTool(Tool):
    """Records whether run() was called, so tests can prove a denied tool did NOT run."""

    def __init__(self, level=0, perm="test.use", result=None, raises=False):
        self.calls = 0
        self._result = {"ok": True} if result is None else result
        self._raises = raises
        self.spec = ToolSpec(
            name="counting_tool", description="d", risk_level=level, required_permission=perm,
            input_schema={"type": "object", "properties": {"x": {"type": "integer"}}, "additionalProperties": False},
            output_schema={"type": "object", "required": ["ok"], "properties": {"ok": {"type": "boolean"}}},
            allowed_operations=("read",))

    def run(self, args):
        self.calls += 1
        if self._raises:
            raise RuntimeError("boom")
        return self._result

    def summarize(self, result):
        return "summary"


def make(tool):
    registry = ToolRegistry()
    registry.register(tool)
    audit = InMemoryAuditSink()
    return ToolExecutor(registry, PermissionEngine(), audit), audit


CTX = PermissionContext(user_id=7)


class ExecutorTests(unittest.TestCase):
    def test_allowed_tool_runs(self):
        tool = CountingTool(level=0)
        executor, audit = make(tool)
        out = executor.execute("counting_tool", {"x": 1}, CTX)
        self.assertEqual(out.status, OutcomeStatus.EXECUTED)
        self.assertEqual(tool.calls, 1)
        self.assertEqual(audit.events[0].status, "executed")
        self.assertEqual(audit.events[0].arg_names, ("x",))   # names only, no values

    def test_ask_decision_does_not_execute(self):
        tool = CountingTool(level=3)
        executor, audit = make(tool)
        out = executor.execute("counting_tool", {}, CTX)
        self.assertEqual(out.status, OutcomeStatus.NEEDS_APPROVAL)
        self.assertEqual(tool.calls, 0)

    def test_block_decision_does_not_execute(self):
        tool = CountingTool(level=5)
        executor, _ = make(tool)
        out = executor.execute("counting_tool", {}, CTX)
        self.assertEqual(out.status, OutcomeStatus.BLOCKED)
        self.assertEqual(tool.calls, 0)

    def test_revoked_permission_does_not_execute(self):
        tool = CountingTool(level=0)
        executor, _ = make(tool)
        ctx = PermissionContext(user_id=7, denied_permissions=frozenset({"test.use"}))
        self.assertEqual(executor.execute("counting_tool", {}, ctx).status, OutcomeStatus.BLOCKED)
        self.assertEqual(tool.calls, 0)

    def test_invalid_input_does_not_execute(self):
        tool = CountingTool(level=0)
        executor, _ = make(tool)
        out = executor.execute("counting_tool", {"x": "not-an-int"}, CTX)
        self.assertEqual(out.status, OutcomeStatus.INVALID_INPUT)
        self.assertEqual(tool.calls, 0)

    def test_unknown_tool_is_blocked_and_audited(self):
        executor, audit = make(CountingTool())
        out = executor.execute("does_not_exist", {}, CTX)
        self.assertEqual(out.status, OutcomeStatus.UNKNOWN_TOOL)
        self.assertEqual(audit.events[-1].status, "unknown_tool")

    def test_tool_exception_is_contained(self):
        executor, _ = make(CountingTool(level=0, raises=True))
        out = executor.execute("counting_tool", {}, CTX)
        self.assertEqual(out.status, OutcomeStatus.ERROR)
        self.assertNotIn("boom", out.reason)   # internal error text is not leaked

    def test_invalid_output_is_rejected(self):
        executor, _ = make(CountingTool(level=0, result={"wrong": 1}))
        self.assertEqual(executor.execute("counting_tool", {}, CTX).status, OutcomeStatus.ERROR)

    def test_duplicate_registration_fails(self):
        registry = ToolRegistry()
        registry.register(CountingTool())
        with self.assertRaises(ValueError):
            registry.register(CountingTool())

    def test_spec_validation(self):
        with self.assertRaises(ValueError):
            ToolSpec(name="Bad Name", description="d", risk_level=0, required_permission="a.b",
                     input_schema={}, output_schema={}, allowed_operations=("read",))
        with self.assertRaises(ValueError):
            ToolSpec(name="good_name", description="d", risk_level=0, required_permission="nodot",
                     input_schema={}, output_schema={}, allowed_operations=("read",))


if __name__ == "__main__":
    unittest.main()
