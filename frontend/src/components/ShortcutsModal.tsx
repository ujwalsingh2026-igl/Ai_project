import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K / ⌘ + K', desc: 'Global Command Palette (search, actions, navigation)' },
    { key: '?', desc: 'Open this keyboard shortcuts cheat-sheet overlay' },
    { key: 'Ctrl + /', desc: 'Toggle Right Tactical Panel (Audit Log & Approvals)' },
    { key: 'Ctrl + Enter', desc: 'Submit chat message immediately' },
    { key: 'Esc', desc: 'Close any active modal, dialog, or drawer' },
    { key: 'Tab / Shift + Tab', desc: 'Navigate through all interactive controls' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts Cheat Sheet"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-cockpit-border bg-cockpit-surface p-5 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-cockpit-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cockpit-accent" />
            <h2 className="text-sm font-bold tracking-wide uppercase font-mono text-cockpit-text">
              Keyboard Shortcuts Cheat-Sheet
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close Shortcuts Modal"
            className="text-cockpit-muted hover:text-cockpit-text p-1 rounded hover:bg-cockpit-elevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-cockpit-border/50">
              <span className="text-cockpit-muted text-[11px]">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-cockpit-base border border-cockpit-border text-cockpit-accent font-semibold text-xs whitespace-nowrap">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border text-xs font-mono text-cockpit-text hover:bg-cockpit-border transition-colors"
          >
            CLOSE [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
