"""Unit tests for defensive security center tools (pure Python, no Django)."""
import unittest

from core.builtin_tools.security import (
    SecurityListeningPortsTool,
    SecurityPostureTool,
    SecurityProcessInspectTool,
    SecuritySelfTestTool,
)
from core.intent import RuleBasedIntentRouter
from core.permissions import Decision, PermissionContext, PermissionEngine, RiskLevel
from core.tools import OutcomeStatus, ToolExecutor, ToolRegistry


class SecurityToolsTests(unittest.TestCase):
    def setUp(self):
        self.posture_tool = SecurityPostureTool(collectors={
            "firewall": lambda: {"status": "PASS", "score": 15, "max_score": 15, "details": "All profiles ON."},
            "antivirus": lambda: {"status": "PASS", "score": 20, "max_score": 20, "details": "Real-time active."},
            "uac": lambda: {"status": "PASS", "score": 15, "max_score": 15, "details": "UAC active."},
            "guest_account": lambda: {"status": "PASS", "score": 10, "max_score": 10, "details": "Disabled."},
            "disk_encryption": lambda: {"status": "PASS", "score": 15, "max_score": 15, "details": "Encrypted."},
            "pending_reboot": lambda: {"status": "PASS", "score": 10, "max_score": 10, "details": "Clean."},
            "screen_lock": lambda: {"status": "PASS", "score": 10, "max_score": 10, "details": "10 min timeout."},
            "ports_hygiene": lambda: {"status": "PASS", "score": 5, "max_score": 5, "details": "Clean sockets."},
        })
        self.process_tool = SecurityProcessInspectTool()
        self.ports_tool = SecurityListeningPortsTool()
        self.self_test_tool = SecuritySelfTestTool()

        self.registry = ToolRegistry()
        self.registry.register(self.posture_tool)
        self.registry.register(self.process_tool)
        self.registry.register(self.ports_tool)
        self.registry.register(self.self_test_tool)

        self.engine = PermissionEngine()
        self.executor = ToolExecutor(self.registry, self.engine)
        self.router = RuleBasedIntentRouter(self.registry)
        self.context = PermissionContext(user_id=1)

    def test_posture_evaluation_score_and_summary(self):
        outcome = self.executor.execute("security_posture_eval", {}, self.context)
        self.assertEqual(outcome.status, OutcomeStatus.EXECUTED)
        self.assertEqual(outcome.decision, Decision.ALLOW)
        self.assertEqual(outcome.result["total_score"], 100)
        self.assertEqual(outcome.result["grade"], "A")
        self.assertEqual(len(outcome.result["checks"]), 8)
        self.assertIn("Defensive Posture Score: 100/100 (Grade: A)", outcome.summary)

    def test_posture_evaluation_penalties(self):
        degraded_tool = SecurityPostureTool(collectors={
            "firewall": lambda: {"status": "FAIL", "score": 0, "max_score": 15, "details": "Off"},
            "antivirus": lambda: {"status": "WARN", "score": 10, "max_score": 20, "details": "RTP off"},
            "uac": lambda: {"status": "FAIL", "score": 0, "max_score": 15, "details": "Disabled"},
            "guest_account": lambda: {"status": "PASS", "score": 10, "max_score": 10, "details": "Disabled"},
            "disk_encryption": lambda: {"status": "FAIL", "score": 0, "max_score": 15, "details": "Unencrypted"},
            "pending_reboot": lambda: {"status": "WARN", "score": 5, "max_score": 10, "details": "Reboot pending"},
            "screen_lock": lambda: {"status": "WARN", "score": 5, "max_score": 10, "details": "No timeout"},
            "ports_hygiene": lambda: {"status": "WARN", "score": 2, "max_score": 5, "details": "Risky port"},
        })
        res = degraded_tool.run({})
        self.assertEqual(res["total_score"], 32)
        self.assertEqual(res["grade"], "F")

    def test_heuristic_process_anomaly_rules(self):
        # 1. Temp folder execution
        flags1 = self.process_tool._evaluate_anomalies(
            name="updater.exe",
            exe=r"C:\Users\admin\AppData\Local\Temp\updater.exe",
            parent_name="explorer.exe",
            listening_ports=[],
        )
        self.assertTrue(any(f["rule"] == "TEMP_DIRECTORY_EXECUTION" for f in flags1))

        # 2. Typosquatting critical process name
        flags2 = self.process_tool._evaluate_anomalies(
            name="svch0st.exe",
            exe=r"C:\Windows\svch0st.exe",
            parent_name="services.exe",
            listening_ports=[],
        )
        self.assertTrue(any(f["rule"] == "TYPOSQUATTING_NAME" for f in flags2))

        # 3. System process outside System32
        flags3 = self.process_tool._evaluate_anomalies(
            name="svchost.exe",
            exe=r"C:\Users\admin\Downloads\svchost.exe",
            parent_name="explorer.exe",
            listening_ports=[],
        )
        self.assertTrue(any(f["rule"] == "IMPERSONATED_SYSTEM_BINARY" for f in flags3))

        # 4. Office reader spawning shell
        flags4 = self.process_tool._evaluate_anomalies(
            name="powershell.exe",
            exe=r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
            parent_name="winword.exe",
            listening_ports=[],
        )
        self.assertTrue(any(f["rule"] == "SUSPICIOUS_PARENT_CHILD" for f in flags4))

        # 5. Benign normal process
        flags5 = self.process_tool._evaluate_anomalies(
            name="python.exe",
            exe=r"C:\Python314\python.exe",
            parent_name="explorer.exe",
            listening_ports=[],
        )
        self.assertEqual(len(flags5), 0)

    def test_harmless_eicar_self_test(self):
        outcome = self.executor.execute("security_self_test", {}, self.context)
        self.assertEqual(outcome.status, OutcomeStatus.EXECUTED)
        self.assertEqual(outcome.decision, Decision.ALLOW)
        self.assertEqual(outcome.result["status"], "PASSED_VERIFIED")
        self.assertTrue(outcome.result["hash_matched"])
        self.assertTrue(outcome.result["signature_matched"])
        self.assertIn("EICAR-Standard-AV-Test-File", outcome.result["threat_name"])
        self.assertIn("Self-Test Result: PASSED_VERIFIED", outcome.summary)

    def test_listening_ports_tool(self):
        outcome = self.executor.execute("security_listening_ports", {}, self.context)
        self.assertEqual(outcome.status, OutcomeStatus.EXECUTED)
        self.assertIn("count", outcome.result)
        self.assertIn("ports", outcome.result)
        self.assertIsInstance(outcome.result["ports"], list)

    def test_intent_routing_for_security(self):
        intent1 = self.router.route("check my security posture score")
        self.assertEqual(intent1.kind, "tool")
        self.assertEqual(intent1.tool_name, "security_posture_eval")

        intent2 = self.router.route("inspect running processes for anomalies")
        self.assertEqual(intent2.kind, "tool")
        self.assertEqual(intent2.tool_name, "security_process_inspect")

        intent3 = self.router.route("show open listening ports")
        self.assertEqual(intent3.kind, "tool")
        self.assertEqual(intent3.tool_name, "security_listening_ports")

        intent4 = self.router.route("run security self-test")
        self.assertEqual(intent4.kind, "tool")
        self.assertEqual(intent4.tool_name, "security_self_test")


if __name__ == "__main__":
    unittest.main()
