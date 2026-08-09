class AudioController {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playClick() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Create oscillator for the woody resonance
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Woody sound: moderate frequency, fast decay, short duration
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

    // Short click noise component
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.01; // 10ms of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1500, now);
    noiseFilter.Q.setValueAtTime(3, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);

    // Gain envelope for main oscillator
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Connections
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // Play
    osc.start(now);
    osc.stop(now + 0.09);
    
    noise.start(now);
    noise.stop(now + 0.02);
  }

  public playThud() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lpFilter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    // Deep pitch drop
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    // Low pass filter to make it thuddy and warm
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(200, now);
    lpFilter.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    // Gain envelope
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    // Connections
    osc.connect(lpFilter);
    lpFilter.connect(gain);
    gain.connect(this.ctx.destination);

    // Play
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const audioController = new AudioController();
