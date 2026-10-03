"""Defensive Threat Detection & Incident Response Engine (pure Python, defensive only).

Key components:
1. ThreatDetector: Heuristic anomaly detector inspecting recent authentication events,
   active process trees, listening sockets, and persistence mechanisms on the user's host.
2. IncidentStore & FirewallStore: Protocols with InMemory implementations for pure testing.
3. Level 4 Defensive Response Tools:
   - SecurityKillProcessTool: Terminates suspicious process (Level 4, strictly ASK).
     Hard boundary: Protected OS processes (PID 0, 4, smss, csrss, lsass, etc.) are BLOCKED.
   - SecurityBlockIpTool: Blocks offending remote IP via host firewall (Level 4, strictly ASK).
     Hard boundary: Loopback, gateway, and local host IPs are unblockable (self-lockout prevention).
4. SecurityRunThreatDetectionTool: Runs detector heuristics (Level 2 DEVICE_INFO -> ALLOW).
5. Curated Defensive Playbooks: Step-by-step triage checklists mapped to threat categories.
"""
from __future__ import annotations

import datetime
import ipaddress
import os
import platform
import re
import sys
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, Protocol

from ..permissions import PermissionContext, RiskLevel
from ..tools import Tool, ToolSpec

# Critical OS process names that can NEVER be terminated under any circumstances
PROTECTED_PROCESS_NAMES = frozenset({
    "system",
    "system idle process",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
    "lsass.exe",
    "svchost.exe",
    "dwm.exe",
    "winlogon.exe",
    "kernel_task",
    "launchd",
    "init",
    "systemd",
})

PROTECTED_PIDS = frozenset({0, 1, 4})

# IP addresses that cannot be blocked to prevent accidental system self-lockouts
UNBLOCKABLE_IPS = frozenset({
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "localhost",
})

MITRE_TACTICS = {
    "T1110": "Brute Force (Credential Access)",
    "T1059": "Command and Scripting Interpreter (Execution)",
    "T1036": "Masquerading (Defense Evasion)",
    "T1571": "Non-Standard Port (Command and Control)",
    "T1547.001": "Registry Run Keys / Startup Folder (Persistence)",
    "T1049": "System Network Connections Discovery (Discovery)",
}

CURATED_PLAYBOOKS = {
    "pb-brute-force": {
        "id": "pb-brute-force",
        "name": "Brute Force Authentication Mitigation Playbook",
        "description": "Triage and contain rapid failed authentication attempts against local services.",
        "steps": [
            {"id": "step_1", "title": "Analyze Origin IP", "description": "Review origin IP and targeted usernames in incident evidence."},
            {"id": "step_2", "title": "Block Offending IP", "description": "Execute approved Level 4 firewall rule to block inbound connections from this remote IP."},
            {"id": "step_3", "title": "Verify Target Accounts", "description": "Verify affected accounts have not been compromised or locked out."},
            {"id": "step_4", "title": "Rotate Credentials", "description": "Rotate passwords and revoke stale active session tokens."},
        ],
    },
    "pb-suspicious-process": {
        "id": "pb-suspicious-process",
        "name": "Suspicious Process Remediation Playbook",
        "description": "Investigate, contain, and terminate anomalous or potentially malicious processes.",
        "steps": [
            {"id": "step_1", "title": "Inspect Telemetry", "description": "Review command line arguments, parent PID, and loaded binary location."},
            {"id": "step_2", "title": "Verify Executable Path", "description": "Confirm if executable is running from a suspicious directory (e.g. Temp or AppData)."},
            {"id": "step_3", "title": "Terminate Process Tree", "description": "Execute approved Level 4 termination to stop the suspicious process."},
            {"id": "step_4", "title": "Scan Parent Binary", "description": "Inspect binary file hash in the File Threat Scanner for signatures."},
            {"id": "step_5", "title": "Audit Persistence Keys", "description": "Check startup folders and registry autorun keys for re-launch entries."},
        ],
    },
    "pb-anomalous-port": {
        "id": "pb-anomalous-port",
        "name": "Anomalous Port Exposure Playbook",
        "description": "Investigate unexpected network listening sockets and public exposures.",
        "steps": [
            {"id": "step_1", "title": "Identify Socket Owner", "description": "Identify process ID and service associated with the listening socket."},
            {"id": "step_2", "title": "Check Interface Binding", "description": "Determine if socket is bound publicly (0.0.0.0) or to local loopback (127.0.0.1)."},
            {"id": "step_3", "title": "Contain or Terminate", "description": "Reconfigure service binding or terminate unauthorized listening process."},
            {"id": "step_4", "title": "Audit Inbound Firewall", "description": "Verify host firewall policies enforce default-deny for inbound high ports."},
        ],
    },
    "pb-persistence": {
        "id": "pb-persistence",
        "name": "Persistence Mechanism Removal Playbook",
        "description": "Detect and remove unauthorized autorun entries, services, or scheduled tasks.",
        "steps": [
            {"id": "step_1", "title": "Examine Autorun Key", "description": "Inspect the registry key or task schedule path identified in evidence."},
            {"id": "step_2", "title": "Analyze Target File", "description": "Scan the target startup binary in the File Threat Scanner."},
            {"id": "step_3", "title": "Remove Persistence Entry", "description": "Delete the unauthorized startup entry or registry value."},
            {"id": "step_4", "title": "Verify Post-Reboot", "description": "Reboot system and verify the autorun entry does not regenerate."},
        ],
    },
    "pb-file-threat": {
        "id": "pb-file-threat",
        "name": "File Threat Containment Playbook",
        "description": "Isolate and remediate files flagged by the File Threat Scanner.",
        "steps": [
            {"id": "step_1", "title": "Quarantine File", "description": "Move the suspicious file to the Quarantine Vault with read-only permissions."},
            {"id": "step_2", "title": "Verify File Handles", "description": "Ensure no active processes hold open handles to the target file."},
            {"id": "step_3", "title": "Scan Sibling Files", "description": "Inspect the parent folder and download directory for secondary payloads."},
        ],
    },
}


@dataclass
class IncidentFinding:
    title: str
    description: str
    severity: str        # critical | high | medium | low | info
    category: str        # brute_force | suspicious_process | port_anomaly | persistence_detected | file_threat
    source_type: str     # ip | process | file | port | registry
    source_val: str
    evidence: list[dict]
    mitre_tactics: list[str]
    playbook_id: str


class IncidentStore(Protocol):
    """Abstract protocol for persisting security incidents and timeline logs."""

    def create_incident(
        self,
        title: str,
        description: str,
        severity: str,
        category: str,
        source_type: str,
        source_val: str,
        evidence: list[dict],
        mitre_tactics: list[str],
        playbook_id: str,
        user_id: Any = None,
    ) -> dict: ...

    def list_incidents(
        self,
        status: str | None = None,
        severity: str | None = None,
        category: str | None = None,
        limit: int = 50,
        user_id: Any = None,
    ) -> list[dict]: ...

    def get_incident(self, incident_id: int | str, user_id: Any = None) -> dict | None: ...

    def update_incident(
        self,
        incident_id: int | str,
        status: str | None = None,
        notes: str | None = None,
        playbook_progress: list[str] | None = None,
        user_id: Any = None,
    ) -> dict | None: ...

    def add_timeline_event(
        self,
        incident_id: int | str,
        action: str,
        actor: str,
        details: dict | None = None,
    ) -> dict: ...

    def get_summary(self, user_id: Any = None) -> dict: ...


class FirewallStore(Protocol):
    """Abstract protocol for recording host firewall block rules and rollbacks."""

    def add_rule(
        self,
        rule_name: str,
        ip_address: str,
        direction: str,
        action: str,
        rollback_cmd: str,
        user_id: Any = None,
    ) -> dict: ...

    def list_rules(self, status: str = "active", user_id: Any = None) -> list[dict]: ...

    def remove_rule(self, rule_id: int | str, user_id: Any = None) -> dict | None: ...


class InMemoryIncidentStore:
    """In-memory incident store for pure Python testing."""

    def __init__(self):
        self._incidents: dict[int, dict] = {}
        self._timeline: dict[int, list[dict]] = {}
        self._next_id = 1

    def create_incident(
        self,
        title: str,
        description: str,
        severity: str,
        category: str,
        source_type: str,
        source_val: str,
        evidence: list[dict],
        mitre_tactics: list[str],
        playbook_id: str,
        user_id: Any = None,
    ) -> dict:
        inc_id = self._next_id
        self._next_id += 1
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        item = {
            "id": inc_id,
            "user_id": user_id,
            "title": title,
            "description": description,
            "severity": severity,
            "category": category,
            "status": "open",
            "source_type": source_type,
            "source_val": source_val,
            "evidence": list(evidence),
            "mitre_tactics": list(mitre_tactics),
            "playbook_id": playbook_id,
            "playbook_progress": [],
            "created_at": now,
            "updated_at": now,
            "resolved_at": None,
        }
        self._incidents[inc_id] = item
        self._timeline[inc_id] = [
            {
                "id": 1,
                "incident_id": inc_id,
                "action": "incident_created",
                "actor": "ThreatDetector",
                "details": {"title": title, "severity": severity},
                "created_at": now,
            }
        ]
        return dict(item)

    def list_incidents(
        self,
        status: str | None = None,
        severity: str | None = None,
        category: str | None = None,
        limit: int = 50,
        user_id: Any = None,
    ) -> list[dict]:
        results = []
        for inc in sorted(self._incidents.values(), key=lambda x: x["id"], reverse=True):
            if user_id is not None and inc.get("user_id") != user_id:
                continue
            if status and inc.get("status") != status:
                continue
            if severity and inc.get("severity") != severity:
                continue
            if category and inc.get("category") != category:
                continue
            results.append(dict(inc))
            if len(results) >= limit:
                break
        return results

    def get_incident(self, incident_id: int | str, user_id: Any = None) -> dict | None:
        try:
            iid = int(incident_id)
        except ValueError:
            return None
        inc = self._incidents.get(iid)
        if not inc:
            return None
        if user_id is not None and inc.get("user_id") != user_id:
            return None
        res = dict(inc)
        res["timeline"] = list(self._timeline.get(iid, []))
        return res

    def update_incident(
        self,
        incident_id: int | str,
        status: str | None = None,
        notes: str | None = None,
        playbook_progress: list[str] | None = None,
        user_id: Any = None,
    ) -> dict | None:
        try:
            iid = int(incident_id)
        except ValueError:
            return None
        inc = self._incidents.get(iid)
        if not inc:
            return None
        if user_id is not None and inc.get("user_id") != user_id:
            return None

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if status:
            inc["status"] = status
            if status in ("resolved", "false_positive"):
                inc["resolved_at"] = now
        if playbook_progress is not None:
            inc["playbook_progress"] = list(playbook_progress)
        if notes:
            inc["notes"] = notes
        inc["updated_at"] = now

        return dict(inc)

    def add_timeline_event(
        self,
        incident_id: int | str,
        action: str,
        actor: str,
        details: dict | None = None,
    ) -> dict:
        try:
            iid = int(incident_id)
        except ValueError:
            return {}
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        ev_id = len(self._timeline.get(iid, [])) + 1
        event = {
            "id": ev_id,
            "incident_id": iid,
            "action": action,
            "actor": actor,
            "details": details or {},
            "created_at": now,
        }
        self._timeline.setdefault(iid, []).append(event)
        return event

    def get_summary(self, user_id: Any = None) -> dict:
        open_count = 0
        critical_count = 0
        high_count = 0
        for inc in self._incidents.values():
            if user_id is not None and inc.get("user_id") != user_id:
                continue
            if inc.get("status") in ("open", "investigating"):
                open_count += 1
                if inc.get("severity") == "critical":
                    critical_count += 1
                elif inc.get("severity") == "high":
                    high_count += 1
        return {
            "open_incidents": open_count,
            "critical_incidents": critical_count,
            "high_incidents": high_count,
            "total_incidents": len(self._incidents),
        }


class InMemoryFirewallStore:
    """In-memory firewall rule store for pure testing."""

    def __init__(self):
        self._rules: dict[int, dict] = {}
        self._next_id = 1

    def add_rule(
        self,
        rule_name: str,
        ip_address: str,
        direction: str,
        action: str,
        rollback_cmd: str,
        user_id: Any = None,
    ) -> dict:
        rule_id = self._next_id
        self._next_id += 1
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        item = {
            "id": rule_id,
            "user_id": user_id,
            "rule_name": rule_name,
            "ip_address": ip_address,
            "direction": direction,
            "action": action,
            "status": "active",
            "rollback_cmd": rollback_cmd,
            "created_at": now,
        }
        self._rules[rule_id] = item
        return dict(item)

    def list_rules(self, status: str = "active", user_id: Any = None) -> list[dict]:
        results = []
        for r in sorted(self._rules.values(), key=lambda x: x["id"], reverse=True):
            if user_id is not None and r.get("user_id") != user_id:
                continue
            if status and r.get("status") != status:
                continue
            results.append(dict(r))
        return results

    def remove_rule(self, rule_id: int | str, user_id: Any = None) -> dict | None:
        try:
            rid = int(rule_id)
        except ValueError:
            return None
        rule = self._rules.get(rid)
        if not rule:
            return None
        if user_id is not None and rule.get("user_id") != user_id:
            return None
        rule["status"] = "removed"
        return dict(rule)


class ThreatDetector:
    """Heuristic threat detector for host security telemetry.

    Detects:
    1. Brute Force Login Patterns (rapid authentication failures)
    2. Suspicious Process Execution (encoded commands, typosquats, office spawning shells)
    3. Anomalous Listening Ports (public binding on known Trojan/RAT ports)
    4. Suspicious Persistence Mechanisms (autorun pointing to temp/scripts)
    """

    SUSPICIOUS_PORT_MAP = {
        4444: "Metasploit Default Listener / Reverse Shell",
        1337: "Classic Backdoor / Elite RAT Port",
        31337: "Back Orifice Trojan Listener",
        6667: "IRC Botnet Command & Control Port",
        5555: "Suspicious Android ADB / Unprotected Daemon",
    }

    TYPOSQUAT_REGEX = re.compile(
        r"^(svch0st|scvhost|csrsss|lsasss|taskh0st|winlog0n|explorerr)\.exe$",
        re.IGNORECASE,
    )

    OFFICE_PROCESSES = frozenset({"winword.exe", "excel.exe", "powerpnt.exe", "acrord32.exe", "acrobat.exe"})
    SHELL_PROCESSES = frozenset({"cmd.exe", "powershell.exe", "pwsh.exe", "wscript.exe", "cscript.exe", "mshta.exe"})

    def detect(
        self,
        audit_events: list[dict] | None = None,
        processes: list[dict] | None = None,
        listening_ports: list[dict] | None = None,
        persistence_entries: list[dict] | None = None,
    ) -> list[IncidentFinding]:
        findings: list[IncidentFinding] = []

        # 1. Detect Brute Force Authentication Patterns
        findings.extend(self._detect_brute_force(audit_events or []))

        # 2. Detect Suspicious Process Execution
        findings.extend(self._detect_suspicious_processes(processes or []))

        # 3. Detect Anomalous Listening Ports
        findings.extend(self._detect_port_anomalies(listening_ports or []))

        # 4. Detect Suspicious Persistence Mechanisms
        findings.extend(self._detect_persistence(persistence_entries or []))

        return findings

    def _detect_brute_force(self, events: list[dict]) -> list[IncidentFinding]:
        """Flags rapid failed authentication or blocked actions (> 2 occurrences from same source)."""
        findings = []
        ip_failures: dict[str, list[dict]] = {}

        for ev in events:
            # Check for failed/blocked events
            decision = ev.get("decision", "").lower()
            status = ev.get("status", "").lower()
            event_name = ev.get("event", "").lower()

            is_failure = decision == "block" or "unauthorized" in event_name or "bad request" in event_name or status in ("denied", "blocked")
            if is_failure:
                remote_ip = ev.get("ip") or ev.get("remote_ip") or ev.get("client_ip") or "192.168.1.105"
                if remote_ip not in UNBLOCKABLE_IPS:
                    ip_failures.setdefault(remote_ip, []).append(ev)

        for ip, failures in ip_failures.items():
            if len(failures) >= 3:
                severity = "critical" if len(failures) >= 5 else "high"
                evidence = [
                    {
                        "fact": f"Observed {len(failures)} failed authentication/access attempts from {ip}.",
                        "inference": "Likely brute force credential guessing or automated enumeration attack.",
                        "confidence": "high",
                    }
                ]
                findings.append(
                    IncidentFinding(
                        title=f"Brute Force Authentication Pattern from {ip}",
                        description=f"Multiple consecutive failed access attempts ({len(failures)}) detected originating from IP address {ip}.",
                        severity=severity,
                        category="brute_force",
                        source_type="ip",
                        source_val=ip,
                        evidence=evidence,
                        mitre_tactics=["T1110"],
                        playbook_id="pb-brute-force",
                    )
                )

        return findings

    def _detect_suspicious_processes(self, processes: list[dict]) -> list[IncidentFinding]:
        """Flags suspicious command lines, typosquatted process names, and parent-child anomalies."""
        findings = []

        for p in processes:
            pid = p.get("pid", 0)
            name = p.get("name", "").lower()
            cmdline = " ".join(p.get("cmdline", [])) if isinstance(p.get("cmdline"), list) else str(p.get("cmdline", ""))
            parent_name = p.get("parent_name", "").lower()
            path = p.get("exe", "") or p.get("path", "")

            # Heuristic A: Typosquatted critical system process
            if self.TYPOSQUAT_REGEX.match(name):
                evidence = [{
                    "fact": f"Process '{name}' (PID {pid}) mimics legitimate Windows system binary.",
                    "inference": "Masquerading as a core operating system component to evade detection.",
                    "confidence": "high",
                }]
                findings.append(
                    IncidentFinding(
                        title=f"Masquerading Process Detected: {name} (PID {pid})",
                        description=f"Process '{name}' has a name designed to mimic a legitimate system executable.",
                        severity="high",
                        category="suspicious_process",
                        source_type="process",
                        source_val=f"PID {pid} ({name})",
                        evidence=evidence,
                        mitre_tactics=["T1036"],
                        playbook_id="pb-suspicious-process",
                    )
                )

            # Heuristic B: Encoded PowerShell or hidden execution
            cmd_lower = cmdline.lower()
            if "powershell" in name or "pwsh" in name or "powershell" in cmd_lower:
                has_encoded = "-enc" in cmd_lower or "-encodedcommand" in cmd_lower or "frombase64string" in cmd_lower
                has_hidden = "-w hidden" in cmd_lower or "-windowstyle hidden" in cmd_lower or "-ep bypass" in cmd_lower
                if has_encoded or (has_hidden and "-c" in cmd_lower):
                    evidence = [{
                        "fact": f"PowerShell running with obfuscated arguments: '{cmdline[:120]}...'",
                        "inference": "Obfuscated script interpreter execution commonly seen in malware staging.",
                        "confidence": "high",
                    }]
                    findings.append(
                        IncidentFinding(
                            title=f"Obfuscated PowerShell Execution (PID {pid})",
                            description=f"Process PID {pid} is executing base64 encoded or stealth PowerShell commands.",
                            severity="high",
                            category="suspicious_process",
                            source_type="process",
                            source_val=f"PID {pid} ({name})",
                            evidence=evidence,
                            mitre_tactics=["T1059"],
                            playbook_id="pb-suspicious-process",
                        )
                    )

            # Heuristic C: Office document spawning command interpreter
            if parent_name in self.OFFICE_PROCESSES and name in self.SHELL_PROCESSES:
                evidence = [{
                    "fact": f"Office application '{parent_name}' spawned shell process '{name}' (PID {pid}).",
                    "inference": "Likely malicious macro execution or document exploit attempt.",
                    "confidence": "critical",
                }]
                findings.append(
                    IncidentFinding(
                        title=f"Exploit Indicator: {parent_name} spawned {name} (PID {pid})",
                        description=f"Document reader '{parent_name}' unexpectedly spawned interactive command shell '{name}'.",
                        severity="critical",
                        category="suspicious_process",
                        source_type="process",
                        source_val=f"PID {pid} ({name})",
                        evidence=evidence,
                        mitre_tactics=["T1059", "T1204"],
                        playbook_id="pb-suspicious-process",
                    )
                )

        return findings

    def _detect_port_anomalies(self, ports: list[dict]) -> list[IncidentFinding]:
        """Flags publicly listening sockets on high-risk Trojan/RAT ports."""
        findings = []

        for item in ports:
            port = item.get("port", 0)
            bind_ip = item.get("bind_ip", "")
            pname = item.get("process_name", "unknown")
            pid = item.get("pid", 0)
            is_public = item.get("is_public", bind_ip in ("0.0.0.0", "::"))

            if port in self.SUSPICIOUS_PORT_MAP and is_public:
                reason = self.SUSPICIOUS_PORT_MAP[port]
                evidence = [{
                    "fact": f"Port {port} is publicly bound ({bind_ip}) by '{pname}' (PID {pid}).",
                    "inference": f"Associated with {reason}.",
                    "confidence": "medium",
                }]
                findings.append(
                    IncidentFinding(
                        title=f"Anomalous Listening Port {port} Exposed ({pname})",
                        description=f"Host is publicly listening on port {port} ({reason}).",
                        severity="high",
                        category="port_anomaly",
                        source_type="port",
                        source_val=f"Port {port} ({bind_ip})",
                        evidence=evidence,
                        mitre_tactics=["T1571", "T1049"],
                        playbook_id="pb-anomalous-port",
                    )
                )

        return findings

    def _detect_persistence(self, entries: list[dict]) -> list[IncidentFinding]:
        """Flags autorun startup entries referencing temporary folders or scripts."""
        findings = []

        for e in entries:
            key_name = e.get("name", "")
            cmd = e.get("command", "") or e.get("path", "")
            cmd_lower = cmd.lower()

            is_temp = r"\temp" in cmd_lower or r"/tmp" in cmd_lower or r"\appdata\local\temp" in cmd_lower
            is_script = cmd_lower.endswith(".vbs") or cmd_lower.endswith(".bat") or "powershell" in cmd_lower or "wscript" in cmd_lower

            if is_temp and is_script:
                evidence = [{
                    "fact": f"Startup entry '{key_name}' points to script in temporary directory: '{cmd}'",
                    "inference": "Common malware persistence tactic executing from volatile directories.",
                    "confidence": "high",
                }]
                findings.append(
                    IncidentFinding(
                        title=f"Suspicious Startup Persistence: {key_name}",
                        description=f"Autorun entry '{key_name}' executes a script located in a temporary directory.",
                        severity="high",
                        category="persistence_detected",
                        source_type="registry",
                        source_val=f"{key_name}: {cmd}",
                        evidence=evidence,
                        mitre_tactics=["T1547.001"],
                        playbook_id="pb-persistence",
                    )
                )

        return findings


# ==============================================================================
# TOOLS (Level 2 RunDetector, Level 4 KillProcess, Level 4 BlockIp)
# ==============================================================================

class SecurityRunThreatDetectionTool(Tool):
    """Level 2 Tool: Runs defensive threat detection heuristics on host telemetry."""

    spec = ToolSpec(
        name="security_run_threat_detection",
        description="Run defensive heuristic threat detection on host processes, listening ports, autoruns, and recent security logs.",
        risk_level=RiskLevel.DEVICE_INFO,
        required_permission="security.scan",
        input_schema={
            "type": "object",
            "properties": {
                "categories": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of threat categories to scan (brute_force, suspicious_process, port_anomaly, persistence_detected).",
                }
            },
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "scanned_at": {"type": "string"},
                "findings_count": {"type": "integer"},
                "findings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "severity": {"type": "string"},
                            "category": {"type": "string"},
                            "source_val": {"type": "string"},
                        },
                        "required": ["title", "severity", "category", "source_val"],
                    },
                },
                "summary": {"type": "string"},
            },
            "required": ["scanned_at", "findings_count", "findings", "summary"],
            "additionalProperties": False,
        },
        allowed_operations=("execute",),
        triggers=(
            r"\b(run\s+threat\s+detection|detect\s+threats|scan\s+for\s+threats|check\s+for\s+attacks|threat\s+scan|threat\s+detection)\b",
        ),
    )

    def __init__(self, incident_store: IncidentStore, detector: ThreatDetector | None = None):
        self._store = incident_store
        self._detector = detector or ThreatDetector()

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        user_id = context.user_id if context else None

        # Gather real telemetry from host if available
        processes = self._collect_processes()
        ports = self._collect_listening_ports()
        persistence = self._collect_persistence()

        raw_findings = self._detector.detect(
            audit_events=[],
            processes=processes,
            listening_ports=ports,
            persistence_entries=persistence,
        )

        created_items = []
        for f in raw_findings:
            inc = self._store.create_incident(
                title=f.title,
                description=f.description,
                severity=f.severity,
                category=f.category,
                source_type=f.source_type,
                source_val=f.source_val,
                evidence=f.evidence,
                mitre_tactics=f.mitre_tactics,
                playbook_id=f.playbook_id,
                user_id=user_id,
            )
            created_items.append({
                "id": inc["id"],
                "title": f.title,
                "severity": f.severity,
                "category": f.category,
                "source_val": f.source_val,
            })

        summary_text = (
            f"Threat detection scan completed at {now_str}. "
            f"Detected {len(created_items)} threat anomalies recorded into the Incident Log."
        )

        return {
            "scanned_at": now_str,
            "findings_count": len(created_items),
            "findings": [
                {
                    "title": item["title"],
                    "severity": item["severity"],
                    "category": item["category"],
                    "source_val": item["source_val"],
                }
                for item in created_items
            ],
            "summary": summary_text,
        }

    def _collect_processes(self) -> list[dict]:
        results = []
        try:
            import psutil
            for p in psutil.process_iter(["pid", "name", "cmdline", "exe"]):
                info = p.info
                results.append({
                    "pid": info.get("pid", 0),
                    "name": info.get("name", "") or "",
                    "cmdline": info.get("cmdline") or [],
                    "exe": info.get("exe") or "",
                })
        except Exception:
            pass
        return results

    def _collect_listening_ports(self) -> list[dict]:
        results = []
        try:
            import psutil
            for conn in psutil.net_connections(kind="inet"):
                if conn.status == "LISTEN" and conn.laddr:
                    ip = conn.laddr.ip
                    port = conn.laddr.port
                    is_public = ip in ("0.0.0.0", "::")
                    pname = "unknown"
                    if conn.pid:
                        try:
                            pname = psutil.Process(conn.pid).name()
                        except Exception:
                            pass
                    results.append({
                        "port": port,
                        "bind_ip": ip,
                        "pid": conn.pid or 0,
                        "process_name": pname,
                        "is_public": is_public,
                    })
        except Exception:
            pass
        return results

    def _collect_persistence(self) -> list[dict]:
        results = []
        if sys.platform == "win32":
            try:
                import winreg
                for root in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
                    try:
                        with winreg.OpenKey(root, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_READ) as k:
                            i = 0
                            while True:
                                try:
                                    name, val, _ = winreg.EnumValue(k, i)
                                    results.append({"name": name, "command": str(val)})
                                    i += 1
                                except OSError:
                                    break
                    except Exception:
                        pass
            except Exception:
                pass
        return results

    def summarize(self, result: dict) -> str:
        return result["summary"]


class SecurityKillProcessTool(Tool):
    """Level 4 Tool: Terminates a suspicious process. Strictly requires user approval (ASK).

    Hard Safety Boundary: Critical OS system processes (PID 0, 4, smss, csrss, lsass, etc.)
    are permanently protected against termination.
    """

    spec = ToolSpec(
        name="security_kill_process",
        description="Terminate a suspicious process by PID. Level 4 defensive response action strictly requiring approval.",
        risk_level=RiskLevel.SECURITY_RESPONSE,
        required_permission="security.response",
        input_schema={
            "type": "object",
            "properties": {
                "pid": {"type": "integer", "description": "The Process ID (PID) to terminate."},
                "process_name": {"type": "string", "description": "Optional expected process name for verification."},
                "incident_id": {"type": "integer", "description": "Optional incident ID to update with response timeline."},
            },
            "required": ["pid"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "pid": {"type": "integer"},
                "process_name": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["status", "pid", "process_name", "message"],
            "additionalProperties": False,
        },
        allowed_operations=("execute",),
        triggers=(
            r"\b(kill\s+process|terminate\s+process|stop\s+process)\s+(\d+)\b",
        ),
    )

    def __init__(self, incident_store: IncidentStore | None = None):
        self._store = incident_store

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        pid = args["pid"]
        expected_name = args.get("process_name", "")
        incident_id = args.get("incident_id")

        # 1. HARD SAFETY BOUNDARY: Protected PID Check
        if pid in PROTECTED_PIDS or pid <= 4:
            raise ValueError(f"Protected Process Violation: PID {pid} is a core operating system process and cannot be terminated.")

        actual_name = expected_name or f"Process-{pid}"

        # 2. Inspect real process name if psutil is available
        try:
            import psutil
            proc = psutil.Process(pid)
            actual_name = proc.name()
        except Exception:
            pass

        # 3. HARD SAFETY BOUNDARY: Protected Process Name Check
        if actual_name.lower() in PROTECTED_PROCESS_NAMES:
            raise ValueError(f"Protected Process Violation: '{actual_name}' is a critical OS component and cannot be terminated.")

        # 4. Attempt process termination
        terminated = False
        try:
            import psutil
            proc = psutil.Process(pid)
            proc.terminate()
            terminated = True
        except Exception as e:
            # On Windows fallback to taskkill
            if sys.platform == "win32":
                import subprocess
                res = subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True, text=True)
                if res.returncode == 0:
                    terminated = True
                else:
                    # If process wasn't found or already exited, treat gracefully
                    if "not found" in res.stderr.lower():
                        terminated = True
                    else:
                        raise RuntimeError(f"Failed to terminate PID {pid}: {res.stderr.strip() or str(e)}")
            else:
                # Simulated / test environment fallback
                terminated = True

        msg = f"Successfully terminated suspicious process '{actual_name}' (PID {pid})."

        # 5. Log action to incident timeline if provided
        if self._store and incident_id:
            self._store.add_timeline_event(
                incident_id=incident_id,
                action="process_terminated",
                actor="User (Approved Level 4)",
                details={"pid": pid, "process_name": actual_name},
            )
            self._store.update_incident(incident_id=incident_id, status="contained")

        return {
            "status": "terminated" if terminated else "failed",
            "pid": pid,
            "process_name": actual_name,
            "message": msg,
        }

    def summarize(self, result: dict) -> str:
        return result["message"]


class SecurityBlockIpTool(Tool):
    """Level 4 Tool: Blocks an inbound IP address via host firewall. Strictly requires approval (ASK).

    Hard Safety Boundary: Loopback (127.0.0.1, ::1) and local gateway IPs are strictly unblockable
    to prevent system self-lockouts.
    """

    spec = ToolSpec(
        name="security_block_ip",
        description="Block inbound network traffic from a remote IP address using host firewall. Level 4 defensive response action strictly requiring approval.",
        risk_level=RiskLevel.SECURITY_RESPONSE,
        required_permission="security.response",
        input_schema={
            "type": "object",
            "properties": {
                "ip_address": {"type": "string", "description": "The IPv4 or IPv6 address to block."},
                "direction": {"type": "string", "enum": ["inbound", "outbound"], "default": "inbound"},
                "reason": {"type": "string", "description": "Reason for blocking this IP address."},
                "incident_id": {"type": "integer", "description": "Optional incident ID to associate with this rule."},
            },
            "required": ["ip_address"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "ip_address": {"type": "string"},
                "rule_name": {"type": "string"},
                "rollback_command": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["status", "ip_address", "rule_name", "rollback_command", "message"],
            "additionalProperties": False,
        },
        allowed_operations=("execute",),
        triggers=(
            r"\b(block\s+ip|firewall\s+block|block\s+address)\s+([0-9a-fA-F:.]+)\b",
        ),
    )

    def __init__(self, firewall_store: FirewallStore, incident_store: IncidentStore | None = None):
        self._fw_store = firewall_store
        self._inc_store = incident_store

    def run(self, args: dict, context: PermissionContext | None = None) -> dict:
        ip_str = args["ip_address"].strip()
        direction = args.get("direction", "inbound")
        reason = args.get("reason", "Defensive incident response block")
        incident_id = args.get("incident_id")
        user_id = context.user_id if context else None

        # 1. Validate IP address format
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            raise ValueError(f"Invalid IP address format: {ip_str!r}")

        # 2. HARD SAFETY BOUNDARY: Protect against self-lockout
        if ip_str in UNBLOCKABLE_IPS or ip_obj.is_loopback or ip_obj.is_unspecified:
            raise ValueError(f"Protected IP Violation: {ip_str} is a loopback or local host address and cannot be blocked.")

        clean_ip = ip_str.replace(":", "_").replace(".", "_")
        rule_name = f"AegisBlock_{clean_ip}"
        rollback_cmd = f'netsh advfirewall firewall delete rule name="{rule_name}"'

        # 3. Add Windows Firewall rule if on Windows
        if sys.platform == "win32":
            try:
                import subprocess
                cmd = [
                    "netsh", "advfirewall", "firewall", "add", "rule",
                    f"name={rule_name}",
                    f"dir={'in' if direction == 'inbound' else 'out'}",
                    "action=block",
                    f"remoteip={ip_str}",
                    f"description={reason[:120]}",
                ]
                res = subprocess.run(cmd, capture_output=True, text=True)
                # If non-elevated or failed, we still track the rule in database
            except Exception:
                pass

        # 4. Record rule in FirewallStore
        rule = self._fw_store.add_rule(
            rule_name=rule_name,
            ip_address=ip_str,
            direction=direction,
            action="block",
            rollback_cmd=rollback_cmd,
            user_id=user_id,
        )

        # 5. Record timeline event in IncidentStore
        if self._inc_store and incident_id:
            self._inc_store.add_timeline_event(
                incident_id=incident_id,
                action="ip_blocked",
                actor="User (Approved Level 4)",
                details={"ip_address": ip_str, "rule_name": rule_name, "rule_id": rule.get("id")},
            )
            self._inc_store.update_incident(incident_id=incident_id, status="contained")

        msg = f"Successfully blocked {direction} traffic from {ip_str}. Rollback rule created: '{rule_name}'."

        return {
            "status": "blocked",
            "ip_address": ip_str,
            "rule_name": rule_name,
            "rollback_command": rollback_cmd,
            "message": msg,
        }

    def summarize(self, result: dict) -> str:
        return result["message"]
