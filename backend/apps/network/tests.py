"""Django API tests for network inventory, safety gate, alerts, and DNS logs."""
import datetime
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.network.models import (
    DeviceSighting,
    DnsQueryLog,
    NetworkAlert,
    NetworkDevice,
    NetworkSubnetConfirmation,
)

User = get_user_model()


class NetworkApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="netuser", password="password123")
        self.other_user = User.objects.create_user(username="otheruser", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_subnet_get_and_confirm(self):
        # 1. GET detected subnets
        res = self.client.get("/api/network/subnet/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)

        # 2. Confirm subnet ownership
        confirm_res = self.client.post(
            "/api/network/subnet/",
            {"subnet": "10.227.244.0/24", "gateway_ip": "10.227.244.14", "confirmed": True},
            format="json",
        )
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)
        self.assertTrue(confirm_res.data["confirmed_by_user"])
        self.assertEqual(confirm_res.data["subnet"], "10.227.244.0/24")

        # 3. Check persistence
        conf = NetworkSubnetConfirmation.objects.get(user=self.user, subnet="10.227.244.0/24")
        self.assertTrue(conf.confirmed_by_user)

    def test_scan_blocked_by_safety_gate_until_confirmed(self):
        # Subnet 192.168.99.0/24 not confirmed
        res = self.client.post("/api/network/scan/", {"subnet": "192.168.99.0/24"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data["error"]["code"], "SUBNET_NOT_CONFIRMED")
        self.assertIn("SAFETY BOUNDARY", res.data["error"]["message"])

        # Now confirm it
        NetworkSubnetConfirmation.objects.create(
            user=self.user,
            subnet="192.168.99.0/24",
            confirmed_by_user=True,
        )

        # Now scan should proceed without 403
        res2 = self.client.post("/api/network/scan/", {"subnet": "192.168.99.0/24"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["status"], "success")

    def test_device_crud_and_user_isolation(self):
        # Create device for self
        dev1 = NetworkDevice.objects.create(
            user=self.user,
            mac_address="AA:BB:CC:11:22:33",
            ip_address="10.0.0.5",
            hostname="my-laptop",
            vendor="Intel",
            label=NetworkDevice.Label.MINE,
        )
        # Create device for other user
        NetworkDevice.objects.create(
            user=self.other_user,
            mac_address="DD:EE:FF:11:22:33",
            ip_address="10.0.0.99",
            hostname="other-laptop",
            vendor="Apple",
        )

        # List devices for user
        res = self.client.get("/api/network/devices/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["mac_address"], "AA:BB:CC:11:22:33")

        # Update label and notes
        patch_res = self.client.patch(
            f"/api/network/devices/{dev1.id}/",
            {"label": "family", "notes": "Living room PC"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["label"], "family")
        self.assertEqual(patch_res.data["notes"], "Living room PC")

        # Delete device
        del_res = self.client.delete(f"/api/network/devices/{dev1.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(NetworkDevice.objects.filter(id=dev1.id).exists())

    def test_alerts_lifecycle(self):
        dev = NetworkDevice.objects.create(
            user=self.user,
            mac_address="11:22:33:44:55:66",
            ip_address="10.0.0.20",
            vendor="Raspberry Pi",
        )
        alert = NetworkAlert.objects.create(
            user=self.user,
            device=dev,
            alert_type=NetworkAlert.AlertType.NEW_DEVICE,
            severity=NetworkAlert.Severity.INFO,
            message="New Raspberry Pi discovered",
        )

        # GET alerts
        res = self.client.get("/api/network/alerts/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertFalse(res.data[0]["is_acknowledged"])

        # Ack single alert
        ack_res = self.client.post(f"/api/network/alerts/{alert.id}/ack/")
        self.assertEqual(ack_res.status_code, status.HTTP_200_OK)
        self.assertTrue(ack_res.data["is_acknowledged"])

        # Ack all
        NetworkAlert.objects.create(
            user=self.user,
            device=dev,
            alert_type=NetworkAlert.AlertType.IP_CHANGED,
            severity=NetworkAlert.Severity.LOW,
            message="IP changed",
        )
        ack_all_res = self.client.post("/api/network/alerts/ack-all/")
        self.assertEqual(ack_all_res.status_code, status.HTTP_200_OK)
        self.assertEqual(ack_all_res.data["acknowledged_count"], 1)
        self.assertEqual(NetworkAlert.objects.filter(user=self.user, is_acknowledged=False).count(), 0)

    def test_dns_lookup_and_import(self):
        # Lookup localhost
        lookup_res = self.client.post("/api/network/dns/lookup/", {"query": "localhost"}, format="json")
        self.assertEqual(lookup_res.status_code, status.HTTP_200_OK)
        self.assertEqual(lookup_res.data["status"], "success")

        # Check that query was logged
        self.assertTrue(DnsQueryLog.objects.filter(user=self.user, domain="localhost").exists())

        # Bulk import JSON entries
        import_res = self.client.post(
            "/api/network/dns/import/",
            {
                "entries": [
                    {
                        "domain": "router.local",
                        "client_ip": "10.0.0.15",
                        "query_type": "A",
                        "response": "10.0.0.1",
                    },
                    {
                        "domain": "nas.local",
                        "client_ip": "10.0.0.15",
                        "query_type": "A",
                        "response": "10.0.0.2",
                    },
                ]
            },
            format="json",
        )
        self.assertEqual(import_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(import_res.data["imported_count"], 2)

        # GET DNS logs
        dns_res = self.client.get("/api/network/dns/?search=nas.local")
        self.assertEqual(dns_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(dns_res.data), 1)
        self.assertEqual(dns_res.data[0]["domain"], "nas.local")

    def test_export_and_retention_clear(self):
        dev = NetworkDevice.objects.create(
            user=self.user,
            mac_address="AA:11:22:33:44:55",
            ip_address="10.0.0.50",
            vendor="Google",
        )
        # Sighting from 100 days ago
        old_time = timezone.now() - datetime.timedelta(days=100)
        sighting = DeviceSighting.objects.create(device=dev, ip_address="10.0.0.50")
        DeviceSighting.objects.filter(id=sighting.id).update(timestamp=old_time)

        # Export
        exp_res = self.client.get("/api/network/export/")
        self.assertEqual(exp_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(exp_res.data["devices"]), 1)

        # Prune 90 days
        prune_res = self.client.post("/api/network/clear/", {"scope": "prune_90_days"}, format="json")
        self.assertEqual(prune_res.status_code, status.HTTP_200_OK)
        self.assertEqual(prune_res.data["deleted_sightings"], 1)

        # Clear all
        clear_res = self.client.post("/api/network/clear/", {"scope": "all"}, format="json")
        self.assertEqual(clear_res.status_code, status.HTTP_200_OK)
        self.assertEqual(NetworkDevice.objects.filter(user=self.user).count(), 0)

    def test_generic_tool_runner_network_summary(self):
        res = self.client.post("/api/tools/network_inventory_summary/run/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "executed")
        self.assertIn("total_devices", res.data["result"])
