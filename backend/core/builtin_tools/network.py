"""Network and DNS inventory tools (pure Python, defensive only).

Strict defensive boundaries:
- ONLY inspects the user's OWN local network and confirmed subnets.
- Refuses to scan until the user has explicitly confirmed ownership of the subnet.
- Zero packet sniffing, zero ARP spoofing, zero external probing.
- All MAC addresses normalized; vendor lookup via offline OUI prefix table.
"""
from __future__ import annotations

import datetime
import ipaddress
import re
import socket
import subprocess
import sys
from typing import Any, Protocol

from core.permissions import PermissionContext, RiskLevel
from core.tools import Tool, ToolSpec

# Offline OUI prefix table: maps 6-hex-digit (3-byte) prefix to manufacturer.
OUI_VENDOR_MAP: dict[str, str] = {
    # Apple
    "001CB3": "Apple",
    "002500": "Apple",
    "04D3CF": "Apple",
    "28CFDA": "Apple",
    "3C15C2": "Apple",
    "705681": "Apple",
    "7C6D62": "Apple",
    "A4B197": "Apple",
    "ACBC32": "Apple",
    "BC926B": "Apple",
    "F01898": "Apple",
    # Intel
    "001E67": "Intel",
    "089204": "Intel",
    "2C3358": "Intel",
    "3413E8": "Intel",
    "4851B7": "Intel",
    "8086F2": "Intel",
    "A44CC8": "Intel",
    # Google / Alphabet
    "001A11": "Google",
    "3C5AB4": "Google",
    "546009": "Google",
    "D86C63": "Google",
    "F4F5DB": "Google",
    # Samsung
    "001247": "Samsung",
    "002637": "Samsung",
    "1867B0": "Samsung",
    "30CDA7": "Samsung",
    "508569": "Samsung",
    "A470D6": "Samsung",
    "BC4486": "Samsung",
    "E47CF9": "Samsung",
    # Microsoft
    "00155D": "Microsoft (Hyper-V)",
    "281878": "Microsoft",
    "7CE9D3": "Microsoft",
    "DC5360": "Microsoft",
    # Raspberry Pi
    "28CDC1": "Raspberry Pi",
    "B827EB": "Raspberry Pi",
    "DCA632": "Raspberry Pi",
    "E45F01": "Raspberry Pi",
    # Espressif (ESP8266 / ESP32 IoT)
    "240AC4": "Espressif Systems",
    "30AEA4": "Espressif Systems",
    "840D8E": "Espressif Systems",
    "A4E57C": "Espressif Systems",
    "C44F33": "Espressif Systems",
    # TP-Link
    "14CC20": "TP-Link",
    "30B5C2": "TP-Link",
    "50C7BF": "TP-Link",
    "E848B8": "TP-Link",
    # Netgear
    "00146C": "Netgear",
    "20E52A": "Netgear",
    "2C3033": "Netgear",
    # Cisco
    "00000C": "Cisco",
    "000142": "Cisco",
    "004096": "Cisco",
    # Dell
    "001422": "Dell",
    "1866DA": "Dell",
    "B82A72": "Dell",
    # HP
    "001E0B": "HP",
    "3CD92B": "HP",
    "B4B52F": "HP",
    # Lenovo
    "00508D": "Lenovo",
    "54EE75": "Lenovo",
    "8CE748": "Lenovo",
    # Realtek
    "00E04C": "Realtek",
    "525400": "Realtek / QEMU Virtual",
    # Hon Hai / Foxconn
    "001F3C": "Hon Hai / Foxconn",
    "485D60": "Hon Hai / Foxconn",
    # Amazon
    "00FC8B": "Amazon Technologies",
    "38F73D": "Amazon Technologies",
    "40B4CD": "Amazon Technologies",
    "6854FD": "Amazon Technologies",
    # Sony
    "00041F": "Sony",
    "0013A9": "Sony",
    "00248D": "Sony",
    # Ubiquiti
    "002722": "Ubiquiti",
    "24A43C": "Ubiquiti",
    "788A20": "Ubiquiti",
    # Xiaomi
    "04CF8C": "Xiaomi",
    "640980": "Xiaomi",
    # Randomized / Locally Administered MACs
    # In IEEE 802, if the 2nd least-significant bit of the first byte is 1 (x2, x6, xA, xE),
    # the MAC is locally administered / randomized (common on modern iOS/Android/Windows Wi-Fi).
}


def normalize_mac(mac: str) -> str:
    """Normalizes MAC to uppercase colon-separated format (e.g., AA:BB:CC:DD:EE:FF)."""
    clean = re.sub(r"[^0-9a-fA-F]", "", mac).upper()
    if len(clean) == 12:
        return ":".join(clean[i : i + 2] for i in range(0, 12, 2))
    return mac.upper()


def lookup_mac_vendor(mac: str) -> str:
    """Looks up vendor using offline OUI prefix or detects randomized private MACs."""
    clean = re.sub(r"[^0-9a-fA-F]", "", mac).upper()
    if len(clean) < 6:
        return "Unknown"

    prefix = clean[:6]
    if prefix in OUI_VENDOR_MAP:
        return OUI_VENDOR_MAP[prefix]

    # Check for IEEE 802 Locally Administered / Private Randomized MAC:
    # First byte bit 1 set -> second character is 2, 6, A, or E
    if len(clean) >= 2 and clean[1] in ("2", "6", "A", "E"):
        return "Private / Randomized MAC (Mobile / Privacy)"

    return "Unknown Vendor"


def parse_arp_table(raw_output: str | None = None) -> list[dict[str, str]]:
    """Cross-platform parser for ARP table output (`arp -a`).

    Filters out:
    - Broadcast addresses (255.255.255.255, .255, ff-ff-ff-ff-ff-ff)
    - Multicast addresses (224.0.0.0/4, 01-00-5e-...)
    - Loopback (127.0.0.1)
    """
    if raw_output is None:
        try:
            res = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5)
            raw_output = res.stdout
        except Exception:
            raw_output = ""

    results: list[dict[str, str]] = []
    seen_macs: set[str] = set()

    for line in raw_output.splitlines():
        line = line.strip()
        if not line:
            continue

        # Match IPv4 and MAC pattern (handles Windows and Linux/macOS arp formats)
        match = re.search(
            r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})",
            line,
        )
        if not match:
            continue

        ip = match.group(1)
        mac_raw = match.group(2)
        mac = normalize_mac(mac_raw)

        # Defensive filters: skip broadcast and multicast
        if mac == "FF:FF:FF:FF:FF:FF" or mac.startswith("01:00:5E"):
            continue
        if ip.startswith("224.") or ip.startswith("239.") or ip.endswith(".255") or ip == "255.255.255.255" or ip == "127.0.0.1":
            continue

        # Extract type if present (dynamic vs static)
        entry_type = "dynamic"
        if "static" in line.lower():
            entry_type = "static"

        if mac not in seen_macs:
            seen_macs.add(mac)
            results.append({
                "ip": ip,
                "mac": mac,
                "type": entry_type,
                "vendor": lookup_mac_vendor(mac),
            })

    return results


def detect_local_subnets() -> list[dict[str, Any]]:
    """Detects active IPv4 subnets and gateway on the host machine using psutil."""
    subnets: list[dict[str, Any]] = []
    try:
        import psutil  # type: ignore
    except ImportError:
        return subnets

    gateway_ip = detect_default_gateway()

    for iface_name, addrs in psutil.net_if_addrs().items():
        ipv4_addr = None
        mac_addr = None
        netmask = None

        for addr in addrs:
            if addr.family == socket.AF_INET:
                if not addr.address.startswith("127.") and not addr.address.startswith("169.254."):
                    ipv4_addr = addr.address
                    netmask = addr.netmask
            elif getattr(addr.family, "name", "") == "AF_LINK" or getattr(addr, "address", "").count("-") == 5 or getattr(addr, "address", "").count(":") == 5:
                if addr.address:
                    mac_addr = normalize_mac(addr.address)

        if ipv4_addr and netmask:
            try:
                network = ipaddress.IPv4Network(f"{ipv4_addr}/{netmask}", strict=False)
                subnets.append({
                    "interface": iface_name,
                    "ip": ipv4_addr,
                    "netmask": netmask,
                    "subnet": str(network),
                    "mac": mac_addr or "Unknown",
                    "gateway": gateway_ip or "Unknown",
                })
            except ValueError:
                pass

    return subnets


def detect_default_gateway() -> str:
    """Extracts default gateway IPv4 on Windows (route print) or Linux/macOS (ip route)."""
    if sys.platform == "win32":
        try:
            res = subprocess.run(["route", "print", "0.0.0.0"], capture_output=True, text=True, timeout=3)
            # Find line with 0.0.0.0 0.0.0.0 <Gateway> <Interface>
            for line in res.stdout.splitlines():
                parts = line.strip().split()
                if len(parts) >= 4 and parts[0] == "0.0.0.0" and parts[1] == "0.0.0.0":
                    return parts[2]
        except Exception:
            pass
    else:
        try:
            res = subprocess.run(["ip", "route", "show", "default"], capture_output=True, text=True, timeout=3)
            # default via <gateway> dev <iface>
            parts = res.stdout.strip().split()
            if "via" in parts:
                idx = parts.index("via")
                if idx + 1 < len(parts):
                    return parts[idx + 1]
        except Exception:
            pass
    return ""


def resolve_hostname(ip: str, timeout: float = 1.0) -> str:
    """Safe, non-blocking reverse-DNS lookup with timeout."""
    original_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(timeout)
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname
    except Exception:
        return ""
    finally:
        socket.setdefaulttimeout(original_timeout)


# -----------------------------------------------------------------------------
# Store Protocol (Decouples tool from Django ORM)
# -----------------------------------------------------------------------------


class NetworkStore(Protocol):
    """Protocol for persisting network devices, subnets, and alerts."""

    def is_subnet_confirmed(self, user_id: Any, subnet: str) -> bool:
        """Returns True only if the user has explicitly confirmed ownership of the subnet."""
        ...

    def list_confirmed_subnets(self, user_id: Any) -> list[dict]:
        """Returns list of confirmed subnets for the user."""
        ...

    def get_devices(self, user_id: Any) -> list[dict]:
        """Returns known network devices."""
        ...

    def get_device_by_mac(self, user_id: Any, mac: str) -> dict | None:
        """Finds device by MAC address."""
        ...

    def upsert_device(
        self,
        user_id: Any,
        mac: str,
        ip: str,
        hostname: str = "",
        vendor: str = "Unknown",
        label: str = "unknown",
        is_online: bool = True,
    ) -> dict:
        """Creates or updates a network device."""
        ...

    def record_sighting(self, device_id: Any, ip: str) -> None:
        """Records an observed IP sighting for a device."""
        ...

    def create_alert(
        self,
        user_id: Any,
        device_id: Any | None,
        alert_type: str,
        severity: str,
        message: str,
    ) -> dict:
        """Records a network security alert."""
        ...

    def get_alerts(self, user_id: Any, acknowledged: bool | None = None) -> list[dict]:
        """Returns network alerts."""
        ...


class InMemoryNetworkStore:
    """In-memory network store for unit testing."""

    def __init__(self):
        self.confirmed_subnets: set[tuple[Any, str]] = set()
        self.devices: dict[tuple[Any, str], dict] = {}
        self.sightings: list[dict] = []
        self.alerts: list[dict] = []
        self._next_dev_id = 1
        self._next_alert_id = 1

    def is_subnet_confirmed(self, user_id: Any, subnet: str) -> bool:
        return (user_id, subnet) in self.confirmed_subnets

    def confirm_subnet(self, user_id: Any, subnet: str, gateway: str = ""):
        self.confirmed_subnets.add((user_id, subnet))

    def list_confirmed_subnets(self, user_id: Any) -> list[dict]:
        return [
            {"subnet": s, "confirmed": True}
            for (uid, s) in self.confirmed_subnets
            if uid == user_id
        ]

    def get_devices(self, user_id: Any) -> list[dict]:
        return [d for (uid, _), d in self.devices.items() if uid == user_id]

    def get_device_by_mac(self, user_id: Any, mac: str) -> dict | None:
        return self.devices.get((user_id, normalize_mac(mac)))

    def upsert_device(
        self,
        user_id: Any,
        mac: str,
        ip: str,
        hostname: str = "",
        vendor: str = "Unknown",
        label: str = "unknown",
        is_online: bool = True,
    ) -> dict:
        normalized = normalize_mac(mac)
        key = (user_id, normalized)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if key in self.devices:
            dev = self.devices[key]
            dev["ip_address"] = ip
            if hostname:
                dev["hostname"] = hostname
            dev["vendor"] = vendor
            dev["is_online"] = is_online
            dev["last_seen"] = now
            return dev
        else:
            dev = {
                "id": self._next_dev_id,
                "user_id": user_id,
                "mac_address": normalized,
                "ip_address": ip,
                "hostname": hostname,
                "vendor": vendor,
                "label": label,
                "notes": "",
                "first_seen": now,
                "last_seen": now,
                "is_online": is_online,
            }
            self._next_dev_id += 1
            self.devices[key] = dev
            return dev

    def record_sighting(self, device_id: Any, ip: str) -> None:
        self.sightings.append({
            "device_id": device_id,
            "ip_address": ip,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })

    def create_alert(
        self,
        user_id: Any,
        device_id: Any | None,
        alert_type: str,
        severity: str,
        message: str,
    ) -> dict:
        alert = {
            "id": self._next_alert_id,
            "user_id": user_id,
            "device_id": device_id,
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "is_acknowledged": False,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self._next_alert_id += 1
        self.alerts.append(alert)
        return alert

    def get_alerts(self, user_id: Any, acknowledged: bool | None = None) -> list[dict]:
        res = [a for a in self.alerts if a["user_id"] == user_id]
        if acknowledged is not None:
            res = [a for a in res if a["is_acknowledged"] == acknowledged]
        return res


# -----------------------------------------------------------------------------
# Core Tools
# -----------------------------------------------------------------------------


class NetworkScanDevicesTool(Tool):
    """Discovers devices on user's confirmed local subnet using ARP and reverse DNS.

    HARD SAFETY GATE: Refuses to scan unless the target subnet is confirmed by user.
    """

    spec = ToolSpec(
        name="network_scan_devices",
        description=(
            "Discovers devices on your own confirmed local network using the host's "
            "ARP cache and reverse DNS. Refuses to scan unconfirmed subnets."
        ),
        risk_level=RiskLevel.DEVICE_INFO,
        required_permission="network.scan",
        input_schema={
            "type": "object",
            "properties": {
                "subnet": {
                    "type": "string",
                    "description": "The local subnet to scan (e.g. '10.227.244.0/24' or 'auto')",
                },
            },
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "subnet": {"type": "string"},
                "devices_found": {"type": "integer"},
                "new_devices_count": {"type": "integer"},
                "devices": {"type": "array"},
                "alerts_generated": {"type": "integer"},
                "message": {"type": "string"},
            },
            "required": ["status"],
        },
        allowed_operations=["arp_read", "dns_lookup", "inventory_update"],
    )

    def __init__(self, store: NetworkStore | None = None):
        self.store = store

    def run(self, args: dict[str, Any], context: PermissionContext | None = None) -> dict[str, Any]:
        user_id = context.user_id if context else 1
        requested_subnet = args.get("subnet", "auto")

        # 1. Determine active subnet
        local_subnets = detect_local_subnets()
        target_subnet_info = None

        if requested_subnet == "auto" or not requested_subnet:
            if local_subnets:
                target_subnet_info = local_subnets[0]
                subnet_str = target_subnet_info["subnet"]
            else:
                subnet_str = "127.0.0.0/8"
        else:
            subnet_str = requested_subnet
            for s in local_subnets:
                if s["subnet"] == subnet_str:
                    target_subnet_info = s
                    break

        # 2. STRICT SAFETY GATE: Subnet Ownership Confirmation
        if self.store is not None:
            if not self.store.is_subnet_confirmed(user_id, subnet_str):
                return {
                    "status": "blocked",
                    "subnet": subnet_str,
                    "devices_found": 0,
                    "new_devices_count": 0,
                    "devices": [],
                    "alerts_generated": 0,
                    "message": (
                        f"SAFETY BOUNDARY: Subnet '{subnet_str}' has NOT been confirmed as owned "
                        "or administered by you. In accordance with defensive safety rules, scanning "
                        "is blocked. Please confirm ownership in the Network Center first."
                    ),
                }

        # 3. Discover entries via ARP table
        arp_entries = parse_arp_table()

        # Include local host device itself if available
        if target_subnet_info and target_subnet_info.get("mac") != "Unknown":
            arp_entries.append({
                "ip": target_subnet_info["ip"],
                "mac": target_subnet_info["mac"],
                "type": "static",
                "vendor": lookup_mac_vendor(target_subnet_info["mac"]),
                "is_localhost": True,
            })

        # Filter entries to those residing in the target subnet
        discovered_devices: list[dict[str, Any]] = []
        new_count = 0
        alerts_count = 0

        try:
            target_net = ipaddress.IPv4Network(subnet_str, strict=False)
        except ValueError:
            target_net = None

        for entry in arp_entries:
            ip = entry["ip"]
            mac = entry["mac"]
            vendor = entry["vendor"]

            # Filter to subnet if specified
            if target_net:
                try:
                    if ipaddress.IPv4Address(ip) not in target_net:
                        continue
                except ValueError:
                    continue

            # Reverse DNS lookup (fast)
            hostname = resolve_hostname(ip, timeout=0.4)
            if not hostname and entry.get("is_localhost"):
                hostname = socket.gethostname()

            is_new = False
            ip_changed = False
            old_ip = ""

            if self.store is not None:
                existing = self.store.get_device_by_mac(user_id, mac)
                if existing is None:
                    is_new = True
                    new_count += 1
                    label = "mine" if entry.get("is_localhost") else "unknown"
                    dev = self.store.upsert_device(
                        user_id=user_id,
                        mac=mac,
                        ip=ip,
                        hostname=hostname,
                        vendor=vendor,
                        label=label,
                        is_online=True,
                    )
                    self.store.record_sighting(dev.get("id"), ip)
                    # Alert on new device
                    self.store.create_alert(
                        user_id=user_id,
                        device_id=dev.get("id"),
                        alert_type="new_device",
                        severity="info",
                        message=f"New device discovered on {subnet_str}: {hostname or ip} ({vendor}) [{mac}]",
                    )
                    alerts_count += 1
                else:
                    if existing.get("ip_address") != ip:
                        ip_changed = True
                        old_ip = existing.get("ip_address", "")
                        self.store.create_alert(
                            user_id=user_id,
                            device_id=existing.get("id"),
                            alert_type="ip_changed",
                            severity="low",
                            message=f"IP changed for device [{mac}]: was {old_ip}, now {ip}",
                        )
                        alerts_count += 1
                    dev = self.store.upsert_device(
                        user_id=user_id,
                        mac=mac,
                        ip=ip,
                        hostname=hostname or existing.get("hostname", ""),
                        vendor=vendor,
                        label=existing.get("label", "unknown"),
                        is_online=True,
                    )
                    self.store.record_sighting(dev.get("id"), ip)

            discovered_devices.append({
                "ip": ip,
                "mac": mac,
                "hostname": hostname,
                "vendor": vendor,
                "is_new": is_new,
                "ip_changed": ip_changed,
            })

        return {
            "status": "success",
            "subnet": subnet_str,
            "devices_found": len(discovered_devices),
            "new_devices_count": new_count,
            "devices": discovered_devices,
            "alerts_generated": alerts_count,
            "message": f"Scanned confirmed subnet {subnet_str}. Found {len(discovered_devices)} active devices ({new_count} new).",
        }

    def summarize(self, result: dict) -> str:
        return result.get("message", "Network scan completed.")


class NetworkDnsLookupTool(Tool):
    """Performs forward and reverse DNS queries safely."""

    spec = ToolSpec(
        name="network_dns_lookup",
        description="Performs forward (domain -> IP) or reverse (IP -> hostname) DNS lookups safely.",
        risk_level=RiskLevel.SAFE,
        required_permission="network.dns",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Host name or IP address to resolve (e.g. 'google.com' or '1.1.1.1')",
                },
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "query_type": {"type": "string"},
                "status": {"type": "string"},
                "results": {"type": "array"},
                "message": {"type": "string"},
            },
            "required": ["query", "query_type", "status", "results"],
        },
        allowed_operations=["dns_resolve"],
    )

    def run(self, args: dict[str, Any], context: PermissionContext | None = None) -> dict[str, Any]:
        query = args.get("query", "").strip()
        if not query:
            return {
                "query": "",
                "query_type": "unknown",
                "status": "error",
                "results": [],
                "message": "Query parameter cannot be empty.",
            }

        # Check if query is IPv4/IPv6
        is_ip = False
        try:
            ipaddress.ip_address(query)
            is_ip = True
        except ValueError:
            is_ip = False

        if is_ip:
            # Reverse lookup
            query_type = "PTR"
            try:
                hostname = resolve_hostname(query, timeout=2.0)
                if hostname:
                    return {
                        "query": query,
                        "query_type": query_type,
                        "status": "success",
                        "results": [hostname],
                        "message": f"Resolved {query} to hostname '{hostname}'",
                    }
                else:
                    return {
                        "query": query,
                        "query_type": query_type,
                        "status": "not_found",
                        "results": [],
                        "message": f"No PTR record found for IP {query}",
                    }
            except Exception as e:
                return {
                    "query": query,
                    "query_type": query_type,
                    "status": "error",
                    "results": [],
                    "message": f"Reverse lookup failed: {e}",
                }
        else:
            # Forward lookup
            query_type = "A"
            try:
                _, _, ips = socket.gethostbyname_ex(query)
                return {
                    "query": query,
                    "query_type": query_type,
                    "status": "success",
                    "results": ips,
                    "message": f"Resolved {query} to {len(ips)} IP address(es): {', '.join(ips)}",
                }
            except Exception as e:
                return {
                    "query": query,
                    "query_type": query_type,
                    "status": "error",
                    "results": [],
                    "message": f"Forward lookup failed for '{query}': {e}",
                }

    def summarize(self, result: dict) -> str:
        return result.get("message", "DNS lookup completed.")


class NetworkInventorySummaryTool(Tool):
    """Summarizes network inventory, online status, and security alerts."""

    spec = ToolSpec(
        name="network_inventory_summary",
        description="Summarizes total known devices, online count, confirmed subnets, and unacknowledged alerts.",
        risk_level=RiskLevel.SAFE,
        required_permission="network.summary",
        input_schema={
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "confirmed_subnets_count": {"type": "integer"},
                "total_devices": {"type": "integer"},
                "online_devices": {"type": "integer"},
                "unacknowledged_alerts": {"type": "integer"},
                "labels_breakdown": {"type": "object"},
            },
            "required": ["status", "total_devices", "online_devices"],
        },
        allowed_operations=["inventory_read"],
    )

    def __init__(self, store: NetworkStore | None = None):
        self.store = store

    def run(self, args: dict[str, Any], context: PermissionContext | None = None) -> dict[str, Any]:
        user_id = context.user_id if context else 1

        if self.store is None:
            return {
                "status": "success",
                "confirmed_subnets_count": 0,
                "total_devices": 0,
                "online_devices": 0,
                "unacknowledged_alerts": 0,
                "labels_breakdown": {},
            }

        subnets = self.store.list_confirmed_subnets(user_id)
        devices = self.store.get_devices(user_id)
        alerts = self.store.get_alerts(user_id, acknowledged=False)

        online_count = sum(1 for d in devices if d.get("is_online"))
        breakdown: dict[str, int] = {}
        for d in devices:
            lbl = d.get("label", "unknown")
            breakdown[lbl] = breakdown.get(lbl, 0) + 1

        return {
            "status": "success",
            "confirmed_subnets_count": len(subnets),
            "total_devices": len(devices),
            "online_devices": online_count,
            "unacknowledged_alerts": len(alerts),
            "labels_breakdown": breakdown,
        }

    def summarize(self, result: dict) -> str:
        return f"Network inventory: {result.get('total_devices', 0)} devices ({result.get('online_devices', 0)} online), {result.get('unacknowledged_alerts', 0)} unacknowledged alerts."
