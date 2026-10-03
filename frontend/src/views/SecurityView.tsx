import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Shield,
  ShieldCheck,
  Activity,
  Network,
  Cpu,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Flame,
  Terminal,
  FileCheck,
  Lock,
} from 'lucide-react';
import { api } from '../api/client';
import { PostureCheckItem, ProcessItem, SecuritySelfTestData } from '../api/types';
import { FileScannerTab } from '../components/security/FileScannerTab';
import { QuarantineVaultTab } from '../components/security/QuarantineVaultTab';
import { IncidentsTab } from '../components/security/IncidentsTab';
import { FirewallTab } from '../components/security/FirewallTab';

type SecurityTab = 'posture' | 'incidents' | 'firewall' | 'scanner' | 'quarantine' | 'processes' | 'ports' | 'selftest';

export const SecurityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SecurityTab>('posture');
  const [processSearch, setProcessSearch] = useState('');
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [portSearch, setPortSearch] = useState('');
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [copiedRemediation, setCopiedRemediation] = useState<string | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<ProcessItem | null>(null);
  const [selfTestResult, setSelfTestResult] = useState<SecuritySelfTestData | null>(null);

  // Queries
  const {
    data: posture,
    isLoading: postureLoading,
    refetch: refetchPosture,
  } = useQuery({
    queryKey: ['security-posture'],
    queryFn: () => api.getSecurityPosture(),
  });

  const {
    data: processData,
    isLoading: processLoading,
    refetch: refetchProcesses,
  } = useQuery({
    queryKey: ['security-processes', anomaliesOnly],
    queryFn: () => api.inspectProcesses(anomaliesOnly),
  });

  const {
    data: portsData,
    isLoading: portsLoading,
    refetch: refetchPorts,
  } = useQuery({
    queryKey: ['security-listening-ports'],
    queryFn: () => api.getListeningPorts(),
  });

  const { data: secSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['security-summary'],
    queryFn: () => api.getSecuritySummary(),
    refetchInterval: 10000,
  });

  // Self-test mutation
  const selfTestMutation = useMutation({
    mutationFn: () => api.runSecuritySelfTest(),
    onSuccess: (res) => {
      setSelfTestResult(res);
      setActiveTab('selftest');
    },
  });

  const refreshAll = () => {
    refetchPosture();
    refetchProcesses();
    refetchPorts();
    refetchSummary();
  };

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedRemediation(id);
    setTimeout(() => setCopiedRemediation(null), 2000);
  };

  // Filter processes
  const filteredProcesses = (processData?.processes || []).filter((p) => {
    if (!processSearch) return true;
    const term = processSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      String(p.pid).includes(term) ||
      p.username.toLowerCase().includes(term) ||
      p.exe.toLowerCase().includes(term)
    );
  });

  // Filter ports
  const filteredPorts = (portsData?.ports || []).filter((p) => {
    if (!portSearch) return true;
    const term = portSearch.toLowerCase();
    return (
      String(p.port).includes(term) ||
      p.process_name.toLowerCase().includes(term) ||
      p.bind_ip.toLowerCase().includes(term)
    );
  });

  const publicPortsCount = (portsData?.ports || []).filter((p) => p.is_public).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-cockpit-base overflow-hidden font-sans">
      {/* Top Cockpit Header */}
      <header className="h-14 border-b border-cockpit-border px-6 flex items-center justify-between bg-cockpit-surface/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-cockpit-accent/10 border border-cockpit-accent/30 text-cockpit-accent">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono text-xs font-bold tracking-wider text-cockpit-text">
              DEFENSIVE SECURITY CENTER // POSTURE & TELEMETRY
            </h2>
            <div className="text-[10px] font-mono text-cockpit-muted uppercase">
              LOCAL HOST HARDENING, PROCESS INSPECTION & THREAT DETECTION
            </div>
          </div>
        </div>

        {/* Global Security Actions */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={refreshAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border hover:border-cockpit-accent text-cockpit-muted hover:text-cockpit-accent transition-colors"
            title="Re-run host audit and process scan"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                postureLoading || processLoading || portsLoading ? 'animate-spin' : ''
              }`}
            />
            <span>RUN FULL SCAN</span>
          </button>

          <button
            type="button"
            onClick={() => selfTestMutation.mutate()}
            disabled={selfTestMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-accent text-cockpit-base font-bold hover:bg-cockpit-accent/90 transition-colors"
            title="Scan harmless EICAR test string to verify detection mechanics"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>RUN SELF-TEST</span>
          </button>
        </div>
      </header>

      {/* Sub-Tab Navigation */}
      <div className="border-b border-cockpit-border bg-cockpit-surface/40 px-6 py-2 flex items-center gap-2 font-mono text-xs shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('posture')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'posture'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>POSTURE CHECKLIST ({posture?.total_score ?? '--'}/100)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'incidents'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>
            INCIDENTS & TRIAGE (
            {secSummary?.open_incidents ? (
              <span className="text-severity-high font-bold">{secSummary.open_incidents} OPEN</span>
            ) : (
              '0'
            )}
            )
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('firewall')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'firewall'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>FIREWALL BLOCKS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'scanner'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>THREAT SCANNER</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quarantine')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'quarantine'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>QUARANTINE VAULT</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('processes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'processes'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>
            PROCESS INSPECTOR (
            {processData?.flagged_count ? (
              <span className="text-severity-med font-bold">{processData.flagged_count} FLAGS</span>
            ) : (
              '0 FLAGS'
            )}
            )
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ports')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'ports'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>LISTENING PORTS ({portsData?.count ?? '--'})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('selftest')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'selftest'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>SELF-TEST (EICAR)</span>
        </button>
      </div>

      {/* Main Stage */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ======================= TAB: POSTURE CHECKLIST ======================= */}
        {activeTab === 'posture' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Top Score Banner */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-5 flex items-center justify-between font-mono">
              <div className="space-y-1">
                <div className="text-xs text-cockpit-muted uppercase tracking-wider">
                  DEFENSIVE HARDENING SCORE
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="text-4xl font-black text-cockpit-text">
                    {posture?.total_score ?? '--'}
                    <span className="text-lg font-normal text-cockpit-muted">/100</span>
                  </div>
                  <div
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                      posture?.grade === 'A'
                        ? 'bg-severity-low/20 border-severity-low text-severity-low'
                        : posture?.grade === 'B'
                        ? 'bg-cockpit-accent/20 border-cockpit-accent text-cockpit-accent'
                        : posture?.grade === 'C'
                        ? 'bg-severity-med/20 border-severity-med text-severity-med'
                        : 'bg-severity-high/20 border-severity-high text-severity-high'
                    }`}
                  >
                    GRADE: {posture?.grade || '--'}
                  </div>
                </div>
                <p className="text-[11px] text-cockpit-muted font-sans">
                  Transparent evaluation based on 8 defense-in-depth security benchmarks. Zero black-box magic.
                </p>
              </div>

              {/* Progress ring/track visual */}
              <div className="w-48 bg-cockpit-base border border-cockpit-border rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    (posture?.total_score || 0) >= 80
                      ? 'bg-cockpit-accent'
                      : (posture?.total_score || 0) >= 60
                      ? 'bg-severity-med'
                      : 'bg-severity-high'
                  }`}
                  style={{ width: `${posture?.total_score || 0}%` }}
                />
              </div>
            </div>

            {/* Checklist Table */}
            <div className="space-y-3">
              <div className="text-xs font-mono text-cockpit-muted uppercase tracking-wider">
                BENCHMARK EVALUATION DETAILS ({posture?.checks?.length || 0} CHECKS)
              </div>

              <div className="space-y-2">
                {posture?.checks?.map((check: PostureCheckItem) => {
                  const isExpanded = expandedCheckId === check.id;
                  return (
                    <div
                      key={check.id}
                      className="bg-cockpit-surface border border-cockpit-border rounded-lg overflow-hidden transition-colors"
                    >
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-cockpit-elevated/30"
                        onClick={() => setExpandedCheckId(isExpanded ? null : check.id)}
                      >
                        <div className="flex items-center gap-3">
                          {check.status === 'PASS' && (
                            <CheckCircle2 className="w-5 h-5 text-severity-low shrink-0" />
                          )}
                          {check.status === 'WARN' && (
                            <AlertTriangle className="w-5 h-5 text-severity-med shrink-0" />
                          )}
                          {check.status === 'FAIL' && (
                            <XCircle className="w-5 h-5 text-severity-high shrink-0" />
                          )}
                          <div>
                            <div className="font-mono text-xs font-bold text-cockpit-text flex items-center gap-2">
                              <span>{check.title}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase ${
                                  check.status === 'PASS'
                                    ? 'border-severity-low/40 text-severity-low bg-severity-low/10'
                                    : check.status === 'WARN'
                                    ? 'border-severity-med/40 text-severity-med bg-severity-med/10'
                                    : 'border-severity-high/40 text-severity-high bg-severity-high/10'
                                }`}
                              >
                                {check.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-cockpit-muted mt-0.5 font-mono">
                              {check.details}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 font-mono text-xs">
                          <span className="text-cockpit-text font-bold">
                            {check.score} / {check.max_score} pts
                          </span>
                          <span className="text-cockpit-accent text-xs">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Remediation Drawer */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-cockpit-border/50 bg-cockpit-base/40 space-y-3 font-sans text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-cockpit-elevated/40 border border-cockpit-border/50 rounded p-3">
                              <div className="font-mono text-[10px] text-cockpit-muted uppercase font-bold mb-1">
                                WHAT IT MEANS
                              </div>
                              <p className="text-cockpit-text text-[11px] leading-relaxed">
                                {check.meaning}
                              </p>
                            </div>
                            <div className="bg-cockpit-elevated/40 border border-cockpit-border/50 rounded p-3">
                              <div className="font-mono text-[10px] text-cockpit-muted uppercase font-bold mb-1">
                                WHY IT MATTERS (RATIONALE)
                              </div>
                              <p className="text-cockpit-text text-[11px] leading-relaxed">
                                {check.rationale}
                              </p>
                            </div>
                          </div>

                          <div className="bg-cockpit-surface border border-cockpit-border rounded p-3 font-mono">
                            <div className="flex items-center justify-between text-[11px] text-cockpit-accent font-bold mb-1">
                              <span className="flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5" />
                                <span>HOW TO FIX (REMEDIATION)</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(check.remediation, check.id);
                                }}
                                className="text-cockpit-muted hover:text-cockpit-text flex items-center gap-1 text-[10px]"
                                title="Copy remediation instructions"
                              >
                                {copiedRemediation === check.id ? (
                                  <Check className="w-3 h-3 text-severity-low" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedRemediation === check.id ? 'COPIED' : 'COPY'}</span>
                              </button>
                            </div>
                            <div className="text-[11px] text-cockpit-text bg-cockpit-base p-2 rounded border border-cockpit-border/60 select-all">
                              {check.remediation}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: INCIDENT TRIAGE ======================= */}
        {activeTab === 'incidents' && (
          <div className="max-w-6xl mx-auto">
            <IncidentsTab onApprovalResolved={() => { refetchSummary(); refreshAll(); }} />
          </div>
        )}

        {/* ======================= TAB: FIREWALL BLOCKS ======================= */}
        {activeTab === 'firewall' && (
          <div className="max-w-5xl mx-auto">
            <FirewallTab onApprovalResolved={() => { refetchSummary(); refreshAll(); }} />
          </div>
        )}

        {/* ======================= TAB: THREAT SCANNER ======================= */}
        {activeTab === 'scanner' && (
          <div className="max-w-5xl mx-auto">
            <FileScannerTab />
          </div>
        )}

        {/* ======================= TAB: QUARANTINE VAULT ======================= */}
        {activeTab === 'quarantine' && (
          <div className="max-w-5xl mx-auto">
            <QuarantineVaultTab />
          </div>
        )}

        {/* ======================= TAB: PROCESS INSPECTOR ======================= */}
        {activeTab === 'processes' && (
          <div className="space-y-4 max-w-6xl mx-auto font-mono text-xs">
            {/* Filter and Search Bar */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 text-cockpit-muted" />
                <input
                  type="text"
                  placeholder="Search processes by name, PID, user, path..."
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-cockpit-base border border-cockpit-border rounded text-xs text-cockpit-text placeholder-cockpit-muted outline-none focus:border-cockpit-accent"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnomaliesOnly(!anomaliesOnly)}
                  className={`px-3 py-1.5 rounded border flex items-center gap-1.5 transition-colors ${
                    anomaliesOnly
                      ? 'bg-severity-med/20 border-severity-med text-severity-med font-bold'
                      : 'bg-cockpit-elevated border-cockpit-border text-cockpit-muted hover:text-cockpit-text'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>ANOMALIES ONLY ({processData?.flagged_count ?? 0})</span>
                </button>
              </div>
            </div>

            {/* Process List Table */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cockpit-base/80 border-b border-cockpit-border text-cockpit-muted font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">PID</th>
                      <th className="py-2.5 px-3">PROCESS NAME</th>
                      <th className="py-2.5 px-3">ANOMALY FLAGS</th>
                      <th className="py-2.5 px-3">CPU</th>
                      <th className="py-2.5 px-3">MEM (MB)</th>
                      <th className="py-2.5 px-3">PARENT</th>
                      <th className="py-2.5 px-3">LISTENING</th>
                      <th className="py-2.5 px-3">USER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cockpit-border/40">
                    {filteredProcesses.map((proc) => {
                      const hasFlags = proc.flags && proc.flags.length > 0;
                      return (
                        <tr
                          key={proc.pid}
                          onClick={() => setSelectedProcess(proc)}
                          className={`cursor-pointer transition-colors ${
                            hasFlags
                              ? 'bg-severity-med/5 hover:bg-severity-med/15'
                              : 'hover:bg-cockpit-elevated/40'
                          }`}
                        >
                          <td className="py-2 px-3 font-bold text-cockpit-muted">{proc.pid}</td>
                          <td className="py-2 px-3 font-bold text-cockpit-text">
                            <div className="flex items-center gap-1.5">
                              {hasFlags && (
                                <AlertTriangle className="w-3.5 h-3.5 text-severity-med shrink-0" />
                              )}
                              <span>{proc.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {hasFlags ? (
                              <div className="flex flex-wrap gap-1">
                                {proc.flags.map((f, idx) => (
                                  <span
                                    key={idx}
                                    title={f.reason}
                                    className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                                      f.severity === 'high'
                                        ? 'border-severity-high/40 text-severity-high bg-severity-high/10'
                                        : f.severity === 'medium'
                                        ? 'border-severity-med/40 text-severity-med bg-severity-med/10'
                                        : 'border-cockpit-accent/40 text-cockpit-accent bg-cockpit-accent/10'
                                    }`}
                                  >
                                    {f.rule.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-cockpit-muted">Normal</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-cockpit-muted">{proc.cpu_percent}%</td>
                          <td className="py-2 px-3 text-cockpit-muted">{proc.memory_mb}</td>
                          <td className="py-2 px-3 text-cockpit-muted truncate max-w-[120px]">
                            {proc.parent_name || (proc.ppid ? `PID ${proc.ppid}` : '--')}
                          </td>
                          <td className="py-2 px-3 text-cockpit-muted">
                            {proc.listening_ports && proc.listening_ports.length > 0 ? (
                              <span className="text-cockpit-accent font-bold">
                                {proc.listening_ports.join(', ')}
                              </span>
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="py-2 px-3 text-cockpit-muted truncate max-w-[120px]">
                            {proc.username || '--'}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredProcesses.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-cockpit-muted">
                          No processes match the active search filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Process Details Modal / Popover */}
            {selectedProcess && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 bg-cockpit-base/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono text-xs"
              >
                <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-5 max-w-2xl w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-cockpit-border pb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cockpit-accent" />
                      <h3 className="font-bold text-sm text-cockpit-text">
                        PROCESS TELEMETRY: {selectedProcess.name} (PID {selectedProcess.pid})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProcess(null)}
                      className="text-cockpit-muted hover:text-cockpit-text text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2 bg-cockpit-base p-3 rounded border border-cockpit-border text-[11px]">
                    <div>
                      <span className="text-cockpit-muted">Binary Path: </span>
                      <span className="text-cockpit-text select-all font-bold">
                        {selectedProcess.exe || 'Path not accessible'}
                      </span>
                    </div>
                    <div>
                      <span className="text-cockpit-muted">Parent Process: </span>
                      <span className="text-cockpit-text">
                        {selectedProcess.parent_name} (PPID {selectedProcess.ppid})
                      </span>
                    </div>
                    <div>
                      <span className="text-cockpit-muted">User Account: </span>
                      <span className="text-cockpit-text">{selectedProcess.username || 'System'}</span>
                    </div>
                    <div>
                      <span className="text-cockpit-muted">Listening Sockets: </span>
                      <span className="text-cockpit-text">
                        {selectedProcess.listening_ports?.length
                          ? selectedProcess.listening_ports.join(', ')
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Anomaly Explanations */}
                  {selectedProcess.flags && selectedProcess.flags.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[10px] text-severity-med font-bold uppercase tracking-wider">
                        HEURISTIC ANOMALY LEADS ({selectedProcess.flags.length})
                      </div>
                      {selectedProcess.flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded bg-severity-med/10 border border-severity-med/30 text-xs space-y-1"
                        >
                          <div className="font-bold text-severity-med flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{flag.title}</span>
                          </div>
                          <p className="text-[11px] text-cockpit-text font-sans leading-relaxed">
                            {flag.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-severity-low/10 border border-severity-low/30 text-severity-low text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>No heuristic anomalies flagged for this process.</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProcess(null)}
                      className="px-4 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border text-cockpit-text hover:bg-cockpit-elevated/70"
                    >
                      CLOSE
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB: LISTENING PORTS ======================= */}
        {activeTab === 'ports' && (
          <div className="space-y-4 max-w-5xl mx-auto font-mono text-xs">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-cockpit-surface border border-cockpit-border rounded p-3">
                <div className="text-[10px] text-cockpit-muted uppercase mb-1">TOTAL LISTENING SOCKETS</div>
                <div className="text-2xl font-bold text-cockpit-text">{portsData?.count ?? '--'}</div>
                <div className="text-[10px] text-cockpit-muted mt-1">Host TCP / UDP endpoints</div>
              </div>

              <div className="bg-cockpit-surface border border-cockpit-border rounded p-3">
                <div className="text-[10px] text-cockpit-muted uppercase mb-1">PUBLIC / 0.0.0.0 SOCKETS</div>
                <div
                  className={`text-2xl font-bold ${
                    publicPortsCount > 0 ? 'text-severity-med' : 'text-severity-low'
                  }`}
                >
                  {publicPortsCount}
                </div>
                <div className="text-[10px] text-cockpit-muted mt-1">Bound to all network adapters</div>
              </div>

              <div className="bg-cockpit-surface border border-cockpit-border rounded p-3">
                <div className="text-[10px] text-cockpit-muted uppercase mb-1">LOCAL LOOPBACK ONLY</div>
                <div className="text-2xl font-bold text-cockpit-accent">
                  {(portsData?.count || 0) - publicPortsCount}
                </div>
                <div className="text-[10px] text-cockpit-muted mt-1">Restricted to 127.0.0.1 / ::1</div>
              </div>
            </div>

            {/* Ports Filter */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 text-cockpit-muted" />
                <input
                  type="text"
                  placeholder="Filter by port number, process name, bind address..."
                  value={portSearch}
                  onChange={(e) => setPortSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-cockpit-base border border-cockpit-border rounded text-xs text-cockpit-text placeholder-cockpit-muted outline-none focus:border-cockpit-accent"
                />
              </div>
            </div>

            {/* Ports Table */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-cockpit-base/80 border-b border-cockpit-border text-cockpit-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">PORT</th>
                    <th className="py-2.5 px-3">PROTO</th>
                    <th className="py-2.5 px-3">BIND ADDRESS</th>
                    <th className="py-2.5 px-3">SCOPE</th>
                    <th className="py-2.5 px-3">PROCESS NAME</th>
                    <th className="py-2.5 px-3">PID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cockpit-border/40">
                  {filteredPorts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-cockpit-elevated/40 transition-colors">
                      <td className="py-2 px-3 font-bold text-cockpit-accent">{p.port}</td>
                      <td className="py-2 px-3 text-cockpit-muted">{p.protocol}</td>
                      <td className="py-2 px-3 text-cockpit-text">{p.bind_ip}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                            p.is_public
                              ? 'border-severity-med/40 text-severity-med bg-severity-med/10'
                              : 'border-cockpit-border text-cockpit-muted bg-cockpit-elevated/40'
                          }`}
                        >
                          {p.is_public ? 'PUBLIC (0.0.0.0)' : 'LOCAL (127.0.0.1)'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-cockpit-text">{p.process_name}</td>
                      <td className="py-2 px-3 text-cockpit-muted">{p.pid || '--'}</td>
                    </tr>
                  ))}
                  {filteredPorts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-cockpit-muted">
                        No listening sockets matched the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================= TAB: SELF-TEST (EICAR) ======================= */}
        {activeTab === 'selftest' && (
          <div className="max-w-2xl mx-auto space-y-6 font-mono text-xs">
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-cockpit-border pb-3">
                <Activity className="w-5 h-5 text-cockpit-accent" />
                <div>
                  <h3 className="font-bold text-sm text-cockpit-text">
                    DETECTION PIPELINE SELF-TEST // EICAR STANDARD
                  </h3>
                  <p className="text-[11px] text-cockpit-muted font-sans">
                    Verify that signature pattern matching and hashing mechanics function without introducing dangerous payloads.
                  </p>
                </div>
              </div>

              <div className="bg-cockpit-base p-4 rounded border border-cockpit-border space-y-2 text-[11px] font-sans leading-relaxed text-cockpit-text">
                <p>
                  <strong>What is this test?</strong> The European Institute for Computer Antivirus
                  Research (EICAR) standard test string is a benign 68-byte sequence used globally by security
                  engineers to safely test antivirus and threat detection systems.
                </p>
                <p className="text-cockpit-muted font-mono text-[10px]">
                  {'SIGNATURE: X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'}
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => selfTestMutation.mutate()}
                  disabled={selfTestMutation.isPending}
                  className="px-6 py-2.5 bg-cockpit-accent text-cockpit-base font-bold rounded uppercase tracking-wider hover:bg-cockpit-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {selfTestMutation.isPending ? 'SCANNING TEST ARTIFACT...' : 'RUN SELF-TEST SCAN'}
                  </span>
                </button>
              </div>
            </div>

            {/* Self-Test Result Card */}
            {selfTestResult && (
              <div className="bg-cockpit-surface border border-severity-low/50 rounded-lg p-5 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-severity-low">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm">
                    SELF-TEST VERIFIED: {selfTestResult.status}
                  </span>
                </div>

                <div className="space-y-1 bg-cockpit-base p-3 rounded border border-cockpit-border text-[11px]">
                  <div>
                    <span className="text-cockpit-muted">Artifact Name: </span>
                    <span className="text-cockpit-text font-bold">{selfTestResult.threat_name}</span>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">Signature Matched: </span>
                    <span className="text-severity-low font-bold">
                      {selfTestResult.signature_matched ? 'YES (EICAR_SIG_001)' : 'NO'}
                    </span>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">SHA-256 Hash Matched: </span>
                    <span className="text-severity-low font-bold">
                      {selfTestResult.hash_matched ? 'YES (SHA-256 Validated)' : 'NO'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-cockpit-muted font-sans leading-relaxed">
                  {selfTestResult.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
