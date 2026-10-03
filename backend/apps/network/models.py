"""Data models for persistent network and DNS inventory."""
from django.conf import settings
from django.db import models


class NetworkSubnetConfirmation(models.Model):
    """Explicit confirmation that the user owns/administers this subnet.

    HARD SAFETY BOUNDARY: Device discovery is refused if the target subnet
    has not been confirmed by the user.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="confirmed_subnets",
    )
    subnet = models.CharField(max_length=50)  # e.g. "10.227.244.0/24"
    gateway_ip = models.CharField(max_length=50, blank=True, default="")
    interface_name = models.CharField(max_length=100, blank=True, default="")
    confirmed_by_user = models.BooleanField(default=True)
    confirmed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "subnet")]
        ordering = ["-confirmed_at"]

    def __str__(self):
        return f"{self.subnet} (confirmed: {self.confirmed_by_user})"


class NetworkDevice(models.Model):
    """Known device on user's confirmed local network."""

    class Label(models.TextChoices):
        MINE = "mine", "Mine"
        FAMILY = "family", "Family"
        GUEST = "guest", "Guest"
        UNKNOWN = "unknown", "Unknown"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="network_devices",
    )
    mac_address = models.CharField(max_length=50)  # Normalized uppercase
    ip_address = models.CharField(max_length=50)
    hostname = models.CharField(max_length=255, blank=True, default="")
    vendor = models.CharField(max_length=255, blank=True, default="Unknown Vendor")
    label = models.CharField(max_length=20, choices=Label.choices, default=Label.UNKNOWN)
    notes = models.TextField(blank=True, default="")
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    is_online = models.BooleanField(default=True)

    class Meta:
        unique_together = [("user", "mac_address")]
        ordering = ["-last_seen"]

    def __str__(self):
        return f"{self.hostname or self.ip_address} [{self.mac_address}]"


class DeviceSighting(models.Model):
    """Historical sightings timeline for a known device."""

    device = models.ForeignKey(
        NetworkDevice,
        on_delete=models.CASCADE,
        related_name="sightings",
    )
    ip_address = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.device.mac_address} at {self.ip_address} ({self.timestamp})"


class NetworkAlert(models.Model):
    """Alert raised on new device discovery, IP changes, or anomaly."""

    class AlertType(models.TextChoices):
        NEW_DEVICE = "new_device", "New Device Discovered"
        IP_CHANGED = "ip_changed", "IP Address Changed"
        DEVICE_OFFLINE = "device_offline", "Device Offline"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="network_alerts",
    )
    device = models.ForeignKey(
        NetworkDevice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )
    alert_type = models.CharField(max_length=50, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    message = models.CharField(max_length=255)
    is_acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.message}"


class DnsQueryLog(models.Model):
    """Historical DNS queries (from local lookups or imported router/Pi-hole logs)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dns_query_logs",
    )
    domain = models.CharField(max_length=255)
    client_ip = models.CharField(max_length=50, blank=True, default="")
    query_type = models.CharField(max_length=20, default="A")
    response = models.CharField(max_length=255, blank=True, default="")
    timestamp = models.DateTimeField()
    source = models.CharField(max_length=50, default="lookup")  # lookup, pihole_import, router_import
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.query_type} {self.domain} -> {self.response} ({self.source})"
