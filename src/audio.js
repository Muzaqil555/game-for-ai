/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ — Səs və Musiqi Mühərriki (Audio & Sound Designer)
 * Web Audio API Prosedural Səs və Musiqi Sistemi
 * Xarici heç bir audio faylı tələb etmir (100% Procedural Web Audio Engine).
 * 
 * İnterfeys Müqaviləsi: window.GameAudio
 */

(function () {
  'use strict';

  // MIDI not nömrəsini tezliyə (Hz) çevirir
  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  class ProceduralAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.bgmGain = null;
      this.sfxGain = null;
      this.compressor = null;
      this.reverbNode = null;
      this.reverbGain = null;
      this.noiseBuffer = null;

      this.isMuted = false;
      this.masterVolume = 0.85;
      this.bgmVolume = 0.55;
      this.sfxVolume = 0.85;

      this.currentTheme = null;
      this.schedulerTimer = null;
      this.nextNoteTime = 0;
      this.currentStep = 0;
      this.isInitialized = false;
      this._sfxThrottle = {};

      // Autoplay kilidini açmaq üçün qlobal dinləyicilər
      this._setupAutoplayUnlock();
    }

    /**
     * İstifadəçi qarşılıqlı əlaqəsi ilə AudioContext kilidini dərhal açır
     */
    _setupAutoplayUnlock() {
      const unlockEvents = ['pointerdown', 'keydown', 'touchstart', 'click'];
      const unlock = () => {
        try {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
        } catch (_) {}
      };
      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, unlock, { once: true, passive: true });
      });
    }

    /**
     * AudioContext və səs zəncirini (Node Graph) başladır
     */
    init() {
      try {
        if (this.ctx) {
          if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          return;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          console.warn('[GameAudio] Brauzer Web Audio API dəstəkləmir.');
          return;
        }

        this.ctx = new AudioCtx();

        // 1. Master Dynamics Compressor (Clipping və həddindən artıq səsin qarşısını almaq üçün)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);

        // 2. Master Gain Node
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.compressor);

        // 3. BGM Gain Node
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // 4. SFX Gain Node
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // 5. Reverb / Ambient Convolver
        this._initReverb();

        // 6. Təkrar istifadə edilə bilən Noise Buffer (Partlayış, külək və perkussiyalar üçün)
        this._initNoiseBuffer();

        this.isInitialized = true;
      } catch (e) {
        console.warn('[GameAudio] AudioContext init xətası:', e);
      }
    }

    /**
     * AudioContext-in hazır olmasını təmin edir
     */
    _ensureContext() {
      try {
        if (!this.ctx) {
          this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      } catch (_) {}
    }

    /**
     * Prosedural Reverb (Zal / Mağara əks-sədası) yaradır
     */
    _initReverb() {
      try {
        const rate = this.ctx.sampleRate;
        const duration = 1.6;
        const length = Math.floor(rate * duration);
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
          const t = i / length;
          const decay = Math.pow(1 - t, 2.2);
          left[i] = (Math.random() * 2 - 1) * decay * 0.5;
          right[i] = (Math.random() * 2 - 1) * decay * 0.5;
        }

        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = impulse;

        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
      } catch (_) {
        this.reverbNode = null;
      }
    }

    /**
     * Təkrar istifadə edilə bilən ağ küy bufferi (2 saniyəlik)
     */
    _initNoiseBuffer() {
      try {
        const rate = this.ctx.sampleRate;
        const length = rate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, length, rate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } catch (_) {
        this.noiseBuffer = null;
      }
    }

    /**
     * Səsi açıb / bağlayır
     * @returns {boolean} cari isMuted vəziyyəti
     */
    toggleMute() {
      try {
        this._ensureContext();
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
          const targetGain = this.isMuted ? 0 : this.masterVolume;
          this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
          this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.05);
        }
        return this.isMuted;
      } catch (e) {
        return this.isMuted;
      }
    }

    /* =========================================================================
     *  FON MUSİQİSİ (BGM) — PROSEDURAL SİNTEZATUR VƏ SEQVENSER
     * ========================================================================= */

    /**
     * BGM mövzusunu başladır
     * @param {'menu' | 'forest' | 'cavern' | 'citadel' | 'boss' | 'arena'} themeName 
     */
    playBGM(themeName) {
      try {
        this._ensureContext();
        if (this.currentTheme === themeName) return;

        this.stopBGM();
        this.currentTheme = themeName;
        this.currentStep = 0;

        if (!this.ctx) return;

        // BGM Gain-i yumşaq açırıq
        this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, this.ctx.currentTime + 0.6);

        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this._startScheduler();
      } catch (e) {
        console.warn('[GameAudio] playBGM xətası:', e);
      }
    }

    /**
     * Fon musiqisini dayandırır
     */
    stopBGM() {
      try {
        if (this.schedulerTimer) {
          clearInterval(this.schedulerTimer);
          this.schedulerTimer = null;
        }
        this.currentTheme = null;
        if (this.bgmGain && this.ctx) {
          this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, this.ctx.currentTime);
          this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        }
      } catch (_) {}
    }

    /**
     * Web Audio qızıl standart "Lookahead Scheduler" dövrü
     */
    _startScheduler() {
      const scheduleLookahead = 0.12; // 120ms irəliyə planlaşdırır
      const timerInterval = 25; // 25ms-dən bir yoxlayır

      this.schedulerTimer = setInterval(() => {
        try {
          if (!this.ctx || !this.currentTheme) return;

          const config = this._getThemeConfig(this.currentTheme);
          if (!config) return;

          const stepDuration = 60 / config.bpm / 4; // 16-cı not addımı

          while (this.nextNoteTime < this.ctx.currentTime + scheduleLookahead) {
            this._scheduleThemeStep(this.currentTheme, this.currentStep, this.nextNoteTime, config);
            this.nextNoteTime += stepDuration;
            this.currentStep = (this.currentStep + 1) % config.patternLength;
          }
        } catch (_) {}
      }, timerInterval);
    }

    /**
     * Hər mövzunun BPM və kompozisiya konfiqurasiyası
     */
    _getThemeConfig(theme) {
      switch (theme) {
        case 'menu':
          return { bpm: 74, patternLength: 32 };
        case 'forest':
          return { bpm: 94, patternLength: 32 };
        case 'cavern':
          return { bpm: 80, patternLength: 32 };
        case 'citadel':
          return { bpm: 114, patternLength: 32 };
        case 'boss':
          return { bpm: 138, patternLength: 32 };
        case 'arena':
          return { bpm: 146, patternLength: 32 };
        default:
          return { bpm: 85, patternLength: 32 };
      }
    }

    /**
     * Step üzrə uyğun mövzunun notlarını planlaşdırır
     */
    _scheduleThemeStep(theme, step, time, config) {
      switch (theme) {
        case 'menu':
          this._stepMenu(step, time);
          break;
        case 'forest':
          this._stepForest(step, time);
          break;
        case 'cavern':
          this._stepCavern(step, time);
          break;
        case 'citadel':
          this._stepCitadel(step, time);
          break;
        case 'boss':
          this._stepBoss(step, time);
          break;
        case 'arena':
          this._stepArena(step, time);
          break;
      }
    }

    /* ---------------------------------------------------------
     * 1. MENU BGM (Mistik, Lirik Dark-Fantasy Proloq)
     * --------------------------------------------------------- */
    _stepMenu(step, time) {
      // Akkord və Pad (hər 8 addımda bir Dm -> Bb -> F -> C)
      if (step === 0) {
        this._playPadChord([50, 53, 57, 62], 1.8, time, 0.22); // Dm
        this._playSubBass(38, 1.6, time, 0.35); // D2
      } else if (step === 8) {
        this._playPadChord([46, 53, 58, 62], 1.8, time, 0.22); // Bb
        this._playSubBass(34, 1.6, time, 0.35); // Bb1
      } else if (step === 16) {
        this._playPadChord([41, 48, 53, 57], 1.8, time, 0.22); // F
        this._playSubBass(41, 1.6, time, 0.35); // F2
      } else if (step === 24) {
        this._playPadChord([48, 55, 60, 64], 1.8, time, 0.22); // C
        this._playSubBass(36, 1.6, time, 0.35); // C2
      }

      // Melodiya (Zərif Arpeggio və zınqırov)
      const melodyMap = {
        0: 69, 3: 74, 6: 77, 8: 76, 11: 74, 14: 72,
        16: 69, 19: 72, 22: 65, 24: 67, 27: 69, 30: 64
      };
      if (melodyMap[step]) {
        this._playMelodyNote(melodyMap[step], 0.45, time, 'sine', 0.18, true);
      }
    }

    /* ---------------------------------------------------------
     * 2. FOREST BGM (Zümrüd Qədim Meşəsi — Canlı Dorian Macərası)
     * --------------------------------------------------------- */
    _stepForest(step, time) {
      // Pad (Dm7 -> G7 -> Bbmaj7 -> Asus4)
      if (step === 0) {
        this._playPadChord([50, 53, 57, 60], 1.3, time, 0.18);
        this._playSubBass(38, 1.0, time, 0.3);
      } else if (step === 8) {
        this._playPadChord([43, 50, 53, 59], 1.3, time, 0.18);
        this._playSubBass(43, 1.0, time, 0.3);
      } else if (step === 16) {
        this._playPadChord([46, 53, 57, 62], 1.3, time, 0.18);
        this._playSubBass(34, 1.0, time, 0.3);
      } else if (step === 24) {
        this._playPadChord([45, 52, 57, 62], 1.3, time, 0.18);
        this._playSubBass(33, 1.0, time, 0.3);
      }

      // Odunlu arfa / tütək melodiyası
      const fluteMap = {
        0: 62, 2: 65, 4: 69, 6: 72,
        8: 71, 10: 67, 12: 74, 14: 71,
        16: 69, 18: 65, 20: 62, 22: 65,
        24: 64, 26: 67, 28: 69, 30: 72
      };
      if (fluteMap[step]) {
        this._playMelodyNote(fluteMap[step], 0.32, time, 'triangle', 0.22, true);
      }

      // Ritm və Perkussiya
      if (step === 0 || step === 16) {
        this._playPercKick(time, 0.28);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this._playWoodBlock(time, 0.18);
      }
      if (step % 2 === 0) {
        this._playPercHiHat(time, 0.08, false);
      }
    }

    /* ---------------------------------------------------------
     * 3. CAVERN BGM (Astral Kristal Mağaraları — Əks-sədalı Efir)
     * --------------------------------------------------------- */
    _stepCavern(step, time) {
      // Dərin mağara dromu
      if (step === 0) {
        this._playPadChord([40, 47, 52, 55, 59], 2.8, time, 0.2); // Em
        this._playSubBass(28, 2.6, time, 0.4); // E1
      } else if (step === 16) {
        this._playPadChord([36, 43, 47, 52, 54], 2.8, time, 0.2); // Cmaj7#11
        this._playSubBass(24, 2.6, time, 0.4); // C1
      }

      // Kristal pings (parlaq zənglər və damcılar)
      const crystalMap = {
        2: 83, 5: 88, 9: 91, 14: 87,
        18: 84, 21: 91, 25: 95, 29: 88
      };
      if (crystalMap[step]) {
        this._playCrystalPing(crystalMap[step], 0.8, time, 0.16);
      }

      // Seyrək su damcısı
      if (step === 7 || step === 23) {
        this._playWaterDrop(time, 0.15);
      }
    }

    /* ---------------------------------------------------------
     * 4. CITADEL BGM (Obsidian Kölgələr Qalası — Qaranlıq Marş)
     * --------------------------------------------------------- */
    _stepCitadel(step, time) {
      // Driving Saw Bass (ritmik, kəskin və qaranlıq)
      const bassNotes = {
        0: 38, 2: 38, 4: 38, 6: 38,
        8: 39, 10: 39, 12: 39, 14: 39,
        16: 41, 18: 41, 20: 41, 22: 41,
        24: 37, 26: 37, 28: 37, 30: 37
      };
      if (bassNotes[step]) {
        this._playSawBass(bassNotes[step], 0.16, time, 0.32);
      }

      // Qotik Arpeggio
      const arpMap = {
        0: 62, 2: 65, 4: 69, 6: 74,
        8: 63, 10: 67, 12: 70, 14: 75,
        16: 65, 18: 68, 20: 72, 22: 77,
        24: 61, 26: 64, 28: 69, 30: 73
      };
      if (arpMap[step]) {
        this._playMelodyNote(arpMap[step], 0.2, time, 'sawtooth', 0.14, false);
      }

      // Perkussiya: Güclü Marş Nağarası
      if (step === 0 || step === 8 || step === 16 || step === 24) {
        this._playPercKick(time, 0.45);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this._playPercSnare(time, 0.32);
      }
      if (step % 2 === 0) {
        this._playPercHiHat(time, 0.12, false);
      }
    }

    /* ---------------------------------------------------------
     * 5. BOSS BGM (Epik Boss Döyüşü — Sürətli, Aqressiv Titan Rəsmi)
     * --------------------------------------------------------- */
    _stepBoss(step, time) {
      // Sürətli 16-lıq aqressiv bas xətti
      let bassMidi = 36; // C2
      if (step >= 8 && step < 16) bassMidi = 32; // G#1
      else if (step >= 16 && step < 24) bassMidi = 34; // A#1
      else if (step >= 24) bassMidi = 31; // G1

      this._playSawBass(bassMidi, 0.11, time, 0.35);

      // Dramatik Sintezator Akkord Zərbələri (Brass Stabs)
      if (step === 0 || step === 3) {
        this._playPadChord([60, 63, 67], 0.25, time, 0.35); // C Minor
      } else if (step === 6 || step === 8) {
        this._playPadChord([56, 60, 63], 0.25, time, 0.35); // G# Major
      } else if (step === 12) {
        this._playPadChord([58, 62, 65], 0.25, time, 0.35); // A# Major
      }

      // Epik Lead Melodiya (Qəhrəmanlıq motivi)
      const bossLead = {
        16: 72, 18: 70, 20: 68, 22: 67,
        24: 65, 26: 67, 28: 63, 30: 62
      };
      if (bossLead[step]) {
        this._playMelodyNote(bossLead[step], 0.18, time, 'sawtooth', 0.24, true);
      }

      // Sürətli Zərb Perkussiyası
      // Four-on-the-floor kick + sinkopalar
      if (step === 0 || step === 4 || step === 8 || step === 12 ||
          step === 16 || step === 20 || step === 24 || step === 28 ||
          step === 6 || step === 14 || step === 22 || step === 30) {
        this._playPercKick(time, 0.5);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this._playPercSnare(time, 0.4);
      }
      // 16-lıq hi-hat roll
      this._playPercHiHat(time, (step % 2 === 0) ? 0.15 : 0.08, step === 14 || step === 30);
    }

    /* ---------------------------------------------------------
     * 6. ARENA BGM (Sonsuz Kolizey — Yüksək Templi Gladiator/Synth-Orchestral Döyüş)
     * --------------------------------------------------------- */
    _stepArena(step, time) {
      // 1. Driving Saw Bass (Aqressiv gladiator ritmi: Dm -> F -> Gm -> A)
      let bassMidi = 38; // D2
      if (step >= 8 && step < 16) bassMidi = 41; // F2
      else if (step >= 16 && step < 24) bassMidi = 43; // G2
      else if (step >= 24) bassMidi = 45; // A2

      // Gallop bass pattern
      if (step % 2 === 0 || step % 4 === 3) {
        this._playSawBass(bassMidi, 0.12, time, 0.38);
      }

      // 2. Heavy Brass / Synth Chords
      if (step === 0) {
        this._playPadChord([50, 53, 57, 62], 0.28, time, 0.35); // Dm
        this._playPercCrash(time, 0.3);
      } else if (step === 6) {
        this._playPadChord([50, 53, 57], 0.22, time, 0.3);
      } else if (step === 8) {
        this._playPadChord([53, 57, 60], 0.28, time, 0.35); // F
      } else if (step === 14) {
        this._playPadChord([55, 58, 62], 0.22, time, 0.3); // Gm
      } else if (step === 16) {
        this._playPadChord([55, 58, 62, 67], 0.28, time, 0.35); // Gm
      } else if (step === 22) {
        this._playPadChord([57, 61, 64], 0.22, time, 0.3); // A
      } else if (step === 24) {
        this._playPadChord([57, 61, 64, 69], 0.32, time, 0.4); // A
      }

      // 3. Epik Qəhrəmanlıq Gladiatorial Lead Melodiyası
      const arenaLead = {
        0: 74, 2: 74, 4: 77, 6: 76, 8: 74,
        10: 72, 12: 69, 14: 72, 16: 74, 18: 76,
        20: 77, 22: 79, 24: 81, 26: 79, 28: 77, 30: 76
      };
      if (arenaLead[step]) {
        this._playMelodyNote(arenaLead[step], 0.16, time, 'sawtooth', 0.22, true);
      }

      // 4. Döyüş Perkussiyası (Kolizey nağaraları)
      // Driving double-kick & march
      if (step % 2 === 0 || step === 7 || step === 15 || step === 23 || step === 31) {
        this._playPercKick(time, 0.52);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this._playPercSnare(time, 0.45);
      }
      // Hi-hat roll
      this._playPercHiHat(time, (step % 2 === 0) ? 0.16 : 0.09, step === 14 || step === 30);
    }

    /* =========================================================================
     *  BGM SİNTEZATUR KÖMƏKÇİLƏRİ (OSCILLATORS & ENVELOPES)
     * ========================================================================= */

    _playSubBass(midiNote, duration, time, vol = 0.3) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(midiToFreq(midiNote), time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + duration);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playSawBass(midiNote, duration, time, vol = 0.3) {
      try {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(midiToFreq(midiNote), time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, time);
        filter.Q.setValueAtTime(3.5, time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + duration);
        osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playPadChord(notes, duration, time, vol = 0.2) {
      try {
        notes.forEach((midi) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(midi), time);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, time);

          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(vol / notes.length, time + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.bgmGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(time);
          osc.stop(time + duration);
          osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
        });
      } catch (_) {}
    }

    _playMelodyNote(midiNote, duration, time, waveType = 'sine', vol = 0.2, sendToReverb = true) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(midiToFreq(midiNote), time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        if (sendToReverb && this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        osc.start(time);
        osc.stop(time + duration);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playCrystalPing(midiNote, duration, time, vol = 0.15) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(midiToFreq(midiNote), time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0005, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        if (this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        osc.start(time);
        osc.stop(time + duration);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playWaterDrop(time, vol = 0.15) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, time);
        osc.frequency.exponentialRampToValueAtTime(450, time + 0.09);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        if (this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        osc.start(time);
        osc.stop(time + 0.1);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playPercKick(time, vol = 0.4) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + 0.14);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playPercSnare(time, vol = 0.3) {
      try {
        // Tonal hissə
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(60, time + 0.08);
        oscGain.gain.setValueAtTime(vol * 0.7, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        osc.connect(oscGain);
        oscGain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.08);
        osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };

        // Küy hissəsi
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const noiseGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1200, time);

          noiseGain.gain.setValueAtTime(vol, time);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.bgmGain);

          noise.start(time);
          noise.stop(time + 0.14);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); noiseGain.disconnect(); };
        }
      } catch (_) {}
    }

    _playPercHiHat(time, vol = 0.1, isOpen = false) {
      try {
        if (!this.noiseBuffer) return;
        const dur = isOpen ? 0.09 : 0.035;
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        noise.buffer = this.noiseBuffer;
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        noise.start(time);
        noise.stop(time + dur);
        noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playWoodBlock(time, vol = 0.18) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, time);
        osc.frequency.exponentialRampToValueAtTime(350, time + 0.04);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + 0.04);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    _playPercCrash(time, vol = 0.25) {
      try {
        if (!this.noiseBuffer) return;
        const dur = 0.6;
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        noise.buffer = this.noiseBuffer;
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4500, time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        if (this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        noise.start(time);
        noise.stop(time + dur);
        noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    /* =========================================================================
     *  SƏS EFFEKTLƏRİ (SFX) — PROCEDURAL SOUND DESIGN
     * ========================================================================= */

    /**
     * Tələb olunan SFX səsini çıxarır
     * @param {'slash1' | 'slash2' | 'slash3' | 'dash' | 'spell' | 'hit' | 'playerHurt' | 'explosion' | 'coin' | 'chest' | 'quest' | 'portal' | 'bossRoar' | 'levelUp' | 'click' | 'dagger' | 'hammer' | 'bow' | 'ultimate' | 'relic' | 'comboSSS' | 'perfectDodge' | 'lightningChain' | 'lootRare' | 'lootEpic' | 'lootLegendary' | 'evolution' | 'eliteSpawn' | 'talentUnlock' | 'dailyComplete' | 'soulGain'} type 
     */
    playSFX(type) {
      try {
        if (!type) return;

        // Tez-tez çağırılan hissəcik/ruh səsləri üçün throttle (≥60ms)
        const wallNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (!this._sfxThrottle) this._sfxThrottle = {};
        const throttleLimit = {
          soulGain: 65, // 65ms throttle
        };
        if (throttleLimit[type]) {
          const lastTime = this._sfxThrottle[type] || 0;
          if (wallNow - lastTime < throttleLimit[type]) {
            return;
          }
          this._sfxThrottle[type] = wallNow;
        }

        this._ensureContext();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;

        switch (type) {
          case 'slash1':
            this._sfxSlash(now, 2200, 480, 500, 110, 0.12);
            break;

          case 'slash2':
            this._sfxSlash(now, 3200, 680, 680, 160, 0.14);
            break;

          case 'slash3':
            this._sfxSlashHeavy(now);
            break;

          case 'dash':
            this._sfxDash(now);
            break;

          case 'spell':
            this._sfxSpell(now);
            break;

          case 'hit':
            this._sfxHit(now);
            break;

          case 'playerHurt':
            this._sfxPlayerHurt(now);
            break;

          case 'explosion':
            this._sfxExplosion(now);
            break;

          case 'coin':
            this._sfxCoin(now);
            break;

          case 'chest':
            this._sfxChest(now);
            break;

          case 'quest':
            this._sfxQuest(now);
            break;

          case 'portal':
            this._sfxPortal(now);
            break;

          case 'bossRoar':
            this._sfxBossRoar(now);
            break;

          case 'levelUp':
            this._sfxLevelUp(now);
            break;

          case 'click':
            this._sfxClick(now);
            break;

          case 'dagger':
          case 'daggers':
            this._sfxDagger(now);
            break;

          case 'hammer':
            this._sfxHammer(now);
            break;

          case 'bow':
            this._sfxBow(now);
            break;

          case 'ultimate':
            this._sfxUltimate(now);
            break;

          case 'relic':
            this._sfxRelic(now);
            break;

          case 'comboSSS':
            this._sfxComboSSS(now);
            break;

          case 'perfectDodge':
            this._sfxPerfectDodge(now);
            break;

          case 'lightningChain':
            this._sfxLightningChain(now);
            break;

          case 'lootRare':
            this._sfxLootRare(now);
            break;

          case 'lootEpic':
            this._sfxLootEpic(now);
            break;

          case 'lootLegendary':
            this._sfxLootLegendary(now);
            break;

          case 'evolution':
            this._sfxEvolution(now);
            break;

          case 'eliteSpawn':
            this._sfxEliteSpawn(now);
            break;

          case 'talentUnlock':
            this._sfxTalentUnlock(now);
            break;

          case 'dailyComplete':
            this._sfxDailyComplete(now);
            break;

          case 'soulGain':
            this._sfxSoulGain(now);
            break;

          default:
            // Naməlum SFX olduqda xəta atmır, sakit ötürür
            break;
        }
      } catch (e) {
        // Brauzer autoplay və ya səs istisnalarını təhlükəsiz qarşılayır
      }
    }

    // 1. Qılınc yelləmə (Slash 1 & Slash 2)
    _sfxSlash(now, filterStart, filterEnd, oscStart, oscEnd, dur) {
      try {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(oscStart, now);
        osc.frequency.exponentialRampToValueAtTime(oscEnd, now + dur);

        oscGain.gain.setValueAtTime(0.28, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + dur);
        osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };

        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(2.8, now);
          filter.frequency.setValueAtTime(filterStart, now);
          filter.frequency.exponentialRampToValueAtTime(filterEnd, now + dur);

          nGain.gain.setValueAtTime(0.4, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 2. Qılınc Kombo Finalı (Slash 3 — Ağır Şok Dalğası)
    _sfxSlashHeavy(now) {
      try {
        const dur = 0.24;

        // Sub bass təkan
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(180, now);
        sub.frequency.exponentialRampToValueAtTime(35, now + dur);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + dur);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };

        // Sawtooth kəsim
        const saw = this.ctx.createOscillator();
        const sawGain = this.ctx.createGain();
        saw.type = 'sawtooth';
        saw.frequency.setValueAtTime(420, now);
        saw.frequency.exponentialRampToValueAtTime(80, now + dur);
        sawGain.gain.setValueAtTime(0.35, now);
        sawGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        saw.connect(sawGain);
        sawGain.connect(this.sfxGain);
        saw.start(now);
        saw.stop(now + dur);
        saw.onended = () => { saw.disconnect(); sawGain.disconnect(); };

        // Güclü whoosh noise
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3500, now);
          filter.frequency.exponentialRampToValueAtTime(250, now + dur);

          nGain.gain.setValueAtTime(0.5, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 3. Kölgə Sıçrayışı (Dash — Hava Deşilməsi)
    _sfxDash(now) {
      try {
        const dur = 0.22;
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(2.2, now);
          filter.frequency.setValueAtTime(320, now);
          filter.frequency.exponentialRampToValueAtTime(2400, now + dur * 0.4);
          filter.frequency.exponentialRampToValueAtTime(200, now + dur);

          gain.gain.setValueAtTime(0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
        }

        // Sub glide
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + dur);
        oscGain.gain.setValueAtTime(0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + dur);
        osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };
      } catch (_) {}
    }

    // 4. Arcane Bolt / Sehrli Mərmi (Spell)
    _sfxSpell(now) {
      try {
        const dur = 0.35;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(340, now);
        osc1.frequency.exponentialRampToValueAtTime(980, now + dur * 0.5);
        osc1.frequency.exponentialRampToValueAtTime(450, now + dur);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(680, now);
        osc2.frequency.exponentialRampToValueAtTime(1960, now + dur * 0.5);
        osc2.frequency.exponentialRampToValueAtTime(900, now + dur);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        if (this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + dur);
        osc2.stop(now + dur);
        osc1.onended = () => { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    // 5. Düşmənə zərbə dəyməsi (Hit)
    _sfxHit(now) {
      try {
        const dur = 0.12;

        // Thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + dur);
        oscGain.gain.setValueAtTime(0.55, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + dur);
        osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };

        // Qısa metal/ət çırtıltısı
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1200, now);

          nGain.gain.setValueAtTime(0.4, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + 0.04);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 6. Qəhrəmanın zədələnməsi (Player Hurt)
    _sfxPlayerHurt(now) {
      try {
        const dur = 0.28;

        // Küt zərbə
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(110, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + dur);
        subGain.gain.setValueAtTime(0.65, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + dur);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };

        // Dissonant Sawtooth Beating (Ağrı hissi)
        const saw1 = this.ctx.createOscillator();
        const saw2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const sawGain = this.ctx.createGain();

        saw1.type = 'sawtooth';
        saw2.type = 'sawtooth';
        saw1.frequency.setValueAtTime(110, now);
        saw2.frequency.setValueAtTime(117, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        sawGain.gain.setValueAtTime(0.35, now);
        sawGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        saw1.connect(filter);
        saw2.connect(filter);
        filter.connect(sawGain);
        sawGain.connect(this.sfxGain);

        saw1.start(now);
        saw2.start(now);
        saw1.stop(now + dur);
        saw2.stop(now + dur);
        saw1.onended = () => { saw1.disconnect(); saw2.disconnect(); filter.disconnect(); sawGain.disconnect(); };
      } catch (_) {}
    }

    // 7. Partlayış (Explosion)
    _sfxExplosion(now) {
      try {
        const dur = 0.75;

        // Dərin sub-bass
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(150, now);
        sub.frequency.exponentialRampToValueAtTime(20, now + dur);
        subGain.gain.setValueAtTime(0.7, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + dur);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };

        // Güclü partlayış küyü
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1800, now);
          filter.frequency.exponentialRampToValueAtTime(60, now + dur);

          nGain.gain.setValueAtTime(0.75, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 8. Qızıl sikkə (Coin Pickup)
    _sfxCoin(now) {
      try {
        // İkiqat zınqırov (B5 -> E6)
        const notes = [
          { midi: 83, start: now, dur: 0.12, vol: 0.28 },
          { midi: 88, start: now + 0.07, dur: 0.32, vol: 0.32 }
        ];

        notes.forEach((n) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(n.midi), n.start);

          gain.gain.setValueAtTime(n.vol, n.start);
          gain.gain.exponentialRampToValueAtTime(0.0005, n.start + n.dur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(n.start);
          osc.stop(n.start + n.dur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });
      } catch (_) {}
    }

    // 9. Sandıq açılması (Chest Open)
    _sfxChest(now) {
      try {
        // Sandığın ağır kilidinin açılması çıqqıltısı
        if (this.noiseBuffer) {
          const n1 = this.ctx.createBufferSource();
          const g1 = this.ctx.createGain();
          n1.buffer = this.noiseBuffer;
          g1.gain.setValueAtTime(0.35, now);
          g1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          n1.connect(g1);
          g1.connect(this.sfxGain);
          n1.start(now);
          n1.stop(now + 0.04);

          const n2 = this.ctx.createBufferSource();
          const g2 = this.ctx.createGain();
          n2.buffer = this.noiseBuffer;
          g2.gain.setValueAtTime(0.4, now + 0.06);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          n2.connect(g2);
          g2.connect(this.sfxGain);
          n2.start(now + 0.06);
          n2.stop(now + 0.1);
        }

        // Sandıqdan parıldayan mükafat akkordu (D-Major Arpeggio: F#5, A5, D6)
        const chord = [78, 81, 86];
        chord.forEach((midi, idx) => {
          const startTime = now + 0.1 + idx * 0.05;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(midi), startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0005, startTime + 0.45);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(startTime);
          osc.stop(startTime + 0.45);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });
      } catch (_) {}
    }

    // 10. Tapşırıq / Rün aktivləşməsi (Quest Complete / Obelisk)
    _sfxQuest(now) {
      try {
        const arpeggio = [62, 66, 69, 74, 78]; // D4, F#4, A4, D5, F#5
        arpeggio.forEach((midi, idx) => {
          const startTime = now + idx * 0.07;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(midi), startTime);

          gain.gain.setValueAtTime(0.28, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0005, startTime + 0.55);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(startTime);
          osc.stop(startTime + 0.55);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });
      } catch (_) {}
    }

    // 11. Kosmik Portal (Portal Spin / Hum)
    _sfxPortal(now) {
      try {
        const dur = 0.85;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(118, now);
        osc2.frequency.setValueAtTime(122, now); // Detuned beating

        filter.type = 'bandpass';
        filter.Q.setValueAtTime(4.0, now);
        filter.frequency.setValueAtTime(350, now);
        filter.frequency.linearRampToValueAtTime(1600, now + dur * 0.5);
        filter.frequency.linearRampToValueAtTime(400, now + dur);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        if (this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + dur);
        osc2.stop(now + dur);
        osc1.onended = () => { osc1.disconnect(); osc2.disconnect(); filter.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    // 12. Boss Nərəsi (Boss Roar)
    _sfxBossRoar(now) {
      try {
        const dur = 1.25;

        // İki güclü detuned Sawtooth
        const saw1 = this.ctx.createOscillator();
        const saw2 = this.ctx.createOscillator();
        const formant = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        saw1.type = 'sawtooth';
        saw2.type = 'sawtooth';
        saw1.frequency.setValueAtTime(88, now);
        saw2.frequency.setValueAtTime(92, now);
        saw1.frequency.exponentialRampToValueAtTime(36, now + dur);
        saw2.frequency.exponentialRampToValueAtTime(37, now + dur);

        // Canavar boğazı rezonansı (Formant filter)
        formant.type = 'bandpass';
        formant.Q.setValueAtTime(2.5, now);
        formant.frequency.setValueAtTime(520, now);
        formant.frequency.linearRampToValueAtTime(380, now + dur);

        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        saw1.connect(formant);
        saw2.connect(formant);
        formant.connect(gain);
        gain.connect(this.sfxGain);

        if (this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        saw1.start(now);
        saw2.start(now);
        saw1.stop(now + dur);
        saw2.stop(now + dur);
        saw1.onended = () => { saw1.disconnect(); saw2.disconnect(); formant.disconnect(); gain.disconnect(); };

        // Xırıltılı küy
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const nFilter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          nFilter.type = 'lowpass';
          nFilter.frequency.setValueAtTime(800, now);

          nGain.gain.setValueAtTime(0.4, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(nFilter);
          nFilter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); nFilter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 13. Səviyyə artımı (Level Up Fanfare)
    _sfxLevelUp(now) {
      try {
        const fanfare = [
          { midi: 67, start: now, dur: 0.12 },        // G4
          { midi: 72, start: now + 0.08, dur: 0.12 }, // C5
          { midi: 76, start: now + 0.16, dur: 0.12 }, // E5
          { midi: 79, start: now + 0.24, dur: 0.14 }, // G5
          { midi: 84, start: now + 0.32, dur: 0.65 }  // C6 (Qələbə sonluğu)
        ];

        fanfare.forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(midiToFreq(f.midi), f.start);

          gain.gain.setValueAtTime(0.35, f.start);
          gain.gain.exponentialRampToValueAtTime(0.0005, f.start + f.dur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(f.start);
          osc.stop(f.start + f.dur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });
      } catch (_) {}
    }

    // 14. UI Klik (Click)
    _sfxClick(now) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.022);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.022);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }

    // 15. Əkiz Xəncər (Dagger — Çox Sürətli Kəskin Bıçaq Vızıltısı)
    _sfxDagger(now) {
      try {
        const dur = 0.09;
        // Kəskin vızıltı (High triangle slice)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3200, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + dur);

        oscGain.gain.setValueAtTime(0.32, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + dur);
        osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };

        // Sürətli kəsici küy zolağı
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(4.0, now);
          filter.frequency.setValueAtTime(4800, now);
          filter.frequency.exponentialRampToValueAtTime(900, now + dur);

          nGain.gain.setValueAtTime(0.45, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 16. Astral Döyüş Çəkici (Hammer — Yeri Titrədən Ağır Zərbə və Bas Partlayışı)
    _sfxHammer(now) {
      try {
        const dur = 0.55;

        // Yeri titrədən Ultra Sub-Bass
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(130, now);
        sub.frequency.exponentialRampToValueAtTime(22, now + dur);

        subGain.gain.setValueAtTime(0.85, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + dur);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };

        // Zindana dəyən ağır metal çəkic zərbəsi
        const metal = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();
        metal.type = 'triangle';
        metal.frequency.setValueAtTime(480, now);
        metal.frequency.exponentialRampToValueAtTime(90, now + 0.16);

        metalGain.gain.setValueAtTime(0.5, now);
        metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        metal.connect(metalGain);
        metalGain.connect(this.sfxGain);
        metal.start(now);
        metal.stop(now + 0.16);
        metal.onended = () => { metal.disconnect(); metalGain.disconnect(); };

        // Torpaq/qaya sınması və şok dalğası küyü
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(950, now);
          filter.frequency.exponentialRampToValueAtTime(50, now + dur);

          nGain.gain.setValueAtTime(0.7, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 17. Simurq Alov Yayı (Bow — Yay Kirişinin Dartılıb Oxun Uçma Səsi)
    _sfxBow(now) {
      try {
        // Kirişin kəskin boşalması (Bowstring twang / snap)
        const twang = this.ctx.createOscillator();
        const twangGain = this.ctx.createGain();
        twang.type = 'triangle';
        twang.frequency.setValueAtTime(360, now);
        twang.frequency.exponentialRampToValueAtTime(140, now + 0.07);

        twangGain.gain.setValueAtTime(0.42, now);
        twangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        twang.connect(twangGain);
        twangGain.connect(this.sfxGain);
        twang.start(now);
        twang.stop(now + 0.07);
        twang.onended = () => { twang.disconnect(); twangGain.disconnect(); };

        // Oxun havada fit verərək uçuşu (Whistling arrow glide)
        const flightDur = 0.22;
        const flightStart = now + 0.02;
        const arrow = this.ctx.createOscillator();
        const arrowGain = this.ctx.createGain();
        arrow.type = 'sine';
        arrow.frequency.setValueAtTime(1600, flightStart);
        arrow.frequency.exponentialRampToValueAtTime(820, flightStart + flightDur);

        arrowGain.gain.setValueAtTime(0.24, flightStart);
        arrowGain.gain.exponentialRampToValueAtTime(0.001, flightStart + flightDur);

        arrow.connect(arrowGain);
        arrowGain.connect(this.sfxGain);
        arrow.start(flightStart);
        arrow.stop(flightStart + flightDur);
        arrow.onended = () => { arrow.disconnect(); arrowGain.disconnect(); };

        // Kirişin qısa hava vıyıltısı
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(3.2, now);
          filter.frequency.setValueAtTime(2600, now);
          filter.frequency.exponentialRampToValueAtTime(900, now + 0.18);

          nGain.gain.setValueAtTime(0.35, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + 0.18);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 18. Aether Qiyaməti (Ultimate — Epik Meteor və Xor/Sintezator Partlayışı)
    _sfxUltimate(now) {
      try {
        const totalDur = 1.35;

        // Mistik Aether xor/sintezator yüksəlişi (Epic swell chord)
        const chordNotes = [57, 64, 69, 76]; // A3, E4, A4, E5
        chordNotes.forEach((midi) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(midiToFreq(midi), now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.12, now + 0.22);
          gain.gain.exponentialRampToValueAtTime(0.001, now + totalDur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(now);
          osc.stop(now + totalDur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });

        // Göydən şığıyan meteor fit vızıltısı (Screaming meteor descent)
        const meteor = this.ctx.createOscillator();
        const meteorGain = this.ctx.createGain();
        meteor.type = 'sine';
        meteor.frequency.setValueAtTime(2100, now + 0.05);
        meteor.frequency.exponentialRampToValueAtTime(160, now + 0.35);

        meteorGain.gain.setValueAtTime(0.35, now + 0.05);
        meteorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        meteor.connect(meteorGain);
        meteorGain.connect(this.sfxGain);
        meteor.start(now + 0.05);
        meteor.stop(now + 0.38);
        meteor.onended = () => { meteor.disconnect(); meteorGain.disconnect(); };

        // Epik Qiyamət partlayışı (Apocalypse Detonation)
        const impactTime = now + 0.28;
        const blastDur = 1.0;

        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, impactTime);
        sub.frequency.exponentialRampToValueAtTime(18, impactTime + blastDur);

        subGain.gain.setValueAtTime(0.85, impactTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, impactTime + blastDur);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(impactTime);
        sub.stop(impactTime + blastDur);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };

        // Kosmik partlayış küy dalğası
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2800, impactTime);
          filter.frequency.exponentialRampToValueAtTime(60, impactTime + blastDur);

          nGain.gain.setValueAtTime(0.8, impactTime);
          nGain.gain.exponentialRampToValueAtTime(0.001, impactTime + blastDur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(impactTime);
          noise.stop(impactTime + blastDur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 19. Relikt Kartı Seçimi (Relic — Sehrli Relikt Kartı Seçiləndə Mistik Akkord)
    _sfxRelic(now) {
      try {
        // Mistik Lydian / Astral akkord (F#4, A#4, C#5, F5, G#5)
        const notes = [66, 70, 73, 77, 80];
        notes.forEach((midi, idx) => {
          const startTime = now + idx * 0.055;
          const dur = 0.75;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(midi), startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.24, startTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0005, startTime + dur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(startTime);
          osc.stop(startTime + dur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });

        // Parıldayan efir zınqırovu (Shimmer harmonics)
        const shimmer = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(1760, now + 0.15); // A6
        shimmer.frequency.exponentialRampToValueAtTime(2640, now + 0.65); // E7

        sGain.gain.setValueAtTime(0.15, now + 0.15);
        sGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.65);

        shimmer.connect(sGain);
        sGain.connect(this.sfxGain);
        if (this.reverbNode) shimmer.connect(this.reverbNode);

        shimmer.start(now + 0.15);
        shimmer.stop(now + 0.65);
        shimmer.onended = () => { shimmer.disconnect(); sGain.disconnect(); };
      } catch (_) {}
    }

    // 20. SSS Kombo (ComboSSS — SSS Komboya Çatanda Qısa Zəfər Fanfarı)
    _sfxComboSSS(now) {
      try {
        // Zəfər fanfarı: C5 -> E5 -> G5 -> C6 (parlaq brass / zəfər marşı)
        const fanfare = [
          { midi: 72, start: now, dur: 0.08, vol: 0.32 },        // C5
          { midi: 76, start: now + 0.07, dur: 0.08, vol: 0.35 }, // E5
          { midi: 79, start: now + 0.14, dur: 0.10, vol: 0.38 }, // G5
          { midi: 84, start: now + 0.22, dur: 0.45, vol: 0.45 }  // C6 (Triumphant Apex)
        ];

        fanfare.forEach((f) => {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(midiToFreq(f.midi), f.start);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2600, f.start);

          gain.gain.setValueAtTime(f.vol, f.start);
          gain.gain.exponentialRampToValueAtTime(0.001, f.start + f.dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(f.start);
          osc.stop(f.start + f.dur);
          osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
        });

        // Final zəfər zınqırovu
        const sparkle = this.ctx.createOscillator();
        const spkGain = this.ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(2093, now + 0.22); // C7
        spkGain.gain.setValueAtTime(0.25, now + 0.22);
        spkGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.6);
        sparkle.connect(spkGain);
        spkGain.connect(this.sfxGain);
        if (this.reverbNode) sparkle.connect(this.reverbNode);
        sparkle.start(now + 0.22);
        sparkle.stop(now + 0.6);
        sparkle.onended = () => { sparkle.disconnect(); spkGain.disconnect(); };
      } catch (_) {}
    }

    // 21. Mükəmməl Yayınma (Perfect Dodge — Zaman Yavaşlayanda Kristal-Zaman Vızıltısı)
    _sfxPerfectDodge(now) {
      try {
        const dur = 0.45;

        // Zamanın qırılması / Doppler yavaşlama effekti (Pitch down glide)
        const warp = this.ctx.createOscillator();
        const warpGain = this.ctx.createGain();
        warp.type = 'sine';
        warp.frequency.setValueAtTime(1450, now);
        warp.frequency.exponentialRampToValueAtTime(180, now + dur);

        warpGain.gain.setValueAtTime(0.35, now);
        warpGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        warp.connect(warpGain);
        warpGain.connect(this.sfxGain);
        warp.start(now);
        warp.stop(now + dur);
        warp.onended = () => { warp.disconnect(); warpGain.disconnect(); };

        // Donan zaman kristal zəngi (Crystal Time Ping)
        const ping = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(2349, now); // D7
        ping.frequency.exponentialRampToValueAtTime(1174, now + dur);

        pingGain.gain.setValueAtTime(0.3, now);
        pingGain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

        ping.connect(pingGain);
        pingGain.connect(this.sfxGain);

        if (this.reverbNode) {
          pingGain.connect(this.reverbNode);
        }

        ping.start(now);
        ping.stop(now + dur);
        ping.onended = () => { ping.disconnect(); pingGain.disconnect(); };

        // Eterik hava nəfəsi (Time-slow whoosh)
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(4.5, now);
          filter.frequency.setValueAtTime(3200, now);
          filter.frequency.exponentialRampToValueAtTime(350, now + dur);

          nGain.gain.setValueAtTime(0.4, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 22. İldırım Zənciri (Lightning Chain — Elektrik Qövsü Şaqqıltısı)
    _sfxLightningChain(now) {
      try {
        const dur = 0.26;

        // Elektrik zərbəsi şaqqıltısı (Harsh Sawtooth Arc)
        const saw = this.ctx.createOscillator();
        const sawGain = this.ctx.createGain();
        saw.type = 'sawtooth';
        saw.frequency.setValueAtTime(140, now);
        saw.frequency.setValueAtTime(280, now + 0.04);
        saw.frequency.setValueAtTime(90, now + 0.1);
        saw.frequency.exponentialRampToValueAtTime(40, now + dur);

        sawGain.gain.setValueAtTime(0.45, now);
        sawGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        saw.connect(sawGain);
        sawGain.connect(this.sfxGain);
        saw.start(now);
        saw.stop(now + dur);
        saw.onended = () => { saw.disconnect(); sawGain.disconnect(); };

        // Yüksək gərginlikli plazma qığılcımları (Highpass Noise Sparks)
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(5.0, now);
          filter.frequency.setValueAtTime(3800, now);
          filter.frequency.setValueAtTime(5200, now + 0.06);
          filter.frequency.exponentialRampToValueAtTime(800, now + dur);

          nGain.gain.setValueAtTime(0.55, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 23. Nadir Qənimət (Loot Rare — Qısa Mavi Kristal Cingiltisi, 2 Notlu Arpeggio)
    _sfxLootRare(now) {
      try {
        const notes = [
          { midi: 86, start: now, dur: 0.28, vol: 0.26 },        // D6
          { midi: 93, start: now + 0.075, dur: 0.38, vol: 0.30 }  // A6
        ];

        notes.forEach((n) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(n.midi), n.start);

          gain.gain.setValueAtTime(0, n.start);
          gain.gain.linearRampToValueAtTime(n.vol, n.start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0005, n.start + n.dur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(n.start);
          osc.stop(n.start + n.dur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });

        // Kristal parıltısı üçün yüksək harmonik ping
        const ping = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(midiToFreq(105), now + 0.075); // A7
        pGain.gain.setValueAtTime(0.12, now + 0.075);
        pGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.3);
        ping.connect(pGain);
        pGain.connect(this.sfxGain);
        if (this.reverbNode) pGain.connect(this.reverbNode);
        ping.start(now + 0.075);
        ping.stop(now + 0.3);
        ping.onended = () => { ping.disconnect(); pGain.disconnect(); };
      } catch (_) {}
    }

    // 24. Epik Qənimət (Loot Epic — Bənövşəyi Sehrli Shimmer, 3 Notlu Arpeggio + Reverb)
    _sfxLootEpic(now) {
      try {
        const notes = [
          { midi: 75, start: now, dur: 0.45, vol: 0.24 },         // D#5
          { midi: 80, start: now + 0.07, dur: 0.55, vol: 0.28 },  // G#5
          { midi: 87, start: now + 0.15, dur: 0.70, vol: 0.32 }   // D#6
        ];

        notes.forEach((n) => {
          // Əsas mistik ton (sine)
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(n.midi), n.start);

          // Bənövşəyi sehr shimmeri üçün detune edilmiş ikinci harmonik
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(midiToFreq(n.midi) * 1.006, n.start);

          gain.gain.setValueAtTime(0, n.start);
          gain.gain.linearRampToValueAtTime(n.vol, n.start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0005, n.start + n.dur);

          gain2.gain.setValueAtTime(0, n.start);
          gain2.gain.linearRampToValueAtTime(n.vol * 0.45, n.start + 0.02);
          gain2.gain.exponentialRampToValueAtTime(0.0005, n.start + n.dur);

          osc.connect(gain);
          osc2.connect(gain2);
          gain.connect(this.sfxGain);
          gain2.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
            gain2.connect(this.reverbNode);
          }

          osc.start(n.start);
          osc.stop(n.start + n.dur);
          osc2.start(n.start);
          osc2.stop(n.start + n.dur);

          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
          osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
        });

        // Bənövşəyi sehrli toz / Shimmer effekti
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(6.0, now);
          filter.frequency.setValueAtTime(2800, now);
          filter.frequency.exponentialRampToValueAtTime(7000, now + 0.4);

          nGain.gain.setValueAtTime(0.001, now);
          nGain.gain.linearRampToValueAtTime(0.2, now + 0.12);
          nGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.6);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(now);
          noise.stop(now + 0.6);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 25. Əfsanəvi Qənimət (Loot Legendary — Dərin "Bum" + Parlaq 5 Notlu Qızılı Fanfar + Şimmer, Diablo Legendary Drop)
    _sfxLootLegendary(now) {
      try {
        const totalDur = 1.25;

        // 1. Dərin "Bum" (Sub-bass impact zərbəsi)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(130, now);
        sub.frequency.exponentialRampToValueAtTime(26, now + 0.75);

        subGain.gain.setValueAtTime(0.7, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.75);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };

        // 2. Parlaq 5 notlu qızılı fanfar (G4 -> D5 -> G5 -> B5 -> D6)
        const fanfareNotes = [
          { midi: 67, start: now + 0.05, dur: 0.35, vol: 0.32 },  // G4
          { midi: 74, start: now + 0.13, dur: 0.40, vol: 0.34 },  // D5
          { midi: 79, start: now + 0.21, dur: 0.50, vol: 0.38 },  // G5
          { midi: 83, start: now + 0.29, dur: 0.65, vol: 0.42 },  // B5
          { midi: 86, start: now + 0.38, dur: 0.85, vol: 0.48 }   // D6 (Apex Zəfər akkordu)
        ];

        fanfareNotes.forEach((f) => {
          // Brass gövdəsi (Filtered sawtooth)
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(midiToFreq(f.midi), f.start);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2400, f.start);
          filter.frequency.exponentialRampToValueAtTime(1200, f.start + f.dur);

          gain.gain.setValueAtTime(0, f.start);
          gain.gain.linearRampToValueAtTime(f.vol * 0.7, f.start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0005, f.start + f.dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);

          // Parlaq qızıl zəng qatı (Sine overtone)
          const sineOsc = this.ctx.createOscillator();
          const sineGain = this.ctx.createGain();
          sineOsc.type = 'sine';
          sineOsc.frequency.setValueAtTime(midiToFreq(f.midi) * 2, f.start);

          sineGain.gain.setValueAtTime(0, f.start);
          sineGain.gain.linearRampToValueAtTime(f.vol * 0.4, f.start + 0.015);
          sineGain.gain.exponentialRampToValueAtTime(0.0005, f.start + f.dur * 0.75);

          sineOsc.connect(sineGain);
          sineGain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
            sineGain.connect(this.reverbNode);
          }

          osc.start(f.start);
          osc.stop(f.start + f.dur);
          sineOsc.start(f.start);
          sineOsc.stop(f.start + f.dur);

          osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
          sineOsc.onended = () => { sineOsc.disconnect(); sineGain.disconnect(); };
        });

        // 3. Əfsanəvi Qızılı Şimmer
        const shimmer = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(2349, now + 0.38); // D7
        shimmer.frequency.exponentialRampToValueAtTime(3520, now + totalDur); // A7

        sGain.gain.setValueAtTime(0.22, now + 0.38);
        sGain.gain.exponentialRampToValueAtTime(0.0005, now + totalDur);

        shimmer.connect(sGain);
        sGain.connect(this.sfxGain);
        if (this.reverbNode) sGain.connect(this.reverbNode);

        shimmer.start(now + 0.38);
        shimmer.stop(now + totalDur);
        shimmer.onended = () => { shimmer.disconnect(); sGain.disconnect(); };

        // 4. Parıltılı küy aurası
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(4500, now);

          nGain.gain.setValueAtTime(0.001, now);
          nGain.gain.linearRampToValueAtTime(0.25, now + 0.38);
          nGain.gain.exponentialRampToValueAtTime(0.0005, now + totalDur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(now);
          noise.stop(now + totalDur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 26. Güc Yüksəlişi (Evolution — Yuxarı Qalxan Enerji Sweepi + Zəfər Akkordu)
    _sfxEvolution(now) {
      try {
        const totalDur = 1.55;
        const climaxTime = now + 0.5;

        // 1. Yuxarı qalxan enerji sweep (Pitch sweep)
        const sweepOsc = this.ctx.createOscillator();
        const sweepGain = this.ctx.createGain();
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(140, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(880, climaxTime);

        const sweepFilter = this.ctx.createBiquadFilter();
        sweepFilter.type = 'lowpass';
        sweepFilter.frequency.setValueAtTime(300, now);
        sweepFilter.frequency.exponentialRampToValueAtTime(3200, climaxTime);

        sweepGain.gain.setValueAtTime(0.05, now);
        sweepGain.gain.linearRampToValueAtTime(0.35, climaxTime);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, climaxTime + 0.15);

        sweepOsc.connect(sweepFilter);
        sweepFilter.connect(sweepGain);
        sweepGain.connect(this.sfxGain);

        sweepOsc.start(now);
        sweepOsc.stop(climaxTime + 0.15);
        sweepOsc.onended = () => { sweepOsc.disconnect(); sweepFilter.disconnect(); sweepGain.disconnect(); };

        // Sweep küy küləyi
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const nFilter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          nFilter.type = 'bandpass';
          nFilter.Q.setValueAtTime(3.0, now);
          nFilter.frequency.setValueAtTime(350, now);
          nFilter.frequency.exponentialRampToValueAtTime(2600, climaxTime);

          nGain.gain.setValueAtTime(0.02, now);
          nGain.gain.linearRampToValueAtTime(0.3, climaxTime);
          nGain.gain.exponentialRampToValueAtTime(0.001, climaxTime + 0.1);

          noise.connect(nFilter);
          nFilter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(climaxTime + 0.1);
          noise.onended = () => { noise.disconnect(); nFilter.disconnect(); nGain.disconnect(); };
        }

        // 2. Qüdrətli Zəfər Akkordu (A-Major: A3, E4, A4, C#5, E5)
        const chordNotes = [45, 52, 57, 61, 64];
        chordNotes.forEach((midi) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(midiToFreq(midi), climaxTime);

          gain.gain.setValueAtTime(0, climaxTime);
          gain.gain.linearRampToValueAtTime(0.24, climaxTime + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + totalDur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(climaxTime);
          osc.stop(now + totalDur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });

        // 3. Kulminasiya anında dərin alt bas dalğası
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(110, climaxTime);
        sub.frequency.exponentialRampToValueAtTime(35, now + totalDur);

        subGain.gain.setValueAtTime(0.55, climaxTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + totalDur);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);

        sub.start(climaxTime);
        sub.stop(now + totalDur);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };
      } catch (_) {}
    }

    // 27. Elit Düşmən Xəbərdarlığı (Elite Spawn — Təhlükəli Dərin Xəbərdarlıq Hornu və Gurultu)
    _sfxEliteSpawn(now) {
      try {
        const dur = 1.35;

        // 1. Qaranlıq Döyüş Hornu (Detuned Sawtooth War Horn: Bb1, F2, Bb2)
        const hornFreqs = [58.27, 87.31, 116.54];
        hornFreqs.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          const detuneFactor = 1 + (idx - 1) * 0.015;
          osc.frequency.setValueAtTime(freq * detuneFactor, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.94 * detuneFactor, now + dur);

          filter.type = 'bandpass';
          filter.Q.setValueAtTime(2.2, now);
          filter.frequency.setValueAtTime(320 + idx * 80, now);
          filter.frequency.exponentialRampToValueAtTime(180, now + dur);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.38, now + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
        });

        // 2. Seysmik gurultu və sub-bass
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(65, now);
        sub.frequency.exponentialRampToValueAtTime(28, now + dur);

        subGain.gain.setValueAtTime(0.65, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + dur);
        sub.onended = () => { sub.disconnect(); subGain.disconnect(); };

        // 3. Dərin qaranlıq küy gurultusu
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, now);
          filter.frequency.exponentialRampToValueAtTime(70, now + dur);

          nGain.gain.setValueAtTime(0.45, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          if (this.reverbNode) {
            nGain.connect(this.reverbNode);
          }

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }
      } catch (_) {}
    }

    // 28. İstedad Açılması (Talent Unlock — Yumşaq Qədim Zəng + Yüksələn Ton)
    _sfxTalentUnlock(now) {
      try {
        const dur = 0.95;

        // 1. Qədim məbəd zənginin harmonikləri
        const bellHarmonics = [
          { freq: 523.25, gain: 0.28 },  // C5 fundamental
          { freq: 1046.5, gain: 0.16 },  // 2x
          { freq: 1444.0, gain: 0.12 },  // 2.76x
          { freq: 2825.0, gain: 0.08 }   // 5.4x
        ];

        bellHarmonics.forEach((h) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(h.freq, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(h.gain, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });

        // 2. Yumşaq yüksələn mistik ton
        const riseOsc = this.ctx.createOscillator();
        const riseGain = this.ctx.createGain();
        riseOsc.type = 'sine';
        riseOsc.frequency.setValueAtTime(523.25, now + 0.06);
        riseOsc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.55);

        riseGain.gain.setValueAtTime(0, now + 0.06);
        riseGain.gain.linearRampToValueAtTime(0.22, now + 0.25);
        riseGain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

        riseOsc.connect(riseGain);
        riseGain.connect(this.sfxGain);

        if (this.reverbNode) {
          riseGain.connect(this.reverbNode);
        }

        riseOsc.start(now + 0.06);
        riseOsc.stop(now + dur);
        riseOsc.onended = () => { riseOsc.disconnect(); riseGain.disconnect(); };
      } catch (_) {}
    }

    // 29. Gündəlik Tapşırıq Tamamlanması (Daily Complete — Şən Qısa Qələbə Jingle)
    _sfxDailyComplete(now) {
      try {
        const jingle = [
          { midi: 72, start: now, dur: 0.10, vol: 0.30 },         // C5
          { midi: 76, start: now + 0.08, dur: 0.10, vol: 0.32 },  // E5
          { midi: 79, start: now + 0.16, dur: 0.12, vol: 0.34 },  // G5
          { midi: 84, start: now + 0.26, dur: 0.36, vol: 0.40 }   // C6
        ];

        jingle.forEach((item) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(midiToFreq(item.midi), item.start);

          gain.gain.setValueAtTime(0, item.start);
          gain.gain.linearRampToValueAtTime(item.vol, item.start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0005, item.start + item.dur);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          if (this.reverbNode) {
            gain.connect(this.reverbNode);
          }

          osc.start(item.start);
          osc.stop(item.start + item.dur);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });

        // Final notu üçün şən üçüncü pillə harmoniyası (E6)
        const harm = this.ctx.createOscillator();
        const hGain = this.ctx.createGain();
        harm.type = 'sine';
        harm.frequency.setValueAtTime(midiToFreq(88), now + 0.26); // E6
        hGain.gain.setValueAtTime(0, now + 0.26);
        hGain.gain.linearRampToValueAtTime(0.22, now + 0.28);
        hGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.62);

        harm.connect(hGain);
        hGain.connect(this.sfxGain);
        if (this.reverbNode) hGain.connect(this.reverbNode);

        harm.start(now + 0.26);
        harm.stop(now + 0.62);
        harm.onended = () => { harm.disconnect(); hGain.disconnect(); };
      } catch (_) {}
    }

    // 30. Ruh Toplanması (Soul Gain — İncə Efir "Whoosh" + Yüksək Ton, Throttle ilə)
    _sfxSoulGain(now) {
      try {
        const dur = 0.20;

        // 1. İncə efir whoosh (Zərif nəfəs / hava sorma küyü)
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const nGain = this.ctx.createGain();

          noise.buffer = this.noiseBuffer;
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(3.5, now);
          filter.frequency.setValueAtTime(1400, now);
          filter.frequency.exponentialRampToValueAtTime(3800, now + dur);

          nGain.gain.setValueAtTime(0.001, now);
          nGain.gain.linearRampToValueAtTime(0.20, now + 0.05);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); nGain.disconnect(); };
        }

        // 2. Yüksək efir tonu (High resonant sine chime)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, now);
        osc.frequency.exponentialRampToValueAtTime(1880, now + dur);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        if (this.reverbNode) {
          gain.connect(this.reverbNode);
        }

        osc.start(now);
        osc.stop(now + dur);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (_) {}
    }
  }

  // Tək nüsxə qlobal audio obyekti (Singleton)
  window.GameAudio = new ProceduralAudioEngine();
})();
