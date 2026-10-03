import React, { useState } from 'react';
import { useApp } from '../../state';
import {
  BUILT_IN_THEMES,
  ACCENT_PRESETS,
  type ThemeDefinition,
} from '../../theme/themeEngine';
import type {
  ThemeMode,
  WritingMode,
  WritingWidth,
  FontFamily,
  UIDensity,
} from '../../types';
import {
  Palette,
  Type,
  BookOpen,
  Layout,
  Eye,
  Check,
  Sparkles,
  SunMoon,
} from 'lucide-react';

export const ThemeCustomizer: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const appearance = settings.appearance;

  const [customBg, setCustomBg] = useState(appearance.customColors?.bg || '#f8fafc');
  const [customSurface, setCustomSurface] = useState(
    appearance.customColors?.surface || '#ffffff'
  );
  const [customText, setCustomText] = useState(
    appearance.customColors?.textPrimary || '#0f172a'
  );
  const [customAccent, setCustomAccent] = useState(
    appearance.customColors?.accent || '#6366f1'
  );

  const handleThemeSelect = (themeId: ThemeMode) => {
    updateSettings({
      appearance: {
        ...appearance,
        theme: themeId,
        followSystemTheme: false,
      },
    });
  };

  const handleAccentSelect = (hex: string) => {
    updateSettings({
      appearance: {
        ...appearance,
        accentColor: hex,
      },
    });
  };

  const handleCustomColorsApply = () => {
    updateSettings({
      appearance: {
        ...appearance,
        theme: 'custom',
        customColors: {
          bg: customBg,
          surface: customSurface,
          surfaceElevated: customSurface,
          textPrimary: customText,
          textSecondary: customText,
          accent: customAccent,
          border: '#cbd5e1',
        },
      },
    });
  };

  const typographyFamilies: { id: FontFamily; label: string; sample: string }[] = [
    { id: 'serif', label: 'Literary Serif', sample: 'EB Garamond — Classic literature' },
    { id: 'sans', label: 'Clean Sans', sample: 'Inter — Modern clarity' },
    { id: 'mono', label: 'Typewriter Mono', sample: 'JetBrains Mono — Poetic rhythm' },
    { id: 'classic', label: 'Book Classical', sample: 'Cinzel / Playfair — Regal prose' },
    { id: 'modern', label: 'Modern Studio', sample: 'Inter — Sleek readability' },
    { id: 'handwriting', label: 'Handwritten Script', sample: 'Caveat — Journaling & notes' },
  ];

  const writingModes: { id: WritingMode; label: string; desc: string }[] = [
    { id: 'paper', label: 'Paper Sheet', desc: 'Centered fine press manuscript card' },
    { id: 'canvas', label: 'Fluid Canvas', desc: 'Border-free, continuous fluid writing' },
    { id: 'focus', label: 'Pure Focus', desc: 'Distraction-free minimal surface' },
    { id: 'book', label: 'Hardcover Book', desc: 'Double-page print layout on wide screens' },
  ];

  const writingWidths: { id: WritingWidth; label: string }[] = [
    { id: 'narrow', label: 'Narrow (600px)' },
    { id: 'medium', label: 'Standard (768px)' },
    { id: 'wide', label: 'Wide (980px)' },
    { id: 'full', label: 'Full Width (100%)' },
  ];

  const densities: { id: UIDensity; label: string; desc: string }[] = [
    { id: 'compact', label: 'Compact', desc: 'Dense toolbars, concise padding' },
    { id: 'comfortable', label: 'Comfortable', desc: 'Balanced literary whitespace' },
    { id: 'spacious', label: 'Spacious', desc: 'Expansive breathing room' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Live Interactive Theme Preview */}
      <section className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Live Theme Preview
            </h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium capitalize">
            {appearance.theme} • {appearance.writingMode}
          </span>
        </div>

        {/* Preview Frame */}
        <div className="p-6 sm:p-8 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex justify-center">
          <div className="w-full max-w-xl writing-sheet p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
            <h2 className="text-2xl font-bold mb-2 font-serif text-[var(--color-text-primary)]">
              Where Every Story Finds Its Form
            </h2>
            <p
              className="mb-4 text-[var(--color-text-secondary)] leading-relaxed"
              style={{
                fontSize: `${appearance.fontSize}px`,
                lineHeight: appearance.lineHeight,
                letterSpacing: `${appearance.letterSpacing}px`,
              }}
            >
              LITERIA is designed for writers who appreciate the timeless aesthetic of ink
              on paper, merged with modern local-first simplicity.
            </p>
            <blockquote className="border-l-2 border-[var(--color-accent)] pl-3 italic text-xs text-[var(--color-text-muted)] my-3">
              “Write. Create. Remember.”
            </blockquote>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                24 words • 1 min read
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Built-in Theme Selector */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-serif">
              <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Built-in Literary Themes
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Select a meticulously tuned visual palette for day, evening, or midnight sessions.
            </p>
          </div>

          {/* System Theme Toggle */}
          <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 cursor-pointer bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700">
            <SunMoon className="w-3.5 h-3.5 text-stone-500" />
            <span>Follow OS Theme</span>
            <input
              type="checkbox"
              checked={appearance.followSystemTheme}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, followSystemTheme: e.target.checked },
                })
              }
              className="rounded text-amber-600"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.values(BUILT_IN_THEMES) as ThemeDefinition[]).map((theme) => {
            const isSelected = appearance.theme === theme.id && !appearance.followSystemTheme;
            return (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'border-amber-600 ring-2 ring-amber-500/20 shadow-md bg-stone-50/50 dark:bg-stone-800/50'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                      {theme.name}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 line-clamp-2">
                    {theme.description}
                  </p>
                </div>

                {/* Color Swatch Bar */}
                <div
                  className="h-8 rounded-lg p-1.5 flex items-center justify-between border border-black/10"
                  style={{ backgroundColor: theme.preview.bg }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: theme.preview.surface }}
                    />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.preview.text }}
                    />
                  </div>
                  <div
                    className="w-4 h-4 rounded-full ring-2 ring-white/50"
                    style={{ backgroundColor: theme.preview.accent }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Custom Studio Color Palette (When Custom is selected) */}
      {appearance.theme === 'custom' && (
        <section className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 font-mono">
            Custom Studio Palette
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-stone-500 mb-1">Canvas Background</label>
              <input
                type="color"
                value={customBg}
                onChange={(e) => setCustomBg(e.target.value)}
                className="w-full h-8 rounded border border-stone-300 dark:border-stone-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-stone-500 mb-1">Surface Card</label>
              <input
                type="color"
                value={customSurface}
                onChange={(e) => setCustomSurface(e.target.value)}
                className="w-full h-8 rounded border border-stone-300 dark:border-stone-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-stone-500 mb-1">Text Color</label>
              <input
                type="color"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full h-8 rounded border border-stone-300 dark:border-stone-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-stone-500 mb-1">Accent Dot</label>
              <input
                type="color"
                value={customAccent}
                onChange={(e) => setCustomAccent(e.target.value)}
                className="w-full h-8 rounded border border-stone-300 dark:border-stone-700 cursor-pointer"
              />
            </div>
          </div>
          <button
            onClick={handleCustomColorsApply}
            className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:opacity-90 transition"
          >
            Apply Custom Palette
          </button>
        </section>
      )}

      {/* 4. Curated Accent Colors */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-serif">
          <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Literary Accent Color
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Personalize highlights, cursor cues, links, and focal borders.
        </p>
        <div className="flex flex-wrap gap-2.5 pt-1">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleAccentSelect(preset.hex)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition ${
                appearance.accentColor === preset.hex
                  ? 'border-stone-900 dark:border-stone-100 ring-2 ring-stone-900/10'
                  : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: preset.hex }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Typography Category & Scale */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-serif">
            <Type className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Typography & Prose Rhythm
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Select font classification and fine-tune editorial line spacing and font sizing.
          </p>
        </div>

        {/* Font Family Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {typographyFamilies.map((font) => (
            <button
              key={font.id}
              onClick={() =>
                updateSettings({
                  appearance: { ...appearance, fontFamily: font.id },
                })
              }
              className={`p-3 rounded-xl border text-left transition ${
                appearance.fontFamily === font.id
                  ? 'border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/30'
                  : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 mb-1">
                {font.label}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate font-serif">
                {font.sample}
              </div>
            </button>
          ))}
        </div>

        {/* Sliders: Size, Line Height, Letter Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-stone-600 dark:text-stone-300">Font Size</span>
              <span className="font-mono font-medium">{appearance.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="28"
              step="1"
              value={appearance.fontSize}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, fontSize: Number(e.target.value) },
                })
              }
              className="w-full accent-amber-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-stone-600 dark:text-stone-300">Line Height</span>
              <span className="font-mono font-medium">{appearance.lineHeight}</span>
            </div>
            <input
              type="range"
              min="1.3"
              max="2.4"
              step="0.05"
              value={appearance.lineHeight}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, lineHeight: Number(e.target.value) },
                })
              }
              className="w-full accent-amber-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-stone-600 dark:text-stone-300">Letter Spacing</span>
              <span className="font-mono font-medium">{appearance.letterSpacing}px</span>
            </div>
            <input
              type="range"
              min="-0.5"
              max="2.0"
              step="0.1"
              value={appearance.letterSpacing}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, letterSpacing: Number(e.target.value) },
                })
              }
              className="w-full accent-amber-600"
            />
          </div>
        </div>
      </section>

      {/* 6. Writing Modes & Canvas Width */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-serif">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Writing Modes & Canvas Format
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Switch between book simulation, paper card, or unbounded fluid canvas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {writingModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() =>
                updateSettings({
                  appearance: { ...appearance, writingMode: mode.id },
                })
              }
              className={`p-3.5 rounded-xl border text-left transition ${
                appearance.writingMode === mode.id
                  ? 'border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/30'
                  : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 mb-1">
                {mode.label}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                {mode.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Writing Widths */}
        <div className="flex flex-wrap gap-2 pt-1">
          {writingWidths.map((w) => (
            <button
              key={w.id}
              onClick={() =>
                updateSettings({
                  appearance: { ...appearance, writingWidth: w.id },
                })
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                appearance.writingWidth === w.id
                  ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      {/* 7. UI Density & Glassmorphism */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-serif">
            <Layout className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            UI Density & Surface Translucency
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Control compact versus spacious spacing and frosted glass surfaces.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {densities.map((d) => (
            <button
              key={d.id}
              onClick={() =>
                updateSettings({
                  appearance: { ...appearance, uiDensity: d.id },
                })
              }
              className={`p-3.5 rounded-xl border text-left transition ${
                appearance.uiDensity === d.id
                  ? 'border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/30'
                  : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 mb-1">
                {d.label}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                {d.desc}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={appearance.translucency}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, translucency: e.target.checked },
                })
              }
              className="rounded text-amber-600"
            />
            <span>Enable Translucent Frosted Glass</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={appearance.blur}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, blur: e.target.checked },
                })
              }
              className="rounded text-amber-600"
            />
            <span>Enable Backdrop Blur Filter</span>
          </label>
        </div>
      </section>

      {/* 8. Accessibility Suite */}
      <section className="space-y-4 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-serif">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Accessibility & Visual Comfort
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Dedicated ergonomic preferences for high contrast, reduced motion, and solid backgrounds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900">
            <div>
              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                High Contrast Mode
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Sharper borders and deep black/white contrast
              </div>
            </div>
            <input
              type="checkbox"
              checked={appearance.highContrast}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, highContrast: e.target.checked },
                })
              }
              className="rounded text-amber-600"
            />
          </label>

          <label className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900">
            <div>
              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Reduced Motion
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Disables transitions and UI animations
              </div>
            </div>
            <input
              type="checkbox"
              checked={appearance.reducedMotion}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, reducedMotion: e.target.checked },
                })
              }
              className="rounded text-amber-600"
            />
          </label>

          <label className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900">
            <div>
              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Larger Text Scale
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Increases base typography sizing
              </div>
            </div>
            <input
              type="checkbox"
              checked={appearance.largerText}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, largerText: e.target.checked },
                })
              }
              className="rounded text-amber-600"
            />
          </label>

          <label className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900">
            <div>
              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Reduced Transparency
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Replaces frosted glass with solid opaque surfaces
              </div>
            </div>
            <input
              type="checkbox"
              checked={appearance.reducedTransparency}
              onChange={(e) =>
                updateSettings({
                  appearance: { ...appearance, reducedTransparency: e.target.checked },
                })
              }
              className="rounded text-amber-600"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
