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
export type WritingWidth = 'narrow' | 'medium' | 'wide' | 'full';
export type FontFamily = 'serif' | 'sans' | 'mono' | 'classic' | 'modern' | 'handwriting';

export interface CustomThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  border: string;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  followSystemTheme: boolean;
  writingMode: WritingMode;
  fontFamily: FontFamily;
  fontSize: number; // in px, default 18
  lineHeight: number; // e.g. 1.6
  letterSpacing: number; // in px
  writingWidth: WritingWidth;
  uiDensity: UIDensity;
  accentColor: string; // hex or preset name
  customColors?: CustomThemeColors;
  translucency: boolean;
  blur: boolean;
  
  // Accessibility
  highContrast: boolean;
  reducedMotion: boolean;
  largerText: boolean;
  increasedLineHeight: boolean;
  reducedTransparency: boolean;
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
