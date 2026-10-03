/**
 * Web Audio API synthesizer for the Focus Timer chime and alert notifications.
 * Generates an offline, harmonic multi-tone chime without external audio files.
 */

export function playChimeSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // Harmonic notes: C5 (523.25 Hz) then G5 (783.99 Hz)
    const tones = [
      { freq: 523.25, start: now, duration: 0.4 },
      { freq: 783.99, start: now + 0.15, duration: 0.6 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      // Smooth attack and exponential decay envelope
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });

    // Close the audio context after the sounds finish playing
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // Ignored
      }
    }, 1200);
  } catch {
    // Graceful fallback if Web Audio is restricted or unavailable
  }
}
