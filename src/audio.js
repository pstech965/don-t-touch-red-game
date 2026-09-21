// Programmatic Web Audio Synthesizer for "DON'T TOUCH RED"
class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicNode = null;
    this.musicOsc1 = null;
    this.musicOsc2 = null;
    this.musicFilter = null;
    this.musicInterval = null;
    this.heartbeatInterval = null;
    this.laserWarningOsc = null;
    this.isMuted = false;
    this.musicBeatCount = 0;
    this.musicTempo = 130; // BPM
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
      this.stopHeartbeat();
      this.stopLaserWarning();
    }
    return this.isMuted;
  }

  // Synthesize short sounds
  playHover() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playClick() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.setValueAtTime(300, this.ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playCountdown(isGo = false) {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    const freq = isGo ? 880 : 440;
    const duration = isGo ? 0.3 : 0.15;

    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNearMiss() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playCollision() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    
    // Create explosion noise
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.ctx.destination);

    // Also a low sub pitch sweep
    const osc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    
    subGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    subGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    osc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.start();
    osc.start();
    noise.stop(this.ctx.currentTime + 0.4);
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }

  playLaserWarning() {
    if (this.isMuted || !this.ctx || this.laserWarningOsc) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);

    // Pulsing frequency
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(10, this.ctx.currentTime); // 10Hz pulse
    lfoGain.gain.setValueAtTime(50, this.ctx.currentTime); // modulation depth

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    lfo.start();
    osc.start();

    this.laserWarningOsc = { osc, lfo, gain };
  }

  stopLaserWarning() {
    if (this.laserWarningOsc) {
      try {
        this.laserWarningOsc.osc.stop();
        this.laserWarningOsc.lfo.stop();
      } catch (e) {}
      this.laserWarningOsc = null;
    }
  }

  // Futuristic Procedural Background Music
  playMusic(speedFactor = 1) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;
    this.stopMusic();

    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.musicFilter.Q.setValueAtTime(1, this.ctx.currentTime);
    this.musicFilter.connect(this.ctx.destination);

    const bassLine = [55, 55, 65.4, 65.4, 73.4, 73.4, 82.4, 82.4]; // A1, C2, D2, E2 notes in Hz
    const leadNotes = [220, 261.6, 293.7, 329.6, 392.0, 440.0];

    const playBeat = () => {
      if (this.isMuted || !this.ctx) return;
      const time = this.ctx.currentTime;
      const beatDuration = 60 / (this.musicTempo * Math.sqrt(speedFactor));

      // 1. Synthesize Bass Drum on beat 0 and 2
      if (this.musicBeatCount % 2 === 0) {
        const bd = this.ctx.createOscillator();
        const bdGain = this.ctx.createGain();
        bd.connect(bdGain);
        bdGain.connect(this.musicFilter);
        
        bd.frequency.setValueAtTime(150, time);
        bd.frequency.exponentialRampToValueAtTime(45, time + 0.15);
        bdGain.gain.setValueAtTime(0.3, time);
        bdGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        
        bd.start(time);
        bd.stop(time + 0.16);
      }

      // 2. Synthesize Hihat on off beats
      if (this.musicBeatCount % 2 === 1) {
        const hhGain = this.ctx.createGain();
        hhGain.connect(this.musicFilter);
        
        // noise hihat
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const hhFilter = this.ctx.createBiquadFilter();
        hhFilter.type = 'highpass';
        hhFilter.frequency.setValueAtTime(7000, time);
        
        noise.connect(hhFilter);
        hhFilter.connect(hhGain);
        
        hhGain.gain.setValueAtTime(0.04, time);
        hhGain.gain.linearRampToValueAtTime(0.001, time + 0.05);
        
        noise.start(time);
        noise.stop(time + 0.06);
      }

      // 3. Synthesize Bass note (steady 8th notes or quarter notes)
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.connect(bassGain);
      bassGain.connect(this.musicFilter);
      
      const bassFreq = bassLine[this.musicBeatCount % bassLine.length];
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, time);
      
      bassGain.gain.setValueAtTime(0.12, time);
      bassGain.gain.exponentialRampToValueAtTime(0.005, time + beatDuration * 0.9);
      
      bassOsc.start(time);
      bassOsc.stop(time + beatDuration * 0.95);

      // 4. Synthesize melody / lead on certain beats
      if (this.musicBeatCount % 4 === 0 || (this.musicBeatCount % 8 === 6 && Math.random() > 0.4)) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.connect(leadGain);
        leadGain.connect(this.musicFilter);
        
        // Choose melody notes
        const noteIndex = Math.floor(Math.random() * leadNotes.length);
        const leadFreq = leadNotes[noteIndex];
        
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadFreq, time);
        
        leadGain.gain.setValueAtTime(0.06, time);
        leadGain.gain.exponentialRampToValueAtTime(0.001, time + beatDuration * 1.8);
        
        leadOsc.start(time);
        leadOsc.stop(time + beatDuration * 1.9);
      }

      // Progress beat count
      this.musicBeatCount = (this.musicBeatCount + 1) % 16;
      
      // Schedule next beat
      this.musicInterval = setTimeout(playBeat, beatDuration * 1000);
    };

    // Start beat loop
    playBeat();
  }

  stopMusic() {
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  setMusicSpeed(speedFactor = 1) {
    if (!this.ctx) return;
    // Dynamically open up lowpass filter and boost sound on intensity
    if (this.musicFilter) {
      const targetFreq = Math.min(2200, 1000 + speedFactor * 400);
      this.musicFilter.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
    }
  }

  // Heartbeat sound for high intensity
  startHeartbeat(rate = 1) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;
    this.stopHeartbeat();

    const triggerHeartbeat = () => {
      if (this.isMuted || !this.ctx) return;
      const time = this.ctx.currentTime;
      const intervalMs = Math.max(300, 800 / rate);

      // Thump 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.frequency.setValueAtTime(55, time);
      osc1.frequency.exponentialRampToValueAtTime(25, time + 0.12);
      gain1.gain.setValueAtTime(0.2, time);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc1.start(time);
      osc1.stop(time + 0.13);

      // Thump 2 (slightly delayed)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.frequency.setValueAtTime(50, time + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(20, time + 0.3);
      gain2.gain.setValueAtTime(0.15, time + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc2.start(time + 0.15);
      osc2.stop(time + 0.31);

      this.heartbeatInterval = setTimeout(triggerHeartbeat, intervalMs);
    };

    triggerHeartbeat();
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearTimeout(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const sounds = new SoundManager();
