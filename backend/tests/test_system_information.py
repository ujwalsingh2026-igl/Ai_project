import json
import platform
import socket
import unittest

from core.builtin_tools.system_information import SystemInformationTool
from core.permissions import PermissionContext, PermissionEngine
from core.tools import OutcomeStatus, ToolExecutor, ToolRegistry


class SystemInformationTests(unittest.TestCase):
    def setUp(self):
        registry = ToolRegistry()
        registry.register(SystemInformationTool())
        self.executor = ToolExecutor(registry, PermissionEngine())
        self.ctx = PermissionContext(user_id=1)

    def test_full_run(self):
        out = self.executor.execute("system_information", {}, self.ctx)
        self.assertEqual(out.status, OutcomeStatus.EXECUTED)
        self.assertEqual(set(out.result), {"os", "python", "cpu", "memory", "disk"})
        self.assertEqual(out.result["python"]["version"], platform.python_version())
        self.assertIn("OS:", out.summary)

    def test_single_section(self):
        out = self.executor.execute("system_information", {"sections": ["python"]}, self.ctx)
        self.assertEqual(list(out.result), ["python"])

    def test_bad_section_rejected(self):
        out = self.executor.execute("system_information", {"sections": ["processes"]}, self.ctx)
        self.assertEqual(out.status, OutcomeStatus.INVALID_INPUT)

    def test_no_hostname_in_output(self):
        out = self.executor.execute("system_information", {}, self.ctx)
        self.assertNotIn(socket.gethostname().lower(), json.dumps(out.result).lower())

    def test_infer_args(self):
        tool = SystemInformationTool()
        self.assertEqual(tool.infer_args("how much RAM do I have?"), {"sections": ["memory"]})
        self.assertEqual(tool.infer_args("what system am I running?"), {})


if __name__ == "__main__":
    unittest.main()
