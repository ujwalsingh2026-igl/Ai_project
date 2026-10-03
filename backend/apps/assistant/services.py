"""Wires the pure-Python core to Django (settings + database)."""
from django.conf import settings

from apps.assistant.store import DjangoMemoryStore
from apps.network.store import DjangoNetworkStore
from apps.permissions.approvals import DjangoApprovalStore
from apps.permissions.audit import DjangoAuditSink
from apps.planner.store import DjangoPlannerStore
from apps.security.store import DjangoFirewallStore, DjangoIncidentStore, DjangoQuarantineStore
from core.approvals import ApprovalService
from core.builtin_tools.file_scanner import (
    SecurityFileDeleteTool,
    SecurityFileQuarantineTool,
    SecurityFileRestoreTool,
    SecurityFileScanTool,
)
from core.builtin_tools.incident_response import (
    SecurityBlockIpTool,
    SecurityKillProcessTool,
    SecurityRunThreatDetectionTool,
)
from core.builtin_tools.memory import (
    MemoryRecallTool,
    MemoryStoreTool,
)
from core.builtin_tools.network import (
    NetworkDnsLookupTool,
    NetworkInventorySummaryTool,
    NetworkScanDevicesTool,
)
from core.builtin_tools.planner import (
    PlannerDailyBriefTool,
    PlannerTaskAddTool,
    PlannerTaskListTool,
)
from core.builtin_tools.security import (
    SecurityListeningPortsTool,
    SecurityPostureTool,
    SecurityProcessInspectTool,
    SecuritySelfTestTool,
)
from core.builtin_tools.system_information import SystemInformationTool
from core.intent import AgentIntentRouter, RuleBasedIntentRouter
from core.orchestrator import Orchestrator
from core.permissions import PermissionEngine
from core.providers import create_provider
from core.tools import ToolExecutor, ToolRegistry


def build_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(SystemInformationTool())     # new tools are registered HERE, nowhere else
    planner_store = DjangoPlannerStore()
    registry.register(PlannerTaskListTool(planner_store))
    registry.register(PlannerTaskAddTool(planner_store))
    registry.register(PlannerDailyBriefTool(planner_store))
    # Defensive Security Center tools (read-only, device info)
    registry.register(SecurityPostureTool())
    registry.register(SecurityProcessInspectTool())
    registry.register(SecurityListeningPortsTool())
    registry.register(SecuritySelfTestTool())
    # Network & DNS inventory tools (defensive only)
    network_store = DjangoNetworkStore()
    registry.register(NetworkScanDevicesTool(network_store))
    registry.register(NetworkDnsLookupTool())
    registry.register(NetworkInventorySummaryTool(network_store))
    # File Threat Scanner & Quarantine Vault (defensive only)
    quarantine_store = DjangoQuarantineStore()
    registry.register(SecurityFileScanTool())
    registry.register(SecurityFileQuarantineTool(quarantine_store))
    registry.register(SecurityFileRestoreTool(quarantine_store))
    registry.register(SecurityFileDeleteTool(quarantine_store))
    # Incident Response & Threat Detection (defensive only, Level 4 response mitigations)
    incident_store = DjangoIncidentStore()
    firewall_store = DjangoFirewallStore()
    registry.register(SecurityRunThreatDetectionTool(incident_store))
    registry.register(SecurityKillProcessTool(incident_store))
    registry.register(SecurityBlockIpTool(firewall_store, incident_store))
    # Assistant Memory & Preferences
    memory_store = DjangoMemoryStore()
    registry.register(MemoryStoreTool(memory_store))
    registry.register(MemoryRecallTool(memory_store))
    return registry


def _build_runtime():
    registry = build_registry()
    executor = ToolExecutor(registry, PermissionEngine(settings.PERMISSION_OVERRIDES), DjangoAuditSink())
    approvals = ApprovalService(DjangoApprovalStore(settings.APPROVAL_TTL_SECONDS), executor)
    return registry, executor, approvals


def build_tool_runtime():
    return _build_runtime()


def build_orchestrator() -> Orchestrator:
    registry, executor, approvals = _build_runtime()
    provider = create_provider(settings.AI_CONFIG)
    router = AgentIntentRouter(registry, provider)
    return Orchestrator(
        provider,
        router,
        executor,
        approvals=approvals,
        memory_store=DjangoMemoryStore(),
    )



def build_approval_service() -> ApprovalService:
    return _build_runtime()[2]
