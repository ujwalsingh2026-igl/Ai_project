import React, { useState } from 'react';
import { useApp } from '../state';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { APP_CONFIG } from '../config/app.config';
import { Cpu, Shield, Database, Sliders } from 'lucide-react';
import { ThemeCustomizer } from '../components/theme/ThemeCustomizer';
import { DesignSystemShowcase } from '../components/design-system/DesignSystemShowcase';
import { Tabs } from '../components/ui/Tabs';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<'themes' | 'preferences' | 'design-system'>('themes');

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Settings Header */}
      <div className="pb-4 border-b border-stone-200/70 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Settings & Studio Studio
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Personalize themes, typography, writing modes, AI companion, and storage.
          </p>
        </div>

        <Tabs
          variant="pills"
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as typeof activeTab)}
          items={[
            { id: 'themes', label: 'Themes & Studio' },
            { id: 'preferences', label: 'Editor & Engine' },
            { id: 'design-system', label: 'Design Tokens' },
          ]}
        />
      </div>

      {/* Tab 1: Themes & Customization */}
      {activeTab === 'themes' && <ThemeCustomizer />}

      {/* Tab 2: Editor & System Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Editor Preferences */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Editor Behavior & Metrics
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Auto-save timings, spell check, and live status bar counters.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                  Spell Check Active
                </span>
                <input
                  type="checkbox"
                  checked={settings.editor.spellCheck}
                  onChange={(e) =>
                    updateSettings({
                      editor: { ...settings.editor, spellCheck: e.target.checked },
                    })
                  }
                  className="rounded text-amber-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                  Show Word Count
                </span>
                <input
                  type="checkbox"
                  checked={settings.editor.showWordCount}
                  onChange={(e) =>
                    updateSettings({
                      editor: { ...settings.editor, showWordCount: e.target.checked },
                    })
                  }
                  className="rounded text-amber-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                  Show Reading Time
                </span>
                <input
                  type="checkbox"
                  checked={settings.editor.showReadingTime}
                  onChange={(e) =>
                    updateSettings({
                      editor: { ...settings.editor, showReadingTime: e.target.checked },
                    })
                  }
                  className="rounded text-amber-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                  Typewriter Scroll
                </span>
                <input
                  type="checkbox"
                  checked={settings.editor.typewriterMode}
                  onChange={(e) =>
                    updateSettings({
                      editor: { ...settings.editor, typewriterMode: e.target.checked },
                    })
                  }
                  className="rounded text-amber-600"
                />
              </label>
            </div>
          </Card>

          {/* AI Configuration Section */}
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  AI Writing Assistant Engine
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Local-first AI prompts, smart continuity, and auto-suggest.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 text-xs text-stone-600 dark:text-stone-400">
              <span>Assistant Pipeline</span>
              <Badge variant="accent">Phase 18 Integration Ready</Badge>
            </div>
          </Card>

          {/* Local Storage Section */}
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Local-First Storage Engine
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  IndexedDB engine active and persisting all manuscripts locally on this machine.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 text-xs text-stone-600 dark:text-stone-400">
              <span>Database Engine</span>
              <Badge variant="neutral">Connected (IndexedDB v1)</Badge>
            </div>
          </Card>

          {/* System & Privacy Info */}
          <Card className="bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-4 h-4 text-stone-500" />
              <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                Privacy Architecture
              </h4>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {APP_CONFIG.name} v{APP_CONFIG.version} adheres to a strict local-first philosophy. Your
              notes, manuscripts, characters, and journals are saved directly to your device and never
              transmitted to unverified servers.
            </p>
          </Card>
        </div>
      )}

      {/* Tab 3: Design System Tokens */}
      {activeTab === 'design-system' && <DesignSystemShowcase />}
    </div>
  );
};
