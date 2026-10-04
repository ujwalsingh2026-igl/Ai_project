"""Agentic Intent Router for Aegis.

Analyzes user messages and routes to either conversational AI or tool execution.
Combines:
1. Fast regex triggers for sub-millisecond deterministic execution of standard commands.
2. LLM-based autonomous tool selection and parameter extraction for natural language queries.
3. Robust heuristic semantic fallback when running offline or with basic models.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from .tools import ToolRegistry

if TYPE_CHECKING:
    from .providers.base import AIProvider

logger = logging.getLogger("core.intent")


@dataclass(frozen=True)
class Intent:
    kind: str                       # "chat" or "tool"
    tool_name: str | None = None
    args: dict = field(default_factory=dict)


class RuleBasedIntentRouter:
    """Deterministic regex-based router (original Phase 1 implementation)."""

    def __init__(self, registry: ToolRegistry):
        self._registry = registry

    def route(self, message: str) -> Intent:
        for tool in self._registry.all():
            for pattern in tool.spec.triggers:
                if re.search(pattern, message, re.IGNORECASE):
                    return Intent("tool", tool.spec.name, tool.infer_args(message))
        return Intent("chat")


class AgentIntentRouter:
    """Autonomous AI Agent Router with LLM-based tool calling and fast fallback."""

    def __init__(self, registry: ToolRegistry, provider: AIProvider | None = None):
        self._registry = registry
        self._provider = provider
        self._rule_router = RuleBasedIntentRouter(registry)

    def route(self, message: str) -> Intent:
        # 1. Fast direct trigger matching for instant response on standard commands
        fast_intent = self._rule_router.route(message)
        if fast_intent.kind == "tool":
            return fast_intent

        # 2. LLM-based agent reasoning if an active model provider is configured
        if self._provider and self._provider.name != "echo":
            try:
                llm_intent = self._route_with_llm(message)
                if llm_intent is not None:
                    return llm_intent
            except Exception as exc:
                logger.warning(f"LLM tool routing failed, falling back to heuristics: {exc}")

        # 3. Semantic keyword heuristics fallback
        heuristic_intent = self._heuristic_match(message)
        if heuristic_intent is not None:
            return heuristic_intent

        return Intent("chat")

    def _route_with_llm(self, message: str) -> Intent | None:
        """Prompts the LLM to select an appropriate tool and extract arguments in JSON."""
        from .providers.base import ChatMessage

        tools_desc = []
        for t in self._registry.all():
            spec = t.spec
            tools_desc.append({
                "name": spec.name,
                "description": spec.description,
                "input_schema": spec.input_schema,
            })

        system_instruction = (
            "You are the intent analyzer and tool selection engine for Aegis AI Command Center.\n"
            "Given the user's message and the list of available tools, determine if a tool should be executed.\n\n"
            "AVAILABLE TOOLS:\n"
            + json.dumps(tools_desc, indent=1) + "\n\n"
            "RULES:\n"
            "1. If the user is asking to perform an action, inspect system status, check ports, scan files, "
            "manage tasks, or recall memory, choose the best matching tool.\n"
            "2. If the user is having a general conversation, asking for programming help, or asking a general question, "
            "choose 'chat'.\n"
            "3. Output MUST be strictly valid JSON without markdown fences:\n"
            '   {"intent": "tool", "tool": "<tool_name>", "args": {<extracted args>}}\n'
            '   OR {"intent": "chat"}\n'
        )

        resp = self._provider.generate(
            [ChatMessage("user", message)],
            system=system_instruction,
        )

        raw = resp.text.strip()
        # Strip potential markdown fences
        if "```" in raw:
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        # Attempt to parse json
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                if data.get("intent") == "tool" and data.get("tool"):
                    tool_name = data["tool"]
                    if self._registry.get(tool_name):
                        args = data.get("args") if isinstance(data.get("args"), dict) else {}
                        return Intent("tool", tool_name, args)
                elif data.get("intent") == "chat":
                    return Intent("chat")
        except json.JSONDecodeError:
            # Fall back to finding a JSON block inside the text
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(0))
                    if data.get("intent") == "tool" and data.get("tool"):
                        tool_name = data["tool"]
                        if self._registry.get(tool_name):
                            args = data.get("args") if isinstance(data.get("args"), dict) else {}
                            return Intent("tool", tool_name, args)
                except Exception:
                    pass

        return None

    def _heuristic_match(self, message: str) -> Intent | None:
        """High-precision keyword matching for natural requests."""
        lower = message.lower()

        # Security & Ports
        if any(k in lower for k in ["listening port", "open port", "what ports", "active sockets", "check ports"]):
            if self._registry.get("security_listening_ports"):
                return Intent("tool", "security_listening_ports", {})

        if any(k in lower for k in ["posture", "security score", "hardening audit", "how secure"]):
            if self._registry.get("security_posture_eval"):
                return Intent("tool", "security_posture_eval", {})

        if any(k in lower for k in ["suspicious process", "process anomalies", "running processes", "check processes"]):
            if self._registry.get("security_process_inspect"):
                return Intent("tool", "security_process_inspect", {})

        if any(k in lower for k in ["threat detection", "threat scan", "detect threats", "check for intrusions"]):
            if self._registry.get("security_run_threat_detection"):
                return Intent("tool", "security_run_threat_detection", {})

        # Network
        if any(k in lower for k in ["who is on my network", "scan network", "connected devices", "arp scan"]):
            if self._registry.get("network_scan_devices"):
                return Intent("tool", "network_scan_devices", {})

        if any(k in lower for k in ["network summary", "inventory summary", "device counts"]):
            if self._registry.get("network_inventory_summary"):
                return Intent("tool", "network_inventory_summary", {})

        # Planner
        if any(k in lower for k in ["daily brief", "what's my brief", "my briefing", "today's agenda"]):
            if self._registry.get("planner_daily_brief"):
                return Intent("tool", "planner_daily_brief", {})

        if any(k in lower for k in ["show my tasks", "list tasks", "what are my tasks", "view tasks"]):
            if self._registry.get("planner_task_list"):
                return Intent("tool", "planner_task_list", {})

        # Memory
        if any(k in lower for k in ["show memories", "what do you remember", "my preferences", "recall memory"]):
            if self._registry.get("memory_recall"):
                return Intent("tool", "memory_recall", {})

        # Medical Clinical Decision Support (Opus 5.5)
        if any(k in lower for k in ["disease info", "disease lookup", "what is the condition", "tell me about the disease"]):
            if self._registry.get("medical_disease_lookup"):
                tool = self._registry.get("medical_disease_lookup")
                return Intent("tool", "medical_disease_lookup", tool.infer_args(message))

        if any(k in lower for k in ["symptom", "triage", "differential diagnosis", "patient presents"]):
            if self._registry.get("medical_symptom_triage"):
                tool = self._registry.get("medical_symptom_triage")
                return Intent("tool", "medical_symptom_triage", tool.infer_args(message))

        if any(k in lower for k in ["drug interaction", "contraindication", "medication interaction"]):
            if self._registry.get("medical_drug_interaction"):
                tool = self._registry.get("medical_drug_interaction")
                return Intent("tool", "medical_drug_interaction", tool.infer_args(message))

        # E-Commerce & Business Analytics
        if any(k in lower for k in ["sales summary", "sales analytics", "revenue report", "profit margin"]):
            if self._registry.get("ecommerce_sales_summary"):
                tool = self._registry.get("ecommerce_sales_summary")
                return Intent("tool", "ecommerce_sales_summary", tool.infer_args(message))

        if any(k in lower for k in ["customer analytics", "customer metrics", "clv", "customer lifetime value", "repeat customer"]):
            if self._registry.get("ecommerce_customer_metrics"):
                tool = self._registry.get("ecommerce_customer_metrics")
                return Intent("tool", "ecommerce_customer_metrics", tool.infer_args(message))

        if any(k in lower for k in ["order lookup", "order status", "track order"]) or "ord-" in lower:
            if self._registry.get("ecommerce_order_lookup"):
                tool = self._registry.get("ecommerce_order_lookup")
                return Intent("tool", "ecommerce_order_lookup", tool.infer_args(message))

        # Defensive Cybersecurity & Benchmarks (NSL-KDD, FWAF, EMBER)
        if any(k in lower for k in ["threat signature", "mitre attack", "threat profile", "cve lookup", "explain threat", "explain attack", "syn flood", "neptune attack"]):
            if self._registry.get("cybersecurity_threat_lookup"):
                tool = self._registry.get("cybersecurity_threat_lookup")
                return Intent("tool", "cybersecurity_threat_lookup", tool.infer_args(message))

        if any(k in lower for k in ["network anomaly", "detect intrusion", "network telemetry", "traffic anomaly", "nsl-kdd"]):
            if self._registry.get("network_anomaly_detector"):
                tool = self._registry.get("network_anomaly_detector")
                return Intent("tool", "network_anomaly_detector", tool.infer_args(message))

        if any(k in lower for k in ["waf payload", "inspect payload", "check sqli", "check xss", "analyze query", "malicious payload"]):
            if self._registry.get("waf_payload_analyzer"):
                tool = self._registry.get("waf_payload_analyzer")
                return Intent("tool", "waf_payload_analyzer", tool.infer_args(message))

        if any(k in lower for k in ["cybersecurity dataset", "security benchmark", "ml security dataset", "dataset catalog"]):
            if self._registry.get("cybersecurity_dataset_catalog"):
                tool = self._registry.get("cybersecurity_dataset_catalog")
                return Intent("tool", "cybersecurity_dataset_catalog", tool.infer_args(message))

        return None

