"""Unit tests for pure Python memory store and tools."""
from __future__ import annotations

import unittest

from core.builtin_tools.memory import InMemoryMemoryStore, MemoryRecallTool, MemoryStoreTool
from core.permissions import PermissionContext, RiskLevel
from core.schema import validate


class TestMemoryStore(unittest.TestCase):
    def setUp(self):
        self.store = InMemoryMemoryStore()
        self.user_id = 42
        self.other_user = 99

    def test_add_and_list_memories(self):
        mem1 = self.store.add_memory(
            user_id=self.user_id,
            key="Theme Preference",
            content="Prefers high-contrast terminal theme",
            category="preference",
        )
        self.assertEqual(mem1["id"], 1)
        self.assertEqual(mem1["key"], "Theme Preference")

        mem2 = self.store.add_memory(
            user_id=self.user_id,
            key="Subnet Boundary",
            content="Homelab subnet is 192.168.1.0/24",
            category="security_policy",
        )

        # Other user memory
        self.store.add_memory(
            user_id=self.other_user,
            key="Bob Secret",
            content="Different user data",
        )

        user_mems = self.store.list_memories(self.user_id)
        self.assertEqual(len(user_mems), 2)

        # Category filter
        sec_mems = self.store.list_memories(self.user_id, category="security_policy")
        self.assertEqual(len(sec_mems), 1)
        self.assertEqual(sec_mems[0]["key"], "Subnet Boundary")

    def test_search_memories(self):
        self.store.add_memory(self.user_id, "Python Dev", "Writes Python 3.14 async code", "workflow")
        self.store.add_memory(self.user_id, "Frontend Dev", "Uses React 19 + TypeScript", "workflow")

        results = self.store.list_memories(self.user_id, search="typescript")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["key"], "Frontend Dev")

    def test_update_and_delete_memory(self):
        mem = self.store.add_memory(self.user_id, "Language", "Python", "preference")
        updated = self.store.update_memory(self.user_id, mem["id"], content="Python and Rust")
        self.assertIsNotNone(updated)
        self.assertEqual(updated["content"], "Python and Rust")

        deleted = self.store.delete_memory(self.user_id, mem["id"])
        self.assertTrue(deleted)
        self.assertEqual(len(self.store.list_memories(self.user_id)), 0)

    def test_clear_memories(self):
        self.store.add_memory(self.user_id, "K1", "V1")
        self.store.add_memory(self.user_id, "K2", "V2")
        self.store.add_memory(self.other_user, "K3", "V3")

        cleared = self.store.clear_memories(self.user_id)
        self.assertEqual(cleared, 2)
        self.assertEqual(len(self.store.list_memories(self.user_id)), 0)
        self.assertEqual(len(self.store.list_memories(self.other_user)), 1)


class TestMemoryTools(unittest.TestCase):
    def setUp(self):
        self.store = InMemoryMemoryStore()
        self.store_tool = MemoryStoreTool(self.store)
        self.recall_tool = MemoryRecallTool(self.store)
        self.context = PermissionContext(user_id=1, user_selected_resource=True)

    def test_store_tool_execution(self):
        args = {
            "key": "Editor",
            "content": "Prefers Neovim with terminal keybindings",
            "category": "workflow",
        }
        validate(args, self.store_tool.spec.input_schema)

        result = self.store_tool.run(args, context=self.context)
        self.assertTrue(result["stored"])
        self.assertEqual(result["memory"]["key"], "Editor")

        validate(result, self.store_tool.spec.output_schema)

        summary = self.store_tool.summarize(result)
        self.assertIn("Editor", summary)

    def test_store_tool_infer_args(self):
        inferred = self.store_tool.infer_args("remember that my homelab subnet is 10.0.0.0/24")
        self.assertEqual(inferred["category"], "security_policy")
        self.assertIn("10.0.0.0/24", inferred["content"])

    def test_recall_tool_execution(self):
        self.store.add_memory(1, "Preferred Shell", "PowerShell 7", "workflow")
        self.store.add_memory(1, "Theme", "Dark Cockpit", "preference")

        args = {"category": "all"}
        validate(args, self.recall_tool.spec.input_schema)

        result = self.recall_tool.run(args, context=self.context)
        self.assertEqual(result["count"], 2)

        validate(result, self.recall_tool.spec.output_schema)

        summary = self.recall_tool.summarize(result)
        self.assertIn("Preferred Shell", summary)
        self.assertIn("Dark Cockpit", summary)

    def test_recall_tool_infer_args(self):
        inferred = self.recall_tool.infer_args("what are my security preferences?")
        self.assertEqual(inferred["category"], "security_policy")


if __name__ == "__main__":
    unittest.main()
