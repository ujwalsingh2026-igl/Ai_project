import React from 'react';
import {
  MessageSquare,
  Calendar,
  Shield,
  Wifi,
  Activity,
  Brain,
  Settings,
  LogOut,
  ShieldCheck,
  SunMoon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export type ActiveView =
  | 'assistant'
  | 'daily'
  | 'security'
  | 'network'
  | 'audit'
  | 'memory'
  | 'settings';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  pendingApprovalsCount,
}) => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    {
      id: 'assistant' as ActiveView,
      label: 'Assistant Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} ASK` : undefined,
      badgeColor: 'text-severity-med bg-severity-med/20 border-severity-med',
    },
    {
      id: 'daily' as ActiveView,
      label: 'Daily Assistant',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'security' as ActiveView,
      label: 'Security Center',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: 'network' as ActiveView,
      label: 'Network & DNS',
      icon: <Wifi className="w-4 h-4" />,
    },
    {
      id: 'audit' as ActiveView,
      label: 'Activity & Audit',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'memory' as ActiveView,
      label: 'Memory',
      icon: <Brain className="w-4 h-4" />,
    },
    {
      id: 'settings' as ActiveView,
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside
      role="navigation"
      aria-label="Cockpit Main Navigation"
      className="w-60 border-r border-cockpit-border bg-cockpit-surface flex flex-col justify-between shrink-0 font-sans select-none"
    >
      {/* Brand Header */}
      <div>
        <div className="h-14 border-b border-cockpit-border px-4 flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-cockpit-accent/10 border border-cockpit-accent/30 text-cockpit-accent">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-wider text-cockpit-text">
              AEGIS // COCKPIT
            </h1>
            <div className="text-[10px] font-mono text-cockpit-muted uppercase tracking-tight">
              PRIVATE COMMAND CENTER
            </div>
          </div>
        </div>

        {/* Navigation Link List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-cockpit-elevated border border-cockpit-accent text-cockpit-accent font-semibold shadow-sm'
                    : 'text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-cockpit-accent' : 'text-cockpit-muted'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${
                      item.badgeColor || 'border-cockpit-border text-cockpit-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User & System Controls */}
      <div className="p-3 border-t border-cockpit-border space-y-2 bg-cockpit-base/40">
        <div className="flex items-center justify-between px-2 text-xs font-mono text-cockpit-muted">
          <span>THEME: {theme.toUpperCase()}</span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-1 rounded hover:text-cockpit-text hover:bg-cockpit-elevated"
            title="Cycle theme (Dark / Light / High-Contrast)"
          >
            <SunMoon className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-cockpit-elevated border border-cockpit-border text-xs font-mono text-cockpit-muted hover:text-severity-high hover:border-severity-high/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOGOUT SESSION</span>
        </button>
      </div>
    </aside>
  );
};
