"""Unit tests for AgentIntentRouter (LLM function calling & heuristic routing)."""
import json
import unittest
from unittest.mock import MagicMock

from core.builtin_tools.system_information import SystemInformationTool
from core.intent import AgentIntentRouter, Intent
from core.providers.base import AIProvider, ChatMessage, ProviderResponse
from core.tools import ToolRegistry, ToolSpec


class DummyMockTool:
    def __init__(self, name: str, description: str, triggers: list[str]):
        self.spec = ToolSpec(
            name=name,
            description=description,
            risk_level=0,
            required_permission=f"test.{name}",
            input_schema={"type": "object", "properties": {"target": {"type": "string"}}},
            output_schema={"type": "object"},
            allowed_operations=["read"],
            triggers=triggers,
        )

    def infer_args(self, message: str) -> dict:
        return {}



class MockProvider(AIProvider):
    name = "mock"

    def __init__(self, canned_text: str):
        self.canned_text = canned_text
        self.last_system = None
        self.last_messages = None

    def generate(self, messages: list[ChatMessage], *, system: str | None = None) -> ProviderResponse:
        self.last_system = system
        self.last_messages = messages
        return ProviderResponse(text=self.canned_text, provider="mock", model="test-model")


class AgentIntentRouterTests(unittest.TestCase):
    def setUp(self):
        self.registry = ToolRegistry()
        self.registry.register(SystemInformationTool())
        self.registry.register(DummyMockTool("security_listening_ports", "List open listening sockets", [r"^listening ports$"]))
        self.registry.register(DummyMockTool("network_scan_devices", "Scan devices on network", [r"^scan devices$"]))
        self.registry.register(DummyMockTool("planner_daily_brief", "Daily brief of tasks and security", [r"^daily brief$"]))

    def test_fast_direct_trigger(self):
        router = AgentIntentRouter(self.registry)
        intent = router.route("What system am I running?")
        self.assertEqual(intent.kind, "tool")
        self.assertEqual(intent.tool_name, "system_information")

    def test_heuristic_fallback_matching(self):
        router = AgentIntentRouter(self.registry)
        # Ports natural question
        intent = router.route("What listening ports are currently open on my system?")
        self.assertEqual(intent.kind, "tool")
        self.assertEqual(intent.tool_name, "security_listening_ports")

        # Network devices question
        intent = router.route("Can you tell me who is on my network?")
        self.assertEqual(intent.kind, "tool")
        self.assertEqual(intent.tool_name, "network_scan_devices")

        # Daily brief question
        intent = router.route("Show me my briefing for today")
        self.assertEqual(intent.kind, "tool")
        self.assertEqual(intent.tool_name, "planner_daily_brief")

    def test_llm_routes_to_tool(self):
        provider = MockProvider(json.dumps({
            "intent": "tool",
            "tool": "security_listening_ports",
            "args": {"target": "0.0.0.0"}
        }))
        router = AgentIntentRouter(self.registry, provider)
        intent = router.route("I suspect an unauthorized server is running, check open sockets please")
        self.assertEqual(intent.kind, "tool")
        self.assertEqual(intent.tool_name, "security_listening_ports")
        self.assertEqual(intent.args, {"target": "0.0.0.0"})

    def test_llm_routes_to_chat(self):
        provider = MockProvider(json.dumps({"intent": "chat"}))
        router = AgentIntentRouter(self.registry, provider)
        intent = router.route("Explain how public-key cryptography works in simple terms")
        self.assertEqual(intent.kind, "chat")
        self.assertIsNone(intent.tool_name)

    def test_llm_malformed_json_falls_back_gracefully(self):
        provider = MockProvider("Sorry, I don't know how to format JSON.")
        router = AgentIntentRouter(self.registry, provider)
        intent = router.route("Can you write a poem about firewalls?")
        self.assertEqual(intent.kind, "chat")


if __name__ == "__main__":
    unittest.main()
