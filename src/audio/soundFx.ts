/**
 * Procedural Web Audio Synthesizer for Face Target Blaster
 * Generates crisp, latency-free SFX with zero external audio assets.
 */

class SoundFxManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    const savedMute = localStorage.getItem('face_blaster_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('face_blaster_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Laser blaster shot
   */
  public playShoot(type: 'blaster' | 'triple' | 'plasma' | 'laser' = 'blaster') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'blaster') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(820, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.12);
    } else if (type === 'triple') {
      [740, 880, 1020].forEach((freq, idx) => {
        const subOsc = this.ctx!.createOscillator();
        const subGain = this.ctx!.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(freq, t + idx * 0.02);
        subOsc.frequency.exponentialRampToValueAtTime(160, t + idx * 0.02 + 0.1);

        subGain.gain.setValueAtTime(0.18, t + idx * 0.02);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.02 + 0.1);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain!);

        subOsc.start(t + idx * 0.02);
        subOsc.stop(t + idx * 0.02 + 0.1);
      });
    } else if (type === 'plasma') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.22);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.22);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.22);
    } else {
      // laser beam
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.18);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.18);
    }
  }

  /**
   * Target pop / hit with combo-scaled pentatonic chime!
   */
  public playTargetHit(combo: number = 0, isCrit: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // 1. Organic bubble / balloon pop impact
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(380, t);
    popOsc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    popGain.gain.setValueAtTime(0.45, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);
    popOsc.start(t);
    popOsc.stop(t + 0.08);

    // 2. High crisp chime tuned musically to the current combo
    const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];
    const pitchIndex = Math.min(combo, pentatonicScale.length - 1);
    const baseFreq = pentatonicScale[pitchIndex];

    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chimeOsc.type = isCrit ? 'triangle' : 'sine';
    chimeOsc.frequency.setValueAtTime(baseFreq, t + 0.01);
    chimeOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.15);

    chimeGain.gain.setValueAtTime(isCrit ? 0.35 : 0.22, t + 0.01);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chimeOsc.start(t + 0.01);
    chimeOsc.stop(t + 0.18);

    // 3. Noise burst for satisfying pop texture
    this.playNoiseBurst(0.04, 0.15);
  }

  /**
   * Golden target hit - rich sparkling arpeggio
   */
  public playGoldenHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [659.25, 783.99, 1046.5, 1318.51, 1567.98]; // E5, G5, C6, E6, G6
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);

      gain.gain.setValueAtTime(0.2, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.18);
    });
  }

  /**
   * Shield metallic deflection
   */
  public playShieldHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Bomb explosion sound
   */
  public playExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Sub rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    subGain.gain.setValueAtTime(0.6, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.4);

    // Deep noise burst
    this.playNoiseBurst(0.35, 0.4);
  }

  /**
   * Combo streak fanfare (e.g. at 5x, 10x, 20x)
   */
  public playComboFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const chords = [523.25, 659.25, 783.99, 1046.5];
    const t = this.ctx.currentTime;

    chords.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /**
   * Power-up pickup
   */
  public playPowerup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Game Over descending sound
   */
  public playGameOver() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.5);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  /**
   * Synthesized white noise burst for hit crispness
   */
  private playNoiseBurst(duration: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
    } catch {
      // ignore audio buffer creation hiccups
    }
  }
}

export const soundFx = new SoundFxManager();
