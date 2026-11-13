// Lightweight procedural Web Audio cues (zero external assets, muted by default)
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private droneGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;

  private ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isEnabled() {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ensureContext();
      this.startDrone();
      this.playClick(180);
    } else {
      this.stopDrone();
    }
    return this.enabled;
  }

  private startDrone() {
    if (!this.ctx || this.droneOsc) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 46; // Low cinematic sub-hum

      filter.type = 'lowpass';
      filter.frequency.value = 110;

      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.025, this.ctx.currentTime + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.droneOsc = osc;
      this.droneGain = gain;
    } catch {
      // Ignore audio autoplay restrictions gracefully
    }
  }

  private stopDrone() {
    if (!this.ctx || !this.droneOsc || !this.droneGain) return;
    try {
      const now = this.ctx.currentTime;
      this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      const osc = this.droneOsc;
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignore
        }
      }, 350);
      this.droneOsc = null;
      this.droneGain = null;
    } catch {
      // Ignore
    }
  }

  public playClick(freq = 220) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + 0.12);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Ignore
    }
  }

  public playReveal() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [146.83, 155.56].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.04, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + 0.7);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new SoundEngine();
