import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
} from 'lucide-react';
import { AuditLog, PendingApproval } from '../api/types';
import { ApprovalCard } from './ApprovalCard';

interface TacticalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pendingApprovals: PendingApproval[];
  auditLogs: AuditLog[];
  onRefresh: () => void;
  onApprovalResolved: () => void;
}

export const TacticalPanel: React.FC<TacticalPanelProps> = ({
  isOpen,
  onClose,
  pendingApprovals,
  auditLogs,
  onRefresh,
  onApprovalResolved,
}) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'audit'>('approvals');

  if (!isOpen) return null;

  return (
    <aside
      role="complementary"
      aria-label="Tactical Activity & Approvals Panel"
      className="w-80 md:w-96 border-l border-cockpit-border bg-cockpit-surface flex flex-col h-full shrink-0 z-20 font-sans"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cockpit-border bg-cockpit-base/60">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-cockpit-text">
          <Activity className="w-4 h-4 text-cockpit-accent" />
          <span>TACTICAL STREAM</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            type="button"
            aria-label="Refresh Tactical Data"
            className="p-1 rounded text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated transition-colors"
            title="Refresh logs & approvals"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close Tactical Panel"
            className="p-1 rounded text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cockpit-border bg-cockpit-base/30 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 transition-colors ${
            activeTab === 'approvals'
              ? 'border-cockpit-accent text-cockpit-text bg-cockpit-elevated/40 font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-severity-med" />
          <span>APPROVALS ({pendingApprovals.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-cockpit-accent text-cockpit-text bg-cockpit-elevated/40 font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-severity-info" />
          <span>AUDIT LOG ({auditLogs.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'approvals' ? (
          <div>
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-12 text-xs font-mono text-cockpit-muted">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-cockpit-border opacity-50" />
                NO PENDING ACTIONS AWAITING APPROVAL
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((item) => (
                  <ApprovalCard
                    key={item.id}
                    actionId={item.id}
                    toolName={item.tool_name}
                    expiresAt={item.expires_at}
                    onResolved={onApprovalResolved}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-xs font-mono text-cockpit-muted">
                <Activity className="w-8 h-8 mx-auto mb-2 text-cockpit-border opacity-50" />
                NO AUDIT EVENTS RECORDED YET
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded border border-cockpit-border bg-cockpit-base text-xs font-mono"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        {log.decision === 'allow' && <CheckCircle2 className="w-3.5 h-3.5 text-severity-low" />}
                        {log.decision === 'ask' && <AlertTriangle className="w-3.5 h-3.5 text-severity-med" />}
                        {log.decision === 'block' && <Ban className="w-3.5 h-3.5 text-severity-high" />}
                        <span
                          className={`uppercase ${
                            log.decision === 'allow'
                              ? 'text-severity-low'
                              : log.decision === 'ask'
                              ? 'text-severity-med'
                              : 'text-severity-high'
                          }`}
                        >
                          [{log.decision}]
                        </span>
                        <span className="text-cockpit-text">{log.tool_name}</span>
                      </div>
                      <span className="text-[10px] text-cockpit-muted">
                        LVL {log.risk_level ?? '?'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-cockpit-muted">
                      <span>Status: <strong className="text-cockpit-text font-normal">{log.status}</strong></span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {log.reason && (
                      <div className="mt-1 text-[11px] text-cockpit-muted border-t border-cockpit-border/40 pt-1">
                        {log.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="p-2.5 border-t border-cockpit-border bg-cockpit-base/40 text-[11px] font-mono text-cockpit-muted flex items-center justify-between">
        <span>Append-only security log</span>
        <span>Ctrl + / to toggle</span>
      </div>
    </aside>
  );
};
