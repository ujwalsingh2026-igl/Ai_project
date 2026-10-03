"""API tests. NOTE: written but NOT YET RUN (Django was not installable in the build sandbox)."""
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.assistant.models import Conversation, Message
from apps.permissions.models import AuditLog
from core.providers import ProviderConfig

User = get_user_model()


class ChatApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("alice", password="a-long-test-password-1")
        self.other = User.objects.create_user("bob", password="a-long-test-password-2")

    def login(self, user=None):
        self.client.force_authenticate(user or self.user)

    def test_health_is_public(self):
        self.assertEqual(self.client.get("/api/health/").json(), {"status": "ok"})

    def test_chat_requires_authentication(self):
        r = self.client.post("/api/assistant/chat/", {"message": "hi"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_chat_creates_conversation_and_both_messages(self):
        self.login()
        r = self.client.post("/api/assistant/chat/", {"message": "Explain loops"}, format="json")
        self.assertEqual(r.status_code, 200)
        conv = Conversation.objects.get(pk=r.json()["conversation_id"])
        self.assertEqual(conv.user, self.user)
        self.assertEqual(list(conv.messages.values_list("role", flat=True)), ["user", "assistant"])

    def test_chat_continues_existing_conversation(self):
        self.login()
        cid = self.client.post("/api/assistant/chat/", {"message": "one"}, format="json").json()["conversation_id"]
        self.client.post("/api/assistant/chat/", {"message": "two", "conversation_id": cid}, format="json")
        self.assertEqual(Message.objects.filter(conversation_id=cid).count(), 4)

    def test_empty_and_too_long_messages_rejected_with_consistent_error(self):
        self.login()
        for bad in ["", "   ", "x" * 5000]:
            r = self.client.post("/api/assistant/chat/", {"message": bad}, format="json")
            self.assertEqual(r.status_code, 400)
            self.assertEqual(r.json()["error"]["code"], "invalid_input")

    def test_cannot_use_another_users_conversation(self):
        self.login(self.other)
        cid = self.client.post("/api/assistant/chat/", {"message": "secret"}, format="json").json()["conversation_id"]
        self.login(self.user)
        r = self.client.post("/api/assistant/chat/", {"message": "hi", "conversation_id": cid}, format="json")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(self.client.get(f"/api/conversations/{cid}/").status_code, 404)

    def test_conversation_list_only_shows_own(self):
        self.login(self.other)
        self.client.post("/api/assistant/chat/", {"message": "bob's"}, format="json")
        self.login(self.user)
        self.assertEqual(self.client.get("/api/conversations/").json(), [])

    def test_system_question_runs_tool_and_writes_audit_log(self):
        self.login()
        r = self.client.post("/api/assistant/chat/", {"message": "What system am I running?"}, format="json")
        self.assertEqual(r.status_code, 200)
        meta = r.json()["reply"]["metadata"]
        self.assertEqual((meta["tool"], meta["tool_status"], meta["decision"]), ("system_information", "executed", "allow"))
        log = AuditLog.objects.get()
        self.assertEqual((log.user, log.tool_name, log.risk_level, log.status), (self.user, "system_information", 2, "executed"))

    def test_tools_endpoint_lists_metadata(self):
        self.login()
        tools = self.client.get("/api/tools/").json()
        self.assertEqual(tools[0]["name"], "system_information")
        for key in ("description", "risk_level", "required_permission", "input_schema", "output_schema", "allowed_operations"):
            self.assertIn(key, tools[0])

    @override_settings(AI_CONFIG=ProviderConfig(provider="local", base_url="http://127.0.0.1:1/v1", model="m", timeout=2))
    def test_provider_failure_returns_502_in_standard_error_shape(self):
        self.login()
        r = self.client.post("/api/assistant/chat/", {"message": "hello"}, format="json")
        self.assertEqual(r.status_code, 502)
        self.assertEqual(r.json()["error"]["code"], "ai_provider_error")

    def test_assistant_status_endpoint(self):
        self.login()
        r = self.client.get("/api/assistant/status/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("ai", data)
        self.assertIn("pending_approvals_count", data)

    def test_audit_logs_endpoint(self):
        self.login()
        # Trigger an audit log entry
        self.client.post("/api/assistant/chat/", {"message": "What system am I running?"}, format="json")
        r = self.client.get("/api/audit/")
        self.assertEqual(r.status_code, 200)
        logs = r.json()
        self.assertGreaterEqual(len(logs), 1)
        self.assertEqual(logs[0]["tool_name"], "system_information")

    def test_pending_approvals_endpoint(self):
        self.login()
        r = self.client.get("/api/assistant/approvals/")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)


from datetime import timedelta  # noqa: E402

from django.utils import timezone  # noqa: E402

from apps.permissions.models import PendingApproval  # noqa: E402
from core.permissions import Decision, RiskLevel  # noqa: E402

ASK_DEVICE_INFO = {RiskLevel.DEVICE_INFO: Decision.ASK}


@override_settings(PERMISSION_OVERRIDES=ASK_DEVICE_INFO)
class ApprovalApiTests(APITestCase):
    """NOTE: written but NOT YET RUN (no Django in the build sandbox)."""

    def setUp(self):
        self.user = User.objects.create_user("alice", password="a-long-test-password-1")
        self.other = User.objects.create_user("bob", password="a-long-test-password-2")
        self.client.force_authenticate(self.user)

    def ask(self):
        r = self.client.post("/api/assistant/chat/", {"message": "What system am I running?"}, format="json")
        self.assertEqual(r.status_code, 200)
        return r.json()

    def confirm(self, action_id, decision="approve"):
        return self.client.post("/api/assistant/confirm/", {"action_id": action_id, "decision": decision}, format="json")

    def test_ask_creates_pending_and_does_not_run_tool(self):
        data = self.ask()
        meta = data["reply"]["metadata"]
        self.assertEqual(meta["tool_status"], "needs_approval")
        self.assertNotIn("OS:", data["reply"]["content"])
        pending = PendingApproval.objects.get(pk=meta["pending_action_id"])
        self.assertEqual((pending.user, pending.status, pending.tool_name), (self.user, "pending", "system_information"))
        self.assertEqual(str(pending.conversation_id), data["conversation_id"])
        self.assertEqual(list(AuditLog.objects.values_list("status", flat=True)), ["needs_approval"])

    def test_approve_runs_tool_and_posts_result_in_same_conversation(self):
        data = self.ask()
        r = self.confirm(data["reply"]["metadata"]["pending_action_id"])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "executed")
        self.assertIn("OS:", r.json()["message"])
        conv = Conversation.objects.get(pk=data["conversation_id"])
        self.assertEqual(conv.messages.count(), 3)          # user, ask-reply, approval result
        self.assertEqual(set(AuditLog.objects.values_list("status", flat=True)), {"needs_approval", "executed"})

    def test_deny_does_not_run_tool(self):
        data = self.ask()
        r = self.confirm(data["reply"]["metadata"]["pending_action_id"], "deny")
        self.assertEqual((r.status_code, r.json()["status"]), (200, "denied"))
        self.assertFalse(AuditLog.objects.filter(status="executed").exists())

    def test_second_confirm_returns_409(self):
        aid = self.ask()["reply"]["metadata"]["pending_action_id"]
        self.confirm(aid)
        r = self.confirm(aid)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["error"]["code"], "approval_not_pending")
        self.assertEqual(AuditLog.objects.filter(status="executed").count(), 1)

    def test_other_user_gets_404_and_cannot_burn_the_action(self):
        aid = self.ask()["reply"]["metadata"]["pending_action_id"]
        self.client.force_authenticate(self.other)
        self.assertEqual(self.confirm(aid).status_code, 404)
        self.assertEqual(PendingApproval.objects.get(pk=aid).status, "pending")

    def test_expired_returns_410_and_does_not_run(self):
        aid = self.ask()["reply"]["metadata"]["pending_action_id"]
        PendingApproval.objects.filter(pk=aid).update(expires_at=timezone.now() - timedelta(seconds=1))
        r = self.confirm(aid)
        self.assertEqual(r.status_code, 410)
        self.assertFalse(AuditLog.objects.filter(status="executed").exists())

    def test_confirm_validation_and_auth(self):
        aid = self.ask()["reply"]["metadata"]["pending_action_id"]
        self.assertEqual(self.confirm(aid, "maybe").status_code, 400)
        self.assertEqual(self.client.post("/api/assistant/confirm/", {"action_id": "not-a-uuid", "decision": "approve"}, format="json").status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.confirm(aid).status_code, 401)

    def test_confirm_ignores_extra_tool_fields(self):
        aid = self.ask()["reply"]["metadata"]["pending_action_id"]
        r = self.client.post("/api/assistant/confirm/", {"action_id": aid, "decision": "approve",
                                                         "tool_name": "other", "args": {"sections": ["disk"]}}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(AuditLog.objects.filter(status="executed").get().tool_name, "system_information")


class SecurityToolsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("secuser", password="a-long-test-password-sec")
        self.client.force_authenticate(self.user)

    def test_run_security_posture_via_api(self):
        r = self.client.post("/api/tools/security_posture_eval/run/", {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "executed")
        self.assertIn("total_score", r.json()["result"])
        self.assertIn("grade", r.json()["result"])

    def test_run_security_process_inspect_via_api(self):
        r = self.client.post("/api/tools/security_process_inspect/run/", {
            "args": {"filter_anomalies_only": False}
        }, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "executed")
        self.assertIn("total_processes", r.json()["result"])

    def test_run_security_listening_ports_via_api(self):
        r = self.client.post("/api/tools/security_listening_ports/run/", {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "executed")
        self.assertIn("count", r.json()["result"])

    def test_run_security_self_test_via_api(self):
        r = self.client.post("/api/tools/security_self_test/run/", {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "executed")
        self.assertEqual(r.json()["result"]["status"], "PASSED_VERIFIED")
        self.assertTrue(r.json()["result"]["hash_matched"])
        self.assertTrue(r.json()["result"]["signature_matched"])


class AssistantMemoryApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("memuser", password="a-long-test-password-mem")
        self.other_user = User.objects.create_user("otheruser", password="a-long-test-password-other")
        self.client.force_authenticate(self.user)

    def test_create_and_list_memories(self):
        r = self.client.post("/api/assistant/memories/", {
            "key": "Theme",
            "content": "Prefers Dark Cockpit theme",
            "category": "preference",
        }, format="json")
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertEqual(data["key"], "Theme")
        self.assertEqual(data["source"], "explicit")

        # List memories
        list_resp = self.client.get("/api/assistant/memories/")
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.json()), 1)
        self.assertEqual(list_resp.json()[0]["key"], "Theme")

    def test_search_and_category_filter(self):
        self.client.post("/api/assistant/memories/", {
            "key": "Subnet",
            "content": "Workstation subnet is 192.168.1.0/24",
            "category": "security_policy",
        }, format="json")
        self.client.post("/api/assistant/memories/", {
            "key": "Stack",
            "content": "Project uses Django 5.2 and React 19",
            "category": "project",
        }, format="json")

        # Filter by category
        cat_resp = self.client.get("/api/assistant/memories/?category=security_policy")
        self.assertEqual(len(cat_resp.json()), 1)
        self.assertEqual(cat_resp.json()[0]["key"], "Subnet")

        # Search
        search_resp = self.client.get("/api/assistant/memories/?search=react")
        self.assertEqual(len(search_resp.json()), 1)
        self.assertEqual(search_resp.json()[0]["key"], "Stack")

    def test_update_and_delete_memory(self):
        create_resp = self.client.post("/api/assistant/memories/", {
            "key": "Language",
            "content": "Python 3.12",
            "category": "preference",
        }, format="json")
        mem_id = create_resp.json()["id"]

        # Update
        patch_resp = self.client.patch(f"/api/assistant/memories/{mem_id}/", {
            "content": "Python 3.14",
        }, format="json")
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.json()["content"], "Python 3.14")

        # Delete
        del_resp = self.client.delete(f"/api/assistant/memories/{mem_id}/")
        self.assertEqual(del_resp.status_code, 200)

        # Confirm deleted
        get_resp = self.client.get(f"/api/assistant/memories/{mem_id}/")
        self.assertEqual(get_resp.status_code, 404)

    def test_clear_all_memories(self):
        self.client.post("/api/assistant/memories/", {"key": "K1", "content": "V1"}, format="json")
        self.client.post("/api/assistant/memories/", {"key": "K2", "content": "V2"}, format="json")

        clear_resp = self.client.post("/api/assistant/memories/clear/")
        self.assertEqual(clear_resp.status_code, 200)
        self.assertEqual(clear_resp.json()["count"], 2)

        list_resp = self.client.get("/api/assistant/memories/")
        self.assertEqual(len(list_resp.json()), 0)

    def test_user_isolation(self):
        create_resp = self.client.post("/api/assistant/memories/", {
            "key": "Private",
            "content": "Alice's private secret note",
        }, format="json")
        mem_id = create_resp.json()["id"]

        # Switch to Bob
        self.client.force_authenticate(self.other_user)
        list_resp = self.client.get("/api/assistant/memories/")
        self.assertEqual(len(list_resp.json()), 0)

        del_resp = self.client.delete(f"/api/assistant/memories/{mem_id}/")
        self.assertEqual(del_resp.status_code, 404)

    def test_run_memory_tools_via_api(self):
        # Run memory_store tool
        r1 = self.client.post("/api/tools/memory_store/run/", {
            "args": {
                "key": "Editor Preference",
                "content": "VSCode / Neovim terminal mode",
                "category": "workflow",
            }
        }, format="json")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json()["status"], "executed")

        # Run memory_recall tool
        r2 = self.client.post("/api/tools/memory_recall/run/", {
            "args": {"category": "all"}
        }, format="json")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["status"], "executed")
        self.assertTrue(r2.json()["result"]["count"] >= 1)

