import unittest

from core.builtin_tools.system_information import SystemInformationTool
from core.intent import RuleBasedIntentRouter
from core.orchestrator import Orchestrator
from core.permissions import PermissionContext, PermissionEngine
from core.providers import AIProvider, ChatMessage, EchoProvider, ProviderError, ProviderResponse
from core.tools import InMemoryAuditSink, OutcomeStatus, ToolExecutor, ToolRegistry


class FailingProvider(AIProvider):
    name = "failing"

    def generate(self, messages, *, system=None):
        raise ProviderError("down")


class RecordingProvider(AIProvider):
    name = "recording"

    def __init__(self):
        self.calls = []

    def generate(self, messages, *, system=None):
        self.calls.append((messages, system))
        return ProviderResponse("ok", self.name, "m")


def build(provider, engine=None):
    registry = ToolRegistry()
    registry.register(SystemInformationTool())
    audit = InMemoryAuditSink()
    executor = ToolExecutor(registry, engine or PermissionEngine(), audit)
    return Orchestrator(provider, RuleBasedIntentRouter(registry), executor), audit


CTX = PermissionContext(user_id=1)


class OrchestratorTests(unittest.TestCase):
    def test_plain_chat_goes_to_provider(self):
        orch, audit = build(EchoProvider())
        r = orch.handle("Explain what a Python list is", [], CTX)
        self.assertEqual(r.intent, "chat")
        self.assertIn("Python list", r.reply)
        self.assertEqual(audit.events, [])          # no tool, no audit

    def test_history_is_sent_to_provider(self):
        provider = RecordingProvider()
        orch, _ = build(provider)
        orch.handle("and in C?", [ChatMessage("user", "hi"), ChatMessage("assistant", "hello")], CTX)
        messages, system = provider.calls[0]
        self.assertEqual([m.content for m in messages], ["hi", "hello", "and in C?"])
        self.assertTrue(system)

    def test_system_question_runs_tool_through_permission_engine(self):
        provider = RecordingProvider()
        orch, audit = build(provider)
        r = orch.handle("What system am I running?", [], CTX)
        self.assertEqual(r.intent, "tool")
        self.assertEqual(r.tool_outcome.status, OutcomeStatus.EXECUTED)
        sent = provider.calls[0][0][-1].content
        self.assertIn("TOOL RESULT", sent)
        self.assertIn("OS:", sent)
        self.assertEqual(audit.events[0].tool_name, "system_information")
        self.assertEqual(r.metadata()["tool_status"], "executed")

    def test_revoked_permission_means_tool_not_run_and_provider_not_called(self):
        provider = RecordingProvider()
        orch, audit = build(provider)
        ctx = PermissionContext(user_id=1, denied_permissions=frozenset({"device.read"}))
        r = orch.handle("What system am I running?", [], ctx)
        self.assertEqual(r.tool_outcome.status, OutcomeStatus.BLOCKED)
        self.assertEqual(provider.calls, [])
        self.assertNotIn("OS:", r.reply)

    def test_needs_approval_message(self):
        from core.permissions import Decision, RiskLevel
        engine = PermissionEngine({RiskLevel.DEVICE_INFO: Decision.ASK})
        orch, _ = build(RecordingProvider(), engine)
        r = orch.handle("What system am I running?", [], CTX)
        self.assertEqual(r.tool_outcome.status, OutcomeStatus.NEEDS_APPROVAL)
        self.assertIn("not configured", r.reply)

    def test_provider_failure_after_tool_falls_back_to_raw_summary(self):
        orch, _ = build(FailingProvider())
        r = orch.handle("What system am I running?", [], CTX)
        self.assertIn("OS:", r.reply)

    def test_provider_failure_in_chat_propagates(self):
        orch, _ = build(FailingProvider())
        with self.assertRaises(ProviderError):
            orch.handle("hello there", [], CTX)

    def test_router_no_false_positives(self):
        orch, audit = build(RecordingProvider())
        for text in ["Explain how a CPU works", "Check whether my laptop has suspicious processes",
                     "Teach me about memory in C", "What is an operating system?"]:
            self.assertEqual(orch.handle(text, [], CTX).intent, "chat", text)
        self.assertEqual(audit.events, [])

    def test_router_true_positives(self):
        orch, _ = build(RecordingProvider())
        for text in ["What system am I running?", "show me my laptop specs", "how much RAM do I have?",
                     "what python version", "which OS is this"]:
            self.assertEqual(orch.handle(text, [], CTX).intent, "tool", text)


if __name__ == "__main__":
    unittest.main()
