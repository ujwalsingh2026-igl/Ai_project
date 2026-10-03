"""URLs for Defensive Security Center API."""
from django.urls import path

from .views import (
    BlockIpActionView,
    FileScanView,
    FirewallRuleListView,
    FirewallRuleRollbackView,
    HashLookupView,
    IncidentDetailView,
    IncidentListView,
    IncidentUpdateView,
    KillProcessActionView,
    QuarantineActionView,
    QuarantineDeleteView,
    QuarantineListView,
    QuarantineRestoreView,
    RunThreatDetectorView,
    ScanFindingDetailView,
    ScanFindingListView,
    SecuritySummaryView,
)

urlpatterns = [
    # File Threat Scanner & Quarantine Vault
    path("scan/", FileScanView.as_view(), name="security_file_scan"),
    path("findings/", ScanFindingListView.as_view(), name="security_findings_list"),
    path("findings/<int:pk>/", ScanFindingDetailView.as_view(), name="security_finding_detail"),
    path("quarantine/", QuarantineListView.as_view(), name="security_quarantine_list"),
    path("quarantine/action/", QuarantineActionView.as_view(), name="security_quarantine_action"),
    path("quarantine/<int:pk>/restore/", QuarantineRestoreView.as_view(), name="security_quarantine_restore"),
    path("quarantine/<int:pk>/delete/", QuarantineDeleteView.as_view(), name="security_quarantine_delete"),
    path("hash-lookup/", HashLookupView.as_view(), name="security_hash_lookup"),

    # Threat Detection, Incident Log & Response Actions
    path("incidents/", IncidentListView.as_view(), name="security_incidents_list"),
    path("incidents/<int:pk>/", IncidentDetailView.as_view(), name="security_incident_detail"),
    path("incidents/<int:pk>/update/", IncidentUpdateView.as_view(), name="security_incident_update"),
    path("incidents/run-detector/", RunThreatDetectorView.as_view(), name="security_run_threat_detector"),
    path("actions/kill-process/", KillProcessActionView.as_view(), name="security_kill_process"),
    path("actions/block-ip/", BlockIpActionView.as_view(), name="security_block_ip"),
    path("firewall-rules/", FirewallRuleListView.as_view(), name="security_firewall_rules_list"),
    path("firewall-rules/<int:pk>/rollback/", FirewallRuleRollbackView.as_view(), name="security_firewall_rule_rollback"),
    path("summary/", SecuritySummaryView.as_view(), name="security_summary"),
]
