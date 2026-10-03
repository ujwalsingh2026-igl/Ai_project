# ADR-007: Voice Input / Output Abstraction Layer

## Status
Accepted (Phase A design, preparation for Phase B)

## Context
Voice interaction is a core modality for the command center. However:
1. Browser implementations of the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition` and `speechSynthesis`) vary across operating systems and browsers, and some browsers (like Chrome) transmit voice data to third-party cloud servers for transcription.
2. In future phases, offline/local inference (e.g. local Whisper for STT and local Piper/Coqui for TTS) will be required for maximum privacy.
3. Crucially, **approvals of dangerous or high-risk actions must never be triggered by voice alone**. A user may be overheard, misrecognized, or tricked by synthesized audio.

## Decision
1. **Interface Abstraction**:
   - `VoiceInput`: defines `startListening(options)`, `stopListening()`, `abort()`, and event callbacks (`onTranscript`, `onError`, `onStateChange`).
   - `VoiceOutput`: defines `speak(text, options)`, `stop()`, `getAvailableVoices()`.
   - Browser Web Speech implementation sits behind this interface. When a local engine is integrated, no UI components will need to change.
2. **Push-to-Talk (PTT) by Default**:
   - Default interaction model is Push-to-Talk (hold button or shortcut).
   - Always-visible indicator lights up in the bottom status bar and main UI whenever the microphone is active.
   - A single-click global "Mic Off / Mute" is always accessible.
3. **Approval Safety Rule**:
   - Voice commands can query status, add notes/tasks, or trigger safe actions.
   - When any action requires approval (Decision: `ASK`), the assistant may *read the summary aloud*, but the approval confirmation can **ONLY** be executed via a deliberate physical click or explicit keyboard confirmation on the approval card. Voice cannot confirm actions.
