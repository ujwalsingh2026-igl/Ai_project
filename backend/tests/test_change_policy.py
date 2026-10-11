import json
import unittest
from pathlib import Path

from core.change_policy import ChangeDecision, ChangeRequest, evaluate_change

D = ChangeDecision
DATA = Path(__file__).resolve().parents[2] / "datasets" / "data"


def decide(kind, target="", **value):
    return evaluate_change(ChangeRequest(kind, target, value)).decision


class ChangePolicyTests(unittest.TestCase):
    def test_personal_preferences_are_allowed(self):
        for kind in ("set_style", "set_language", "remember_fact", "forget_fact", "view_memory",
                     "export_memory", "delete_conversation", "shorten_warnings"):
            self.assertEqual(decide(kind), D.ALLOW, kind)

    def test_never_allowed_from_chat(self):
        for kind in ("disable_audit", "delete_audit_log", "disable_permission_engine", "disable_approval",
                     "approve_all_automatically", "suppress_safety_warnings", "disable_honest_feedback",
                     "train_on_others_data", "reveal_secrets"):
            self.assertEqual(decide(kind), D.BLOCK, kind)

    def test_needs_confirmation(self):
        for kind in ("delete_all_memory", "enable_training_on_my_data", "change_model", "ingest_source",
                     "enable_scheduled_job", "update_threat_rules", "enable_external_provider"):
            self.assertEqual(decide(kind), D.ASK, kind)

    def test_new_tools_and_code_are_proposals_only(self):
        self.assertEqual(decide("add_tool", "battery"), D.PROPOSE_ONLY)
        self.assertEqual(decide("modify_code", "frontend_theme"), D.PROPOSE_ONLY)
        self.assertEqual(decide("add_detection_rule", "process_rules"), D.PROPOSE_ONLY)

    def test_code_guarding_safety_cannot_be_changed(self):
        for target in ("safety", "permissions", "audit", "approvals", "memory_filter", "change_policy"):
            self.assertEqual(decide("modify_code", target), D.BLOCK, target)

    def test_unknown_kind_fails_closed(self):
        self.assertEqual(decide("something_new"), D.BLOCK)

    def test_permission_override_rules(self):
        self.assertEqual(decide("set_permission_override", level=2, decision="ask"), D.ALLOW)      # stricter
        self.assertEqual(decide("set_permission_override", level=2, decision="allow"), D.ALLOW)    # equal to default
        self.assertEqual(decide("set_permission_override", level=1, decision="allow"), D.ASK)      # loosening level 1
        self.assertEqual(decide("set_permission_override", level=3, decision="block"), D.ALLOW)    # stricter
        self.assertEqual(decide("set_permission_override", level=3, decision="allow"), D.BLOCK)    # hard cap
        self.assertEqual(decide("set_permission_override", level=4, decision="allow"), D.BLOCK)    # hard cap
        self.assertEqual(decide("set_permission_override", level=5, decision="allow"), D.BLOCK)
        self.assertEqual(decide("set_permission_override", level=5, decision="ask"), D.BLOCK)
        self.assertEqual(decide("set_permission_override", level=9, decision="ask"), D.BLOCK)      # invalid
        self.assertEqual(decide("set_permission_override", level="x", decision="ask"), D.BLOCK)
        self.assertEqual(decide("set_permission_override"), D.BLOCK)

    @unittest.skipUnless((DATA / "change_requests.jsonl").exists(), "dataset not present")
    def test_dataset_decisions_match_code_and_safety_rules_hold(self):
        rows = [json.loads(l) for l in (DATA / "change_requests.jsonl").read_text(encoding="utf-8").splitlines()]
        self.assertGreater(len(rows), 30)
        for r in rows:
            s = r["structured"]
            got = evaluate_change(ChangeRequest(s["kind"], s["target"], s["value"])).decision.value
            self.assertEqual(got, r["expected_decision"], r["text"])
        # no user sentence in the dataset may end up weakening safety
        for r in rows:
            if r["structured"]["kind"] in ("disable_audit", "delete_audit_log", "approve_all_automatically", "disable_approval"):
                self.assertEqual(r["expected_decision"], "block", r["text"])


if __name__ == "__main__":
    unittest.main()
