/**
 * Royal Ludo Web Audio Synthesizer
 * Generates original, synthesized game audio and multi-channel volume controls.
 */

export interface AudioSettings {
  isMuted: boolean;
  masterVolume: number; // 0..100
  musicVolume: number;  // 0..100
  sfxVolume: number;    // 0..100
  voiceVolume: number;  // 0..100
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  public masterVolume: number = 80;
  public musicVolume: number = 60;
  public sfxVolume: number = 80;
  public voiceVolume: number = 90;

  // Background Royal Ambient Synth
  private bgmInterval: any = null;
  private isBgmPlaying: boolean = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('royal_ludo_audio_settings');
      if (raw) {
        const s: AudioSettings = JSON.parse(raw);
        this.isMuted = !!s.isMuted;
        this.masterVolume = s.masterVolume ?? 80;
        this.musicVolume = s.musicVolume ?? 60;
        this.sfxVolume = s.sfxVolume ?? 80;
        this.voiceVolume = s.voiceVolume ?? 90;
      }
    } catch (e) {
      console.warn('Audio settings load error:', e);
    }
  }

  public saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      const settings: AudioSettings = {
        isMuted: this.isMuted,
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
        voiceVolume: this.voiceVolume,
      };
      localStorage.setItem('royal_ludo_audio_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Audio settings save error:', e);
    }
  }

  public getSettings(): AudioSettings {
    return {
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      voiceVolume: this.voiceVolume,
    };
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(100, vol));
    this.saveSettings();
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(100, vol));
    this.saveSettings();
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(100, vol));
    this.saveSettings();
  }

  public setVoiceVolume(vol: number) {
    this.voiceVolume = Math.max(0, Math.min(100, vol));
    this.saveSettings();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.saveSettings();
    if (this.isMuted) {
      this.stopBgm();
    }
    return this.isMuted;
  }

  private getEffectiveSfxGain(baseGain: number = 0.25): number {
    if (this.isMuted) return 0;
    return baseGain * (this.masterVolume / 100) * (this.sfxVolume / 100);
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playClick() {
    const gainVal = this.getEffectiveSfxGain(0.2);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playWheelTick() {
    const gainVal = this.getEffectiveSfxGain(0.18);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  public playDiceRoll() {
    const gainVal = this.getEffectiveSfxGain(0.32);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Realistic wood/felt rolling clatter sequence with micro bounces
    const tumbleCount = 9;
    for (let i = 0; i < tumbleCount; i++) {
      const time = this.ctx.currentTime + i * 0.055 + Math.random() * 0.02;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i % 2 === 0 ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(180 + Math.random() * 320, time);
      osc.frequency.exponentialRampToValueAtTime(80 + Math.random() * 60, time + 0.045);

      gain.gain.setValueAtTime(gainVal * (1 - (i / tumbleCount) * 0.4), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.045);
    }
  }

  public playDiceResult(value: number) {
    const gainVal = this.getEffectiveSfxGain(0.35);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Solid landing impact thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(180, now);
    thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    thudGain.gain.setValueAtTime(gainVal * 0.8, now);
    thudGain.gain.linearRampToValueAtTime(0.001, now + 0.08);
    thudOsc.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.08);

    // Chime note according to rolled face value
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = value === 6 ? 987.77 : 440 + value * 65; // B5 for 6, A4+ for others
    osc.type = value === 6 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now + 0.02);
    if (value === 6) {
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.22);
    }

    gain.gain.setValueAtTime(gainVal, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (value === 6 ? 0.45 : 0.25));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now + 0.02);
    osc.stop(now + (value === 6 ? 0.45 : 0.25));
  }

  public playTokenStepHop(stepIndex: number = 0) {
    const gainVal = this.getEffectiveSfxGain(0.24);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 480 + (stepIndex % 6) * 35;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.06);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playTokenMove() {
    this.playTokenStepHop(0);
  }

  public playFollowChime() {
    const gainVal = this.getEffectiveSfxGain(0.3);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  public playPaymentApproved() {
    this.playJackpotFanfare();
  }

  public playCapture() {
    const gainVal = this.getEffectiveSfxGain(0.28);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [350, 520, 780];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      const startTime = now + idx * 0.08;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  public playSafeStar() {
    const gainVal = this.getEffectiveSfxGain(0.22);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 880, 1174.66]; // D5, A5, D6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      const startTime = now + idx * 0.06;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  public playHomeGoal() {
    const gainVal = this.getEffectiveSfxGain(0.32);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      const startTime = now + idx * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  public playJackpotFanfare() {
    const gainVal = this.getEffectiveSfxGain(0.35);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    fanfareNotes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      const startTime = now + idx * 0.09;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  public playTimerWarning() {
    const gainVal = this.getEffectiveSfxGain(0.15);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playTimeout() {
    const gainVal = this.getEffectiveSfxGain(0.25);
    if (gainVal <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.isBgmPlaying = false;
  }
}

export const sound = new SoundEngine();
