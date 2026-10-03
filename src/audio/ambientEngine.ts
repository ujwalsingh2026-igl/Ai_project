export type AmbientSound =
  | 'off'
  | 'rain'
  | 'library'
  | 'coffeeshop'
  | 'fireplace'
  | 'wind'
  | 'waves'
  | 'whitenoise';

export interface AmbientState {
  currentSound: AmbientSound;
  volume: number; // 0 to 1
  isPlaying: boolean;
}

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSource: AudioNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private crackleInterval: number | null = null;
  private state: AmbientState = {
    currentSound: 'off',
    volume: 0.5,
    isPlaying: false,
  };
  private listeners: Array<(state: AmbientState) => void> = [];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.state.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Create a 5-second looping buffer of calibrated noise
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown'): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white * 0.15;
      } else if (type === 'brown') {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 1.5;
      } else {
        // Pink noise (Paul Kellet's filter)
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  public setSound(sound: AmbientSound) {
    if (this.state.currentSound === sound && this.state.isPlaying) return;
    this.stopCurrent();

    if (sound === 'off') {
      this.state.currentSound = 'off';
      this.state.isPlaying = false;
      this.notify();
      return;
    }

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.state.currentSound = sound;
    this.state.isPlaying = true;

    switch (sound) {
      case 'rain':
        this.playRain();
        break;
      case 'fireplace':
        this.playFireplace();
        break;
      case 'waves':
        this.playWaves();
        break;
      case 'wind':
        this.playWind();
        break;
      case 'whitenoise':
        this.playWhiteNoise();
        break;
      case 'coffeeshop':
        this.playCoffeeShop();
        break;
      case 'library':
        this.playLibrary();
        break;
    }

    this.notify();
  }

  private playRain() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer('pink');
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.masterGain);
    source.start();
    this.currentSource = source;
  }

  private playFireplace() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer('brown');
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.masterGain);
    source.start();
    this.currentSource = source;

    // Embers crackle bursts
    this.crackleInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain) return;
      if (Math.random() > 0.4) {
        const osc = this.ctx.createOscillator();
        const crackleGain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120 + Math.random() * 600, this.ctx.currentTime);
        crackleGain.gain.setValueAtTime(0.04 * Math.random(), this.ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
        osc.connect(crackleGain);
        crackleGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      }
    }, 180);
  }

  private playWaves() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer('brown');
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const waveGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    // LFO for ocean swell period (6 seconds)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.16, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);
    lfo.start();
    this.lfoOsc = lfo;

    source.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.masterGain);
    source.start();
    this.currentSource = source;
  }

  private playWind() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer('pink');
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // LFO to sweep wind frequency
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.lfoOsc = lfo;

    source.connect(filter);
    filter.connect(this.masterGain);
    source.start();
    this.currentSource = source;
  }

  private playWhiteNoise() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer('pink');
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.masterGain);
    source.start();
    this.currentSource = source;
  }

  private playCoffeeShop() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer('pink');
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.masterGain);
    source.start();
    this.currentSource = source;
  }

  private playLibrary() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer('brown');
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.masterGain);
    source.start();
    this.currentSource = source;
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
    this.notify();
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.stopCurrent();
      this.state.isPlaying = false;
    } else if (this.state.currentSound !== 'off') {
      this.setSound(this.state.currentSound);
    } else {
      this.setSound('rain');
    }
    this.notify();
  }

  private stopCurrent() {
    if (this.currentSource) {
      try {
        (this.currentSource as AudioBufferSourceNode).stop();
        this.currentSource.disconnect();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
      } catch {
        // already stopped
      }
      this.lfoOsc = null;
    }
    if (this.crackleInterval) {
      window.clearInterval(this.crackleInterval);
      this.crackleInterval = null;
    }
  }

  public getState(): AmbientState {
    return { ...this.state };
  }

  public subscribe(fn: (state: AmbientState) => void): () => void {
    this.listeners.push(fn);
    fn(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }
}

export const ambientEngine = new AmbientSoundEngine();
