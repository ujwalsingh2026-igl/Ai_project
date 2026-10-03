"""Unit tests for the Defensive Threat Detection & Incident Response Engine (pure Python)."""
import unittest

from core.builtin_tools.incident_response import (
    CURATED_PLAYBOOKS,
    InMemoryFirewallStore,
    InMemoryIncidentStore,
    PROTECTED_PIDS,
    PROTECTED_PROCESS_NAMES,
    SecurityBlockIpTool,
    SecurityKillProcessTool,
    SecurityRunThreatDetectionTool,
    ThreatDetector,
    UNBLOCKABLE_IPS,
)
from core.permissions import Decision, PermissionContext, PermissionEngine, RiskLevel
from core.tools import OutcomeStatus, ToolExecutor, ToolRegistry


class TestThreatDetectorHeuristics(unittest.TestCase):
    def setUp(self):
        self.detector = ThreatDetector()

    def test_brute_force_detection(self):
        # 3 failed events from an external IP
        events = [
            {"event": "unauthorized", "decision": "block", "ip": "192.168.1.150"},
            {"event": "unauthorized", "decision": "block", "ip": "192.168.1.150"},
            {"event": "unauthorized", "decision": "block", "ip": "192.168.1.150"},
        ]
        findings = self.detector.detect(audit_events=events)
        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.category, "brute_force")
        self.assertEqual(f.severity, "high")
        self.assertEqual(f.source_val, "192.168.1.150")
        self.assertIn("T1110", f.mitre_tactics)
        self.assertEqual(f.playbook_id, "pb-brute-force")

    def test_brute_force_ignores_loopback(self):
        events = [
            {"event": "bad request", "decision": "block", "ip": "127.0.0.1"},
            {"event": "bad request", "decision": "block", "ip": "127.0.0.1"},
            {"event": "bad request", "decision": "block", "ip": "127.0.0.1"},
        ]
        findings = self.detector.detect(audit_events=events)
        self.assertEqual(len(findings), 0)

    def test_typosquatted_process_detection(self):
        processes = [
            {"pid": 4500, "name": "svch0st.exe", "cmdline": ["svch0st.exe"]},
        ]
        findings = self.detector.detect(processes=processes)
        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.category, "suspicious_process")
        self.assertEqual(f.severity, "high")
        self.assertIn("T1036", f.mitre_tactics)

    def test_obfuscated_powershell_detection(self):
        processes = [
            {
                "pid": 5120,
                "name": "powershell.exe",
                "cmdline": ["powershell.exe", "-nop", "-w", "hidden", "-enc", "SQBFAFgA..."],
            }
        ]
        findings = self.detector.detect(processes=processes)
        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.category, "suspicious_process")
        self.assertIn("T1059", f.mitre_tactics)

    def test_office_spawning_shell_detection(self):
        processes = [
            {
                "pid": 6010,
                "name": "powershell.exe",
                "parent_name": "winword.exe",
                "cmdline": ["powershell.exe", "-c", "echo exploit"],
            }
        ]
        findings = self.detector.detect(processes=processes)
        # Should flag both the encoded/powershell check and the office spawn check
        self.assertTrue(any(f.category == "suspicious_process" and f.severity == "critical" for f in findings))

    def test_anomalous_listening_port_detection(self):
        ports = [
            {
                "port": 4444,
                "bind_ip": "0.0.0.0",
                "process_name": "unknown_daemon.exe",
                "pid": 8800,
                "is_public": True,
            },
            {
                "port": 80,
                "bind_ip": "127.0.0.1",
                "process_name": "nginx.exe",
                "pid": 100,
                "is_public": False,
            },
        ]
        findings = self.detector.detect(listening_ports=ports)
        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.category, "port_anomaly")
        self.assertIn("4444", f.title)
        self.assertIn("T1571", f.mitre_tactics)

    def test_suspicious_persistence_detection(self):
        persistence = [
            {
                "name": "UpdateHelper",
                "command": r"wscript.exe C:\Users\Alice\AppData\Local\Temp\helper.vbs",
            }
        ]
        findings = self.detector.detect(persistence_entries=persistence)
        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.category, "persistence_detected")
        self.assertIn("T1547.001", f.mitre_tactics)


class TestIncidentStores(unittest.TestCase):
    def setUp(self):
        self.store = InMemoryIncidentStore()
        self.fw_store = InMemoryFirewallStore()

    def test_incident_lifecycle(self):
        inc = self.store.create_incident(
            title="Brute Force Alert",
            description="Testing incident creation",
            severity="high",
            category="brute_force",
            source_type="ip",
            source_val="192.168.1.200",
            evidence=[{"fact": "3 failed attempts"}],
            mitre_tactics=["T1110"],
            playbook_id="pb-brute-force",
            user_id=1,
        )
        self.assertEqual(inc["id"], 1)
        self.assertEqual(inc["status"], "open")

        # Get with timeline
        fetched = self.store.get_incident(1, user_id=1)
        self.assertIsNotNone(fetched)
        self.assertEqual(len(fetched["timeline"]), 1)

        # Update status and progress
        updated = self.store.update_incident(1, status="investigating", playbook_progress=["step_1"], user_id=1)
        self.assertEqual(updated["status"], "investigating")
        self.assertEqual(updated["playbook_progress"], ["step_1"])

        # Add timeline event
        ev = self.store.add_timeline_event(1, "action_taken", "Tester", {"note": "Investigated IP"})
        self.assertEqual(ev["action"], "action_taken")

        # Summary
        summary = self.store.get_summary(user_id=1)
        self.assertEqual(summary["open_incidents"], 1)
        self.assertEqual(summary["high_incidents"], 1)

    def test_firewall_rule_lifecycle(self):
        rule = self.fw_store.add_rule(
            rule_name="AegisBlock_192_168_1_200",
            ip_address="192.168.1.200",
            direction="inbound",
            action="block",
            rollback_cmd='netsh advfirewall firewall delete rule name="AegisBlock_192_168_1_200"',
            user_id=1,
        )
        self.assertEqual(rule["id"], 1)
        self.assertEqual(rule["status"], "active")

        active_rules = self.fw_store.list_rules(status="active", user_id=1)
        self.assertEqual(len(active_rules), 1)

        removed = self.fw_store.remove_rule(1, user_id=1)
        self.assertEqual(removed["status"], "removed")
        self.assertEqual(len(self.fw_store.list_rules(status="active", user_id=1)), 0)


class TestIncidentResponseTools(unittest.TestCase):
    def setUp(self):
        self.inc_store = InMemoryIncidentStore()
        self.fw_store = InMemoryFirewallStore()
        self.kill_tool = SecurityKillProcessTool(incident_store=self.inc_store)
        self.block_tool = SecurityBlockIpTool(firewall_store=self.fw_store, incident_store=self.inc_store)
        self.run_detector_tool = SecurityRunThreatDetectionTool(incident_store=self.inc_store)

    def test_kill_process_protected_pid_safety(self):
        # Critical PID 0 or 4 must be blocked
        with self.assertRaises(ValueError) as cm:
            self.kill_tool.run({"pid": 4}, PermissionContext(approved_once=True))
        self.assertIn("Protected Process Violation", str(cm.exception))

    def test_kill_process_protected_name_safety(self):
        # Protected core system binary name must be blocked
        with self.assertRaises(ValueError) as cm:
            self.kill_tool.run({"pid": 9999, "process_name": "csrss.exe"}, PermissionContext(approved_once=True))
        self.assertIn("Protected Process Violation", str(cm.exception))

    def test_block_ip_protected_ip_safety(self):
        # 127.0.0.1 must be blocked
        with self.assertRaises(ValueError) as cm:
            self.block_tool.run({"ip_address": "127.0.0.1"}, PermissionContext(approved_once=True))
        self.assertIn("Protected IP Violation", str(cm.exception))

    def test_block_ip_invalid_format(self):
        with self.assertRaises(ValueError) as cm:
            self.block_tool.run({"ip_address": "not-an-ip"}, PermissionContext(approved_once=True))
        self.assertIn("Invalid IP address", str(cm.exception))

    def test_block_ip_success_and_timeline(self):
        inc = self.inc_store.create_incident(
            title="Attack", description="test", severity="high", category="brute_force",
            source_type="ip", source_val="192.168.1.188", evidence=[], mitre_tactics=[], playbook_id="pb-brute-force"
        )
        res = self.block_tool.run(
            {"ip_address": "192.168.1.188", "incident_id": inc["id"]},
            PermissionContext(approved_once=True)
        )
        self.assertEqual(res["status"], "blocked")
        self.assertIn("AegisBlock", res["rule_name"])

        # Incident status updated to contained
        updated_inc = self.inc_store.get_incident(inc["id"])
        self.assertEqual(updated_inc["status"], "contained")
        self.assertTrue(any(t["action"] == "ip_blocked" for t in updated_inc["timeline"]))

    def test_permission_engine_level_4_gates(self):
        engine = PermissionEngine()
        registry = ToolRegistry()
        registry.register(self.kill_tool)
        registry.register(self.block_tool)
        executor = ToolExecutor(registry, engine)

        # 1. Unapproved kill process -> NEEDS_APPROVAL (Risk Level 4)
        outcome1 = executor.execute("security_kill_process", {"pid": 8888}, PermissionContext(approved_once=False))
        self.assertEqual(outcome1.status, OutcomeStatus.NEEDS_APPROVAL)
        self.assertEqual(outcome1.decision, Decision.ASK)

        # 2. Approved kill process -> ALLOW -> Executed
        outcome2 = executor.execute("security_kill_process", {"pid": 8888, "process_name": "fake_test_proc.exe"}, PermissionContext(approved_once=True))
        self.assertEqual(outcome2.status, OutcomeStatus.EXECUTED)
        self.assertEqual(outcome2.result["status"], "terminated")

        # 3. Unapproved block IP -> NEEDS_APPROVAL (Risk Level 4)
        outcome3 = executor.execute("security_block_ip", {"ip_address": "192.168.1.199"}, PermissionContext(approved_once=False))
        self.assertEqual(outcome3.status, OutcomeStatus.NEEDS_APPROVAL)
        self.assertEqual(outcome3.decision, Decision.ASK)

        # 4. Approved block IP -> ALLOW -> Executed
        outcome4 = executor.execute("security_block_ip", {"ip_address": "192.168.1.199"}, PermissionContext(approved_once=True))
        self.assertEqual(outcome4.status, OutcomeStatus.EXECUTED)
        self.assertEqual(outcome4.result["status"], "blocked")


if __name__ == "__main__":
    unittest.main()
