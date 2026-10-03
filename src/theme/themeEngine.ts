import type { ThemeMode, AppearanceSettings } from '../types';

export interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  description: string;
  type: 'light' | 'dark';
  preview: {
    bg: string;
    surface: string;
    text: string;
    accent: string;
  };
  colors: {
    bg: string;
    surface: string;
    surfaceElevated: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    accentSubtle: string;
    border: string;
    borderSubtle: string;
    borderStrong: string;
  };
}

export const BUILT_IN_THEMES: Record<ThemeMode, ThemeDefinition> = {
  light: {
    id: 'light',
    name: 'Warm Light',
    description: 'Clean, warm literary daylight inspired by fresh fine press paper.',
    type: 'light',
    preview: {
      bg: '#fafaf9',
      surface: '#ffffff',
      text: '#1c1917',
      accent: '#d97706',
    },
    colors: {
      bg: '#fafaf9',
      surface: '#ffffff',
      surfaceElevated: '#ffffff',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#a8a29e',
      accent: '#d97706',
      accentHover: '#b45309',
      accentSubtle: '#fef3c7',
      border: '#e7e5e4',
      borderSubtle: '#f5f5f4',
      borderStrong: '#d6d3d1',
    },
  },
  dark: {
    id: 'dark',
    name: 'Charcoal Dark',
    description: 'Restful, warm carbon dark mode calibrated for night writing.',
    type: 'dark',
    preview: {
      bg: '#141211',
      surface: '#1c1917',
      text: '#fafaf9',
      accent: '#f59e0b',
    },
    colors: {
      bg: '#141211',
      surface: '#1c1917',
      surfaceElevated: '#292524',
      textPrimary: '#fafaf9',
      textSecondary: '#d6d3d1',
      textMuted: '#78716c',
      accent: '#f59e0b',
      accentHover: '#fbbf24',
      accentSubtle: '#292524',
      border: '#292524',
      borderSubtle: '#1c1917',
      borderStrong: '#44403c',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Obsidian',
    description: 'Deep navy celestial obsidian with crisp luminous contrasts.',
    type: 'dark',
    preview: {
      bg: '#0a0d14',
      surface: '#101624',
      text: '#f1f5f9',
      accent: '#38bdf8',
    },
    colors: {
      bg: '#0a0d14',
      surface: '#101624',
      surfaceElevated: '#182032',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      accent: '#38bdf8',
      accentHover: '#0284c7',
      accentSubtle: '#0c2238',
      border: '#1e293b',
      borderSubtle: '#131b2c',
      borderStrong: '#334155',
    },
  },
  ivory: {
    id: 'ivory',
    name: 'Classic Ivory',
    description: 'Timeless linen cream tone reminiscent of antiquarian hardcover prints.',
    type: 'light',
    preview: {
      bg: '#fcf9f2',
      surface: '#f5f0e6',
      text: '#2c2724',
      accent: '#b45309',
    },
    colors: {
      bg: '#fcf9f2',
      surface: '#f5f0e6',
      surfaceElevated: '#ebe4d5',
      textPrimary: '#2c2724',
      textSecondary: '#615852',
      textMuted: '#9e948c',
      accent: '#b45309',
      accentHover: '#92400e',
      accentSubtle: '#faeedb',
      border: '#e6decb',
      borderSubtle: '#efe9dc',
      borderStrong: '#d5cbb5',
    },
  },
  sepia: {
    id: 'sepia',
    name: 'Antiquarian Sepia',
    description: 'Rich amber-brown parchment with soothing historical warmth.',
    type: 'light',
    preview: {
      bg: '#f5ebd7',
      surface: '#ebe0c7',
      text: '#43302b',
      accent: '#8c431d',
    },
    colors: {
      bg: '#f5ebd7',
      surface: '#ebe0c7',
      surfaceElevated: '#dfd2b5',
      textPrimary: '#43302b',
      textSecondary: '#6e544c',
      textMuted: '#9e857c',
      accent: '#8c431d',
      accentHover: '#703314',
      accentSubtle: '#f4dec5',
      border: '#d5c5a8',
      borderSubtle: '#ded1b8',
      borderStrong: '#c2af8e',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Pure Minimal',
    description: 'Distraction-free high-legibility monochrome black-and-white print.',
    type: 'light',
    preview: {
      bg: '#ffffff',
      surface: '#ffffff',
      text: '#000000',
      accent: '#171717',
    },
    colors: {
      bg: '#ffffff',
      surface: '#ffffff',
      surfaceElevated: '#f4f4f5',
      textPrimary: '#09090b',
      textSecondary: '#52525b',
      textMuted: '#a1a1aa',
      accent: '#18181b',
      accentHover: '#27272a',
      accentSubtle: '#f4f4f5',
      border: '#e4e4e7',
      borderSubtle: '#f4f4f5',
      borderStrong: '#d4d4d8',
    },
  },
  forest: {
    id: 'forest',
    name: 'Emerald Forest',
    description: 'Deep woodland moss and evergreen tones designed for tranquil contemplation.',
    type: 'dark',
    preview: {
      bg: '#08110c',
      surface: '#0f1f17',
      text: '#ecfdf5',
      accent: '#10b981',
    },
    colors: {
      bg: '#08110c',
      surface: '#0f1f17',
      surfaceElevated: '#172e22',
      textPrimary: '#ecfdf5',
      textSecondary: '#a7f3d0',
      textMuted: '#4b7a62',
      accent: '#10b981',
      accentHover: '#059669',
      accentSubtle: '#0c2e1f',
      border: '#1b3829',
      borderSubtle: '#12261c',
      borderStrong: '#254e39',
    },
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Twilight',
    description: 'Nocturnal violet twilight with luminous amethyst accents.',
    type: 'dark',
    preview: {
      bg: '#0f0b17',
      surface: '#181226',
      text: '#f5f3ff',
      accent: '#a855f7',
    },
    colors: {
      bg: '#0f0b17',
      surface: '#181226',
      surfaceElevated: '#241a38',
      textPrimary: '#f5f3ff',
      textSecondary: '#ddd6fe',
      textMuted: '#7c6f9e',
      accent: '#a855f7',
      accentHover: '#9333ea',
      accentSubtle: '#271940',
      border: '#2c2045',
      borderSubtle: '#1f1631',
      borderStrong: '#3d2e5e',
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom Studio',
    description: 'Your personalized palette with bespoke canvas and accent colors.',
    type: 'light',
    preview: {
      bg: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      accent: '#6366f1',
    },
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceElevated: '#f1f5f9',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      accent: '#6366f1',
      accentHover: '#4f46e5',
      accentSubtle: '#e0e7ff',
      border: '#e2e8f0',
      borderSubtle: '#f1f5f9',
      borderStrong: '#cbd5e1',
    },
  },
};

export const ACCENT_PRESETS = [
  { name: 'Amber Gold', hex: '#d97706', hover: '#b45309', subtle: '#fef3c7' },
  { name: 'Literary Crimson', hex: '#be123c', hover: '#9f1239', subtle: '#ffe4e6' },
  { name: 'Forest Jade', hex: '#059669', hover: '#047857', subtle: '#d1fae5' },
  { name: 'Celestial Indigo', hex: '#4f46e5', hover: '#4338ca', subtle: '#e0e7ff' },
  { name: 'Royal Violet', hex: '#7c3aed', hover: '#6d28d9', subtle: '#ede9fe' },
  { name: 'Teal Quill', hex: '#0f766e', hover: '#115e59', subtle: '#ccfbf1' },
  { name: 'Obsidian Noir', hex: '#18181b', hover: '#27272a', subtle: '#f4f4f5' },
  { name: 'Coral Sun', hex: '#ea580c', hover: '#c2410c', subtle: '#ffedd5' },
];

export function applyThemeToDOM(settings: AppearanceSettings): void {
  const root = document.documentElement;

  // Determine active theme mode (with system fallback if followSystemTheme enabled)
  let effectiveTheme = settings.theme;
  if (settings.followSystemTheme) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = prefersDark ? 'dark' : 'light';
  }

  // Set theme data-attributes
  root.setAttribute('data-theme', effectiveTheme);
  root.setAttribute('data-writing-mode', settings.writingMode || 'paper');
  root.setAttribute('data-density', settings.uiDensity || 'comfortable');
  root.setAttribute('data-font', settings.fontFamily || 'serif');

  // Accessibility attributes
  root.setAttribute('data-high-contrast', settings.highContrast ? 'true' : 'false');
  root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false');
  root.setAttribute('data-larger-text', settings.largerText ? 'true' : 'false');
  root.setAttribute('data-increased-line-height', settings.increasedLineHeight ? 'true' : 'false');
  root.setAttribute('data-reduced-transparency', settings.reducedTransparency ? 'true' : 'false');

  // Dynamic CSS custom variables
  const themeDef = BUILT_IN_THEMES[effectiveTheme] || BUILT_IN_THEMES.light;
  const colors = effectiveTheme === 'custom' && settings.customColors
    ? {
        ...themeDef.colors,
        bg: settings.customColors.bg,
        surface: settings.customColors.surface,
        surfaceElevated: settings.customColors.surfaceElevated || settings.customColors.surface,
        textPrimary: settings.customColors.textPrimary,
        textSecondary: settings.customColors.textSecondary,
        accent: settings.customColors.accent || settings.accentColor,
        border: settings.customColors.border,
      }
    : themeDef.colors;

  // Set root CSS custom properties
  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-surface-elevated', colors.surfaceElevated);
  root.style.setProperty('--color-text-primary', colors.textPrimary);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-border-subtle', colors.borderSubtle);
  root.style.setProperty('--color-border-strong', colors.borderStrong);

  // Apply custom accent if specified
  const accentHex = settings.accentColor || colors.accent;
  root.style.setProperty('--color-accent', accentHex);
  root.style.setProperty('--color-focus', accentHex);

  // Typography parameters
  const baseFontSize = settings.largerText ? settings.fontSize + 2 : settings.fontSize;
  const effectiveLineHeight = settings.increasedLineHeight ? settings.lineHeight + 0.2 : settings.lineHeight;

  root.style.setProperty('--editor-font-size', `${baseFontSize}px`);
  root.style.setProperty('--editor-line-height', `${effectiveLineHeight}`);
  root.style.setProperty('--editor-letter-spacing', `${settings.letterSpacing}px`);

  // Writing Widths
  const widthMap: Record<string, string> = {
    narrow: '600px',
    medium: '768px',
    wide: '980px',
    full: '100%',
  };
  root.style.setProperty('--writing-width', widthMap[settings.writingWidth] || '768px');
}
