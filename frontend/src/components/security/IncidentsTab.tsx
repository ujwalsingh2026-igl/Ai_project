import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Activity,
  Flame,
  Search,
  RefreshCw,
  X,
  CheckSquare,
  Square,
  Zap,
  Lock,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { api } from '../../api/client';
import { ApprovalCard } from '../ApprovalCard';

const PLAYBOOK_DEFINITIONS: Record<
  string,
  {
    name: string;
    description: string;
    steps: Array<{ id: string; title: string; description: string }>;
  }
> = {
  'pb-brute-force': {
    name: 'Brute Force Authentication Mitigation Playbook',
    description: 'Triage and contain rapid failed authentication attempts against local services.',
    steps: [
      { id: 'step_1', title: 'Analyze Origin IP', description: 'Review origin IP and targeted usernames in incident evidence.' },
      { id: 'step_2', title: 'Block Offending IP', description: 'Execute approved Level 4 firewall rule to block inbound connections from this remote IP.' },
      { id: 'step_3', title: 'Verify Target Accounts', description: 'Verify affected accounts have not been compromised or locked out.' },
      { id: 'step_4', title: 'Rotate Credentials', description: 'Rotate passwords and revoke stale active session tokens.' },
    ],
  },
  'pb-suspicious-process': {
    name: 'Suspicious Process Remediation Playbook',
    description: 'Investigate, contain, and terminate anomalous or potentially malicious processes.',
    steps: [
      { id: 'step_1', title: 'Inspect Telemetry', description: 'Review command line arguments, parent PID, and loaded binary location.' },
      { id: 'step_2', title: 'Verify Executable Path', description: 'Confirm if executable is running from a suspicious directory (e.g. Temp or AppData).' },
      { id: 'step_3', title: 'Terminate Process Tree', description: 'Execute approved Level 4 termination to stop the suspicious process.' },
      { id: 'step_4', title: 'Scan Parent Binary', description: 'Inspect binary file hash in the File Threat Scanner for signatures.' },
      { id: 'step_5', title: 'Audit Persistence Keys', description: 'Check startup folders and registry autorun keys for re-launch entries.' },
    ],
  },
  'pb-anomalous-port': {
    name: 'Anomalous Port Exposure Playbook',
    description: 'Investigate unexpected network listening sockets and public exposures.',
    steps: [
      { id: 'step_1', title: 'Identify Socket Owner', description: 'Identify process ID and service associated with the listening socket.' },
      { id: 'step_2', title: 'Check Interface Binding', description: 'Determine if socket is bound publicly (0.0.0.0) or to local loopback (127.0.0.1).' },
      { id: 'step_3', title: 'Contain or Terminate', description: 'Reconfigure service binding or terminate unauthorized listening process.' },
      { id: 'step_4', title: 'Audit Inbound Firewall', description: 'Verify host firewall policies enforce default-deny for inbound high ports.' },
    ],
  },
  'pb-persistence': {
    name: 'Persistence Mechanism Removal Playbook',
    description: 'Detect and remove unauthorized autorun entries, services, or scheduled tasks.',
    steps: [
      { id: 'step_1', title: 'Examine Autorun Key', description: 'Inspect the registry key or task schedule path identified in evidence.' },
      { id: 'step_2', title: 'Analyze Target File', description: 'Scan the target startup binary in the File Threat Scanner.' },
      { id: 'step_3', title: 'Remove Persistence Entry', description: 'Delete the unauthorized startup entry or registry value.' },
      { id: 'step_4', title: 'Verify Post-Reboot', description: 'Reboot system and verify the autorun entry does not regenerate.' },
    ],
  },
  'pb-file-threat': {
    name: 'File Threat Containment Playbook',
    description: 'Isolate and remediate files flagged by the File Threat Scanner.',
    steps: [
      { id: 'step_1', title: 'Quarantine File', description: 'Move the suspicious file to the Quarantine Vault with read-only permissions.' },
      { id: 'step_2', title: 'Verify File Handles', description: 'Ensure no active processes hold open handles to the target file.' },
      { id: 'step_3', title: 'Scan Sibling Files', description: 'Inspect the parent folder and download directory for secondary payloads.' },
    ],
  },
};

const MITRE_DEFINITIONS: Record<string, string> = {
  T1110: 'T1110: Brute Force (Credential Access)',
  T1059: 'T1059: Command and Scripting Interpreter (Execution)',
  T1036: 'T1036: Masquerading (Defense Evasion)',
  T1571: 'T1571: Non-Standard Port (Command and Control)',
  'T1547.001': 'T1547.001: Registry Run Keys / Startup Folder (Persistence)',
  T1049: 'T1049: System Network Connections Discovery (Discovery)',
  T1204: 'T1204: User Execution (Execution)',
};

interface IncidentsTabProps {
  onApprovalResolved?: () => void;
}

export const IncidentsTab: React.FC<IncidentsTabProps> = ({ onApprovalResolved }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);

  // Active pending approval state for Level 4 quick mitigation
  const [activeApproval, setActiveApproval] = useState<{
    id: string;
    tool_name: string;
    args: Record<string, unknown>;
    expires_at: string;
    title: string;
    description: string;
  } | null>(null);

  // Load incidents list
  const { data: incidents = [], isLoading, refetch } = useQuery({
    queryKey: ['security-incidents'],
    queryFn: () => api.getIncidents(),
    refetchInterval: 10000,
  });

  // Selected incident details
  const { data: selectedIncident, refetch: refetchDetail } = useQuery({
    queryKey: ['security-incident', selectedIncidentId],
    queryFn: () => (selectedIncidentId ? api.getIncident(selectedIncidentId) : null),
    enabled: !!selectedIncidentId,
  });

  // Run Threat Detector mutation
  const runDetectorMutation = useMutation({
    mutationFn: () => api.runThreatDetector(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['security-summary'] });
    },
  });

  // Update Incident mutation
  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status?: string; notes?: string; playbook_progress?: string[] } }) =>
      api.updateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['security-incident', selectedIncidentId] });
      queryClient.invalidateQueries({ queryKey: ['security-summary'] });
    },
  });

  // Level 4 Kill Process mutation
  const killProcessMutation = useMutation({
    mutationFn: ({ pid, name, incId }: { pid: number; name?: string; incId?: number }) =>
      api.killProcess(pid, name, incId),
    onSuccess: (res, vars) => {
      if (res.status === 'needs_approval' && res.pending_action_id) {
        setActiveApproval({
          id: res.pending_action_id,
          tool_name: 'security_kill_process',
          args: { pid: vars.pid, process_name: vars.name },
          expires_at: res.pending_expires_at || new Date(Date.now() + 300000).toISOString(),
          title: `Terminate Suspicious Process (PID ${vars.pid})`,
          description: `Level 4 Response: Terminate process ${vars.name || ''} (PID ${vars.pid}) linked to incident #${vars.incId}.`,
        });
      } else {
        refetchDetail();
        refetch();
      }
    },
  });

  // Level 4 Block IP mutation
  const blockIpMutation = useMutation({
    mutationFn: ({ ip, incId }: { ip: string; incId?: number }) =>
      api.blockIp(ip, 'inbound', `Defensive incident block #${incId}`, incId),
    onSuccess: (res, vars) => {
      if (res.status === 'needs_approval' && res.pending_action_id) {
        setActiveApproval({
          id: res.pending_action_id,
          tool_name: 'security_block_ip',
          args: { ip_address: vars.ip, direction: 'inbound' },
          expires_at: res.pending_expires_at || new Date(Date.now() + 300000).toISOString(),
          title: `Block Remote IP Address (${vars.ip})`,
          description: `Level 4 Response: Create host firewall inbound block rule for ${vars.ip} linked to incident #${vars.incId}.`,
        });
      } else {
        refetchDetail();
        refetch();
      }
    },
  });

  // Count severities
  const criticalCount = incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length;
  const highCount = incidents.filter((i) => i.severity === 'high' && i.status !== 'resolved').length;
  const mediumCount = incidents.filter((i) => i.severity === 'medium' && i.status !== 'resolved').length;
  const lowCount = incidents.filter((i) => i.severity === 'low' && i.status !== 'resolved').length;
  const totalOpen = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'false_positive').length;

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'open' && (inc.status === 'resolved' || inc.status === 'false_positive')) return false;
      if (statusFilter !== 'open' && inc.status !== statusFilter) return false;
    }
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.title.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q) ||
        inc.source_val.toLowerCase().includes(q) ||
        inc.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-severity-high/20 text-severity-high border border-severity-high/40">
            <Flame className="w-3 h-3 text-severity-high" /> CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <AlertCircle className="w-3 h-3 text-yellow-400" /> MEDIUM
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-severity-low/20 text-severity-low border border-severity-low/30">
            <Info className="w-3 h-3 text-severity-low" /> LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-cockpit-muted bg-cockpit-panel border border-cockpit-border">
            <Info className="w-3 h-3" /> INFO
          </span>
        );
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'open':
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30">OPEN</span>;
      case 'investigating':
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">INVESTIGATING</span>;
      case 'contained':
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">CONTAINED</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-severity-low/20 text-severity-low border border-severity-low/30">RESOLVED</span>;
      case 'false_positive':
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-cockpit-panel text-cockpit-muted border border-cockpit-border">FALSE POSITIVE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-cockpit-panel text-cockpit-muted">{st}</span>;
    }
  };

  const togglePlaybookStep = (stepId: string) => {
    if (!selectedIncident) return;
    const currentProgress = selectedIncident.playbook_progress || [];
    const newProgress = currentProgress.includes(stepId)
      ? currentProgress.filter((id) => id !== stepId)
      : [...currentProgress, stepId];

    updateIncidentMutation.mutate({
      id: selectedIncident.id,
      data: { playbook_progress: newProgress },
    });
  };

  const currentPlaybook = selectedIncident?.playbook_id ? PLAYBOOK_DEFINITIONS[selectedIncident.playbook_id] : null;

  return (
    <div className="space-y-6">
      {/* Top Banner: Incident Severity Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-cockpit-panel/60 border border-cockpit-border rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-cockpit-muted uppercase">Open Incidents</div>
            <div className="text-2xl font-mono font-bold text-cockpit-text">{totalOpen}</div>
          </div>
          <ShieldAlert className="w-6 h-6 text-cockpit-accent opacity-80" />
        </div>

        <div className="p-3 bg-red-950/20 border border-severity-high/30 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-severity-high uppercase font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Critical
            </div>
            <div className="text-2xl font-mono font-bold text-severity-high">{criticalCount}</div>
          </div>
          <span className="text-xs font-mono text-severity-high/60">P0</span>
        </div>

        <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-amber-400 uppercase font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> High
            </div>
            <div className="text-2xl font-mono font-bold text-amber-400">{highCount}</div>
          </div>
          <span className="text-xs font-mono text-amber-400/60">P1</span>
        </div>

        <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-yellow-400 uppercase font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Medium
            </div>
            <div className="text-2xl font-mono font-bold text-yellow-400">{mediumCount}</div>
          </div>
          <span className="text-xs font-mono text-yellow-400/60">P2</span>
        </div>

        <div className="p-3 bg-green-950/20 border border-severity-low/30 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-severity-low uppercase font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Low / Info
            </div>
            <div className="text-2xl font-mono font-bold text-severity-low">{lowCount}</div>
          </div>
          <span className="text-xs font-mono text-severity-low/60">P3</span>
        </div>
      </div>

      {/* Control Bar: Filters & Run Threat Detector */}
      <div className="p-4 bg-cockpit-panel border border-cockpit-border rounded-lg space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-cockpit-base p-1 rounded border border-cockpit-border">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'open', label: 'ACTIVE' },
              { id: 'investigating', label: 'TRIAGING' },
              { id: 'contained', label: 'CONTAINED' },
              { id: 'resolved', label: 'RESOLVED' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-cockpit-accent text-cockpit-base font-bold'
                    : 'text-cockpit-muted hover:text-cockpit-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runDetectorMutation.mutate()}
              disabled={runDetectorMutation.isPending}
              className="flex items-center gap-2 px-4 py-1.5 bg-cockpit-accent hover:bg-cockpit-accent/90 text-cockpit-base text-xs font-mono font-bold rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runDetectorMutation.isPending ? 'animate-spin' : ''}`} />
              {runDetectorMutation.isPending ? 'SCANNING TELEMETRY...' : 'RUN THREAT DETECTOR'}
            </button>
          </div>
        </div>

        {/* Search & Severity Filter */}
        <div className="flex flex-col md:flex-row items-center gap-3 pt-2 border-t border-cockpit-border/50">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-cockpit-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incidents by title, IP, process, or tactic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-cockpit-base border border-cockpit-border rounded text-xs font-mono text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:border-cockpit-accent"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-mono text-cockpit-muted">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label="Filter by Severity"
              className="px-2 py-1.5 bg-cockpit-base border border-cockpit-border rounded text-xs font-mono text-cockpit-text focus:outline-none focus:border-cockpit-accent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="border border-cockpit-border rounded-lg bg-cockpit-panel overflow-hidden">
        <div className="px-4 py-3 bg-cockpit-base border-b border-cockpit-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cockpit-accent" />
            <span className="text-xs font-mono font-bold text-cockpit-text uppercase tracking-wider">
              Security Incidents Log ({filteredIncidents.length})
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-cockpit-muted">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cockpit-accent" />
            Loading incidents telemetry...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-cockpit-muted space-y-2">
            <CheckCircle className="w-8 h-8 text-severity-low mx-auto opacity-70" />
            <div className="font-semibold text-cockpit-text">No active security incidents found</div>
            <p className="max-w-md mx-auto text-cockpit-muted">
              The defensive heuristics engine has detected zero active anomalies matching your current filters.
              Click &quot;Run Threat Detector&quot; to perform a fresh scan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-cockpit-border/50">
            {filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 hover:bg-cockpit-base/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(inc.severity)}
                    {getStatusBadge(inc.status)}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cockpit-base text-cockpit-muted border border-cockpit-border">
                      {inc.category.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-cockpit-muted">
                      Source: <span className="text-cockpit-text font-bold">{inc.source_val || inc.source_type}</span>
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-cockpit-text">{inc.title}</div>
                  <p className="text-xs text-cockpit-muted line-clamp-2">{inc.description}</p>

                  {/* MITRE Badges */}
                  {inc.mitre_tactics && inc.mitre_tactics.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-mono text-cockpit-muted">MITRE ATT&CK:</span>
                      {inc.mitre_tactics.map((tac) => (
                        <span
                          key={tac}
                          title={MITRE_DEFINITIONS[tac] || tac}
                          className="px-1.5 py-0.5 bg-cockpit-base border border-cockpit-border rounded text-[10px] font-mono text-cockpit-accent"
                        >
                          {tac}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cockpit-panel hover:bg-cockpit-base text-cockpit-text border border-cockpit-border rounded text-xs font-mono font-medium transition-colors"
                  >
                    <span>Triage & Playbook</span>
                    <ChevronRight className="w-3.5 h-3.5 text-cockpit-accent" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident Detail & Triage Drawer / Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-cockpit-panel border border-cockpit-border rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-cockpit-base border-b border-cockpit-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getSeverityBadge(selectedIncident.severity)}
                <span className="text-xs font-mono font-bold text-cockpit-text uppercase">
                  Incident #{selectedIncident.id} — Triage & Response
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedIncidentId(null);
                  setActiveApproval(null);
                }}
                className="text-cockpit-muted hover:text-cockpit-text transition-colors p-1"
                aria-label="Close Incident Triage Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Title & Status Bar */}
              <div className="space-y-2">
                <div className="text-base font-bold text-cockpit-text">{selectedIncident.title}</div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-cockpit-muted font-mono">Status:</span>
                  <select
                    value={selectedIncident.status}
                    onChange={(e) =>
                      updateIncidentMutation.mutate({
                        id: selectedIncident.id,
                        data: { status: e.target.value },
                      })
                    }
                    className="px-2.5 py-1 bg-cockpit-base border border-cockpit-border rounded font-mono text-xs text-cockpit-text focus:outline-none focus:border-cockpit-accent"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                    <option value="false_positive">False Positive</option>
                  </select>

                  <span className="text-cockpit-muted font-mono ml-2">Source:</span>
                  <span className="px-2 py-0.5 bg-cockpit-base border border-cockpit-border rounded font-mono text-cockpit-text">
                    {selectedIncident.source_val || selectedIncident.source_type}
                  </span>

                  <span className="text-cockpit-muted font-mono ml-2">Detected:</span>
                  <span className="text-cockpit-muted font-mono">
                    {new Date(selectedIncident.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-cockpit-base border border-cockpit-border rounded">
                <p className="text-cockpit-text leading-relaxed">{selectedIncident.description}</p>
              </div>

              {/* Telemetry Evidence Box */}
              {selectedIncident.evidence && selectedIncident.evidence.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-cockpit-accent uppercase flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Telemetry Evidence
                  </div>
                  <div className="space-y-2">
                    {selectedIncident.evidence.map((ev, idx) => (
                      <div key={idx} className="p-3 bg-cockpit-base border border-cockpit-border rounded space-y-1">
                        <div className="font-semibold text-cockpit-text">{ev.fact}</div>
                        {ev.inference && (
                          <div className="text-cockpit-muted flex items-start gap-1">
                            <span className="text-amber-400 font-mono">Inference:</span> {ev.inference}
                          </div>
                        )}
                        {ev.confidence && (
                          <div className="text-[11px] font-mono text-cockpit-muted">
                            Confidence: <span className="text-cockpit-accent uppercase">{ev.confidence}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Level 4 Quick Mitigation Actions */}
              <div className="p-4 bg-cockpit-base/80 border border-cockpit-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cockpit-text uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Defensive Response Mitigations (Level 4 - Approval Required)
                  </div>
                </div>
                <p className="text-xs text-cockpit-muted">
                  Defensive responses are gatekept by the Permission Engine. Triggering an action below generates a single-use
                  approval card requiring your deliberate confirmation before filesystem or network changes occur.
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Process Source: Kill Process Button */}
                  {selectedIncident.source_type === 'process' && (
                    <button
                      type="button"
                      onClick={() => {
                        const pidMatch = selectedIncident.source_val.match(/PID\s+(\d+)/i);
                        const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;
                        if (pid) {
                          killProcessMutation.mutate({ pid, incId: selectedIncident.id });
                        }
                      }}
                      className="px-3 py-1.5 bg-severity-high/20 hover:bg-severity-high/30 text-severity-high border border-severity-high/40 rounded font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Flame className="w-3.5 h-3.5" /> Terminate Suspicious Process Tree
                    </button>
                  )}

                  {/* IP Source: Block IP Button */}
                  {selectedIncident.source_type === 'ip' && (
                    <button
                      type="button"
                      onClick={() => {
                        blockIpMutation.mutate({ ip: selectedIncident.source_val, incId: selectedIncident.id });
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Block Remote IP via Firewall
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      updateIncidentMutation.mutate({
                        id: selectedIncident.id,
                        data: { status: 'contained' },
                      })
                    }
                    className="px-3 py-1.5 bg-cockpit-panel hover:bg-cockpit-base text-cockpit-text border border-cockpit-border rounded font-mono text-xs transition-colors"
                  >
                    Mark as Contained
                  </button>
                </div>

                {/* Inline Level 4 Approval Card */}
                {activeApproval && (
                  <div className="pt-2">
                    <ApprovalCard
                      actionId={activeApproval.id}
                      toolName={activeApproval.tool_name}
                      riskLevel={4}
                      expiresAt={activeApproval.expires_at}
                      onResolved={() => {
                        setActiveApproval(null);
                        refetchDetail();
                        refetch();
                        onApprovalResolved?.();
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Interactive Playbook Checklist */}
              {currentPlaybook && (
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-cockpit-accent uppercase flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" /> {currentPlaybook.name}
                  </div>
                  <p className="text-xs text-cockpit-muted">{currentPlaybook.description}</p>

                  <div className="space-y-2 border border-cockpit-border rounded p-3 bg-cockpit-base">
                    {currentPlaybook.steps.map((step) => {
                      const isCompleted = selectedIncident.playbook_progress?.includes(step.id);
                      return (
                        <div
                          key={step.id}
                          onClick={() => togglePlaybookStep(step.id)}
                          className={`flex items-start gap-3 p-2.5 rounded cursor-pointer transition-colors border ${
                            isCompleted
                              ? 'bg-severity-low/10 border-severity-low/30 text-cockpit-text'
                              : 'bg-cockpit-panel/40 border-cockpit-border hover:bg-cockpit-panel text-cockpit-muted'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-severity-low shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-cockpit-muted shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-0.5">
                            <div className={`font-semibold ${isCompleted ? 'text-severity-low' : 'text-cockpit-text'}`}>
                              {step.title}
                            </div>
                            <div className="text-[11px] text-cockpit-muted">{step.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline Audit History */}
              {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-cockpit-muted uppercase">
                    Incident Audit Timeline ({selectedIncident.timeline.length})
                  </div>
                  <div className="border border-cockpit-border rounded p-3 bg-cockpit-base space-y-2 max-h-48 overflow-y-auto">
                    {selectedIncident.timeline.map((item) => (
                      <div key={item.id} className="text-xs font-mono flex items-start gap-2 border-b border-cockpit-border/40 pb-1.5 last:border-b-0">
                        <span className="text-cockpit-muted shrink-0">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-cockpit-accent font-semibold">{item.action}:</span>
                        <span className="text-cockpit-text flex-1">
                          by {item.actor} {JSON.stringify(item.details)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
