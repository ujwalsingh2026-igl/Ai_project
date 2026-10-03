"""API Views for persistent network and DNS inventory."""
import csv
import datetime
import io
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.builtin_tools.network import (
    NetworkDnsLookupTool,
    NetworkScanDevicesTool,
    detect_local_subnets,
    normalize_mac,
)
from core.permissions import PermissionContext

from .models import (
    DeviceSighting,
    DnsQueryLog,
    NetworkAlert,
    NetworkDevice,
    NetworkSubnetConfirmation,
)
from .serializers import (
    DeviceSightingSerializer,
    DnsQueryLogSerializer,
    NetworkAlertSerializer,
    NetworkDeviceSerializer,
    NetworkSubnetConfirmationSerializer,
)
from .store import DjangoNetworkStore


class SubnetView(APIView):
    """GET: Detected local subnets + confirmation status.
    POST: Confirm or revoke subnet ownership.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        local_subnets = detect_local_subnets()
        user_confirmations = {
            c.subnet: c
            for c in NetworkSubnetConfirmation.objects.filter(user=request.user)
        }

        results = []
        for s in local_subnets:
            subnet_str = s["subnet"]
            conf = user_confirmations.get(subnet_str)
            results.append({
                "interface": s["interface"],
                "ip": s["ip"],
                "netmask": s["netmask"],
                "subnet": subnet_str,
                "gateway": s["gateway"],
                "mac": s["mac"],
                "confirmed": conf.confirmed_by_user if conf else False,
                "confirmed_at": conf.confirmed_at.isoformat() if conf and conf.confirmed_at else None,
            })

        # Also include any confirmed subnets not currently active
        detected_set = {s["subnet"] for s in local_subnets}
        for subnet_str, conf in user_confirmations.items():
            if subnet_str not in detected_set and conf.confirmed_by_user:
                results.append({
                    "interface": conf.interface_name or "Historical",
                    "ip": "Unknown",
                    "netmask": "Unknown",
                    "subnet": subnet_str,
                    "gateway": conf.gateway_ip or "Unknown",
                    "mac": "Unknown",
                    "confirmed": True,
                    "confirmed_at": conf.confirmed_at.isoformat() if conf.confirmed_at else None,
                })

        return Response(results)

    def post(self, request):
        subnet_str = request.data.get("subnet", "").strip()
        if not subnet_str:
            return Response(
                {"error": {"code": "INVALID_INPUT", "message": "Subnet is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        confirmed = bool(request.data.get("confirmed", True))
        gateway_ip = request.data.get("gateway_ip", "").strip()
        interface_name = request.data.get("interface_name", "").strip()

        obj, _ = NetworkSubnetConfirmation.objects.update_or_create(
            user=request.user,
            subnet=subnet_str,
            defaults={
                "gateway_ip": gateway_ip,
                "interface_name": interface_name,
                "confirmed_by_user": confirmed,
            },
        )
        return Response(NetworkSubnetConfirmationSerializer(obj).data)


class DeviceListView(APIView):
    """GET: List known devices with optional filtering."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = NetworkDevice.objects.filter(user=request.user)
        label_param = request.query_params.get("label")
        if label_param and label_param != "all":
            qs = qs.filter(label=label_param)

        online_param = request.query_params.get("online")
        if online_param in ("true", "1"):
            qs = qs.filter(is_online=True)
        elif online_param in ("false", "0"):
            qs = qs.filter(is_online=False)

        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(hostname__icontains=search)
                | Q(ip_address__icontains=search)
                | Q(mac_address__icontains=search)
                | Q(vendor__icontains=search)
            )

        return Response(NetworkDeviceSerializer(qs, many=True).data)


class DeviceDetailView(APIView):
    """GET, PATCH, DELETE a specific network device."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        dev = get_object_or_404(NetworkDevice, pk=pk, user=request.user)
        data = NetworkDeviceSerializer(dev).data
        recent_sightings = dev.sightings.order_by("-timestamp")[:20]
        data["recent_sightings"] = DeviceSightingSerializer(recent_sightings, many=True).data
        return Response(data)

    def patch(self, request, pk):
        dev = get_object_or_404(NetworkDevice, pk=pk, user=request.user)
        ser = NetworkDeviceSerializer(dev, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        dev = get_object_or_404(NetworkDevice, pk=pk, user=request.user)
        dev.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NetworkScanView(APIView):
    """POST: Scans confirmed subnet using host ARP cache and reverse DNS.

    STRICT SAFETY GATE:
    Fails immediately with 403 Forbidden if target subnet is not confirmed.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_subnet = request.data.get("subnet", "auto")

        # Determine target subnet
        if target_subnet == "auto" or not target_subnet:
            local_subnets = detect_local_subnets()
            if local_subnets:
                target_subnet = local_subnets[0]["subnet"]
            else:
                target_subnet = "127.0.0.0/8"

        # Check explicit subnet confirmation
        is_confirmed = NetworkSubnetConfirmation.objects.filter(
            user=request.user,
            subnet=target_subnet,
            confirmed_by_user=True,
        ).exists()

        if not is_confirmed:
            return Response(
                {
                    "error": {
                        "code": "SUBNET_NOT_CONFIRMED",
                        "message": (
                            f"SAFETY BOUNDARY: Subnet '{target_subnet}' has NOT been confirmed "
                            "as owned or administered by you. In accordance with defensive safety rules, "
                            "scanning is blocked. Please confirm ownership in the Network Center first."
                        ),
                        "details": {"subnet": target_subnet},
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        store = DjangoNetworkStore()
        tool = NetworkScanDevicesTool(store=store)
        result = tool.run(
            {"subnet": target_subnet},
            context=PermissionContext(user_id=request.user.pk),
        )

        return Response(result)


class AlertListView(APIView):
    """GET: List network alerts for user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = NetworkAlert.objects.filter(user=request.user)
        ack_param = request.query_params.get("acknowledged")
        if ack_param in ("true", "1"):
            qs = qs.filter(is_acknowledged=True)
        elif ack_param in ("false", "0"):
            qs = qs.filter(is_acknowledged=False)

        return Response(NetworkAlertSerializer(qs, many=True).data)


class AlertAckView(APIView):
    """POST: Acknowledge a single alert."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        alert = get_object_or_404(NetworkAlert, pk=pk, user=request.user)
        alert.is_acknowledged = True
        alert.save()
        return Response(NetworkAlertSerializer(alert).data)


class AlertAckAllView(APIView):
    """POST: Acknowledge all unread alerts for user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated_count = NetworkAlert.objects.filter(
            user=request.user,
            is_acknowledged=False,
        ).update(is_acknowledged=True)
        return Response({"acknowledged_count": updated_count})


class DnsQueryLogView(APIView):
    """GET: List DNS query logs with search & source filter."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = DnsQueryLog.objects.filter(user=request.user)
        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(domain__icontains=search) | Q(client_ip__icontains=search))

        source_param = request.query_params.get("source")
        if source_param and source_param != "all":
            qs = qs.filter(source=source_param)

        qs = qs.order_by("-timestamp")[:200]
        return Response(DnsQueryLogSerializer(qs, many=True).data)


class DnsLookupView(APIView):
    """POST: Forward or reverse DNS lookup with query logging."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("query", "").strip()
        if not query:
            return Response(
                {"error": {"code": "INVALID_INPUT", "message": "Query parameter cannot be empty."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tool = NetworkDnsLookupTool()
        result = tool.run({"query": query}, context=PermissionContext(user_id=request.user.pk))

        # Log query to history
        if result.get("status") == "success" and result.get("results"):
            primary_resp = result["results"][0] if result["results"] else ""
            DnsQueryLog.objects.create(
                user=request.user,
                domain=query,
                client_ip=request.META.get("REMOTE_ADDR", "127.0.0.1"),
                query_type=result.get("query_type", "A"),
                response=primary_resp,
                timestamp=timezone.now(),
                source="lookup",
            )

        return Response(result)


class DnsImportView(APIView):
    """POST: Import DNS query logs from Pi-hole or router logs (JSON or CSV)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        entries = request.data.get("entries")
        csv_text = request.data.get("csv_content")

        created_records: list[DnsQueryLog] = []

        if entries and isinstance(entries, list):
            for item in entries:
                domain = item.get("domain", "").strip()
                if not domain:
                    continue
                client_ip = item.get("client_ip", "").strip()
                query_type = item.get("query_type", "A").upper()
                resp = item.get("response", "").strip()
                ts_str = item.get("timestamp")
                ts = timezone.now()
                if ts_str:
                    try:
                        ts = datetime.datetime.fromisoformat(ts_str)
                        if timezone.is_naive(ts):
                            ts = timezone.make_aware(ts)
                    except ValueError:
                        ts = timezone.now()

                created_records.append(
                    DnsQueryLog(
                        user=request.user,
                        domain=domain,
                        client_ip=client_ip,
                        query_type=query_type,
                        response=resp,
                        timestamp=ts,
                        source="pihole_import",
                    )
                )

        elif csv_text and isinstance(csv_text, str):
            f = io.StringIO(csv_text.strip())
            reader = csv.reader(f)
            for row in reader:
                if not row:
                    continue
                # Expected CSV: domain, client_ip, query_type, response, timestamp (optional)
                domain = row[0].strip() if len(row) > 0 else ""
                if not domain or domain.lower() in ("domain", "query", "host"):
                    continue
                client_ip = row[1].strip() if len(row) > 1 else ""
                query_type = row[2].strip().upper() if len(row) > 2 else "A"
                resp = row[3].strip() if len(row) > 3 else ""
                created_records.append(
                    DnsQueryLog(
                        user=request.user,
                        domain=domain,
                        client_ip=client_ip,
                        query_type=query_type,
                        response=resp,
                        timestamp=timezone.now(),
                        source="router_import",
                    )
                )

        if created_records:
            DnsQueryLog.objects.bulk_create(created_records)

        return Response(
            {
                "status": "success",
                "imported_count": len(created_records),
                "message": f"Successfully imported {len(created_records)} DNS log records.",
            },
            status=status.HTTP_201_CREATED,
        )


class NetworkExportView(APIView):
    """GET: Download complete network inventory and DNS logs as JSON."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        subnets = NetworkSubnetConfirmation.objects.filter(user=request.user)
        devices = NetworkDevice.objects.filter(user=request.user)
        alerts = NetworkAlert.objects.filter(user=request.user)
        dns_logs = DnsQueryLog.objects.filter(user=request.user)

        export_data = {
            "exported_at": timezone.now().isoformat(),
            "user": request.user.username,
            "confirmed_subnets": NetworkSubnetConfirmationSerializer(subnets, many=True).data,
            "devices": NetworkDeviceSerializer(devices, many=True).data,
            "alerts": NetworkAlertSerializer(alerts, many=True).data,
            "dns_logs": DnsQueryLogSerializer(dns_logs, many=True).data,
        }
        return Response(export_data)


class NetworkClearView(APIView):
    """POST: Wipe network devices, alerts, or prune records older than 90 days."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        scope = request.data.get("scope", "all")
        result = {}

        if scope == "prune_90_days":
            cutoff = timezone.now() - datetime.timedelta(days=90)
            deleted_sightings, _ = DeviceSighting.objects.filter(
                device__user=request.user,
                timestamp__lt=cutoff,
            ).delete()
            deleted_alerts, _ = NetworkAlert.objects.filter(
                user=request.user,
                created_at__lt=cutoff,
            ).delete()
            deleted_dns, _ = DnsQueryLog.objects.filter(
                user=request.user,
                timestamp__lt=cutoff,
            ).delete()

            result = {
                "scope": scope,
                "deleted_sightings": deleted_sightings,
                "deleted_alerts": deleted_alerts,
                "deleted_dns": deleted_dns,
                "message": "90-day retention prune completed successfully.",
            }

        elif scope == "devices":
            deleted_devices, _ = NetworkDevice.objects.filter(user=request.user).delete()
            result = {"scope": scope, "deleted_devices": deleted_devices}

        elif scope == "alerts":
            deleted_alerts, _ = NetworkAlert.objects.filter(user=request.user).delete()
            result = {"scope": scope, "deleted_alerts": deleted_alerts}

        elif scope == "dns":
            deleted_dns, _ = DnsQueryLog.objects.filter(user=request.user).delete()
            result = {"scope": scope, "deleted_dns": deleted_dns}

        elif scope == "all":
            d_dev, _ = NetworkDevice.objects.filter(user=request.user).delete()
            d_alt, _ = NetworkAlert.objects.filter(user=request.user).delete()
            d_dns, _ = DnsQueryLog.objects.filter(user=request.user).delete()
            result = {
                "scope": scope,
                "deleted_devices": d_dev,
                "deleted_alerts": d_alt,
                "deleted_dns": d_dns,
                "message": "All network data wiped.",
            }
        else:
            return Response(
                {"error": {"code": "INVALID_SCOPE", "message": f"Unknown scope: {scope}"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result)
