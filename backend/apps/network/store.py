"""Django ORM adapter for core.builtin_tools.network.NetworkStore protocol."""
from __future__ import annotations

import datetime
from typing import Any

from core.builtin_tools.network import normalize_mac

from .models import (
    DeviceSighting,
    NetworkAlert,
    NetworkDevice,
    NetworkSubnetConfirmation,
)


class DjangoNetworkStore:
    """Implements NetworkStore protocol using Django ORM."""

    def is_subnet_confirmed(self, user_id: Any, subnet: str) -> bool:
        return NetworkSubnetConfirmation.objects.filter(
            user_id=user_id,
            subnet=subnet,
            confirmed_by_user=True,
        ).exists()

    def list_confirmed_subnets(self, user_id: Any) -> list[dict]:
        qs = NetworkSubnetConfirmation.objects.filter(user_id=user_id, confirmed_by_user=True)
        return [
            {
                "id": s.id,
                "subnet": s.subnet,
                "gateway_ip": s.gateway_ip,
                "interface_name": s.interface_name,
                "confirmed_at": s.confirmed_at.isoformat() if s.confirmed_at else None,
            }
            for s in qs
        ]

    def get_devices(self, user_id: Any) -> list[dict]:
        qs = NetworkDevice.objects.filter(user_id=user_id).order_by("-last_seen")
        return [
            {
                "id": d.id,
                "mac_address": d.mac_address,
                "ip_address": d.ip_address,
                "hostname": d.hostname,
                "vendor": d.vendor,
                "label": d.label,
                "notes": d.notes,
                "first_seen": d.first_seen.isoformat(),
                "last_seen": d.last_seen.isoformat(),
                "is_online": d.is_online,
            }
            for d in qs
        ]

    def get_device_by_mac(self, user_id: Any, mac: str) -> dict | None:
        normalized = normalize_mac(mac)
        d = NetworkDevice.objects.filter(user_id=user_id, mac_address=normalized).first()
        if not d:
            return None
        return {
            "id": d.id,
            "mac_address": d.mac_address,
            "ip_address": d.ip_address,
            "hostname": d.hostname,
            "vendor": d.vendor,
            "label": d.label,
            "notes": d.notes,
            "first_seen": d.first_seen.isoformat(),
            "last_seen": d.last_seen.isoformat(),
            "is_online": d.is_online,
        }

    def upsert_device(
        self,
        user_id: Any,
        mac: str,
        ip: str,
        hostname: str = "",
        vendor: str = "Unknown Vendor",
        label: str = "unknown",
        is_online: bool = True,
    ) -> dict:
        normalized = normalize_mac(mac)
        dev = NetworkDevice.objects.filter(user_id=user_id, mac_address=normalized).first()
        if dev:
            dev.ip_address = ip
            if hostname:
                dev.hostname = hostname
            dev.vendor = vendor
            dev.is_online = is_online
            dev.save()
        else:
            dev = NetworkDevice.objects.create(
                user_id=user_id,
                mac_address=normalized,
                ip_address=ip,
                hostname=hostname,
                vendor=vendor,
                label=label,
                is_online=is_online,
            )

        return {
            "id": dev.id,
            "mac_address": dev.mac_address,
            "ip_address": dev.ip_address,
            "hostname": dev.hostname,
            "vendor": dev.vendor,
            "label": dev.label,
            "notes": dev.notes,
            "first_seen": dev.first_seen.isoformat(),
            "last_seen": dev.last_seen.isoformat(),
            "is_online": dev.is_online,
        }

    def record_sighting(self, device_id: Any, ip: str) -> None:
        if device_id:
            DeviceSighting.objects.create(device_id=device_id, ip_address=ip)

    def create_alert(
        self,
        user_id: Any,
        device_id: Any | None,
        alert_type: str,
        severity: str,
        message: str,
    ) -> dict:
        alert = NetworkAlert.objects.create(
            user_id=user_id,
            device_id=device_id,
            alert_type=alert_type,
            severity=severity,
            message=message,
        )
        return {
            "id": alert.id,
            "user_id": user_id,
            "device_id": device_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "is_acknowledged": alert.is_acknowledged,
            "created_at": alert.created_at.isoformat(),
        }

    def get_alerts(self, user_id: Any, acknowledged: bool | None = None) -> list[dict]:
        qs = NetworkAlert.objects.filter(user_id=user_id)
        if acknowledged is not None:
            qs = qs.filter(is_acknowledged=acknowledged)
        qs = qs.order_by("-created_at")
        return [
            {
                "id": a.id,
                "device_id": a.device_id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "message": a.message,
                "is_acknowledged": a.is_acknowledged,
                "created_at": a.created_at.isoformat(),
            }
            for a in qs
        ]
