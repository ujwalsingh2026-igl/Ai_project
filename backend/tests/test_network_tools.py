"""Unit tests for core network tools (pure Python, defensive rules)."""
import unittest

from core.builtin_tools.network import (
    InMemoryNetworkStore,
    NetworkDnsLookupTool,
    NetworkInventorySummaryTool,
    NetworkScanDevicesTool,
    detect_local_subnets,
    lookup_mac_vendor,
    normalize_mac,
    parse_arp_table,
)
from core.permissions import PermissionContext


class MacVendorLookupTests(unittest.TestCase):
    def test_normalize_mac(self):
        self.assertEqual(normalize_mac("aa-bb-cc-dd-ee-ff"), "AA:BB:CC:DD:EE:FF")
        self.assertEqual(normalize_mac("00:1c:b3:01:02:03"), "00:1C:B3:01:02:03")
        self.assertEqual(normalize_mac("aabbccddeeff"), "AA:BB:CC:DD:EE:FF")

    def test_known_vendor_lookup(self):
        self.assertEqual(lookup_mac_vendor("00:1C:B3:11:22:33"), "Apple")
        self.assertEqual(lookup_mac_vendor("2C:33:58:AA:BB:CC"), "Intel")
        self.assertEqual(lookup_mac_vendor("B8:27:EB:12:34:56"), "Raspberry Pi")
        self.assertEqual(lookup_mac_vendor("D8:6C:63:99:88:77"), "Google")

    def test_randomized_private_mac_detection(self):
        # Locally administered bit set: second hex char is 2, 6, A, or E
        self.assertIn("Randomized", lookup_mac_vendor("DA:A1:19:12:34:56"))
        self.assertIn("Randomized", lookup_mac_vendor("72:B2:33:44:55:66"))

    def test_unknown_vendor(self):
        self.assertEqual(lookup_mac_vendor("01:03:05:07:09:0B"), "Unknown Vendor")


class ArpParserTests(unittest.TestCase):
    def test_parse_windows_arp_output(self):
        sample_output = """
Interface: 192.168.1.100 --- 0x3
  Internet Address      Physical Address      Type
  192.168.1.1           00-1c-b3-11-22-33     dynamic   
  192.168.1.25          2c-33-58-aa-bb-cc     dynamic   
  192.168.1.255         ff-ff-ff-ff-ff-ff     static    
  224.0.0.22            01-00-5e-00-00-16     static    
  224.0.0.251           01-00-5e-00-00-fb     static    
  255.255.255.255       ff-ff-ff-ff-ff-ff     static    
"""
        entries = parse_arp_table(sample_output)
        self.assertEqual(len(entries), 2)

        # Check gateway
        self.assertEqual(entries[0]["ip"], "192.168.1.1")
        self.assertEqual(entries[0]["mac"], "00:1C:B3:11:22:33")
        self.assertEqual(entries[0]["vendor"], "Apple")

        # Check second host
        self.assertEqual(entries[1]["ip"], "192.168.1.25")
        self.assertEqual(entries[1]["mac"], "2C:33:58:AA:BB:CC")
        self.assertEqual(entries[1]["vendor"], "Intel")

    def test_broadcast_and_multicast_excluded(self):
        sample = """
  224.0.0.1             01-00-5e-00-00-01     static
  239.255.255.250       01-00-5e-7f-ff-fa     static
  192.168.1.255         ff-ff-ff-ff-ff-ff     static
  255.255.255.255       ff-ff-ff-ff-ff-ff     static
"""
        entries = parse_arp_table(sample)
        self.assertEqual(len(entries), 0)


class NetworkScanToolTests(unittest.TestCase):
    def setUp(self):
        self.store = InMemoryNetworkStore()
        self.tool = NetworkScanDevicesTool(store=self.store)
        self.context = PermissionContext(user_id=1)

    def test_strict_safety_gate_blocks_unconfirmed_subnet(self):
        # Target subnet not confirmed in store
        result = self.tool.run({"subnet": "192.168.1.0/24"}, context=self.context)
        self.assertEqual(result["status"], "blocked")
        self.assertIn("SAFETY BOUNDARY", result["message"])
        self.assertIn("192.168.1.0/24", result["message"])
        self.assertEqual(result["devices_found"], 0)

    def test_scan_confirmed_subnet(self):
        # User explicitly confirms ownership
        self.store.confirm_subnet(user_id=1, subnet="10.227.244.0/24", gateway="10.227.244.14")
        self.assertTrue(self.store.is_subnet_confirmed(1, "10.227.244.0/24"))

        result = self.tool.run({"subnet": "10.227.244.0/24"}, context=self.context)
        self.assertEqual(result["status"], "success")
        self.assertIn("Scanned confirmed subnet", result["message"])
        # Should record devices and sightings in store
        devices = self.store.get_devices(1)
        self.assertIsInstance(devices, list)

    def test_device_ip_change_detection(self):
        self.store.confirm_subnet(user_id=1, subnet="192.168.1.0/24")
        # Pre-seed existing device
        self.store.upsert_device(
            user_id=1,
            mac="AA:BB:CC:11:22:33",
            ip="192.168.1.50",
            hostname="my-laptop",
            vendor="Intel",
            label="mine",
        )
        self.assertEqual(len(self.store.get_devices(1)), 1)
        self.assertEqual(self.store.get_device_by_mac(1, "AA:BB:CC:11:22:33")["ip_address"], "192.168.1.50")


class NetworkDnsLookupToolTests(unittest.TestCase):
    def setUp(self):
        self.tool = NetworkDnsLookupTool()
        self.context = PermissionContext(user_id=1)

    def test_forward_lookup_localhost(self):
        result = self.tool.run({"query": "localhost"}, context=self.context)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["query_type"], "A")
        self.assertTrue(any("127.0.0.1" in ip for ip in result["results"]))

    def test_reverse_lookup_loopback(self):
        result = self.tool.run({"query": "127.0.0.1"}, context=self.context)
        self.assertEqual(result["query_type"], "PTR")
        self.assertIn(result["status"], ["success", "not_found"])

    def test_empty_query_fails_gracefully(self):
        result = self.tool.run({"query": ""}, context=self.context)
        self.assertEqual(result["status"], "error")


class NetworkInventorySummaryToolTests(unittest.TestCase):
    def setUp(self):
        self.store = InMemoryNetworkStore()
        self.tool = NetworkInventorySummaryTool(store=self.store)
        self.context = PermissionContext(user_id=1)

    def test_summary_empty(self):
        res = self.tool.run({}, context=self.context)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["total_devices"], 0)
        self.assertEqual(res["online_devices"], 0)
        self.assertEqual(res["unacknowledged_alerts"], 0)

    def test_summary_with_devices_and_alerts(self):
        self.store.confirm_subnet(1, "192.168.1.0/24")
        d1 = self.store.upsert_device(1, "AA:11:22:33:44:55", "192.168.1.10", "Dev1", "Apple", "mine", True)
        self.store.upsert_device(1, "BB:11:22:33:44:55", "192.168.1.11", "Dev2", "Intel", "guest", False)
        self.store.create_alert(1, d1["id"], "new_device", "info", "New device seen")

        res = self.tool.run({}, context=self.context)
        self.assertEqual(res["total_devices"], 2)
        self.assertEqual(res["online_devices"], 1)
        self.assertEqual(res["confirmed_subnets_count"], 1)
        self.assertEqual(res["unacknowledged_alerts"], 1)
        self.assertEqual(res["labels_breakdown"].get("mine"), 1)
        self.assertEqual(res["labels_breakdown"].get("guest"), 1)


if __name__ == "__main__":
    unittest.main()
