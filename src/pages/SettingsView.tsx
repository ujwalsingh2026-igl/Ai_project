import React from 'react';
import { useApp } from '../state';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { APP_CONFIG } from '../config/app.config';
import { Palette, Cpu, Shield, Database } from 'lucide-react';

import { DesignSystemShowcase } from '../components/design-system/DesignSystemShowcase';
import { Tabs } from '../components/ui/Tabs';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [subTab, setSubTab] = React.useState('preferences');

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="pb-4 border-b border-stone-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Settings & Studio Preferences</h1>
          <p className="text-xs text-stone-500">
            Personalize your writing environment, typography, AI companion, and storage.
          </p>
        </div>
        <Tabs
          variant="pills"
          activeTab={subTab}
          onChange={setSubTab}
          items={[
            { id: 'preferences', label: 'Preferences' },
            { id: 'design-system', label: 'Design System & Tokens' },
          ]}
        />
      </div>

      {subTab === 'design-system' ? (
        <DesignSystemShowcase />
      ) : (

      <div className="space-y-4">
        {/* Appearance Section */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Appearance & Typography</h3>
              <p className="text-xs text-stone-500">
                Current theme: <span className="capitalize font-medium">{settings.appearance.theme}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {(['serif', 'sans', 'mono', 'classic'] as const).map((font) => (
              <button
                key={font}
                onClick={() =>
                  updateSettings({
                    appearance: { ...settings.appearance, fontFamily: font },
                  })
                }
                className={`p-2.5 rounded-lg border text-xs font-medium text-center capitalize transition ${
                  settings.appearance.fontFamily === font
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                }`}
              >
                {font} Font
              </button>
            ))}
          </div>
        </Card>

        {/* AI Configuration Section */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">AI Writing Assistant</h3>
              <p className="text-xs text-stone-500">Configured provider and model preferences</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 text-xs text-stone-600">
            <span>AI Assistance Mode</span>
            <Badge variant="accent">Phase 18 Ready</Badge>
          </div>
        </Card>

        {/* Local Storage Section */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Local-First Storage</h3>
              <p className="text-xs text-stone-500">IndexedDB engine active on this device</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 text-xs text-stone-600">
            <span>Database Status</span>
            <Badge variant="neutral">Connected (IndexedDB)</Badge>
          </div>
        </Card>

        {/* System & Privacy Info */}
        <Card className="bg-stone-50/70 border-stone-200/60">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-4 h-4 text-stone-500" />
            <h4 className="text-xs font-semibold text-stone-800">Privacy & Architecture</h4>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            {APP_CONFIG.name} v{APP_CONFIG.version} is designed with a local-first philosophy. Your data remains strictly on your device until optional end-to-end sync is enabled in later phases.
          </p>
        </Card>
      </div>
      )}
    </div>
  );
};
