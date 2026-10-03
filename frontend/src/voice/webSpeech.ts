import { MicState, VoiceInput, VoiceInputOptions, VoiceOutput, VoiceOutputOptions } from './types';

// Browser Web Speech Recognition implementation
export class WebSpeechInput implements VoiceInput {
  private recognition: any = null;
  private state: MicState = 'idle';
  private options: VoiceInputOptions | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  public getState(): MicState {
    return this.state;
  }

  public start(options: VoiceInputOptions): void {
    if (!this.isSupported()) {
      this.state = 'unsupported';
      options.onError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or a Chromium browser, or use typed input.');
      options.onStateChange(this.state);
      return;
    }

    // Stop any existing session
    this.abort();
    this.options = options;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.language || 'en-IN';

      this.recognition.onstart = () => {
        this.state = 'listening';
        this.options?.onStateChange(this.state);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const combined = finalTranscript || interimTranscript;
        if (combined.trim()) {
          this.options?.onTranscript(combined, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event: any) => {
        this.state = 'error';
        this.options?.onStateChange(this.state);

        let userMsg = 'Microphone speech recognition error.';
        if (event.error === 'not-allowed') {
          userMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
        } else if (event.error === 'no-speech') {
          userMsg = 'No speech detected. Please speak clearly into your microphone.';
        } else if (event.error === 'network') {
          userMsg = 'Network error during cloud speech recognition. Check your connection.';
        }

        this.options?.onError(userMsg);
      };

      this.recognition.onend = () => {
        this.state = 'idle';
        this.options?.onStateChange(this.state);
        this.recognition = null;
      };

      this.recognition.start();
    } catch (err: any) {
      this.state = 'error';
      this.options?.onStateChange(this.state);
      this.options?.onError(err?.message || 'Failed to start speech recognition.');
    }
  }

  public stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
    this.state = 'idle';
    this.options?.onStateChange(this.state);
  }

  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.state = 'idle';
    this.options?.onStateChange(this.state);
  }
}

// Browser Web Speech Synthesis implementation
export class WebSpeechOutput implements VoiceOutput {
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public speak(text: string, options?: VoiceOutputOptions): void {
    if (!this.isSupported() || !text.trim()) return;

    this.stop();

    // Prepare speech-friendly text: strip raw code blocks and markdown markers
    const spokenText = cleanMarkdownForSpeech(text);
    if (!spokenText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);

    if (options?.voice) {
      utterance.voice = options.voice;
    }
    if (typeof options?.rate === 'number') {
      utterance.rate = Math.max(0.5, Math.min(2.0, options.rate));
    }
    if (typeof options?.pitch === 'number') {
      utterance.pitch = Math.max(0.5, Math.min(1.5, options.pitch));
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      options?.onError?.(e);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      options?.onError?.(err);
    }
  }

  public stop(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  public isSpeaking(): boolean {
    if (!this.isSupported()) return false;
    return window.speechSynthesis.speaking;
  }
}

// Utility: removes code blocks, markdown links, headers, backticks so text-to-speech sounds natural
export function cleanMarkdownForSpeech(md: string): string {
  return md
    // Replace code blocks with concise summary
    .replace(/```[a-z]*[\s\S]*?```/gi, ' [code block omitted] ')
    // Replace inline code backticks (preserving content inside, e.g. system_information)
    .replace(/`([^`]+)`/g, '$1')
    // Replace links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers #, ##, etc.
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italics *text*
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove strikethrough ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Clean bullet points
    .replace(/^[\*\-]\s+/gm, '')
    // Collapse excess whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export const defaultVoiceInput = new WebSpeechInput();
export const defaultVoiceOutput = new WebSpeechOutput();
