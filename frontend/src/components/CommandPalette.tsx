import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Calendar,
  Shield,
  Activity,
  Settings,
  Terminal,
  SunMoon,
  HelpCircle,
  X,
  Wifi,
  Brain,
  Stethoscope,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Action' | 'System';
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onOpenShortcuts: () => void;
  onSendSystemQuery: (text: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenShortcuts,
  onSendSystemQuery,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleTheme } = useTheme();

  const commands: CommandItem[] = [
    {
      id: 'nav-assistant',
      title: 'Navigate: Assistant Chat',
      category: 'Navigation',
      icon: <MessageSquare className="w-4 h-4 text-cockpit-accent" />,
      action: () => {
        onNavigate('assistant');
        onClose();
      },
    },
    {
      id: 'nav-daily',
      title: 'Navigate: Daily Assistant (Tasks, Notes, Brief)',
      category: 'Navigation',
      icon: <Calendar className="w-4 h-4 text-severity-info" />,
      action: () => {
        onNavigate('daily');
        onClose();
      },
    },
    {
      id: 'nav-security',
      title: 'Navigate: Defensive Security Center',
      category: 'Navigation',
      icon: <Shield className="w-4 h-4 text-severity-high" />,
      action: () => {
        onNavigate('security');
        onClose();
      },
    },
    {
      id: 'nav-network',
      title: 'Navigate: Network & DNS Inventory (Own LAN)',
      category: 'Navigation',
      icon: <Wifi className="w-4 h-4 text-severity-med" />,
      action: () => {
        onNavigate('network');
        onClose();
      },
    },
    {
      id: 'nav-audit',
      title: 'Navigate: Activity & Audit Telemetry',
      category: 'Navigation',
      icon: <Activity className="w-4 h-4 text-severity-low" />,
      action: () => {
        onNavigate('audit');
        onClose();
      },
    },
    {
      id: 'nav-memory',
      title: 'Navigate: Assistant Memory & Preferences',
      category: 'Navigation',
      icon: <Brain className="w-4 h-4 text-cockpit-accent" />,
      action: () => {
        onNavigate('memory');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      title: 'Navigate: Cockpit Settings',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4 text-cockpit-muted" />,
      action: () => {
        onNavigate('settings');
        onClose();
      },
    },
    {
      id: 'action-system-info',
      title: 'Action: Inspect System Information (Tool)',
      category: 'Action',
      icon: <Terminal className="w-4 h-4 text-cockpit-accent" />,
      action: () => {
        onNavigate('assistant');
        onSendSystemQuery('What system am I running?');
        onClose();
      },
    },
    {
      id: 'action-security-scan',
      title: 'Security: Open Defensive Threat Scanner (Static Analysis)',
      category: 'Action',
      icon: <Shield className="w-4 h-4 text-severity-high" />,
      action: () => {
        onNavigate('security');
        onClose();
      },
    },
    {
      id: 'action-quarantine-vault',
      title: 'Security: Open Quarantine Storage Vault',
      category: 'Action',
      icon: <Shield className="w-4 h-4 text-severity-high" />,
      action: () => {
        onNavigate('security');
        onClose();
      },
    },
    {
      id: 'action-incident-triage',
      title: 'Security: View Incident Log & Playbook Triage',
      category: 'Action',
      icon: <Shield className="w-4 h-4 text-severity-high" />,
      action: () => {
        onNavigate('security');
        onClose();
      },
    },
    {
      id: 'action-firewall-rules',
      title: 'Security: Manage Host Firewall Inbound Block Rules',
      category: 'Action',
      icon: <Shield className="w-4 h-4 text-severity-med" />,
      action: () => {
        onNavigate('security');
        onClose();
      },
    },
    {
      id: 'action-recall-memories',
      title: 'Action: Recall Stored Memories (Tool)',
      category: 'Action',
      icon: <Brain className="w-4 h-4 text-cockpit-accent" />,
      action: () => {
        onSendSystemQuery('what do you remember');
        onClose();
      },
    },
    {
      id: 'action-medical-lookup',
      title: 'Action: Clinical Disease Lookup (Opus 5.5)',
      category: 'Action',
      icon: <Stethoscope className="w-4 h-4 text-severity-info" />,
      action: () => {
        onSendSystemQuery('medical lookup Atrial Fibrillation');
        onClose();
      },
    },
    {
      id: 'action-medical-triage',
      title: 'Action: Symptom Triage & Red Flags (HH-RLHF)',
      category: 'Action',
      icon: <Stethoscope className="w-4 h-4 text-severity-high" />,
      action: () => {
        onSendSystemQuery('medical triage patient presents with palpitations and shortness of breath');
        onClose();
      },
    },
    {
      id: 'action-ecommerce-sales',
      title: 'Action: E-Commerce Sales & Revenue Summary',
      category: 'Action',
      icon: <TrendingUp className="w-4 h-4 text-cockpit-accent" />,
      action: () => {
        onSendSystemQuery('sales summary');
        onClose();
      },
    },
    {
      id: 'action-ecommerce-customer',
      title: 'Action: Customer Analytics & CLV Metrics',
      category: 'Action',
      icon: <ShoppingBag className="w-4 h-4 text-severity-low" />,
      action: () => {
        onSendSystemQuery('customer metrics');
        onClose();
      },
    },
    {
      id: 'action-theme',
      title: 'Action: Cycle Cockpit Theme (Dark / Light / High-Contrast)',
      category: 'Action',
      icon: <SunMoon className="w-4 h-4 text-cockpit-text" />,
      action: () => {
        toggleTheme();
        onClose();
      },
    },
    {
      id: 'action-shortcuts',
      title: 'Help: View Keyboard Shortcuts',
      category: 'System',
      icon: <HelpCircle className="w-4 h-4 text-cockpit-muted" />,
      action: () => {
        onOpenShortcuts();
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-cockpit-border bg-cockpit-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-cockpit-border bg-cockpit-base/50">
          <Search className="w-4 h-4 text-cockpit-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, navigation path, or safe action..."
            className="w-full bg-transparent text-sm text-cockpit-text placeholder-cockpit-muted focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            type="button"
            aria-label="Close Command Palette"
            className="text-cockpit-muted hover:text-cockpit-text p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs font-mono text-cockpit-muted">
              NO MATCHING COMMANDS FOUND
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left text-xs font-mono transition-colors ${
                  idx === selectedIndex
                    ? 'bg-cockpit-elevated border border-cockpit-accent/40 text-cockpit-text'
                    : 'text-cockpit-muted hover:text-cockpit-text border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1 rounded bg-cockpit-base border border-cockpit-border">
                    {cmd.icon}
                  </span>
                  <span>{cmd.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {cmd.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cockpit-border text-cockpit-muted uppercase">
                      {cmd.badge}
                    </span>
                  )}
                  <span className="text-[10px] uppercase text-cockpit-muted">
                    {cmd.category}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-cockpit-border bg-cockpit-base/30 text-[11px] font-mono text-cockpit-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-cockpit-elevated border border-cockpit-border">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-cockpit-elevated border border-cockpit-border">↵</kbd> Execute</span>
            <span><kbd className="px-1 py-0.5 rounded bg-cockpit-elevated border border-cockpit-border">Esc</kbd> Close</span>
          </div>
          <span>Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};
