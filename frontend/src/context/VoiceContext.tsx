import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  MicState,
  SupportedLanguage,
  VoiceInput,
  VoiceMode,
  VoiceOutput,
} from '../voice/types';
import { defaultVoiceInput, defaultVoiceOutput } from '../voice/webSpeech';

interface VoiceContextType {
  // Input State
  micState: MicState;
  mode: VoiceMode;
  language: SupportedLanguage;
  transcript: string;
  error: string | null;
  autoSend: boolean;
  isSupported: boolean;

  // Actions
  startListening: () => void;
  stopListening: () => void;
  abortListening: () => void;
  globalMicOff: () => void;
  setMode: (mode: VoiceMode) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setAutoSend: (val: boolean) => void;
  setTranscript: (text: string) => void;
  clearTranscript: () => void;

  // Output State & Actions
  autoSpeak: boolean;
  isSpeaking: boolean;
  rate: number;
  pitch: number;
  selectedVoiceURI: string | null;
  availableVoices: SpeechSynthesisVoice[];
  speak: (text: string) => void;
  stopSpeaking: () => void;
  setAutoSpeak: (val: boolean) => void;
  setRate: (val: number) => void;
  setPitch: (val: number) => void;
  setSelectedVoiceURI: (uri: string | null) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

interface VoiceProviderProps {
  children: React.ReactNode;
  voiceInput?: VoiceInput;
  voiceOutput?: VoiceOutput;
  onAutoSend?: (text: string) => void;
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({
  children,
  voiceInput = defaultVoiceInput,
  voiceOutput = defaultVoiceOutput,
  onAutoSend,
}) => {
  const [micState, setMicState] = useState<MicState>(() =>
    voiceInput.isSupported() ? 'idle' : 'unsupported'
  );
  const [mode, setModeState] = useState<VoiceMode>(() => {
    try {
      const saved = localStorage.getItem('aegis_voice_mode') as VoiceMode;
      return saved === 'toggle' ? 'toggle' : 'push-to-talk';
    } catch {
      return 'push-to-talk';
    }
  });
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('aegis_voice_lang') as SupportedLanguage;
      return ['en-IN', 'en-US', 'hi-IN'].includes(saved) ? saved : 'en-IN';
    } catch {
      return 'en-IN';
    }
  });
  const [autoSend, setAutoSendState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aegis_voice_autosend') === 'true';
    } catch {
      return false;
    }
  });
  const [autoSpeak, setAutoSpeakState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aegis_voice_autospeak') === 'true';
    } catch {
      return false;
    }
  });

  const [rate, setRateState] = useState<number>(1.0);
  const [pitch, setPitchState] = useState<number>(1.0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const autoSendRef = useRef(autoSend);
  autoSendRef.current = autoSend;
  const onAutoSendRef = useRef(onAutoSend);
  onAutoSendRef.current = onAutoSend;

  // Load available speech synthesis voices
  useEffect(() => {
    if (!voiceOutput.isSupported()) return;

    const loadVoices = () => {
      const voices = voiceOutput.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [voiceOutput]);

  const setMode = (m: VoiceMode) => {
    setModeState(m);
    try {
      localStorage.setItem('aegis_voice_mode', m);
    } catch {
      // Ignore
    }
  };

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('aegis_voice_lang', lang);
    } catch {
      // Ignore
    }
  };

  const setAutoSend = (val: boolean) => {
    setAutoSendState(val);
    try {
      localStorage.setItem('aegis_voice_autosend', String(val));
    } catch {
      // Ignore
    }
  };

  const setAutoSpeak = (val: boolean) => {
    setAutoSpeakState(val);
    try {
      localStorage.setItem('aegis_voice_autospeak', String(val));
    } catch {
      // Ignore
    }
  };

  const setRate = (val: number) => setRateState(val);
  const setPitch = (val: number) => setPitchState(val);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');

    voiceInput.start({
      language,
      onTranscript: (spokenText, isFinal) => {
        setTranscript(spokenText);
        if (isFinal && autoSendRef.current && onAutoSendRef.current) {
          onAutoSendRef.current(spokenText);
        }
      },
      onError: (err) => {
        setError(err);
      },
      onStateChange: (state) => {
        setMicState(state);
      },
    });
  }, [voiceInput, language]);

  const stopListening = useCallback(() => {
    voiceInput.stop();
  }, [voiceInput]);

  const abortListening = useCallback(() => {
    voiceInput.abort();
    setTranscript('');
  }, [voiceInput]);

  const globalMicOff = useCallback(() => {
    voiceInput.abort();
    voiceOutput.stop();
    setIsSpeaking(false);
    setTranscript('');
    setError(null);
  }, [voiceInput, voiceOutput]);

  const speak = useCallback(
    (text: string) => {
      if (!voiceOutput.isSupported()) return;

      const voice = availableVoices.find((v) => v.voiceURI === selectedVoiceURI) || null;

      voiceOutput.speak(text, {
        voice,
        rate,
        pitch,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [voiceOutput, availableVoices, selectedVoiceURI, rate, pitch]
  );

  const stopSpeaking = useCallback(() => {
    voiceOutput.stop();
    setIsSpeaking(false);
  }, [voiceOutput]);

  return (
    <VoiceContext.Provider
      value={{
        micState,
        mode,
        language,
        transcript,
        error,
        autoSend,
        isSupported: voiceInput.isSupported(),
        startListening,
        stopListening,
        abortListening,
        globalMicOff,
        setMode,
        setLanguage,
        setAutoSend,
        setTranscript,
        clearTranscript: () => setTranscript(''),
        autoSpeak,
        isSpeaking,
        rate,
        pitch,
        selectedVoiceURI,
        availableVoices,
        speak,
        stopSpeaking,
        setAutoSpeak,
        setRate,
        setPitch,
        setSelectedVoiceURI,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
