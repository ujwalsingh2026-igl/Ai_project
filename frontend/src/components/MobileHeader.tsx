import React from 'react';
import { ShieldCheck, Menu, Sliders, Bell } from 'lucide-react';
import { ActiveView } from './Sidebar';

interface MobileHeaderProps {
  activeView: ActiveView;
  isBackendOnline: boolean;
  pendingApprovalsCount: number;
  onOpenDrawer: () => void;
  onToggleTactical: () => void;
}

const VIEW_TITLES: Record<ActiveView, string> = {
  assistant: 'ASSISTANT CHAT',
  daily: 'DAILY ASSISTANT',
  security: 'SECURITY CENTER',
  network: 'NETWORK & DNS',
  audit: 'ACTIVITY & AUDIT',
  memory: 'ASSISTANT MEMORY',
  settings: 'SETTINGS',
};

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeView,
  isBackendOnline,
  pendingApprovalsCount,
  onOpenDrawer,
  onToggleTactical,
}) => {
  return (
    <header className="md:hidden h-14 border-b border-cockpit-border bg-cockpit-surface/95 backdrop-blur px-3 flex items-center justify-between select-none z-30 shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open Navigation Menu"
          className="p-2 -ml-1 rounded text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cockpit-accent/10 border border-cockpit-accent/30 text-cockpit-accent">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-mono text-xs font-bold tracking-wider text-cockpit-text uppercase leading-none">
              {VIEW_TITLES[activeView] || 'AEGIS COCKPIT'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBackendOnline ? 'bg-severity-low shadow-[0_0_6px_rgba(63,185,80,0.8)]' : 'bg-severity-high shadow-[0_0_6px_rgba(248,81,73,0.8)]'
                }`}
              />
              <span className="text-[10px] font-mono text-cockpit-muted uppercase">
                {isBackendOnline ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {pendingApprovalsCount > 0 && (
          <button
            type="button"
            onClick={onToggleTactical}
            aria-label={`${pendingApprovalsCount} pending approvals`}
            className="flex items-center gap-1 px-2 py-1 rounded bg-severity-med/20 border border-severity-med text-severity-med text-[11px] font-mono font-bold animate-pulse"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{pendingApprovalsCount}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTactical}
          aria-label="Toggle Tactical Panel"
          className="p-2 rounded text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated transition-colors"
          title="Tactical Panel (Approvals & Logs)"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
