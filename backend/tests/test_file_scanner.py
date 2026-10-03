"""Unit tests for pure Python file threat scanner and quarantine tools."""
import hashlib
import os
import shutil
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

from core.builtin_tools.file_scanner import (
    EICAR_TEST_STRING,
    InMemoryQuarantineStore,
    SecurityFileDeleteTool,
    SecurityFileQuarantineTool,
    SecurityFileRestoreTool,
    SecurityFileScanTool,
    analyze_file,
    calculate_entropy,
    compute_hashes,
    inspect_archive,
    inspect_script_content,
    parse_pe_headers,
)
from core.permissions import PermissionContext


class FileScannerCoreTests(unittest.TestCase):
    def test_calculate_entropy(self):
        # Empty data -> 0.0
        self.assertEqual(calculate_entropy(b""), 0.0)
        # All identical bytes -> 0.0 (zero randomness)
        self.assertEqual(calculate_entropy(b"A" * 1000), 0.0)
        # Full uniform distribution of all 256 bytes -> exactly 8.0
        all_bytes = bytes(range(256)) * 4
        self.assertEqual(calculate_entropy(all_bytes), 8.0)

    def test_compute_hashes(self):
        data = b"hello world"
        hashes = compute_hashes(data)
        self.assertEqual(
            hashes["sha256"],
            hashlib.sha256(data).hexdigest(),
        )
        self.assertEqual(
            hashes["md5"],
            hashlib.md5(data).hexdigest(),
        )

    def test_eicar_scan_verdict(self):
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(EICAR_TEST_STRING)
            filepath = f.name

        try:
            analysis = analyze_file(filepath)
            self.assertEqual(analysis["verdict"], "likely_malicious")
            self.assertEqual(analysis["threat_score"], 100)
            self.assertTrue(any("EICAR" in e["fact"] for e in analysis["evidence"]))
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)

    def test_double_extension_deception(self):
        temp_dir = tempfile.mkdtemp()
        deceptive_file = os.path.join(temp_dir, "quarterly_report.pdf.exe")
        with open(deceptive_file, "wb") as f:
            f.write(b"Harmless test binary content")

        try:
            analysis = analyze_file(deceptive_file)
            self.assertIn(analysis["verdict"], ["suspicious", "likely_malicious"])
            self.assertTrue(any("Double Extension" in m["title"] for m in analysis["yara_matches"]))
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_pe_header_parser(self):
        # Build minimal valid PE binary in memory
        dos_header = bytearray(64)
        dos_header[:2] = b"MZ"
        struct.pack_into("<I", dos_header, 0x3C, 64)  # e_lfanew = 64

        pe_sig = b"PE\0\0"
        # COFF: machine=0x14C (x86), sections=1, timedatestamp=0, sym_ptr=0, num_sym=0, opt_size=28, chars=0x0102
        coff = struct.pack("<HHIIIHH", 0x14C, 1, 0, 0, 0, 28, 0x0102)
        # Optional Header: magic=0x10B (PE32)
        opt_hdr = bytearray(28)
        struct.pack_into("<H", opt_hdr, 0, 0x10B)

        # Section Header: name=".text\0\0\0", v_size=0x1000, v_addr=0x1000, raw_size=512, raw_ptr=156
        sec_hdr = bytearray(40)
        sec_hdr[:8] = b".text\0\0\0"
        struct.pack_into("<IIII", sec_hdr, 8, 0x1000, 0x1000, 512, 156)

        section_data = b"\x90" * 512  # NOP sled

        pe_data = bytes(dos_header + pe_sig + coff + opt_hdr + sec_hdr + section_data)
        pe_parsed = parse_pe_headers(pe_data)

        self.assertTrue(pe_parsed["is_pe"])
        self.assertIn("x86", pe_parsed["machine"])
        self.assertEqual(pe_parsed["num_sections"], 1)
        self.assertEqual(pe_parsed["sections"][0]["name"], ".text")

    def test_script_obfuscation_detection(self):
        powershell_payload = b"powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -Enc aGVsbG8="
        script_info = inspect_script_content(powershell_payload)
        self.assertTrue(script_info["has_suspicious_script"])
        self.assertTrue(any("PowerShell" in s for s in script_info["script_signals"]))

        vba_macro = b"Sub AutoOpen()\n    Shell(\"calc.exe\")\nEnd Sub"
        macro_info = inspect_script_content(vba_macro)
        self.assertTrue(macro_info["has_suspicious_script"])
        self.assertTrue(any("AutoOpen" in s for s in macro_info["script_signals"]))

    def test_archive_inspection(self):
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, "test_archive.zip")
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("benign.txt", "This is benign documentation.")
            zf.writestr("hidden_dropper.vbs", "WScript.Echo 'test'")

        try:
            res = inspect_archive(zip_path)
            self.assertTrue(res["is_archive"])
            self.assertEqual(res["member_count"], 2)
            self.assertTrue(res["has_executable_inside"])
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_quarantine_restore_delete_flow(self):
        temp_dir = tempfile.mkdtemp()
        quarantine_dir = os.path.join(temp_dir, "vault")
        test_file = os.path.join(temp_dir, "suspicious_test.bin")
        with open(test_file, "wb") as f:
            f.write(b"Suspicious payload data for testing")

        store = InMemoryQuarantineStore()
        context = PermissionContext(user_id=1)

        scan_tool = SecurityFileScanTool()
        scan_res = scan_tool.run({"path": test_file}, context=context)
        self.assertEqual(scan_res["status"], "success")

        # 1. Quarantine
        quarantine_tool = SecurityFileQuarantineTool(store=store, quarantine_dir=quarantine_dir)
        q_res = quarantine_tool.run({"path": test_file, "notes": "Test quarantine"}, context=context)
        self.assertEqual(q_res["status"], "success")
        self.assertFalse(os.path.exists(test_file))  # Original moved
        self.assertTrue(os.path.exists(q_res["quarantine_path"]))

        items = store.list_quarantine_items(1)
        self.assertEqual(len(items), 1)
        item_id = items[0]["id"]

        # 2. Restore
        restore_tool = SecurityFileRestoreTool(store=store)
        rest_res = restore_tool.run({"quarantine_id": item_id}, context=context)
        self.assertEqual(rest_res["status"], "success")
        self.assertTrue(os.path.exists(test_file))  # Restored back
        self.assertFalse(os.path.exists(q_res["quarantine_path"]))
        self.assertEqual(store.get_quarantine_item(item_id, 1)["status"], "restored")

        # Re-quarantine for delete test
        q_res2 = quarantine_tool.run({"path": test_file}, context=context)
        item_id2 = store.list_quarantine_items(1)[-1]["id"]

        # 3. Delete
        delete_tool = SecurityFileDeleteTool(store=store)
        del_res = delete_tool.run({"quarantine_id": item_id2}, context=context)
        self.assertEqual(del_res["status"], "success")
        self.assertFalse(os.path.exists(q_res2["quarantine_path"]))
        self.assertEqual(store.get_quarantine_item(item_id2, 1)["status"], "deleted")

        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
