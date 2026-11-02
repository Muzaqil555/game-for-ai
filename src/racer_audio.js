/**
 * NEON VELOCITY: Synthwave OutRun Drift & Police Pursuit
 * Ultra-Realistic Procedural Web Audio API Sound Engine
 * 
 * 100% Procedural Synthesis — Zero external .mp3/.wav dependencies.
 * Developed by Agent 12: Səs və Musiqi Mütəxəssisi (Audio & Sound Designer)
 * 
 * Architecture:
 * 1. Realistic Multi-Harmonic Engine Synthesis (RPM 800 - 9000, throttle, gear, wave-shaper distortion & rev-limiter)
 * 2. Turbo Blow-Off Valve (Pshhh-ch-ch-ch pneumatic compressor surge & wastegate flutter)
 * 3. Exhaust Backfire & Overrun Crackle Pops (anti-lag staggered micro-explosions)
 * 4. Dual-Mode Police Sirens with Doppler Shift (Wail & Yelp with 3D/stereo panning and distance attenuation)
 * 5. Procedural Tire Screech (Drift slip-angle & speed-dependent resonant bandpass noise)
 * 6. 80s LinnDrum & Yamaha FM Synthwave Sequencer (124 BPM in D Minor, multi-layer dynamic intensity)
 * 7. Complete Arcade SFX Suite (Nitro jet, crash & takedown, near-miss whoosh, spike strip blowout, garage cash chime)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const AudioEngine = factory();
    root.NeonVelocityAudio = AudioEngine;
    root.RacerAudio = new AudioEngine();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // --- Riyazi Sabitlər & Köməkçi Funksiyalar ---
  const TWO_PI = Math.PI * 2;
  const SPEED_OF_SOUND = 340; // m/s (Doppler effekti üçün fiziki sabit)

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  /**
   * Qeyri-xətti distorsiya əyrisi (Soft/Hard Saturation Curve)
   */
  function makeDistortionCurve(amount = 20, samples = 44100) {
    const k = typeof amount === 'number' ? amount : 20;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Mühərrik üçün xüsusi asimmetrik egzoz doyma əyrisi (Asymmetric Tube Overdrive)
   */
  function makeEngineDistortionCurve(drive = 2.5, samples = 2048) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Asimmetrik doyma: silindr partlayışının təzyiq fərqini simulyasiya edir
      if (x < -0.08) {
        curve[i] = -0.08 + (x + 0.08) / (1 + Math.abs(x * drive));
      } else {
        curve[i] = Math.tanh(x * drive * 1.4);
      }
    }
    return curve;
  }

  // =========================================================================
  // NEON VELOCITY PROCEDURAL AUDIO ENGINE
  // =========================================================================

  class NeonVelocityAudio {
    constructor() {
      this.ctx = null;
      this.isInitialized = false;
      this.isMuted = false;

      // Master Həcmlər
      this.masterVolume = 0.85;
      this.engineVolume = 0.80;
      this.musicVolume = 0.65;
      this.sfxVolume = 0.85;
      this.sirenVolume = 0.75;
      this.screechVolume = 0.70;

      // Əsas Zəncir Node-ları
      this.masterGain = null;
      this.compressor = null;
      this.engineMasterGain = null;
      this.musicMasterGain = null;
      this.sfxMasterGain = null;
      this.sirenMasterGain = null;
      this.screechMasterGain = null;

      // Küy (Noise) Buferləri
      this.whiteNoiseBuffer = null;
      this.pinkNoiseBuffer = null;

      // 1. Mühərrik Alt-Sistemi
      this.engine = {
        isRunning: false,
        rpm: 850,
        targetRpm: 850,
        throttle: 0.0,
        gear: 1,
        speed: 0,
        isNitro: false,
        // Audio Node-lar
        fundamentalOsc: null,
        detuneOsc: null,
        subOsc: null,
        intakeOsc: null,
        vibratoLfo: null,
        vibratoGain: null,
        waveshaper: null,
        filterLowpass: null,
        filterPeak: null,
        gainNode: null,
        limiterGain: null,
        prevThrottle: 0.0,
        lastBackfireTime: 0
      };

      // 2. Təkər Sürüşməsi (Tire Screech) Alt-Sistemi
      this.tire = {
        isPlaying: false,
        noiseSource: null,
        filterHigh: null,
        filterMid: null,
        gainNode: null,
        vibratoLfo: null,
        vibratoGain: null,
        currentSlip: 0
      };

      // 3. Polis Sirenləri Alt-Sistemi (Çoxsaylı Patrullar)
      this.sirens = new Map(); // id -> { osc1, osc2, lfo, lfoGain, gain, panner, filter, mode }

      // 4. Nitro Boost Dövrü
      this.nitro = {
        isPlaying: false,
        noiseSource: null,
        filter: null,
        whineOsc: null,
        gainNode: null
      };

      // 5. Synthwave 80s Musiqi Mühərriki
      this.music = {
        isPlaying: false,
        bpm: 124,
        stepTime: 0.120967, // (60 / 124) / 4 saniyə (16-lıq not)
        currentStep: 0,
        nextStepTime: 0,
        timerId: null,
        lookaheadMs: 25,
        scheduleAheadSec: 0.1,
        intensity: 2, // 1: Cruising, 2: Drift/High Speed, 3: Heat 5 Pursuit
        filterNode: null,
        // D Minor Akkord Proqressiyası (8 takt: Dm9 -> Bbmaj7 -> C9 -> Am7)
        chords: [
          { root: 38, notes: [50, 53, 57, 60, 64] }, // Dm9: D2 + D3, F3, A3, C4, E4
          { root: 38, notes: [50, 53, 57, 60, 64] },
          { root: 34, notes: [46, 53, 57, 62] },     // Bbmaj7: Bb1 + Bb2, F3, A3, D4
          { root: 34, notes: [46, 53, 57, 62] },
          { root: 36, notes: [48, 55, 58, 62, 64] }, // C9: C2 + C3, G3, Bb3, D4, E4
          { root: 36, notes: [48, 55, 58, 62, 64] },
          { root: 33, notes: [45, 52, 55, 60] },     // Am7: A1 + A2, E3, G3, C4
          { root: 33, notes: [45, 52, 55, 60] }
        ],
        // 16-addımlıq FM Synth Bass xətti (OutRun üslubu)
        bassSteps: [
          38, 38, 50, 38,  38, 41, 38, 38,  43, 45, 38, 38,  48, 46, 45, 43
        ],
        // Lead arpeggio motivləri
        leadSteps: [
          62, 0, 65, 69,   72, 69, 65, 0,   60, 64, 67, 72,  74, 72, 67, 64
        ]
      };

      // Xarici hadisə dinləyicisi (Particle effektləri və Visual FX üçün)
      this.onBackfire = null; // callback(intensity, count)

      // Brauzerin audio siyasətini açmaq (Autoplay unlock)
      this._setupAutoplayUnlock();
    }

    /**
     * İstifadəçinin ilk klik və ya toxunuşunda AudioContext-i dərhal aktivləşdirir
     */
    _setupAutoplayUnlock() {
      const unlockEvents = ['pointerdown', 'keydown', 'touchstart', 'click'];
      const unlock = () => {
        if (!this.ctx) {
          this.init();
        } else if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      unlockEvents.forEach(evt => {
        if (typeof window !== 'undefined') {
          window.addEventListener(evt, unlock, { once: true, passive: true });
        }
      });
    }

    /**
     * AudioContext və Master Signal Routing Zəncirini Başladır
     */
    init() {
      if (this.isInitialized && this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return this;
      }

      const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (!AudioCtx) {
        console.warn('[NeonVelocityAudio] Web Audio API bu mühitdə dəstəkləmir.');
        return this;
      }

      try {
        this.ctx = new AudioCtx();

        // 1. Master Dinamik Kompressor (Clipping və həddən artıq səs təzyiqini məhdudlaşdırır)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(20, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);

        // 2. Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.compressor);

        // 3. Alt-kanal Gain Node-ları
        this.engineMasterGain = this.ctx.createGain();
        this.engineMasterGain.gain.setValueAtTime(this.engineVolume, this.ctx.currentTime);
        this.engineMasterGain.connect(this.masterGain);

        this.musicMasterGain = this.ctx.createGain();
        this.musicMasterGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicMasterGain.connect(this.masterGain);

        this.sfxMasterGain = this.ctx.createGain();
        this.sfxMasterGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxMasterGain.connect(this.masterGain);

        this.sirenMasterGain = this.ctx.createGain();
        this.sirenMasterGain.gain.setValueAtTime(this.sirenVolume, this.ctx.currentTime);
        this.sirenMasterGain.connect(this.masterGain);

        this.screechMasterGain = this.ctx.createGain();
        this.screechMasterGain.gain.setValueAtTime(this.screechVolume, this.ctx.currentTime);
        this.screechMasterGain.connect(this.masterGain);

        // 4. Küy (Noise) Buferlərini Hazırla
        this._generateNoiseBuffers();

        // 5. Mühərrik və Təkər Səs Alt-sistemlərini Qur
        this._setupEngineSubsystem();
        this._setupTireScreechSubsystem();

        this.isInitialized = true;
        console.log('🏎️ [NeonVelocityAudio] Ultra-Realist Prosedural Web Audio Mühərriki uğurla aktivləşdirildi.');
      } catch (e) {
        console.error('[NeonVelocityAudio] Başlama zamanı xəta:', e);
      }

      return this;
    }

    /**
     * Ağ və Çəhrayı küy buferlərini riyazi olaraq sintez edir (100% prosedural)
     */
    _generateNoiseBuffers() {
      if (!this.ctx) return;

      const sampleRate = this.ctx.sampleRate;
      const bufferLength = sampleRate * 3; // 3 saniyəlik təkrarlanan seamless bufer

      // Ağ Küy (White Noise)
      this.whiteNoiseBuffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
      const whiteData = this.whiteNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) {
        whiteData[i] = Math.random() * 2 - 1;
      }

      // Çəhrayı Küy (Pink Noise - Paul Kellet 3-pole süzgəc alqoritmi)
      this.pinkNoiseBuffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
      const pinkData = this.pinkNoiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferLength; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }

    // =========================================================================
    // 1. ULTRA-REALIST MÜHƏRRİK SƏSİ (RPM, ÖTÜRMƏ VƏ QAZ DƏRƏCƏSİ)
    // =========================================================================

    /**
     * Mühərrik zəncirini (Multi-Harmonic Sawtooth + Sub-Octave + Tube Overdrive + Dynamic Resonant Filter) qurur
     */
    _setupEngineSubsystem() {
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const eng = this.engine;

      // Master Gain for Engine
      eng.gainNode = this.ctx.createGain();
      eng.gainNode.gain.setValueAtTime(0.0001, now);

      // Rev-Limiter kəsim gain-i
      eng.limiterGain = this.ctx.createGain();
      eng.limiterGain.gain.setValueAtTime(1.0, now);
      eng.limiterGain.connect(this.engineMasterGain);

      // Asimmetrik Egzoz Doıma / Overdrive
      eng.waveshaper = this.ctx.createWaveShaper();
      eng.waveshaper.curve = makeEngineDistortionCurve(2.8, 2048);
      eng.waveshaper.oversample = '2x';

      // Dinamik Tezlik Süzgəcləri:
      // 1. Lowpass Süzgəc (Qaz və RPM ilə açılır)
      eng.filterLowpass = this.ctx.createBiquadFilter();
      eng.filterLowpass.type = 'lowpass';
      eng.filterLowpass.frequency.setValueAtTime(450, now);
      eng.filterLowpass.Q.setValueAtTime(3.2, now);

      // 2. Peaking Süzgəc (Egzoz rezonans boğazı)
      eng.filterPeak = this.ctx.createBiquadFilter();
      eng.filterPeak.type = 'peaking';
      eng.filterPeak.frequency.setValueAtTime(1400, now);
      eng.filterPeak.Q.setValueAtTime(4.0, now);
      eng.filterPeak.gain.setValueAtTime(4.0, now);

      // Siqnal Zənciri:
      // Oscillators -> Waveshaper -> FilterLowpass -> FilterPeak -> GainNode -> LimiterGain -> EngineMasterGain
      eng.waveshaper.connect(eng.filterLowpass);
      eng.filterLowpass.connect(eng.filterPeak);
      eng.filterPeak.connect(eng.gainNode);
      eng.gainNode.connect(eng.limiterGain);

      // Mühərrik Titrəməsi (Vibrato LFO - 6.5 Hz)
      eng.vibratoLfo = this.ctx.createOscillator();
      eng.vibratoLfo.type = 'sine';
      eng.vibratoLfo.frequency.setValueAtTime(6.5, now);

      eng.vibratoGain = this.ctx.createGain();
      eng.vibratoGain.gain.setValueAtTime(1.8, now); // 1.8 Hz titrəmə modulyasiyası
      eng.vibratoLfo.connect(eng.vibratoGain);

      // 1. Əsas Harmonik (Fundamental Sawtooth - Silindr alışma tezliyi)
      eng.fundamentalOsc = this.ctx.createOscillator();
      eng.fundamentalOsc.type = 'sawtooth';
      eng.fundamentalOsc.frequency.setValueAtTime(45, now);
      eng.vibratoGain.connect(eng.fundamentalOsc.frequency);

      // 2. Detuned Rasp Sawtooth (+3.5 cent fərqlə mexaniki metal xırıltısı)
      eng.detuneOsc = this.ctx.createOscillator();
      eng.detuneOsc.type = 'sawtooth';
      eng.detuneOsc.frequency.setValueAtTime(45, now);
      eng.detuneOsc.detune.setValueAtTime(12, now);
      eng.vibratoGain.connect(eng.detuneOsc.frequency);

      // 3. Sub-Oktava Kvadrat Dalğa (Alt gövdə gurultusu və vibrasiya)
      eng.subOsc = this.ctx.createOscillator();
      eng.subOsc.type = 'square';
      eng.subOsc.frequency.setValueAtTime(22.5, now);

      // 4. Hava Girişi / İntake Dronu (Üçbucaqlı dalğa 1.5x)
      eng.intakeOsc = this.ctx.createOscillator();
      eng.intakeOsc.type = 'triangle';
      eng.intakeOsc.frequency.setValueAtTime(67.5, now);

      // Bütün generatorları waveshaper-ə qoş
      eng.fundamentalOsc.connect(eng.waveshaper);
      eng.detuneOsc.connect(eng.waveshaper);
      eng.subOsc.connect(eng.waveshaper);
      eng.intakeOsc.connect(eng.waveshaper);

      // Generatorları işə sal
      eng.vibratoLfo.start(now);
      eng.fundamentalOsc.start(now);
      eng.detuneOsc.start(now);
      eng.subOsc.start(now);
      eng.intakeOsc.start(now);
    }

    /**
     * Mühərriki işə salır (Start Ignition)
     */
    startEngine() {
      if (!this.isInitialized) this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      this.engine.isRunning = true;
      this.engine.gainNode.gain.cancelScheduledValues(now);
      this.engine.gainNode.gain.setTargetAtTime(0.55, now, 0.2);

      // Starter səsi (İlkin alışma küyü)
      this._playStarterImpulse();
    }

    /**
     * Mühərrikin starter alışma küyü
     */
    _playStarterImpulse() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxMasterGain);

      osc.start(now);
      osc.stop(now + 0.36);
    }

    /**
     * Mühərriki söndürür
     */
    stopEngine() {
      if (!this.ctx || !this.engine.isRunning) return;
      const now = this.ctx.currentTime;
      this.engine.isRunning = false;
      this.engine.gainNode.gain.cancelScheduledValues(now);
      this.engine.gainNode.gain.setTargetAtTime(0.0001, now, 0.4);
    }

    /**
     * Hər kadrda (Frame) Mühərrik Göstəricilərini Yeniləyir
     * @param {Object} telemetry - { rpm, throttle, gear, speed, maxSpeed, isNitro }
     */
    updateEngine(telemetry = {}) {
      if (!this.ctx || !this.engine.isRunning) return;

      const now = this.ctx.currentTime;
      const eng = this.engine;

      const rpm = clamp(telemetry.rpm !== undefined ? telemetry.rpm : eng.rpm, 800, 9200);
      const throttle = clamp(telemetry.throttle !== undefined ? telemetry.throttle : 0, 0, 1);
      const gear = telemetry.gear || 1;
      const speed = telemetry.speed || 0;
      const isNitro = !!telemetry.isNitro;

      eng.rpm = rpm;
      eng.throttle = throttle;
      eng.gear = gear;
      eng.speed = speed;
      eng.isNitro = isNitro;

      // 1. Silindr Alışma Tezliyinin Hesablanması (6-Silindrli İdman Avtomobili)
      // Firing Frequency = (RPM / 60) * (Cylinders / 2) -> (RPM / 60) * 3
      const fundamentalFreq = (rpm / 60) * 3.0;

      // Hərəkət zamanı tezlikləri rəvan modulyasiya et (timeConstant = 0.035)
      eng.fundamentalOsc.frequency.setTargetAtTime(fundamentalFreq, now, 0.035);
      eng.detuneOsc.frequency.setTargetAtTime(fundamentalFreq, now, 0.035);
      eng.subOsc.frequency.setTargetAtTime(fundamentalFreq * 0.5, now, 0.035);
      eng.intakeOsc.frequency.setTargetAtTime(fundamentalFreq * 1.5, now, 0.035);

      // 2. Qaz Dərəcəsinə (Throttle) və RPM-ə Bağlı Filtr Modulyasiyası
      // Qaz verildikdə süzgəc kəskin açılır (450 Hz-dən 6200 Hz-ə qədər)
      const baseCutoff = 380 + (rpm / 9000) * 1400;
      const throttleOpen = Math.pow(throttle, 1.3) * 4400;
      const nitroBoostFreq = isNitro ? 1200 : 0;
      const targetCutoff = clamp(baseCutoff + throttleOpen + nitroBoostFreq, 350, 9500);

      eng.filterLowpass.frequency.setTargetAtTime(targetCutoff, now, 0.04);
      eng.filterLowpass.Q.setTargetAtTime(2.2 + throttle * 4.0, now, 0.04);

      // Peaking boğaz rezonansı (qaz verildikdə qışqıran metal səsi)
      const peakFreq = 1200 + (rpm / 9000) * 1800;
      eng.filterPeak.frequency.setTargetAtTime(peakFreq, now, 0.05);
      eng.filterPeak.gain.setTargetAtTime(2.0 + throttle * 7.5, now, 0.05);

      // 3. Səs Həcmi Dinamikası
      // Boş dayandıqda (idle) sakit, tam qazda yüksək və gur
      const targetVol = 0.35 + (rpm / 9000) * 0.35 + throttle * 0.30;
      eng.gainNode.gain.setTargetAtTime(targetVol, now, 0.05);

      // 4. Rev-Limiter (8850+ RPM-də kəskin yanacaq kəsilməsi və atəş çırpıntısı)
      if (rpm >= 8850) {
        // 18 Hz tezliklə mühərrik kəsimi ("tat-tat-tat-tat!")
        const chop = (Math.sin(now * TWO_PI * 18) > 0) ? 1.0 : 0.08;
        eng.limiterGain.gain.setValueAtTime(chop, now);

        // Qırmızı xəttdə təkrar partlayış şansı
        if (Math.random() < 0.18 && (now - eng.lastBackfireTime > 0.12)) {
          this.playBackfire(0.85, 1);
          eng.lastBackfireTime = now;
        }
      } else {
        eng.limiterGain.gain.setTargetAtTime(1.0, now, 0.02);
      }

      // 5. Qazı qəfil buraxdıqda (Overrun) egzoz crackle və Turbo BOV yoxlaması
      const throttleDelta = eng.prevThrottle - throttle;
      if (throttleDelta > 0.35 && rpm > 3400) {
        // Turbo Blow-Off Valve işə düşür
        this.playBlowOff(clamp(throttleDelta * 1.5, 0.5, 1.2));

        // Egzozda yanmamış yanacaq partlayışları (Overrun Crackle & Backfire)
        if (now - eng.lastBackfireTime > 0.35) {
          const popCount = Math.floor(Math.random() * 3) + 2; // 2 - 4 partlayış
          this.playBackfire(clamp(rpm / 7000, 0.6, 1.2), popCount);
          eng.lastBackfireTime = now;
        }
      }

      eng.prevThrottle = throttle;
    }

    // =========================================================================
    // 2. ÖTÜRMƏ DƏYİŞMƏSİ & TURBO BLOW-OFF VALVE ("Pshhh-ch-ch-ch")
    // =========================================================================

    /**
     * Ötürmə Pilləsi Dəyişməsi (Gear Shift)
     * @param {string} direction - 'up' və ya 'down'
     * @param {number} newGear - yeni pillə nömrəsi
     */
    playGearShift(direction = 'up', newGear = 2) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Mexaniki transmissiya zərbəsi (Gear Clunk & Linkage Click)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(direction === 'up' ? 140 : 180, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxMasterGain);

      osc.start(now);
      osc.stop(now + 0.12);

      // Metalik ilişmə küyü (Metallic synchro click)
      if (this.whiteNoiseBuffer) {
        const clickSource = this.ctx.createBufferSource();
        clickSource.buffer = this.whiteNoiseBuffer;
        const clickFilter = this.ctx.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.setValueAtTime(3200, now);
        clickFilter.Q.setValueAtTime(5.0, now);

        const clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(0.35, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        clickSource.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.sfxMasterGain);

        clickSource.start(now);
        clickSource.stop(now + 0.05);
      }

      // Əgər yuxarı ötürmədirsə və yüksək RPM-dədirsə, dərhal Turbo Blow-off valve açılır
      if (direction === 'up' && this.engine.rpm > 3600) {
        this.playBlowOff(0.9);
      }
    }

    /**
     * Pnevmatik Turbo Blow-Off Valve Səsi ("Pshhh-ch-ch-ch" Compressor Surge & Wastegate Flutter)
     * @param {number} intensity - 0.1 ilə 1.5 arası güc
     */
    playBlowOff(intensity = 1.0) {
      if (!this.ctx || !this.whiteNoiseBuffer) return;

      const now = this.ctx.currentTime;
      const pwr = clamp(intensity, 0.3, 1.5);

      // --- 1-ci Mərhələ: Yüksək Təzyiqli Hava Boşalması ("Pshhh") ---
      const hissSource = this.ctx.createBufferSource();
      hissSource.buffer = this.whiteNoiseBuffer;

      const hissFilter = this.ctx.createBiquadFilter();
      hissFilter.type = 'bandpass';
      hissFilter.frequency.setValueAtTime(3800, now);
      hissFilter.frequency.exponentialRampToValueAtTime(2200, now + 0.18);
      hissFilter.Q.setValueAtTime(3.5, now);

      const hissGain = this.ctx.createGain();
      hissGain.gain.setValueAtTime(0.55 * pwr, now);
      hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      hissSource.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(this.sfxMasterGain);

      hissSource.start(now);
      hissSource.stop(now + 0.23);

      // --- 2-ci Mərhələ: Rezonanslı Titrəmə / Flutter ("ch-ch-ch-ch") ---
      const flutterSource = this.ctx.createBufferSource();
      flutterSource.buffer = this.whiteNoiseBuffer;

      const flutterFilter = this.ctx.createBiquadFilter();
      flutterFilter.type = 'bandpass';
      flutterFilter.frequency.setValueAtTime(2100, now + 0.06);
      flutterFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.55);
      flutterFilter.Q.setValueAtTime(7.0, now);

      // 21 Hz Tremolo LFO (Kompressor qanadlarının titrəmə modulyasiyası)
      const tremoloOsc = this.ctx.createOscillator();
      tremoloOsc.type = 'sine';
      tremoloOsc.frequency.setValueAtTime(21, now);

      const tremoloGain = this.ctx.createGain();
      tremoloGain.gain.setValueAtTime(0.5, now);
      tremoloOsc.connect(tremoloGain);

      const flutterGain = this.ctx.createGain();
      // Flutter 60ms sonra pikə çatır və 500ms ərzində sönür
      flutterGain.gain.setValueAtTime(0.001, now);
      flutterGain.gain.linearRampToValueAtTime(0.65 * pwr, now + 0.09);
      flutterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

      tremoloGain.connect(flutterGain.gain);

      flutterSource.connect(flutterFilter);
      flutterFilter.connect(flutterGain);
      flutterGain.connect(this.sfxMasterGain);

      tremoloOsc.start(now);
      flutterSource.start(now + 0.04);

      tremoloOsc.stop(now + 0.6);
      flutterSource.stop(now + 0.6);
    }

    // =========================================================================
    // 3. EGZOZ BACKFIRE & OVERRUN CRACKLE (ANTI-LAG PARTLAYIŞ POPLARI)
    // =========================================================================

    /**
     * Egzoz partlayışı və popları (Anti-Lag Backfire Pops)
     * @param {number} intensity - partlayış gücü
     * @param {number} count - popların sayı (əgər boşdursa 2-5 arası random)
     */
    playBackfire(intensity = 1.0, count = null) {
      if (!this.ctx) return;

      const totalPops = count !== null ? count : (Math.floor(Math.random() * 3) + 2);
      const baseIntensity = clamp(intensity, 0.4, 1.4);

      let delay = 0;
      for (let i = 0; i < totalPops; i++) {
        const popIntensity = baseIntensity * (0.7 + Math.random() * 0.6);
        setTimeout(() => {
          this._singleBackfirePop(popIntensity);
        }, delay * 1000);

        // Növbəti pop üçün təsadüfi gecikmə (35ms - 75ms)
        delay += 0.035 + Math.random() * 0.045;
      }

      // Xarici vizual effekt callback-i
      if (typeof this.onBackfire === 'function') {
        try {
          this.onBackfire({ intensity: baseIntensity, count: totalPops });
        } catch (_) {}
      }
    }

    /**
     * Tək bir egzoz popunun sintezi
     */
    _singleBackfirePop(intensity) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Düşən Sinus Tezliyi (Bərk zərbə təzyiqi: 240 Hz -> 35 Hz)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(240, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.055);

      subGain.gain.setValueAtTime(0.7 * intensity, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      subOsc.connect(subGain);
      subGain.connect(this.sfxMasterGain);

      subOsc.start(now);
      subOsc.stop(now + 0.07);

      // 2. Partlayış Küy Şilləsi (Distorted High-Pass Noise Snap)
      if (this.whiteNoiseBuffer) {
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.whiteNoiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400 + Math.random() * 600, now);
        filter.Q.setValueAtTime(4.5, now);

        // Sərt Overdrive distorsiyası
        const shaper = this.ctx.createWaveShaper();
        shaper.curve = makeDistortionCurve(35, 2048);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.85 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        noiseSource.connect(filter);
        filter.connect(shaper);
        shaper.connect(gain);
        gain.connect(this.sfxMasterGain);

        noiseSource.start(now);
        noiseSource.stop(now + 0.05);
      }
    }

    // =========================================================================
    // 4. POLİS SİRENLƏRİ & DOPPLER EFFEKTİ (WEE-WOO & YELP)
    // =========================================================================

    /**
     * Patrul avtomobillərinin sirenlərini yeniləyir və ya yenisini əlavə edir
     * @param {Array} cruisers - Array of { id, distance, relSpeed, side, mode }
     *   - distance: oyunçudan məsafə (metrlə, məs. 10 - 300)
     *   - relSpeed: oyunçuya yaxınlaşma nisbi sürəti (m/s, müsbət yaxınlaşır, mənfi uzaqlaşır)
     *   - side: yol üzrə mövqe (-1.0 sol zolaq, +1.0 sağ zolaq)
     *   - mode: 'wail' (Wee-Woo) və ya 'yelp' (cəld siren)
     */
    updatePoliceSirens(cruisers = []) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const activeIds = new Set();

      cruisers.forEach(c => {
        const id = c.id || 'default_cop';
        activeIds.add(id);

        let sirenNode = this.sirens.get(id);
        if (!sirenNode) {
          sirenNode = this._createPoliceSirenNode(c.mode || 'wail');
          this.sirens.set(id, sirenNode);
        }

        // 1. Doppler Tezlik Əmsalı
        // f_apparent = f0 * (SPEED_OF_SOUND / (SPEED_OF_SOUND - relSpeed))
        const vr = clamp(c.relSpeed || 0, -120, 120);
        const dopplerMultiplier = clamp(SPEED_OF_SOUND / (SPEED_OF_SOUND - vr), 0.72, 1.45);

        // 2. Məsafəyə görə Səs Zəifləməsi (Distance Attenuation)
        const dist = Math.max(2, c.distance || 30);
        const volumeFactor = 1.0 / (1.0 + dist * 0.016); // Məsafə artdıqca yumşaq sönmə
        const targetVol = clamp(volumeFactor * 0.9, 0.0, 1.0);

        // 3. Məsafəyə görə Havanın Yüksək Tezlikləri Udması (Air Absorption Lowpass)
        const cutoff = clamp(12000 - dist * 35, 900, 12000);

        // 4. Stereo Panning (-1.0 sol, +1.0 sağ)
        const pan = clamp(c.side !== undefined ? c.side : 0, -1, 1);

        // Node Parametrlərini Yenilə
        sirenNode.filter.frequency.setTargetAtTime(cutoff, now, 0.08);
        sirenNode.panner.pan.setTargetAtTime(pan, now, 0.08);
        sirenNode.gain.gain.setTargetAtTime(targetVol, now, 0.08);

        // Rejim dəyişikliyi (Məsafə çox yaxındırsa (<40m) avtomatik təlaşlı 'yelp'-ə keçə bilər)
        const effectiveMode = (c.mode) ? c.mode : (dist < 45 ? 'yelp' : 'wail');
        if (sirenNode.mode !== effectiveMode) {
          sirenNode.mode = effectiveMode;
          this._switchSirenMode(sirenNode, effectiveMode);
        }

        // Doppler modulyasiyası
        sirenNode.dopplerGain.gain.setTargetAtTime(dopplerMultiplier, now, 0.06);
      });

      // Aktiv olmayan köhnə patrulların səsini söndür və təmizlə
      for (const [id, sirenNode] of this.sirens.entries()) {
        if (!activeIds.has(id)) {
          sirenNode.gain.gain.setTargetAtTime(0.0001, now, 0.3);
          setTimeout(() => {
            try {
              sirenNode.osc.stop();
              sirenNode.lfo.stop();
              sirenNode.gain.disconnect();
            } catch (_) {}
            this.sirens.delete(id);
          }, 350);
        }
      }
    }

    /**
     * Tək bir patrul avtomobili üçün səs zənciri yaradır
     */
    _createPoliceSirenNode(mode = 'wail') {
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';

      // LFO (Tezliyi yuxarı-aşağı modulyasiya edir)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'triangle';

      const lfoDepth = this.ctx.createGain();

      // Doppler vuruğu
      const dopplerGain = this.ctx.createGain();
      dopplerGain.gain.setValueAtTime(1.0, now);

      // Süzgəc
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(8000, now);

      // Stereo Panner
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : { pan: { setTargetAtTime: () => {} }, connect: (dest) => dest };

      // Gain
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      // Rejim parametrləri
      if (mode === 'yelp') {
        osc.frequency.setValueAtTime(950, now);
        lfo.frequency.setValueAtTime(4.2, now); // 4.2 Hz sürətli Yelping
        lfoDepth.gain.setValueAtTime(320, now);
      } else {
        // Wail: Klassik iki-tonlu "Wee-Woo"
        osc.frequency.setValueAtTime(780, now);
        lfo.frequency.setValueAtTime(0.75, now); // 0.75 Hz klassik dövr
        lfoDepth.gain.setValueAtTime(220, now);
      }

      // Bağlantılar:
      // lfo -> lfoDepth -> osc.frequency
      lfo.connect(lfoDepth);
      lfoDepth.connect(osc.frequency);

      // osc -> filter -> panner -> gain -> sirenMasterGain
      osc.connect(filter);
      if (this.ctx.createStereoPanner) {
        filter.connect(panner);
        panner.connect(gain);
      } else {
        filter.connect(gain);
      }
      gain.connect(this.sirenMasterGain);

      osc.start(now);
      lfo.start(now);

      return { osc, lfo, lfoDepth, dopplerGain, filter, panner, gain, mode };
    }

    /**
     * Siren rejimini Wail <-> Yelp arasında dəyişir
     */
    _switchSirenMode(sirenNode, mode) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (mode === 'yelp') {
        sirenNode.osc.frequency.setTargetAtTime(950, now, 0.1);
        sirenNode.lfo.frequency.setTargetAtTime(4.2, now, 0.1);
        sirenNode.lfoDepth.gain.setTargetAtTime(320, now, 0.1);
      } else {
        sirenNode.osc.frequency.setTargetAtTime(780, now, 0.1);
        sirenNode.lfo.frequency.setTargetAtTime(0.75, now, 0.1);
        sirenNode.lfoDepth.gain.setTargetAtTime(220, now, 0.1);
      }
    }

    /**
     * Bütün aktiv patrulların sirenlərini dayandırır
     */
    stopAllSirens() {
      const now = this.ctx ? this.ctx.currentTime : 0;
      for (const [, sirenNode] of this.sirens.entries()) {
        if (sirenNode.gain) sirenNode.gain.setTargetAtTime(0.0001, now, 0.2);
      }
      this.sirens.clear();
    }

    // =========================================================================
    // 5. TƏKƏR CIRILTISI (TIRE SCREECH & DRIFT SLIP-ANGLE NOISE)
    // =========================================================================

    /**
     * Təkər sürüşməsi zəncirini (Dual-Bandpass Pink Noise + Micro-Vibrato) qurur
     */
    _setupTireScreechSubsystem() {
      if (!this.ctx || !this.pinkNoiseBuffer) return;
      const now = this.ctx.currentTime;
      const t = this.tire;

      t.gainNode = this.ctx.createGain();
      t.gainNode.gain.setValueAtTime(0.0001, now);
      t.gainNode.connect(this.screechMasterGain);

      // 1. Əsas asfalt cırıltısı süzgəci (Bandpass ~2400 Hz, Q = 7)
      t.filterHigh = this.ctx.createBiquadFilter();
      t.filterHigh.type = 'bandpass';
      t.filterHigh.frequency.setValueAtTime(2400, now);
      t.filterHigh.Q.setValueAtTime(7.0, now);

      // 2. Təkər rezin sürtünməsi süzgəci (Bandpass ~1150 Hz, Q = 4)
      t.filterMid = this.ctx.createBiquadFilter();
      t.filterMid.type = 'bandpass';
      t.filterMid.frequency.setValueAtTime(1150, now);
      t.filterMid.Q.setValueAtTime(4.0, now);

      // Mikro-titrəmə LFO (16 Hz - protektor bloklarının asfalta çırpınması)
      t.vibratoLfo = this.ctx.createOscillator();
      t.vibratoLfo.type = 'sine';
      t.vibratoLfo.frequency.setValueAtTime(16, now);

      t.vibratoGain = this.ctx.createGain();
      t.vibratoGain.gain.setValueAtTime(180, now);
      t.vibratoLfo.connect(t.vibratoGain);
      t.vibratoGain.connect(t.filterHigh.frequency);

      // Pink Noise bufer mənbəyi (Daimi loop)
      t.noiseSource = this.ctx.createBufferSource();
      t.noiseSource.buffer = this.pinkNoiseBuffer;
      t.noiseSource.loop = true;

      // Zəncir: noise -> filterHigh -> gainNode, noise -> filterMid -> gainNode
      t.noiseSource.connect(t.filterHigh);
      t.noiseSource.connect(t.filterMid);
      t.filterHigh.connect(t.gainNode);
      t.filterMid.connect(t.gainNode);

      t.vibratoLfo.start(now);
      t.noiseSource.start(now);
      t.isPlaying = true;
    }

    /**
     * Təkər cırıltısını yeniləyir (Drift zamanı hər kadrda çağırılır)
     * @param {number} slipAngle - Təkər sürüşmə dərəcəsi (0.0 ilə 1.0 arası və ya bucaq)
     * @param {number} speed - Avtomobilin sürəti (km/h)
     */
    updateTireScreech(slipAngle = 0, speed = 0) {
      if (!this.ctx || !this.tire.isPlaying) return;

      const now = this.ctx.currentTime;
      const absSlip = Math.abs(slipAngle);
      this.tire.currentSlip = absSlip;

      // Yalnız sürət > 25 km/h və sürüşmə > 0.12 olduqda cırıltı yaranır
      if (speed < 25 || absSlip < 0.12) {
        this.tire.gainNode.gain.setTargetAtTime(0.0001, now, 0.06);
        return;
      }

      // 1. Səs Həcmi: Sürüşmə bucağı və sürətə proporsional
      const slipFactor = clamp((absSlip - 0.12) / 0.70, 0, 1.0);
      const speedFactor = clamp(speed / 90, 0.2, 1.0);
      const targetGain = slipFactor * speedFactor * 0.75;

      this.tire.gainNode.gain.setTargetAtTime(targetGain, now, 0.04);

      // 2. Rezonans Tezliklərinin Dinamik Sürüşməsi
      // Sürüşmə gücləndikcə cırıltı daha iti və aqressiv olur (2200 Hz -> 3300 Hz)
      const targetHighFreq = 2200 + slipFactor * 1100;
      const targetMidFreq = 1000 + slipFactor * 450;

      this.tire.filterHigh.frequency.setTargetAtTime(targetHighFreq, now, 0.04);
      this.tire.filterMid.frequency.setTargetAtTime(targetMidFreq, now, 0.04);
    }

    // =========================================================================
    // 6. 80-ci İLLƏR LİNN DRUM & FM SYNTHWAVE FON MUSİQİSİ
    // =========================================================================

    /**
     * Synthwave fon musiqisini başladır (124 BPM, D Minor)
     */
    startMusic() {
      if (!this.isInitialized) this.init();
      if (!this.ctx) return;
      if (this.music.isPlaying) return;

      this.music.isPlaying = true;
      this.music.currentStep = 0;
      this.music.nextStepTime = this.ctx.currentTime + 0.05;

      // Musiqi üçün əsas Lowpass süzgəc
      if (!this.music.filterNode) {
        this.music.filterNode = this.ctx.createBiquadFilter();
        this.music.filterNode.type = 'lowpass';
        this.music.filterNode.frequency.setValueAtTime(8000, this.ctx.currentTime);
        this.music.filterNode.connect(this.musicMasterGain);
      }

      this._scheduleMusicLoop();
      console.log('🎵 [NeonVelocityAudio] 80s Synthwave FM Musiqi Mühərriki işə düşdü.');
    }

    /**
     * Fon musiqisini dayandırır
     */
    stopMusic() {
      this.music.isPlaying = false;
      if (this.music.timerId) {
        clearTimeout(this.music.timerId);
        this.music.timerId = null;
      }
    }

    /**
     * Musiqinin intensivlik səviyyəsini dəyişir (1: Sakit, 2: Drift, 3: Heat 5 Təqib)
     * @param {number} level - 1, 2 və ya 3
     */
    setMusicIntensity(level = 2) {
      this.music.intensity = clamp(Math.floor(level), 1, 3);
      if (this.ctx && this.music.filterNode) {
        const now = this.ctx.currentTime;
        const cutoff = this.music.intensity === 1 ? 3800 : (this.music.intensity === 2 ? 8500 : 14000);
        this.music.filterNode.frequency.setTargetAtTime(cutoff, now, 0.2);
      }
    }

    /**
     * Web Audio Lookahead Sequencer Saat Mexanizmi
     */
    _scheduleMusicLoop() {
      if (!this.music.isPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      while (this.music.nextStepTime < now + this.music.scheduleAheadSec) {
        this._play16thNoteStep(this.music.currentStep, this.music.nextStepTime);
        this.music.nextStepTime += this.music.stepTime;
        this.music.currentStep = (this.music.currentStep + 1) % 128; // 8 takt x 16 addım = 128
      }

      this.music.timerId = setTimeout(() => {
        this._scheduleMusicLoop();
      }, this.music.lookaheadMs);
    }

    /**
     * 16-lıq not addımında zərb və melodiyanı sintez edir
     */
    _play16thNoteStep(step, time) {
      const bar = Math.floor(step / 16) % 8;
      const stepInBar = step % 16;
      const intensity = this.music.intensity;

      // --- 1. LINNDRUM RİTMİK ZƏRBLƏRİ ---
      // Kick: Hər 4 addımdan bir (Four-on-the-floor: 0, 4, 8, 12)
      if (stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12) {
        this._synthesizeKick(time);
      }

      // Snare (80s Gated Reverb Snare): 4 və 12-ci addımlarda (2-ci və 4-cü paylar)
      if (stepInBar === 4 || stepInBar === 12) {
        this._synthesizeGatedSnare(time);
      }

      // Hi-Hats:
      // Bağlı Hat: hər 2-ci addımda (8-lik notlar)
      if (stepInBar % 2 === 0) {
        this._synthesizeHiHat(time, false);
      }
      // Açıq Hat: Sinxopik 16-lıqlarda (intensivlik >= 2 olduqda)
      if (intensity >= 2 && (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14)) {
        this._synthesizeHiHat(time, true);
      }

      // 80s Clap: Heat 5 təqibində (intensivlik 3) hər 8 və 12-ci addımda
      if (intensity === 3 && (stepInBar === 4 || stepInBar === 12)) {
        this._synthesize80sClap(time);
      }

      // --- 2. YAMAHA FM SYNTH BASSLINE (16-lıq Qaçan Bas) ---
      const bassNote = this.music.bassSteps[stepInBar];
      if (bassNote) {
        // Akkordun kök notu ilə modulyasiya
        const chord = this.music.chords[bar];
        const transposedBass = bassNote + (chord.root - 38);
        this._synthesizeFMBass(transposedBass, time, stepInBar % 4 === 0);
      }

      // --- 3. POLİFONİK RETRO SİNTEZATOR AKKORDLARI (Pads / Brass) ---
      // Taktın əvvəlində akkord səslənir (stepInBar === 0 və ya 8)
      if (stepInBar === 0) {
        const chord = this.music.chords[bar];
        this._synthesizePolyPad(chord.notes, time, this.music.stepTime * 14);
      }

      // --- 4. ARPEGGİO LEAD MELODİYASI ---
      if (intensity >= 2) {
        const leadNote = this.music.leadSteps[stepInBar];
        if (leadNote > 0) {
          const chord = this.music.chords[bar];
          const transposedLead = leadNote + (chord.root - 38);
          this._synthesizeArpLead(transposedLead, time);
        }
      }
    }

    /**
     * LinnDrum Punchy 80s Kick (160 Hz -> 36 Hz sürətli pitch drop)
     */
    _synthesizeKick(time) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.085);

      gain.gain.setValueAtTime(0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(this.music.filterNode || this.musicMasterGain);

      osc.start(time);
      osc.stop(time + 0.23);

      // Snappy Transient Click (5ms)
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(320, time);
      click.frequency.exponentialRampToValueAtTime(60, time + 0.02);

      clickGain.gain.setValueAtTime(0.45, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

      click.connect(clickGain);
      clickGain.connect(this.music.filterNode || this.musicMasterGain);

      click.start(time);
      click.stop(time + 0.025);
    }

    /**
     * 80s Gated Reverb Snare (Pitched body + Bandpass noise burst with hard gate)
     */
    _synthesizeGatedSnare(time) {
      // 1. Snare Tonu (210 Hz -> 85 Hz)
      const toneOsc = this.ctx.createOscillator();
      const toneGain = this.ctx.createGain();
      toneOsc.type = 'triangle';
      toneOsc.frequency.setValueAtTime(210, time);
      toneOsc.frequency.exponentialRampToValueAtTime(85, time + 0.07);

      toneGain.gain.setValueAtTime(0.65, time);
      toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      toneOsc.connect(toneGain);
      toneGain.connect(this.music.filterNode || this.musicMasterGain);

      toneOsc.start(time);
      toneOsc.stop(time + 0.13);

      // 2. Partlayıcı Ağ Küy (Gated Noise Tail)
      if (this.whiteNoiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.whiteNoiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1250, time);
        filter.Q.setValueAtTime(2.8, time);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.75, time);
        // Gated Reverb effekti: 140ms saxlayır, sonra kəskin kəsir
        noiseGain.gain.setValueAtTime(0.65, time + 0.13);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.music.filterNode || this.musicMasterGain);

        noise.start(time);
        noise.stop(time + 0.17);
      }
    }

    /**
     * 80s Hi-Hat (Metalic Highpass Noise)
     */
    _synthesizeHiHat(time, isOpen = false) {
      if (!this.whiteNoiseBuffer) return;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, time);

      const gain = this.ctx.createGain();
      const duration = isOpen ? 0.17 : 0.045;
      gain.gain.setValueAtTime(isOpen ? 0.45 : 0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.music.filterNode || this.musicMasterGain);

      noise.start(time);
      noise.stop(time + duration + 0.01);
    }

    /**
     * Vintage 80s Linn Clap (Multi-pulse noise envelope)
     */
    _synthesize80sClap(time) {
      if (!this.whiteNoiseBuffer) return;

      [0, 0.012, 0.024].forEach((offset) => {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.whiteNoiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, time + offset);
        filter.Q.setValueAtTime(3.0, time + offset);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, time + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.065);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.music.filterNode || this.musicMasterGain);

        noise.start(time + offset);
        noise.stop(time + offset + 0.07);
      });
    }

    /**
     * Yamaha DX7 / FM Synthwave Rolling Bassline
     * Modulator (Sine) -> Modulation Gain -> Carrier (Sawtooth) -> Resonant Filter
     */
    _synthesizeFMBass(midiNote, time, isAccented = false) {
      const freq = midiToFreq(midiNote);

      // 1. Modulator Oscillator (FM Operator 2: 2x Frequency Ratio)
      const modOsc = this.ctx.createOscillator();
      modOsc.type = 'sine';
      modOsc.frequency.setValueAtTime(freq * 2.0, time);

      const modGain = this.ctx.createGain();
      const fmIndex = isAccented ? 340 : 220;
      modGain.gain.setValueAtTime(fmIndex, time);
      modGain.gain.exponentialRampToValueAtTime(20, time + this.music.stepTime * 0.85);

      modOsc.connect(modGain);

      // 2. Carrier Oscillator (FM Operator 1: Sawtooth)
      const carrierOsc = this.ctx.createOscillator();
      carrierOsc.type = 'sawtooth';
      carrierOsc.frequency.setValueAtTime(freq, time);
      modGain.connect(carrierOsc.frequency); // FM Modulyasiyası!

      // 3. 24dB Moog-üslublu Rezonans Süzgəc
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isAccented ? 1800 : 950, time);
      filter.frequency.exponentialRampToValueAtTime(320, time + this.music.stepTime * 0.9);
      filter.Q.setValueAtTime(4.5, time);

      // 4. Bass Həcm Envelope-i
      const envGain = this.ctx.createGain();
      const peakVol = isAccented ? 0.65 : 0.50;
      envGain.gain.setValueAtTime(peakVol, time);
      envGain.gain.exponentialRampToValueAtTime(0.001, time + this.music.stepTime * 0.92);

      carrierOsc.connect(filter);
      filter.connect(envGain);
      envGain.connect(this.music.filterNode || this.musicMasterGain);

      modOsc.start(time);
      carrierOsc.start(time);

      modOsc.stop(time + this.music.stepTime);
      carrierOsc.stop(time + this.music.stepTime);
    }

    /**
     * Polifonik Retro Chords & Synth Brass (Lush Detuned Sawtooth Waves)
     */
    _synthesizePolyPad(notes, time, duration) {
      notes.forEach((midi) => {
        const freq = midiToFreq(midi);

        // 2 detuned generator (Lush Chorus effekti)
        [-7, 7].forEach((detuneVal) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, time);
          osc.detune.setValueAtTime(detuneVal, time);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1800, time);
          filter.frequency.exponentialRampToValueAtTime(650, time + duration);
          filter.Q.setValueAtTime(2.0, time);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.linearRampToValueAtTime(0.12, time + 0.15); // Yumşaq Attack
          gain.gain.setValueAtTime(0.10, time + duration - 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // Release

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.music.filterNode || this.musicMasterGain);

          osc.start(time);
          osc.stop(time + duration + 0.05);
        });
      });
    }

    /**
     * Galloping Arpeggio Lead (Plucky Square Synthwave Lead)
     */
    _synthesizeArpLead(midiNote, time) {
      const freq = midiToFreq(midiNote);

      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 2.2, time);
      filter.Q.setValueAtTime(3.5, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + this.music.stepTime * 0.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.music.filterNode || this.musicMasterGain);

      osc.start(time);
      osc.stop(time + this.music.stepTime * 0.8);
    }

    // =========================================================================
    // 7. ƏLAVƏ ARCADE SFX SÜİTİ (NITRO, CRASH, TAKEDOWN, EMP, UI)
    // =========================================================================

    /**
     * Nitro Boost Reaktiv Səsi (Afterburner Jet Turbine Roar)
     * @param {boolean} active - aktivdir ya yox
     */
    playNitro(active = true) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const n = this.nitro;

      if (active) {
        if (n.isPlaying) return;
        n.isPlaying = true;

        n.gainNode = this.ctx.createGain();
        n.gainNode.gain.setValueAtTime(0.001, now);
        n.gainNode.gain.linearRampToValueAtTime(0.85, now + 0.15);
        n.gainNode.connect(this.sfxMasterGain);

        // Turbin fışıltısı (Jet Hiss)
        if (this.pinkNoiseBuffer) {
          n.noiseSource = this.ctx.createBufferSource();
          n.noiseSource.buffer = this.pinkNoiseBuffer;
          n.noiseSource.loop = true;

          n.filter = this.ctx.createBiquadFilter();
          n.filter.type = 'bandpass';
          n.filter.frequency.setValueAtTime(1800, now);
          n.filter.Q.setValueAtTime(3.0, now);

          n.noiseSource.connect(n.filter);
          n.filter.connect(n.gainNode);
          n.noiseSource.start(now);
        }

        // Yüksələn reaktiv tonu (High-pitch Afterburner Whine)
        n.whineOsc = this.ctx.createOscillator();
        n.whineOsc.type = 'sawtooth';
        n.whineOsc.frequency.setValueAtTime(420, now);
        n.whineOsc.frequency.exponentialRampToValueAtTime(1450, now + 1.2);

        const whineGain = this.ctx.createGain();
        whineGain.gain.setValueAtTime(0.18, now);
        n.whineOsc.connect(whineGain);
        whineGain.connect(n.gainNode);
        n.whineOsc.start(now);
      } else {
        if (!n.isPlaying) return;
        n.isPlaying = false;
        if (n.gainNode) {
          n.gainNode.gain.cancelScheduledValues(now);
          n.gainNode.gain.setTargetAtTime(0.0001, now, 0.15);
        }
        setTimeout(() => {
          try {
            if (n.noiseSource) n.noiseSource.stop();
            if (n.whineOsc) n.whineOsc.stop();
          } catch (_) {}
        }, 200);
      }
    }

    /**
     * Toqquşma / Qəza Səsi (Heavy Metallic Impact & Glass Crumble)
     * @param {number} severity - Zərbə şiddəti (0.2 ilə 1.5 arası)
     */
    playCrash(severity = 1.0) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const pwr = clamp(severity, 0.3, 1.5);

      // 1. Dərin Sub-Bass Zərbəsi (80 Hz -> 25 Hz)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.22);

      subGain.gain.setValueAtTime(0.9 * pwr, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      subOsc.connect(subGain);
      subGain.connect(this.sfxMasterGain);

      subOsc.start(now);
      subOsc.stop(now + 0.36);

      // 2. Metalik Deformasiya və Şüşə Sınması Küyü
      if (this.whiteNoiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.whiteNoiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.frequency.exponentialRampToValueAtTime(450, now + 0.4);
        filter.Q.setValueAtTime(2.5, now);

        const shaper = this.ctx.createWaveShaper();
        shaper.curve = makeDistortionCurve(45, 2048);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.85 * pwr, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        noise.connect(filter);
        filter.connect(shaper);
        shaper.connect(gain);
        gain.connect(this.sfxMasterGain);

        noise.start(now);
        noise.stop(now + 0.46);
      }
    }

    /**
     * Polad Çəpər / Metal Sürtünməsi Səsi (Metal Scrape & Guardrail Grind)
     * @param {number} severity - Sürtünmə şiddəti
     */
    playMetalScrape(severity = 0.45) {
      if (!this.ctx) return;
      this.playCrash(clamp(severity, 0.25, 0.65));
    }

    /**
     * Polis Takedown Qələbə Partlayışı (Freeze-frame Cinematic Boom)
     */
    playTakedown() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Kinematik Sub Drop (180 Hz -> 22 Hz)
      const dropOsc = this.ctx.createOscillator();
      const dropGain = this.ctx.createGain();
      dropOsc.type = 'sine';
      dropOsc.frequency.setValueAtTime(190, now);
      dropOsc.frequency.exponentialRampToValueAtTime(24, now + 0.7);

      dropGain.gain.setValueAtTime(1.0, now);
      dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      dropOsc.connect(dropGain);
      dropGain.connect(this.sfxMasterGain);

      dropOsc.start(now);
      dropOsc.stop(now + 0.9);

      // 2. Qığılcım və Şüşə Şilləsi
      this.playCrash(1.4);

      // 3. Arxa planda rezonanslı Takedown akkordu (Synth Fanfare)
      [50, 53, 57, 62].forEach((midi) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(midiToFreq(midi), now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.sfxMasterGain);

        osc.start(now);
        osc.stop(now + 0.7);
      });
    }

    /**
     * Yaxın Keçid Vışıltısı (Near-Miss Doppler Whoosh - 200+ km/h)
     */
    playNearMiss() {
      if (!this.ctx || !this.pinkNoiseBuffer) return;
      const now = this.ctx.currentTime;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.28);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxMasterGain);

      noise.start(now);
      noise.stop(now + 0.34);
    }

    /**
     * Tikanlı Xətt (Spike Strip) Təkər Partlaması və Metal Disk Qığılcımı
     */
    playSpikeStrip() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Partlayış popu
      this._singleBackfirePop(1.3);

      // Yüksək təzyiqli hava qaçması (De-flating Hiss)
      if (this.whiteNoiseBuffer) {
        const hiss = this.ctx.createBufferSource();
        hiss.buffer = this.whiteNoiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3200, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        hiss.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxMasterGain);

        hiss.start(now);
        hiss.stop(now + 0.65);
      }
    }

    /**
     * EMP Dalğası və ya Nitro Şarjı (Cyberpunk Electronic Pulse)
     */
    playEMP() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.55);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxMasterGain);

      osc.start(now);
      osc.stop(now + 0.62);
    }

    /**
     * Yarış Başlama Sayğacı (3, 2, 1, GO!)
     * @param {number} step - 3, 2, 1 və ya 'go'
     */
    playCountdown(step) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const isGo = step === 'go' || step === 0;
      const freq = isGo ? 880 : 440;
      const duration = isGo ? 0.45 : 0.18;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxMasterGain);

      osc.start(now);
      osc.stop(now + duration + 0.02);

      // GO üçün major akord təntənəsi
      if (isGo) {
        [1100, 1320].forEach((chordFreq) => {
          const chordOsc = this.ctx.createOscillator();
          const chordGain = this.ctx.createGain();
          chordOsc.type = 'triangle';
          chordOsc.frequency.setValueAtTime(chordFreq, now);

          chordGain.gain.setValueAtTime(0.35, now);
          chordGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          chordOsc.connect(chordGain);
          chordGain.connect(this.sfxMasterGain);

          chordOsc.start(now);
          chordOsc.stop(now + duration + 0.02);
        });
      }
    }

    /**
     * Neon UI Menyu Düyməsi Kliki
     */
    playUIClick() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.sfxMasterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    }

    /**
     * Qaraj Təkmilləşdirməsi / Neon Krediti Zəngi (Cash Register Chime)
     */
    playCash() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Parlaq ikili zəng tonu (C6 və G6)
      [1046.5, 1567.98].forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxMasterGain);

        osc.start(time);
        osc.stop(time + 0.36);
      });
    }

    /**
     * 1.5s Drift Çıxışında Mini-Turbo Plazma Partlayışı (Mini-Turbo Boost)
     */
    playMiniTurbo() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Yüksələn plazma tonu (280 Hz -> 1100 Hz)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.28);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.28);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxMasterGain);

      osc.start(now);
      osc.stop(now + 0.4);

      // Partlayış zərbəsi
      this.playBlowOff(1.1);
    }

    /**
     * SWAT Rhino Ağır Zirehli Yük Maşınının Pnevmatik Siqnalı (SWAT Rhino Air Horn)
     */
    _playRhinoHorn() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // İki tonlu pnevmatik fleyta (145 Hz & 182 Hz)
      [145, 182].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(2.5, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.55, now + 0.05);
        gain.gain.setValueAtTime(0.5, now + 0.42);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxMasterGain);

        osc.start(now);
        osc.stop(now + 0.65);
      });
    }

    /**
     * Polis Helikopterinin Rotor Qanad Çırpıntısı (Police Chopper Rotor Chop)
     */
    _playChopperRotor() {
      if (!this.ctx || !this.pinkNoiseBuffer) return;
      const now = this.ctx.currentTime;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(3.5, now);

      // 22 Hz Tremolo LFO (İki-pərli helikopter rotoru)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(22, now);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.5, now);
      lfo.connect(lfoGain);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.2);
      gain.gain.setValueAtTime(0.6, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      lfoGain.connect(gain.gain);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxMasterGain);

      noise.start(now);
      lfo.start(now);

      noise.stop(now + 1.85);
      lfo.stop(now + 1.85);
    }

    /**
     * Agent 1-in Pursuit AI Hadisələrini Audio Cues ilə Birləşdirir
     * @param {string} cue - AI hadisə növü
     * @param {Object} data - əlavə göstəricilər
     */
    handleAICue(cue, data = {}) {
      switch (cue) {
        case 'takedown':
          this.playTakedown();
          break;
        case 'heavy_crash':
        case 'traffic_crash':
          this.playCrash(1.3);
          break;
        case 'metal_scrape':
          this.playCrash(0.4);
          break;
        case 'tire_blowout':
        case 'spike_drop':
          this.playSpikeStrip();
          break;
        case 'near_miss':
        case 'spike_evasion':
          this.playNearMiss();
          break;
        case 'heat_escalation':
          this.setMusicIntensity((data.heatLevel || 1) >= 4 ? 3 : 2);
          this.playEMP();
          break;
        case 'rhino_horn':
          this._playRhinoHorn();
          break;
        case 'chopper_enter':
        case 'spotlight_lock':
          this._playChopperRotor();
          break;
        case 'roadblock_alert':
        case 'pit_warning':
          this.playCountdown(2);
          break;
        case 'mini_turbo':
          this.playMiniTurbo();
          break;
        default:
          break;
      }
    }

    /**
     * AI Direktoru ilə Birbaşa Avtomatik Əlaqələndirmə
     */
    connectToAI(aiDirector) {
      if (!aiDirector) return;
      aiDirector.onAudioEvent = (evt) => {
        if (evt && evt.cue) {
          this.handleAICue(evt.cue, evt);
        }
      };
      console.log('🔗 [NeonVelocityAudio] Pursuit AI Direktoru audio mühərrikinə bağlandı.');
    }

    // =========================================================================
    // HƏCM VƏ İDARƏETMƏ METODLARI
    // =========================================================================

    /**
     * Master Səs Həcmi (0.0 ilə 1.0 arası)
     */
    setMasterVolume(val) {
      this.masterVolume = clamp(val, 0, 1);
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
      }
    }

    /**
     * Fon Musiqisi Səs Həcmi (0.0 ilə 1.0 arası)
     */
    setMusicVolume(val) {
      this.musicVolume = clamp(val, 0, 1);
      if (this.ctx && this.musicMasterGain) {
        this.musicMasterGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
      }
    }

    /**
     * SFX Səs Həcmi (0.0 ilə 1.0 arası)
     */
    setSFXVolume(val) {
      this.sfxVolume = clamp(val, 0, 1);
      if (this.ctx && this.sfxMasterGain) {
        this.sfxMasterGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
      }
    }

    /**
     * Mühərrik Səs Həcmi (0.0 ilə 1.0 arası)
     */
    setEngineVolume(val) {
      this.engineVolume = clamp(val, 0, 1);
      if (this.ctx && this.engineMasterGain) {
        this.engineMasterGain.gain.setTargetAtTime(this.engineVolume, this.ctx.currentTime, 0.05);
      }
    }

    /**
     * Səsi Tam Susdur / Bərpa Et (Mute Toggle)
     */
    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
      }
      return this.isMuted;
    }

    /**
     * Qlobal Frame Yeniləməsi (Game Loop tərəfindən çağırılır)
     * @param {number} dt - delta time
     * @param {Object} state - { car: { rpm, throttle, gear, speed, slipAngle, isNitro }, policeCars: [...] }
     */
    update(dt, state = {}) {
      if (!this.ctx || !this.isInitialized) return;

      if (state.car) {
        this.updateEngine({
          rpm: state.car.rpm,
          throttle: state.car.throttle,
          gear: state.car.gear,
          speed: state.car.speed,
          isNitro: state.car.isNitro
        });

        this.updateTireScreech(state.car.slipAngle || 0, state.car.speed || 0);
      }

      if (state.policeCars && Array.isArray(state.policeCars)) {
        this.updatePoliceSirens(state.policeCars);
      }
    }

    updateEngineRPM(rpm, gear, throttle, isNitro) {
      this.updateEngine({ rpm, gear, throttle, isNitro });
    }

    updatePoliceSirenField(cruisers = []) {
      this.updatePoliceSirens(cruisers);
    }
  }

  return NeonVelocityAudio;
});
