import { db } from './db';
import type { Settings } from '../types';

export * from './db';

export const DEFAULT_SETTINGS: Settings = {
  id: 'current_settings',
  appearance: {
    theme: 'light',
    followSystemTheme: false,
    writingMode: 'paper',
    fontFamily: 'serif',
    fontSize: 18,
    lineHeight: 1.7,
    letterSpacing: 0,
    writingWidth: 'medium',
    uiDensity: 'comfortable',
    accentColor: '#d97706',
    translucency: true,
    blur: true,
    highContrast: false,
    reducedMotion: false,
    largerText: false,
    increasedLineHeight: false,
    reducedTransparency: false,
  },
  editor: {
    autosaveIntervalMs: 2000,
    spellCheck: true,
    typewriterMode: false,
    focusMode: false,
    showWordCount: true,
    showReadingTime: true,
  },
  ai: {
    enabled: true,
    provider: 'local',
    model: 'standard',
    autoSuggest: false,
  },
  updatedAt: Date.now(),
};

export async function initializeStorage(): Promise<void> {
  try {
    const existingSettings = await db.settings.get('current_settings');
    if (!existingSettings) {
      await db.settings.put(DEFAULT_SETTINGS);
    }
  } catch (err) {
    console.error('Failed to initialize local-first storage:', err);
  }
}
