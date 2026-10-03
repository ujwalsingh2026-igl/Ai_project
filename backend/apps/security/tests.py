"""Tests for apps.security: scan findings, quarantine vault, incidents, and firewall rules."""
from __future__ import annotations

import io
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.permissions.models import PendingApproval
from apps.security.models import FirewallRule, IncidentTimeline, QuarantineItem, ScanFinding, SecurityIncident

User = get_user_model()

EICAR_SAMPLE = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


class SecurityScannerApiTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.user = User.objects.create_user(username="alice", password="password123")
        self.other_user = User.objects.create_user(username="bob", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_scan_clean_file_upload(self):
        clean_content = b"print('Hello defensive world! This is a simple safe python script.')\n"
        uploaded = SimpleUploadedFile("clean_script.py", clean_content, content_type="text/x-python")

        resp = self.client.post("/api/security/scan/", {"file": uploaded}, format="multipart")
        self.assertEqual(resp.status_code, 201)
        data = resp.json()

        self.assertEqual(data["file_name"], "clean_script.py")
        self.assertEqual(data["verdict"], "clean")
        self.assertTrue(data["threat_score"] < 30)
        self.assertTrue(len(data["sha256"]) == 64)
        self.assertTrue(len(data["md5"]) == 32)
        self.assertIn("disclaimer", data["file_metadata"])

        # Check DB persistence
        self.assertEqual(ScanFinding.objects.filter(user=self.user).count(), 1)

    def test_scan_eicar_test_sample_upload(self):
        uploaded = SimpleUploadedFile("eicar_test.com", EICAR_SAMPLE, content_type="application/octet-stream")

        resp = self.client.post("/api/security/scan/", {"file": uploaded}, format="multipart")
        self.assertEqual(resp.status_code, 201)
        data = resp.json()

        self.assertEqual(data["verdict"], "likely_malicious")
        self.assertTrue(data["threat_score"] >= 80)
        facts = [e["fact"] for e in data["evidence"]]
        self.assertTrue(any("EICAR" in f for f in facts))

    def test_scan_by_local_path(self):
        with tempfile.NamedTemporaryFile("w+", suffix=".txt", delete=False) as tf:
            tf.write("Clean text content for defensive static path inspection.")
            temp_path = tf.name

        try:
            resp = self.client.post("/api/security/scan/", {"path": temp_path}, format="json")
            self.assertEqual(resp.status_code, 201)
            data = resp.json()
            self.assertEqual(data["verdict"], "clean")
        finally:
            if Path(temp_path).exists():
                Path(temp_path).unlink()

    def test_quarantine_approval_and_restore_flow(self):
        # Create a mock suspicious file to quarantine
        with tempfile.NamedTemporaryFile("wb", suffix=".bin", delete=False) as tf:
            tf.write(b"Suspicious mock binary bytes")
            sample_path = tf.name

        try:
            # 1. POST /api/security/quarantine/action/ -> Level 4 requires approval -> 202 needs_approval
            resp = self.client.post("/api/security/quarantine/action/", {"path": sample_path, "notes": "Test quarantine"})
            self.assertEqual(resp.status_code, 202)
            action_id = resp.json()["pending_action_id"]

            # Verify pending approval created
            pending = PendingApproval.objects.get(pk=action_id)
            self.assertEqual(pending.tool_name, "security_file_quarantine")
            self.assertEqual(pending.status, PendingApproval.Status.PENDING)

            # 2. Confirm the action with approval
            confirm_resp = self.client.post("/api/assistant/confirm/", {"action_id": action_id, "decision": "approve"})
            self.assertEqual(confirm_resp.status_code, 200)

            # Original file should have been moved away
            self.assertFalse(Path(sample_path).exists())

            # Quarantine item should exist in database
            q_items = self.client.get("/api/security/quarantine/").json()
            self.assertEqual(len(q_items), 1)
            q_item = q_items[0]
            self.assertEqual(q_item["status"], "quarantined")
            quarantine_path = Path(q_item["quarantine_path"])
            self.assertTrue(quarantine_path.exists())

            # 3. Request restore -> Level 4 requires approval
            restore_req = self.client.post(f"/api/security/quarantine/{q_item['id']}/restore/")
            self.assertEqual(restore_req.status_code, 202)
            restore_action_id = restore_req.json()["pending_action_id"]

            # Confirm restore
            self.client.post("/api/assistant/confirm/", {"action_id": restore_action_id, "decision": "approve"})

            # File should be restored to original path
            self.assertTrue(Path(sample_path).exists())
            self.assertFalse(quarantine_path.exists())

            q_item_after = self.client.get("/api/security/quarantine/").json()[0]
            self.assertEqual(q_item_after["status"], "restored")
        finally:
            if Path(sample_path).exists():
                Path(sample_path).unlink()

    def test_quarantine_permanent_delete_flow(self):
        with tempfile.NamedTemporaryFile("wb", suffix=".trash", delete=False) as tf:
            tf.write(b"content to be permanently destroyed")
            trash_path = tf.name

        try:
            # Quarantine file
            resp = self.client.post("/api/security/quarantine/action/", {"path": trash_path})
            action_id = resp.json()["pending_action_id"]
            self.client.post("/api/assistant/confirm/", {"action_id": action_id, "decision": "approve"})

            q_item = self.client.get("/api/security/quarantine/").json()[0]
            q_path = Path(q_item["quarantine_path"])
            self.assertTrue(q_path.exists())

            # Request delete
            del_resp = self.client.post(f"/api/security/quarantine/{q_item['id']}/delete/")
            self.assertEqual(del_resp.status_code, 202)
            del_action_id = del_resp.json()["pending_action_id"]

            # Confirm delete
            self.client.post("/api/assistant/confirm/", {"action_id": del_action_id, "decision": "approve"})

            # Quarantined file on disk should be gone
            self.assertFalse(q_path.exists())
            q_item_final = self.client.get("/api/security/quarantine/").json()[0]
            self.assertEqual(q_item_final["status"], "deleted")
        finally:
            if Path(trash_path).exists():
                Path(trash_path).unlink()

    def test_hash_lookup_eicar_and_unknown(self):
        # Known EICAR hash
        resp = self.client.post(
            "/api/security/hash-lookup/",
            {"hash": "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "found")
        self.assertIn("EICAR", data["description"])

        # Unknown hash
        resp2 = self.client.post("/api/security/hash-lookup/", {"hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"})
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        self.assertEqual(data2["status"], "not_found")
        self.assertIn("privacy", data2["message"].lower())


class SecurityIncidentsApiTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.user = User.objects.create_user(username="alice", password="password123")
        self.other_user = User.objects.create_user(username="bob", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_incidents_and_filter(self):
        SecurityIncident.objects.create(
            user=self.user,
            title="High Alert Incident",
            description="Brute force test",
            severity="high",
            category="brute_force",
            status="open",
            source_type="ip",
            source_val="192.168.1.100",
            playbook_id="pb-brute-force",
        )
        SecurityIncident.objects.create(
            user=self.user,
            title="Low Alert Incident",
            description="Minor observation",
            severity="low",
            category="audit",
            status="resolved",
            source_type="system",
            source_val="localhost",
        )
        # Other user's incident should be isolated
        SecurityIncident.objects.create(
            user=self.other_user,
            title="Bob Incident",
            description="Private",
            severity="critical",
            status="open",
        )

        resp = self.client.get("/api/security/incidents/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

        # Filter by status
        resp_filtered = self.client.get("/api/security/incidents/?status=open")
        self.assertEqual(resp_filtered.status_code, 200)
        self.assertEqual(len(resp_filtered.json()), 1)
        self.assertEqual(resp_filtered.json()[0]["title"], "High Alert Incident")

    def test_incident_detail_and_update(self):
        inc = SecurityIncident.objects.create(
            user=self.user,
            title="Suspicious Process Incident",
            description="Typosquatted binary running",
            severity="high",
            category="suspicious_process",
            status="open",
            source_type="process",
            source_val="PID 5500",
            playbook_id="pb-suspicious-process",
        )

        # Get detail
        detail_resp = self.client.get(f"/api/security/incidents/{inc.id}/")
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.json()["id"], inc.id)

        # Patch update
        patch_resp = self.client.patch(
            f"/api/security/incidents/{inc.id}/update/",
            {"status": "investigating", "playbook_progress": ["step_1"], "notes": "Investigating process tree."},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, 200)
        data = patch_resp.json()
        self.assertEqual(data["status"], "investigating")
        self.assertEqual(data["playbook_progress"], ["step_1"])
        self.assertEqual(data["notes"], "Investigating process tree.")

        # Verify timeline recorded the status change
        inc.refresh_from_db()
        self.assertTrue(inc.timeline.filter(action="status_changed").exists())
        self.assertTrue(inc.timeline.filter(action="playbook_updated").exists())

    def test_run_threat_detector_endpoint(self):
        resp = self.client.post("/api/security/incidents/run-detector/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("findings_count", data)
        self.assertIn("summary", data)

    def test_kill_process_action_requires_approval(self):
        # Level 4 action -> returns 202 needs_approval
        resp = self.client.post("/api/security/actions/kill-process/", {"pid": 9999, "process_name": "malicious.exe"})
        self.assertEqual(resp.status_code, 202)
        data = resp.json()
        self.assertEqual(data["status"], "needs_approval")
        self.assertIn("pending_action_id", data)

        # Verify PendingApproval model record exists
        pending = PendingApproval.objects.get(pk=data["pending_action_id"])
        self.assertEqual(pending.tool_name, "security_kill_process")
        self.assertEqual(pending.args["pid"], 9999)

    def test_kill_process_action_blocks_system_pids(self):
        # Level 4 tool checks PID 0 and 4 as hard boundaries
        # When confirmed/approved, running on PID 4 raises error / blocks
        action_resp = self.client.post("/api/security/actions/kill-process/", {"pid": 4})
        action_id = action_resp.json()["pending_action_id"]

        confirm_resp = self.client.post("/api/assistant/confirm/", {"action_id": action_id, "decision": "approve"})
        self.assertEqual(confirm_resp.status_code, 200)
        data = confirm_resp.json()
        self.assertEqual(data["status"], "error")
        self.assertIn("could not run", data["message"].lower())

    def test_block_ip_action_requires_approval(self):
        resp = self.client.post("/api/security/actions/block-ip/", {"ip_address": "198.51.100.44", "reason": "Attack IP"})
        self.assertEqual(resp.status_code, 202)
        data = resp.json()
        self.assertEqual(data["status"], "needs_approval")
        self.assertIn("pending_action_id", data)

        # Approve action
        action_id = data["pending_action_id"]
        confirm_resp = self.client.post("/api/assistant/confirm/", {"action_id": action_id, "decision": "approve"})
        self.assertEqual(confirm_resp.status_code, 200)

        # Verify firewall rule record exists
        rule = FirewallRule.objects.filter(user=self.user, ip_address="198.51.100.44").first()
        self.assertIsNotNone(rule)
        self.assertEqual(rule.status, "active")

    def test_block_ip_protects_loopback(self):
        action_resp = self.client.post("/api/security/actions/block-ip/", {"ip_address": "127.0.0.1"})
        action_id = action_resp.json()["pending_action_id"]

        confirm_resp = self.client.post("/api/assistant/confirm/", {"action_id": action_id, "decision": "approve"})
        self.assertEqual(confirm_resp.status_code, 200)
        data = confirm_resp.json()
        self.assertEqual(data["status"], "error")
        self.assertIn("could not run", data["message"].lower())

    def test_firewall_rules_and_rollback(self):
        rule = FirewallRule.objects.create(
            user=self.user,
            rule_name="AegisBlock_203_0_113_50",
            ip_address="203.0.113.50",
            direction="inbound",
            action="block",
            rollback_cmd='netsh advfirewall firewall delete rule name="AegisBlock_203_0_113_50"',
        )

        list_resp = self.client.get("/api/security/firewall-rules/")
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.json()), 1)

        rollback_resp = self.client.post(f"/api/security/firewall-rules/{rule.id}/rollback/")
        self.assertEqual(rollback_resp.status_code, 200)
        self.assertEqual(rollback_resp.json()["status"], "removed")

        rule.refresh_from_db()
        self.assertEqual(rule.status, "removed")

    def test_security_summary_endpoint(self):
        SecurityIncident.objects.create(
            user=self.user,
            title="Critical Incident",
            description="Alert",
            severity="critical",
            status="open",
        )
        resp = self.client.get("/api/security/summary/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["open_incidents"], 1)
        self.assertEqual(data["critical_incidents"], 1)
