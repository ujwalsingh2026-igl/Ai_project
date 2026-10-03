export type MicState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';
export type VoiceMode = 'push-to-talk' | 'toggle';
export type SupportedLanguage = 'en-IN' | 'en-US' | 'hi-IN';

export interface VoiceInputOptions {
  language: SupportedLanguage;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStateChange: (state: MicState) => void;
}

export interface VoiceInput {
  isSupported(): boolean;
  start(options: VoiceInputOptions): void;
  stop(): void;
  abort(): void;
  getState(): MicState;
}

export interface VoiceOutputOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

export interface VoiceOutput {
  isSupported(): boolean;
  speak(text: string, options?: VoiceOutputOptions): void;
  stop(): void;
  getVoices(): SpeechSynthesisVoice[];
  isSpeaking(): boolean;
}
