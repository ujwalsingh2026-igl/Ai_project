from django.urls import path

from . import views

urlpatterns = [
    path("subnet/", views.SubnetView.as_view(), name="network-subnet"),
    path("devices/", views.DeviceListView.as_view(), name="network-devices"),
    path("devices/<int:pk>/", views.DeviceDetailView.as_view(), name="network-device-detail"),
    path("scan/", views.NetworkScanView.as_view(), name="network-scan"),
    path("alerts/", views.AlertListView.as_view(), name="network-alerts"),
    path("alerts/<int:pk>/ack/", views.AlertAckView.as_view(), name="network-alert-ack"),
    path("alerts/ack-all/", views.AlertAckAllView.as_view(), name="network-alert-ack-all"),
    path("dns/", views.DnsQueryLogView.as_view(), name="network-dns-logs"),
    path("dns/lookup/", views.DnsLookupView.as_view(), name="network-dns-lookup"),
    path("dns/import/", views.DnsImportView.as_view(), name="network-dns-import"),
    path("export/", views.NetworkExportView.as_view(), name="network-export"),
    path("clear/", views.NetworkClearView.as_view(), name="network-clear"),
]
