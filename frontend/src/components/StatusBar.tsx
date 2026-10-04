import React from 'react';
import {
  Activity,
  Mic,
  MicOff,
  ShieldAlert,
  Server,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import { AssistantStatus } from '../api/types';

interface StatusBarProps {
  isBackendOnline: boolean;
  statusData?: AssistantStatus | null;
  pendingApprovalsCount: number;
  openAlertsCount?: number;
  micState?: string;
  onMicOff?: () => void;
  onToggleTacticalPanel?: () => void;
  onOpenShortcuts?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isBackendOnline,
  statusData,
  pendingApprovalsCount,
  openAlertsCount = 0,
  micState = 'standby',
  onMicOff,
  onToggleTacticalPanel,
  onOpenShortcuts,
}) => {
  const provider = statusData?.ai?.provider || 'local';
  const model = statusData?.ai?.model || 'llama3.2';

  return (
    <footer
      role="contentinfo"
      aria-label="System Status Bar"
      className="hidden md:flex h-8 border-t border-cockpit-border bg-cockpit-base px-3 items-center justify-between text-xs font-mono text-cockpit-muted select-none"
    >
      {/* Left side: Telemetry & Connection */}
      <div className="flex items-center gap-4">
        {/* Backend Status */}
        <div className="flex items-center gap-1.5" title="Backend Liveness Check (/api/health/)">
          <Server className="w-3.5 h-3.5" />
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendOnline ? 'bg-severity-low shadow-[0_0_8px_rgba(63,185,80,0.6)]' : 'bg-severity-high shadow-[0_0_8px_rgba(248,81,73,0.6)]'
            }`}
          />
          <span className={isBackendOnline ? 'text-cockpit-text' : 'text-severity-high font-bold'}>
            {isBackendOnline ? 'BACKEND 8001: ONLINE' : 'BACKEND: OFFLINE'}
          </span>
        </div>

        <span className="text-cockpit-border">|</span>

        {/* AI Provider & Model */}
        <div className="flex items-center gap-1.5" title="Active AI Engine Config">
          <Cpu className="w-3.5 h-3.5 text-cockpit-accent" />
          <span className="text-[11px] text-cockpit-text uppercase">
            AI: <span className="text-cockpit-accent font-semibold">{provider}</span>
            {model && <span className="text-cockpit-muted lowercase font-normal ml-1">[{model}]</span>}
          </span>
        </div>

        <span className="text-cockpit-border hidden sm:inline">|</span>

        {/* Mic State Indicator */}
        <div className="hidden sm:flex items-center gap-1.5" title="Voice Input Status">
          <Mic className={`w-3.5 h-3.5 ${micState === 'listening' ? 'text-severity-high animate-pulse' : 'text-cockpit-muted'}`} />
          <span className="text-[11px] uppercase">
            MIC: <span className={micState === 'listening' ? 'text-severity-high font-bold' : 'text-cockpit-text'}>{micState}</span>
          </span>
          {micState === 'listening' && onMicOff && (
            <button
              type="button"
              onClick={onMicOff}
              aria-label="One-click Mic Kill"
              className="text-severity-high hover:text-white p-0.5 rounded bg-severity-high/20 hover:bg-severity-high transition-colors"
              title="Turn microphone OFF immediately"
            >
              <MicOff className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right side: Security Indicators & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Open Alerts */}
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-severity-info" />
          <span className="text-[11px]">
            ALERTS: <span className="font-bold text-cockpit-text">{openAlertsCount}</span>
          </span>
        </div>

        <span className="text-cockpit-border">|</span>

        {/* Pending Approvals Badge (Clickable to open drawer) */}
        <button
          type="button"
          onClick={onToggleTacticalPanel}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
            pendingApprovalsCount > 0
              ? 'bg-severity-med/20 border border-severity-med text-severity-med hover:bg-severity-med/30 font-bold'
              : 'hover:text-cockpit-text'
          }`}
          title="Toggle Tactical Panel (Pending Approvals & Audit Stream)"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="text-[11px] uppercase">
            APPROVALS: {pendingApprovalsCount}
          </span>
        </button>

        <span className="text-cockpit-border">|</span>

        {/* Shortcuts quick button */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="hover:text-cockpit-text flex items-center gap-1 p-0.5"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
