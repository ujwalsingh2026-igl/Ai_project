"""Serializers for network inventory and DNS query logs."""
from rest_framework import serializers

from .models import (
    DeviceSighting,
    DnsQueryLog,
    NetworkAlert,
    NetworkDevice,
    NetworkSubnetConfirmation,
)


class NetworkSubnetConfirmationSerializer(serializers.ModelSerializer):
    class Meta:
        model = NetworkSubnetConfirmation
        fields = [
            "id",
            "subnet",
            "gateway_ip",
            "interface_name",
            "confirmed_by_user",
            "confirmed_at",
            "updated_at",
        ]
        read_only_fields = ["id", "confirmed_at", "updated_at"]


class DeviceSightingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceSighting
        fields = ["id", "ip_address", "timestamp"]


class NetworkDeviceSerializer(serializers.ModelSerializer):
    sightings_count = serializers.IntegerField(source="sightings.count", read_only=True)

    class Meta:
        model = NetworkDevice
        fields = [
            "id",
            "mac_address",
            "ip_address",
            "hostname",
            "vendor",
            "label",
            "notes",
            "first_seen",
            "last_seen",
            "is_online",
            "sightings_count",
        ]
        read_only_fields = ["id", "first_seen", "last_seen", "sightings_count"]


class NetworkAlertSerializer(serializers.ModelSerializer):
    device_hostname = serializers.CharField(source="device.hostname", read_only=True, default="")
    device_mac = serializers.CharField(source="device.mac_address", read_only=True, default="")

    class Meta:
        model = NetworkAlert
        fields = [
            "id",
            "device",
            "device_hostname",
            "device_mac",
            "alert_type",
            "severity",
            "message",
            "is_acknowledged",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DnsQueryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DnsQueryLog
        fields = [
            "id",
            "domain",
            "client_ip",
            "query_type",
            "response",
            "timestamp",
            "source",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
