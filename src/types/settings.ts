export type ThemeMode =
  | 'light'
  | 'dark'
  | 'midnight'
  | 'ivory'
  | 'sepia'
  | 'minimal'
  | 'forest'
  | 'aurora'
  | 'custom';

export type WritingMode = 'paper' | 'canvas' | 'focus' | 'book';
export type UIDensity = 'compact' | 'comfortable' | 'spacious';

export interface AppearanceSettings {
  theme: ThemeMode;
  fontFamily: 'serif' | 'sans' | 'mono' | 'classic' | 'modern' | 'handwriting';
  fontSize: number; // in px, default 18
  lineHeight: number; // e.g. 1.6
  letterSpacing: number; // in px
  writingWidth: 'narrow' | 'medium' | 'wide' | 'full';
  uiDensity: UIDensity;
  translucency: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface EditorSettings {
  autosaveIntervalMs: number;
  spellCheck: boolean;
  typewriterMode: boolean;
  focusMode: boolean;
  showWordCount: boolean;
  showReadingTime: boolean;
}

export interface AISettings {
  enabled: boolean;
  provider: 'local' | 'gemini' | 'openai' | 'anthropic' | 'custom';
  model: string;
  autoSuggest: boolean;
}

export interface Settings {
  id: string; // 'current_settings'
  appearance: AppearanceSettings;
  editor: EditorSettings;
  ai: AISettings;
  updatedAt: number;
}
