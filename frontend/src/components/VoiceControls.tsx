import React, { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Globe,
  AlertCircle,
  VolumeX,
} from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import { SupportedLanguage } from '../voice/types';

interface VoiceControlsProps {
  onTranscriptReady: (transcript: string) => void;
  className?: string;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  onTranscriptReady,
  className = '',
}) => {
  const {
    micState,
    mode,
    language,
    transcript,
    error,
    isSupported,
    isSpeaking,
    startListening,
    stopListening,
    globalMicOff,
    stopSpeaking,
    setMode,
    setLanguage,
  } = useVoice();

  const isHoldingRef = useRef(false);

  // When transcript updates and speech recognition ends, pass transcript to parent if not auto-sent
  useEffect(() => {
    if (transcript && micState === 'idle') {
      onTranscriptReady(transcript);
    }
  }, [transcript, micState, onTranscriptReady]);

  // Push-to-Talk Event Handlers
  const handleMouseDown = () => {
    if (mode === 'push-to-talk') {
      isHoldingRef.current = true;
      startListening();
    }
  };

  const handleMouseUp = () => {
    if (mode === 'push-to-talk' && isHoldingRef.current) {
      isHoldingRef.current = false;
      stopListening();
    }
  };

  const handleTouchStart = () => {
    if (mode === 'push-to-talk') {
      isHoldingRef.current = true;
      startListening();
    }
  };

  const handleTouchEnd = () => {
    if (mode === 'push-to-talk' && isHoldingRef.current) {
      isHoldingRef.current = false;
      stopListening();
    }
  };

  const handleClickToggle = () => {
    if (mode === 'toggle') {
      if (micState === 'listening') {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  return (
    <div className={`flex flex-col gap-2 font-mono ${className}`}>
      {/* Voice Status & Live Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Active Pulsing Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold ${
              micState === 'listening'
                ? 'bg-severity-high/20 border-severity-high text-severity-high animate-pulse'
                : micState === 'error'
                ? 'bg-severity-med/20 border-severity-med text-severity-med'
                : 'bg-cockpit-elevated border-cockpit-border text-cockpit-muted'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>
              {micState === 'listening'
                ? 'MIC LIVE: SPEAK NOW'
                : micState === 'error'
                ? 'MIC ERROR'
                : micState === 'unsupported'
                ? 'VOICE UNSUPPORTED'
                : 'MIC STANDBY'}
            </span>
          </div>

          {/* Mode Switch (Push-To-Talk vs Toggle) */}
          <div className="flex items-center rounded border border-cockpit-border bg-cockpit-base p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setMode('push-to-talk')}
              className={`px-1.5 py-0.5 rounded ${
                mode === 'push-to-talk'
                  ? 'bg-cockpit-elevated text-cockpit-accent font-bold'
                  : 'text-cockpit-muted hover:text-cockpit-text'
              }`}
              title="Hold button while speaking"
            >
              PTT (HOLD)
            </button>
            <button
              type="button"
              onClick={() => setMode('toggle')}
              className={`px-1.5 py-0.5 rounded ${
                mode === 'toggle'
                  ? 'bg-cockpit-elevated text-cockpit-accent font-bold'
                  : 'text-cockpit-muted hover:text-cockpit-text'
              }`}
              title="Click to start, click to stop"
            >
              TOGGLE
            </button>
          </div>

          {/* Hinglish Language Selector */}
          <div className="flex items-center gap-1 bg-cockpit-base border border-cockpit-border px-1.5 py-0.5 rounded text-[10px] text-cockpit-muted">
            <Globe className="w-3 h-3 text-cockpit-accent" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-cockpit-text focus:outline-none cursor-pointer"
              title="Speech recognition accent/language"
            >
              <option value="en-IN">en-IN (India / Hinglish)</option>
              <option value="en-US">en-US (US English)</option>
              <option value="hi-IN">hi-IN (Hindi)</option>
            </select>
          </div>
        </div>

        {/* Global Mic Off & Speech Stop */}
        <div className="flex items-center gap-1.5">
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-severity-med/20 border border-severity-med text-severity-med text-[10px] hover:bg-severity-med/30"
              title="Stop speaking"
            >
              <VolumeX className="w-3 h-3" />
              <span>STOP AUDIO</span>
            </button>
          )}

          {micState === 'listening' && (
            <button
              type="button"
              onClick={globalMicOff}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-severity-high/20 border border-severity-high text-severity-high text-[10px] font-bold hover:bg-severity-high/30"
              title="Immediately turn microphone OFF everywhere"
            >
              <MicOff className="w-3 h-3" />
              <span>KILL MIC</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Microphone Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!isSupported}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleClickToggle}
          aria-label={mode === 'push-to-talk' ? 'Push to talk (hold)' : 'Toggle microphone'}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded border text-xs font-bold uppercase tracking-wider transition-all select-none ${
            !isSupported
              ? 'opacity-40 border-cockpit-border bg-cockpit-base text-cockpit-muted cursor-not-allowed'
              : micState === 'listening'
              ? 'bg-severity-high/20 border-severity-high text-severity-high shadow-[0_0_12px_rgba(248,81,73,0.4)]'
              : 'bg-cockpit-elevated border-cockpit-border text-cockpit-text hover:border-cockpit-accent hover:text-cockpit-accent'
          }`}
        >
          {micState === 'listening' ? (
            <>
              <Radio className="w-4 h-4 animate-spin" />
              <span>{mode === 'push-to-talk' ? 'RELEASE TO FINISH' : 'CLICK TO STOP RECORDING'}</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-cockpit-accent" />
              <span>{mode === 'push-to-talk' ? 'HOLD TO TALK (PUSH-TO-TALK)' : 'START VOICE RECORDING'}</span>
            </>
          )}
        </button>
      </div>

      {/* Unsupported fallback banner */}
      {!isSupported && (
        <div
          role="alert"
          className="p-2 rounded bg-cockpit-surface border border-cockpit-border text-[11px] text-cockpit-muted flex items-start gap-2"
        >
          <AlertCircle className="w-3.5 h-3.5 text-severity-med shrink-0 mt-0.5" />
          <span>
            Web Speech recognition is unavailable in this browser. You can use typed commands. Local offline Whisper engine is <strong className="text-cockpit-text font-mono">[PLANNED]</strong>.
          </span>
        </div>
      )}

      {/* Live Error Notification */}
      {error && (
        <div
          role="alert"
          className="p-2 rounded bg-severity-high/10 border border-severity-high text-[11px] text-severity-high flex items-start gap-2"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Transcribing Banner (while talking) */}
      {micState === 'listening' && transcript && (
        <div className="p-2 rounded bg-cockpit-base border border-cockpit-accent/40 text-xs text-cockpit-accent italic flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cockpit-accent animate-ping" />
          <span>"{transcript}"</span>
        </div>
      )}
    </div>
  );
};
