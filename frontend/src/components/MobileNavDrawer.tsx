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
  X,
  Lock,
} from 'lucide-react';
import { ActiveView } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  pendingApprovalsCount: number;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  pendingApprovalsCount,
}) => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const navItems = [
    {
      id: 'assistant' as ActiveView,
      label: 'Assistant Chat',
      icon: <MessageSquare className="w-5 h-5" />,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} ASK` : undefined,
      badgeColor: 'text-severity-med bg-severity-med/20 border-severity-med',
    },
    {
      id: 'daily' as ActiveView,
      label: 'Daily Assistant',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'security' as ActiveView,
      label: 'Security Center',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: 'network' as ActiveView,
      label: 'Network & DNS',
      icon: <Wifi className="w-5 h-5" />,
    },
    {
      id: 'audit' as ActiveView,
      label: 'Activity & Audit',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      id: 'memory' as ActiveView,
      label: 'Assistant Memory',
      icon: <Brain className="w-5 h-5" />,
    },
    {
      id: 'settings' as ActiveView,
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const handleSelect = (view: ActiveView) => {
    onSelectView(view);
    onClose();
  };

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative w-4/5 max-w-xs bg-cockpit-surface border-r border-cockpit-border h-full flex flex-col justify-between shadow-2xl z-10 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div>
          <div className="h-14 border-b border-cockpit-border px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-cockpit-accent/10 border border-cockpit-accent/30 text-cockpit-accent">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-mono text-xs font-bold tracking-wider text-cockpit-text">
                  AEGIS // MOBILE
                </h2>
                <div className="text-[10px] font-mono text-cockpit-muted uppercase tracking-tight">
                  COMMAND CENTER
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Navigation"
              className="p-1.5 rounded text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded text-sm font-mono transition-colors min-h-[48px] ${
                    isActive
                      ? 'bg-cockpit-accent/15 text-cockpit-accent border border-cockpit-accent/40 font-semibold shadow-glow'
                      : 'text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-cockpit-accent' : 'text-cockpit-muted'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        item.badgeColor || 'bg-cockpit-border text-cockpit-text'
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

        {/* Footer with Security Status, Theme, and Logout */}
        <div className="p-3 border-t border-cockpit-border bg-cockpit-base/50 space-y-2">
          {/* Security Boundary Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-cockpit-surface border border-cockpit-border text-[11px] font-mono text-cockpit-muted">
            <Lock className="w-3.5 h-3.5 text-cockpit-accent shrink-0" />
            <span>ENCRYPTED ZERO-TRUST MOBILE SESSION</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded bg-cockpit-surface border border-cockpit-border hover:bg-cockpit-elevated text-xs font-mono text-cockpit-text min-h-[44px] transition-colors"
            >
              <SunMoon className="w-4 h-4 text-cockpit-accent" />
              <span className="capitalize">{theme}</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded bg-severity-high/10 border border-severity-high/30 hover:bg-severity-high/20 text-xs font-mono text-severity-high min-h-[44px] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
