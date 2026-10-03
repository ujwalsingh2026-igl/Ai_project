import unittest

from core.permissions import Decision, PermissionContext, PermissionEngine, RiskLevel, parse_policy_overrides
from core.tools import ToolSpec


def spec(level, perm="test.use"):
    return ToolSpec(name="dummy_tool", description="d", risk_level=level, required_permission=perm,
                    input_schema={"type": "object"}, output_schema={"type": "object"}, allowed_operations=("read",))


class PermissionEngineTests(unittest.TestCase):
    def setUp(self):
        self.engine = PermissionEngine()
        self.ctx = PermissionContext(user_id=1)

    def test_default_decisions(self):
        expected = {0: Decision.ALLOW, 1: Decision.ASK, 2: Decision.ALLOW,
                    3: Decision.ASK, 4: Decision.ASK, 5: Decision.BLOCK}
        for level, decision in expected.items():
            self.assertEqual(self.engine.evaluate(spec(level), self.ctx).decision, decision, f"level {level}")

    def test_level5_blocked_even_with_approval(self):
        ctx = PermissionContext(user_id=1, approved_once=True)
        self.assertEqual(self.engine.evaluate(spec(5), ctx).decision, Decision.BLOCK)

    def test_config_cannot_auto_allow_level_3_or_4(self):
        engine = PermissionEngine({RiskLevel.EXTERNAL_COMMUNICATION: Decision.ALLOW,
                                   RiskLevel.SECURITY_RESPONSE: Decision.ALLOW})
        self.assertEqual(engine.evaluate(spec(3), self.ctx).decision, Decision.ASK)
        self.assertEqual(engine.evaluate(spec(4), self.ctx).decision, Decision.ASK)

    def test_approval_allows_level_3_and_4(self):
        ctx = PermissionContext(user_id=1, approved_once=True)
        self.assertEqual(self.engine.evaluate(spec(3), ctx).decision, Decision.ALLOW)
        self.assertEqual(self.engine.evaluate(spec(4), ctx).decision, Decision.ALLOW)

    def test_user_selected_resource_allows_level_1(self):
        ctx = PermissionContext(user_id=1, user_selected_resource=True)
        self.assertEqual(self.engine.evaluate(spec(1), ctx).decision, Decision.ALLOW)

    def test_user_selected_resource_does_not_help_level_3(self):
        ctx = PermissionContext(user_id=1, user_selected_resource=True)
        self.assertEqual(self.engine.evaluate(spec(3), ctx).decision, Decision.ASK)

    def test_revoked_permission_blocks_even_safe_tool(self):
        ctx = PermissionContext(user_id=1, denied_permissions=frozenset({"test.use"}))
        self.assertEqual(self.engine.evaluate(spec(0), ctx).decision, Decision.BLOCK)

    def test_unknown_risk_level_fails_closed(self):
        class Fake:
            risk_level = 99
            required_permission = "x.y"
        self.assertEqual(self.engine.evaluate(Fake(), self.ctx).decision, Decision.BLOCK)


class ParseOverridesTests(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(parse_policy_overrides("2:ask"), {RiskLevel.DEVICE_INFO: Decision.ASK})
        self.assertEqual(parse_policy_overrides(" 1:allow , 2:ASK "),
                         {RiskLevel.USER_DATA: Decision.ALLOW, RiskLevel.DEVICE_INFO: Decision.ASK})

    def test_empty(self):
        self.assertEqual(parse_policy_overrides(""), {})
        self.assertEqual(parse_policy_overrides(None), {})

    def test_invalid_fails_loudly(self):
        for bad in ["2:maybe", "9:ask", "ask", "2", "x:ask"]:
            with self.assertRaises(ValueError, msg=bad):
                parse_policy_overrides(bad)

    def test_override_cannot_make_level_4_auto_allow(self):
        engine = PermissionEngine(parse_policy_overrides("4:allow,5:allow"))
        ctx = PermissionContext(user_id=1)
        self.assertEqual(engine.evaluate(spec(4), ctx).decision, Decision.ASK)
        self.assertEqual(engine.evaluate(spec(5), ctx).decision, Decision.BLOCK)


if __name__ == "__main__":
    unittest.main()
