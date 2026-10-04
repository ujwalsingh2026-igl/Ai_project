"""Unit tests for defensive cybersecurity decision support tools."""
import unittest

from core.builtin_tools.cybersecurity import (
    CybersecurityDatasetCatalogTool,
    CybersecurityThreatLookupTool,
    NetworkAnomalyDetectorTool,
    WafPayloadAnalyzerTool,
)


class TestCybersecurityTools(unittest.TestCase):
    def setUp(self):
        self.threat_tool = CybersecurityThreatLookupTool()
        self.nids_tool = NetworkAnomalyDetectorTool()
        self.waf_tool = WafPayloadAnalyzerTool()
        self.catalog_tool = CybersecurityDatasetCatalogTool()

    def test_threat_lookup_syn_flood(self):
        result = self.threat_tool.run({"query": "SYN Flood"})
        self.assertGreaterEqual(result["count"], 1)
        first = result["results"][0]
        self.assertIn("DoS", first["category"])
        self.assertEqual(first["severity"], "HIGH")
        self.assertIn("T1498", first["mitre_attack_id"])
        self.assertIn("SYN Cookies", first["defensive_mitigation"])
        self.assertIn("DEFENSIVE POLICY NOTICE", result["disclaimer"])

    def test_threat_lookup_sql_injection(self):
        result = self.threat_tool.run({"query": "SQL Injection"})
        self.assertGreaterEqual(result["count"], 1)
        first = result["results"][0]
        self.assertEqual(first["severity"], "CRITICAL")
        self.assertEqual(first["cve_cwe"], "CWE-89")
        self.assertIn("parameterized", first["defensive_mitigation"].lower())

    def test_threat_lookup_unknown(self):
        result = self.threat_tool.run({"query": "NonExistentThreatXYZ123"})
        self.assertEqual(result["count"], 0)
        self.assertIn("No threat signatures found", result["message"])

    def test_nids_benign_traffic(self):
        result = self.nids_tool.run({
            "protocol": "tcp",
            "service": "http",
            "flag": "SF",
            "src_bytes": 240,
            "dst_bytes": 1024,
            "count": 5,
            "serror_rate": 0.0,
            "rerror_rate": 0.0,
        })
        cls = result["classification"]
        self.assertFalse(cls["is_anomaly"])
        self.assertEqual(cls["attack_class"], "Normal")
        self.assertEqual(cls["severity"], "LOW")

    def test_nids_neptune_syn_flood(self):
        result = self.nids_tool.run({
            "protocol": "tcp",
            "service": "private",
            "flag": "S0",
            "src_bytes": 0,
            "dst_bytes": 0,
            "count": 120,
            "serror_rate": 1.0,
            "rerror_rate": 0.0,
        })
        cls = result["classification"]
        self.assertTrue(cls["is_anomaly"])
        self.assertEqual(cls["attack_class"], "DoS")
        self.assertEqual(cls["attack_label"], "neptune")
        self.assertEqual(cls["severity"], "HIGH")
        self.assertIn("SYN Cookies", result["recommended_mitigation"])

    def test_nids_icmp_smurf_flood(self):
        result = self.nids_tool.run({
            "protocol": "icmp",
            "service": "eco_i",
            "flag": "SF",
            "src_bytes": 20,
            "dst_bytes": 0,
            "count": 50,
            "serror_rate": 0.0,
            "rerror_rate": 0.0,
        })
        cls = result["classification"]
        self.assertTrue(cls["is_anomaly"])
        self.assertEqual(cls["attack_class"], "DoS")
        self.assertEqual(cls["attack_label"], "smurf")

    def test_nids_portsweep_reconnaissance(self):
        result = self.nids_tool.run({
            "protocol": "tcp",
            "service": "telnet",
            "flag": "REJ",
            "src_bytes": 0,
            "dst_bytes": 0,
            "count": 45,
            "serror_rate": 0.0,
            "rerror_rate": 0.85,
        })
        cls = result["classification"]
        self.assertTrue(cls["is_anomaly"])
        self.assertEqual(cls["attack_class"], "Probe")
        self.assertEqual(cls["attack_label"], "portsweep")

    def test_waf_benign_query(self):
        result = self.waf_tool.run({"payload": "/search?q=wireless+headphones&page=1"})
        self.assertFalse(result["is_malicious"])
        self.assertEqual(result["primary_threat_type"], "Benign")
        self.assertEqual(result["recommended_waf_action"], "ALLOW")

    def test_waf_sql_injection(self):
        result = self.waf_tool.run({"payload": "' UNION SELECT username, password FROM users--"})
        self.assertTrue(result["is_malicious"])
        self.assertIn("SQL Injection", result["primary_threat_type"])
        self.assertEqual(result["recommended_waf_action"], "BLOCK")
        self.assertEqual(result["risk_level"], "CRITICAL")

    def test_waf_xss_injection(self):
        result = self.waf_tool.run({"payload": "<script>alert(document.cookie)</script>"})
        self.assertTrue(result["is_malicious"])
        self.assertIn("Cross-Site Scripting", result["primary_threat_type"])
        self.assertEqual(result["recommended_waf_action"], "BLOCK")

    def test_waf_path_traversal(self):
        result = self.waf_tool.run({"payload": "/download?file=../../../../etc/passwd"})
        self.assertTrue(result["is_malicious"])
        self.assertIn("Path Traversal", result["primary_threat_type"])
        self.assertEqual(result["recommended_waf_action"], "BLOCK")

    def test_dataset_catalog(self):
        all_res = self.catalog_tool.run({})
        self.assertGreaterEqual(all_res["count"], 6)

        ember_res = self.catalog_tool.run({"query": "EMBER"})
        self.assertGreaterEqual(ember_res["count"], 1)
        self.assertIn("EMBER", ember_res["datasets"][0]["name"])
        self.assertIn("LightGBM", ember_res["datasets"][0]["recommended_models"])


if __name__ == "__main__":
    unittest.main()
