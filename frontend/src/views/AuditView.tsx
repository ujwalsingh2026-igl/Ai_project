import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, Ban, Clock, Filter, Shield } from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../api/types';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDecision, setFilterDecision] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (filterDecision === 'all') return true;
    return log.decision.toLowerCase() === filterDecision.toLowerCase();
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-cockpit-base overflow-hidden font-sans p-4 md:p-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cockpit-border pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cockpit-accent" />
            <h1 className="font-mono text-base font-bold uppercase tracking-wider text-cockpit-text">
              ACTIVITY & AUDIT TELEMETRY
            </h1>
          </div>
          <p className="text-xs font-mono text-cockpit-muted mt-0.5">
            Immutable append-only ledger of every tool call, permission evaluation, and execution status
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Decision Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-cockpit-muted" />
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="bg-transparent text-cockpit-text focus:outline-none"
            >
              <option value="all">ALL DECISIONS</option>
              <option value="allow">ALLOW</option>
              <option value="ask">ASK</option>
              <option value="block">BLOCK</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono text-cockpit-text hover:bg-cockpit-elevated transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cockpit-accent' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="flex items-center gap-2 p-3 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono text-cockpit-muted mb-4">
        <Shield className="w-4 h-4 text-cockpit-accent shrink-0" />
        <span>
          Safety boundary enforced: Arguments stored as names only. Message text and secrets are never committed to audit telemetry.
        </span>
      </div>

      {/* Table of Audit Logs */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-cockpit-border bg-cockpit-surface">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-xs font-mono text-cockpit-muted">
            NO AUDIT RECORDS FOUND FOR CRITERIA
          </div>
        ) : (
          <div className="divide-y divide-cockpit-border">
            {filtered.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-cockpit-elevated/40 transition-colors">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <div className="flex items-center gap-2">
                    {log.decision === 'allow' && <CheckCircle2 className="w-4 h-4 text-severity-low" />}
                    {log.decision === 'ask' && <AlertTriangle className="w-4 h-4 text-severity-med" />}
                    {log.decision === 'block' && <Ban className="w-4 h-4 text-severity-high" />}
                    <span
                      className={`font-bold uppercase ${
                        log.decision === 'allow'
                          ? 'text-severity-low'
                          : log.decision === 'ask'
                          ? 'text-severity-med'
                          : 'text-severity-high'
                      }`}
                    >
                      [{log.decision}]
                    </span>
                    <span className="font-semibold text-cockpit-text">{log.tool_name}</span>
                  </div>

                  <div className="flex items-center gap-3 text-cockpit-muted text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text">
                      RISK LEVEL: {log.risk_level ?? 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-mono text-cockpit-muted flex items-center gap-4">
                  <span>STATUS: <strong className="text-cockpit-text font-normal uppercase">{log.status}</strong></span>
                  {log.details?.arg_names && log.details.arg_names.length > 0 && (
                    <span>
                      ARGS: <code className="text-cockpit-accent">[{log.details.arg_names.join(', ')}]</code>
                    </span>
                  )}
                  {log.reason && <span>REASON: {log.reason}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
