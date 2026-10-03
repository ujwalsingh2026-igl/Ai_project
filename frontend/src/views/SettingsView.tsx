import React from 'react';
import { Settings, Shield, SunMoon, Radio, Lock, CheckCircle2 } from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const {
    language,
    mode,
    autoSend,
    autoSpeak,
    rate,
    pitch,
    selectedVoiceURI,
    availableVoices,
    speak,
    setLanguage,
    setMode,
    setAutoSend,
    setAutoSpeak,
    setRate,
    setPitch,
    setSelectedVoiceURI,
  } = useVoice();

  return (
    <div className="flex-1 overflow-y-auto bg-cockpit-base font-sans p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-cockpit-border pb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-cockpit-accent" />
          <h1 className="font-mono text-base font-bold uppercase tracking-wider text-cockpit-text">
            COMMAND CENTER SETTINGS
          </h1>
        </div>
        <p className="text-xs font-mono text-cockpit-muted mt-0.5">
          Interface personalization, runtime connection, privacy configuration, and permission policy
        </p>
      </div>

      {/* Theme Card */}
      <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <SunMoon className="w-4 h-4 text-cockpit-accent" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cockpit-text">
            Interface Theme & Visual Contrast
          </h2>
        </div>
        <p className="text-xs text-cockpit-muted mb-4">
          Select visual mode. High-contrast provides maximum readability conforming to WCAG 2.1 AAA.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          {[
            { id: 'dark' as Theme, name: 'Dark Cockpit', desc: 'Obsidian void + emerald radar' },
            { id: 'light' as Theme, name: 'Light Terminal', desc: 'Clean daylight operations' },
            { id: 'high-contrast' as Theme, name: 'High Contrast', desc: 'Pure black + phosphor green' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`p-3 rounded border text-left transition-colors ${
                theme === t.id
                  ? 'border-cockpit-accent bg-cockpit-elevated text-cockpit-accent font-semibold shadow-sm'
                  : 'border-cockpit-border bg-cockpit-base text-cockpit-muted hover:text-cockpit-text'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span>{t.name}</span>
                {theme === t.id && <CheckCircle2 className="w-3.5 h-3.5 text-cockpit-accent" />}
              </div>
              <div className="text-[11px] text-cockpit-muted">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Privacy & Voice Controls */}
      <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-cockpit-border pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cockpit-accent" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cockpit-text">
              Voice Access & Audio Engine Configuration
            </h2>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cockpit-base border border-cockpit-border text-cockpit-muted">
            PHASE B: ACTIVE
          </span>
        </div>

        {/* Input Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Recognition Language */}
          <div>
            <label className="block text-[11px] uppercase text-cockpit-muted mb-1">
              Input Accent / Language (STT)
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full p-2 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text focus:outline-none focus:border-cockpit-accent"
            >
              <option value="en-IN">en-IN — Indian English / Hinglish Friendly</option>
              <option value="en-US">en-US — US English</option>
              <option value="hi-IN">hi-IN — Hindi (India)</option>
            </select>
          </div>

          {/* Voice Input Mode */}
          <div>
            <label className="block text-[11px] uppercase text-cockpit-muted mb-1">
              Mic Trigger Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full p-2 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text focus:outline-none focus:border-cockpit-accent"
            >
              <option value="push-to-talk">Push-to-Talk (Hold button / key)</option>
              <option value="toggle">Toggle (Click to start, click to stop)</option>
            </select>
          </div>

          {/* Speech Synthesis Voice */}
          <div>
            <label className="block text-[11px] uppercase text-cockpit-muted mb-1">
              TTS Voice Picker
            </label>
            <select
              value={selectedVoiceURI || ''}
              onChange={(e) => setSelectedVoiceURI(e.target.value || null)}
              className="w-full p-2 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text focus:outline-none focus:border-cockpit-accent"
            >
              <option value="">Default System Voice</option>
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Rate and Pitch Sliders */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cockpit-muted uppercase">Speech Rate: {rate.toFixed(1)}x</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-32 accent-cockpit-accent cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cockpit-muted uppercase">Pitch: {pitch.toFixed(1)}</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-32 accent-cockpit-accent cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="pt-2 border-t border-cockpit-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <label className="flex items-center gap-2.5 p-2 rounded bg-cockpit-base border border-cockpit-border cursor-pointer hover:border-cockpit-accent/50">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="accent-cockpit-accent cursor-pointer"
            />
            <div>
              <div className="font-semibold text-cockpit-text">Auto-send recognized voice</div>
              <div className="text-[10px] text-cockpit-muted">Default OFF: review & edit transcript before sending</div>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-2 rounded bg-cockpit-base border border-cockpit-border cursor-pointer hover:border-cockpit-accent/50">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="accent-cockpit-accent cursor-pointer"
            />
            <div>
              <div className="font-semibold text-cockpit-text">Auto-speak assistant replies</div>
              <div className="text-[10px] text-cockpit-muted">Default OFF: spoken replies upon message delivery</div>
            </div>
          </label>
        </div>

        {/* Test Speech Button */}
        <div className="pt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => speak("Aegis Command Center voice synthesizer operational.")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border text-xs font-mono text-cockpit-text hover:bg-cockpit-border transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-cockpit-accent" />
            <span>TEST VOICE SYNTHESIS</span>
          </button>
        </div>

        {/* Privacy Disclosures */}
        <div className="p-3 rounded bg-cockpit-base border border-cockpit-border/80 space-y-2 text-xs text-cockpit-muted leading-relaxed font-sans">
          <p>
            <strong className="text-cockpit-text">Browser Web Speech API Privacy Notice:</strong> In Chromium browsers (such as Google Chrome), native speech recognition streams voice packets to the browser vendor's cloud service for transcription.
          </p>
          <p>
            <strong className="text-cockpit-text">Private Offline Speech (Local):</strong> Zero-cloud offline Whisper STT + local Piper TTS engine is architecturally designated as <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-cockpit-elevated border border-cockpit-border text-cockpit-muted">PLANNED</span> behind the existing <code>VoiceInput / VoiceOutput</code> abstraction layer.
          </p>
          <p className="font-mono text-[11px] text-severity-low flex items-center gap-1.5 pt-1">
            <Lock className="w-3.5 h-3.5" />
            <span>No audio is ever recorded or persisted to disk. Approvals can NEVER be executed by voice.</span>
          </p>
        </div>
      </div>

      {/* Permission Engine Reference */}
      <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-severity-med" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cockpit-text">
            Permission Engine Hard Safety Caps
          </h2>
        </div>
        <p className="text-xs text-cockpit-muted mb-3 font-sans">
          Rules enforced server-side by <code className="font-mono text-cockpit-accent">backend/core/permissions.py</code> that can never be weakened:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-cockpit-border text-cockpit-muted text-[11px]">
                <th className="pb-2">LEVEL</th>
                <th className="pb-2">SCOPE</th>
                <th className="pb-2">POLICY</th>
                <th className="pb-2">HARD CAP RULE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cockpit-border/50 text-[11px]">
              <tr>
                <td className="py-2 text-severity-low font-bold">0</td>
                <td className="py-2">App Config</td>
                <td className="py-2 text-severity-low">ALLOW</td>
                <td className="py-2 text-cockpit-muted">Read internal config</td>
              </tr>
              <tr>
                <td className="py-2 text-severity-low font-bold">1</td>
                <td className="py-2">User Data</td>
                <td className="py-2">ASK / ALLOW</td>
                <td className="py-2 text-cockpit-muted">ALLOW only if user selected file</td>
              </tr>
              <tr>
                <td className="py-2 text-severity-low font-bold">2</td>
                <td className="py-2">Read Device Info</td>
                <td className="py-2">ALLOW (Phase 1)</td>
                <td className="py-2 text-cockpit-muted">Explicit read-only device check</td>
              </tr>
              <tr>
                <td className="py-2 text-severity-med font-bold">3</td>
                <td className="py-2">External Call / Feed</td>
                <td className="py-2 text-severity-med">ASK</td>
                <td className="py-2 text-severity-med font-bold">Hard cap: NEVER auto-ALLOW</td>
              </tr>
              <tr>
                <td className="py-2 text-severity-high font-bold">4</td>
                <td className="py-2">Security Response / Quarantine</td>
                <td className="py-2 text-severity-high">ASK</td>
                <td className="py-2 text-severity-high font-bold">Hard cap: NEVER auto-ALLOW</td>
              </tr>
              <tr>
                <td className="py-2 text-severity-crit font-bold">5</td>
                <td className="py-2">Malicious / Remote Exploit</td>
                <td className="py-2 text-severity-crit">BLOCK</td>
                <td className="py-2 text-severity-crit font-bold">ALWAYS BLOCKED (Fail-closed)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Management */}
      <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cockpit-text">
            Active Session
          </h2>
          <p className="text-xs font-mono text-cockpit-muted">
            Token stored in memory & sessionStorage • Clears immediately upon logout
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 rounded bg-severity-high/15 border border-severity-high text-severity-high text-xs font-mono font-bold uppercase hover:bg-severity-high/25 transition-colors"
        >
          TERMINATE SESSION
        </button>
      </div>
    </div>
  );
};
