import React from 'react';
import { MessageSquare, Calendar, Shield, Wifi, MoreHorizontal } from 'lucide-react';
import { ActiveView } from './Sidebar';

interface MobileNavBarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenDrawer: () => void;
  pendingApprovalsCount: number;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeView,
  onSelectView,
  onOpenDrawer,
  pendingApprovalsCount,
}) => {
  const tabs = [
    {
      id: 'assistant' as ActiveView,
      label: 'Chat',
      icon: <MessageSquare className="w-5 h-5" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      id: 'daily' as ActiveView,
      label: 'Daily',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'security' as ActiveView,
      label: 'Security',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: 'network' as ActiveView,
      label: 'Network',
      icon: <Wifi className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-cockpit-surface/95 backdrop-blur border-t border-cockpit-border select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView(tab.id)}
              aria-label={tab.label}
              className={`flex-1 flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors relative ${
                isActive
                  ? 'text-cockpit-accent'
                  : 'text-cockpit-muted hover:text-cockpit-text'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 rounded-full bg-severity-med text-black text-[9px] font-mono font-bold leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-mono mt-0.5 ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-cockpit-accent rounded-full" />
              )}
            </button>
          );
        })}

        {/* More / Menu Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="More Menu"
          className="flex-1 flex flex-col items-center justify-center h-full min-h-[48px] py-1 text-cockpit-muted hover:text-cockpit-text transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-mono mt-0.5">More</span>
        </button>
      </div>
    </nav>
  );
};
