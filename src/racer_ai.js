/**
 * ============================================================================
 * NEON VELOCITY: Synthwave OutRun Drift & Police Pursuit
 * Fayl: src/racer_ai.js
 * Qlobal Obyekt: window.NeonPursuitAI
 * Məsul Agent: 1-ci Agent — AI Mütəxəssisi (AI Specialist)
 * Təsvir: Heat 1–5 Polis Təqibi, Ağıllı PIT Manevrləri, Helikopter Fənəri,
 *         SWAT Rhino Zərbə Maşınları, Tikanlı Zolaqlar və Burnout Takedown Rejissoru
 * ============================================================================
 */

(function (root) {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Riyazi və Köməkçi Funksiyalar
  // --------------------------------------------------------------------------
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const randRange = (min, max) => Math.random() * (max - min) + min;
  const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // --------------------------------------------------------------------------
  // UNITS (single source of truth)
  //   * Z positions (player.z, cop.z, spike.z ...) are WORLD UNITS. racer.html advances
  //     playerZ by speedMs * dt * 18, so 1 metre = 18 world units.
  //   * Every distance tunable in this file is written in METRES and converted with M().
  //   * Speeds are km/h. A km/h value moves an entity (v / 3.6 m/s) * 18 = v * 5 units/s.
  //   * X positions are normalised road coordinates, -1..+1 (edge to edge).
  //     options.roadHalfWidthM (default 16 = racer.html ROAD_WIDTH / 2) converts X to metres.
  // --------------------------------------------------------------------------
  const UNITS_PER_METER = 18;
  const KMH_TO_UNITS = UNITS_PER_METER / 3.6; // = 5
  const M = (metres) => metres * UNITS_PER_METER;

  let _idSeq = 0;
  const getUniqueId = (prefix = 'ai') => `${prefix}_${++_idSeq}`;

  // --------------------------------------------------------------------------
  // 2. Heat Səviyyələri və Vahid Arxitip Konfiqurasiyaları
  // --------------------------------------------------------------------------
  const HEAT_CONFIG = {
    0: {
      level: 0,
      name: 'CLEAR',
      color: '#00ff66',
      tagline: 'Pursuit evaded. Dispatch is searching.',
      maxPolice: 0,
      spawnInterval: 999,
      allowedTypes: [],
      aggression: 0,
      evasionReward: 0,
      strobeSpeed: 6.0
    },
    1: {
      level: 1,
      name: 'LOCAL PATROL',
      color: '#00f5ff',
      tagline: 'Metro Patrol Cruisers dispatched',
      maxPolice: 1,
      spawnInterval: 6.0, // saniyə
      allowedTypes: ['patrol_cruiser'],
      aggression: 0.35,
      evasionReward: 500,
      strobeSpeed: 8.0 // Hz
    },
    2: {
      level: 2,
      name: 'STATE PURSUIT',
      color: '#ffe600',
      tagline: 'High-speed Highway Interceptors flanking with PIT tactics',
      maxPolice: 2,
      spawnInterval: 5.0,
      allowedTypes: ['patrol_cruiser', 'highway_interceptor'],
      aggression: 0.65,
      evasionReward: 1200,
      strobeSpeed: 10.0
    },
    3: {
      level: 3,
      name: 'ROADBLOCK TACTICS',
      color: '#ff7700',
      tagline: 'Tactical Roadblocks and Spike Strips deployed ahead',
      maxPolice: 3,
      spawnInterval: 4.5,
      allowedTypes: ['patrol_cruiser', 'highway_interceptor', 'roadblock'],
      aggression: 0.80,
      evasionReward: 2500,
      strobeSpeed: 12.0
    },
    4: {
      level: 4,
      name: 'AIR MOBILIZATION',
      color: '#ff0055',
      tagline: 'Police Helicopter air support & spotlight surveillance',
      maxPolice: 4,
      spawnInterval: 3.8,
      allowedTypes: ['highway_interceptor', 'chopper', 'roadblock'],
      aggression: 0.95,
      evasionReward: 5000,
      strobeSpeed: 14.0
    },
    5: {
      level: 5,
      name: 'MAXIMUM ESCALATION',
      color: '#ff0033',
      tagline: 'SWAT Rhino APCs, Attack Chopper & all-out pursuit forces',
      maxPolice: 5,
      spawnInterval: 3.0,
      allowedTypes: ['highway_interceptor', 'chopper', 'swat_rhino', 'roadblock'],
      aggression: 1.25,
      evasionReward: 12000,
      strobeSpeed: 16.0
    }
  };

  const ARCHETYPES = {
    // Heat 1: Yerli Patrul Kreyseri (Ford Crown Vic tərzi)
    patrol_cruiser: {
      type: 'patrol_cruiser',
      name: 'Crown Patrol Cruiser',
      width: 0.32,       // Normalizə olunmuş yol eni (X: -1.0 .. +1.0)
      length: 14.0,      // Metrlə Z uzunluğu
      mass: 1.2,         // Kinetik kütlə
      baseSpeedMult: 1.05, // Oyunçunun sürətindən 5-15% çox
      maxSpeed: 270,     // km/h
      handling: 1.8,     // Zolaq dəyişmə elastikliyi
      hitboxW: 0.28,
      hitboxL: 12.0,
      health: 100,
      takedownValue: 800,
      color: '#1a1d2e',  // Qara/Ağ polis gövdəsi
      accent: '#ffffff',
      hasLightbar: true,
      role: 'boxer',     // Arxadan yaxınlaşır, sıxışdırır
      contactHalfW: 1.1,
      contactHalfL: 2.3
    },

    // Heat 2: Şosse Müdaxilə Avtomobili (Corvette tərzi sürətli interseptor)
    highway_interceptor: {
      type: 'highway_interceptor',
      name: 'Corvette Interceptor',
      width: 0.34,
      length: 13.0,
      mass: 1.4,
      baseSpeedMult: 1.25,
      maxSpeed: 330,
      handling: 2.8,
      hitboxW: 0.30,
      hitboxL: 11.5,
      health: 140,
      takedownValue: 1500,
      color: '#0d0d14',
      accent: '#00f5ff',
      hasLightbar: true,
      role: 'pit_flanker', // Yan cinahdan PIT manevri edir
      contactHalfW: 1.1,
      contactHalfL: 2.3
    },

    // Heat 5: Ağır Zirehli SWAT Rhino APC (Əks istiqamətdən gələn zərbə tankı)
    swat_rhino: {
      type: 'swat_rhino',
      name: 'SWAT Rhino APC',
      width: 0.44,
      length: 22.0,
      mass: 8.5,         // Nəhəng kütlə — birbaşa toqquşmada oyunçunu məhv edir
      baseSpeedMult: -0.75, // Əks istiqamətdən (oncoming traffic) sürətlə gəlir
      maxSpeed: 210,
      handling: 0.6,
      hitboxW: 0.40,
      hitboxL: 19.0,
      health: 600,
      takedownValue: 3500,
      color: '#101216',
      accent: '#ff0033',
      hasLightbar: true,
      role: 'head_on_ram', // Ön-önə ramming
      contactHalfW: 1.6,
      contactHalfL: 3.1
    },

    // Mülki Trafik Tipləri (Dinc yol axını)
    civilian_sedan: {
      type: 'civilian_sedan',
      name: 'Cyber Sedan',
      width: 0.28,
      length: 12.0,
      mass: 1.0,
      baseSpeed: 140,    // km/h sabit kruiz
      handling: 0.8,
      hitboxW: 0.25,
      hitboxL: 10.0,
      health: 50,
      color: '#ffaa00',
      isCivilian: true
    },
    civilian_sports: {
      type: 'civilian_sports',
      name: 'Neon Coupé',
      width: 0.29,
      length: 11.5,
      mass: 0.95,
      baseSpeed: 190,
      handling: 1.4,
      hitboxW: 0.26,
      hitboxL: 10.0,
      health: 50,
      color: '#bf00ff',
      isCivilian: true
    },
    civilian_truck: {
      type: 'civilian_truck',
      name: 'Cargo Hauler',
      width: 0.42,
      length: 26.0,
      mass: 4.5,
      baseSpeed: 110,
      handling: 0.4,
      hitboxW: 0.38,
      hitboxL: 24.0,
      health: 200,
      color: '#00cc88',
      isCivilian: true
    }
  };

  // --------------------------------------------------------------------------
  // 3. Əsas AI Direktoru və Təqib Meneceri
  // --------------------------------------------------------------------------
  class NeonPursuitAI {
    constructor(options = {}) {
      this.options = Object.assign({
        trackLength: 400000,   // Metr
        roadWidth: 2000,       // Daxili dünya koordinat vahidi
        maxTrafficCount: 16,
        roadHalfWidthM: 16,              // racer.html ROAD_WIDTH / 2 (x=1 -> 16 m)
        // All distances below are METRES (converted with M()).
        policeSpawnDistanceBehind: 150,  // spec: heat 1 cruiser follows 150 m behind
        policeSpawnDistanceAhead: 260,   // roadblocks appear this far ahead (visible warning)
        rhinoSpawnDistanceAhead: 320,
        roadblockInterval: 2200,         // one roadblock every 2.2 km (heat 3+)
        escapeRadius: 300,               // no live cop within this => escaping
        escapeTime: 7.0,                 // seconds out of range to drop one heat level
        cullBehind: 450,                 // cops removed this far behind (fade starts at fadeStart)
        fadeStart: 350,
        cullAhead: 700,
        hitStopDuration: 0.080,          // 80ms hit-stop
        bustedSpeedKmh: 25,              // busted: below this speed...
        bustedContactRadius: 9,          // ...with a cop within this many metres (along road)
        bustedTime: 3.0,                 // ...for this many seconds
        bustedMinHeat: 2,
        takedownRelSpeedKmh: 45,         // closing speed that makes a plain rear ram a takedown
        driftRamBonus: 500,
        wallPinBonus: 400,
        nearMissReward: 200,             // spec: +$200 for brushing traffic above 200 km/h
        spikeEvasionReward: 500,
        trafficEnabled: true,            // set false until racer.html renders traffic
        // Callbacks (any may also be assigned as a property after construction):
        onTakedown: null,
        onSpikeBlowout: null,
        onSpikeEvasion: null,
        onHeatChange: null,
        onSpotlightLock: null,
        onPursuitEvaded: null,
        onScreenShake: null,
        onAudioEvent: null,
        onAlert: null,
        onCredits: null,
        onBusted: null
      }, options);

      this.reset();
    }

    /**
     * Vəziyyətin tam sıfırlanması
     */
    reset() {
      // Heat Vəziyyəti
      this.heatLevel = 1;
      this.heatProgress = 0.0; // 0.0 -> 1.0 (Növbəti heat-ə keçid)
      this.heatPercent = 0;    // heatProgress * 100, updated every frame (HUD meter)
      this.peakHeat = 1;
      this.busted = false;
      this.bustedTimer = 0;
      this.bustedProgress = 0; // 0..1, HUD can show an arrest meter
      this.sessionCredits = 0; // everything paid through onCredits
      this.lastPlayerSpeed = 0;
      this.pursuitActive = true;
      this.escapeCooldown = 0.0;
      this.totalTakedowns = 0;
      this.totalCreditsEarned = 0;
      this.bustWarned = false;

      // Vaxt və Zaman Qrafiki
      this.time = 0.0;
      this.lastSpawnTime = -10.0;
      this.lastRoadblockZ = 0; // z of the previous roadblock; first one after roadblockInterval
      this.lastTrafficSpawn = -10;

      // Hit-stop freeze-frame taymeri (Burnout 80ms)
      this.hitStopTimer = 0.0;

      // Aktiv Obyektlər
      this.policeUnits = [];
      this.trafficUnits = [];
      this.roadblocks = [];
      this.spikeStrips = [];
      this.particles = [];
      this.debris = [];
      this.activeAlerts = []; // Ekranda görünən dinamik bildirişlər

      // Helikopter (Heat 4 & 5 üçün tək xüsusi hava vahidi)
      this.chopper = {
        active: false,
        x: 0.0,
        z: 0.0,
        y: 280.0,           // Hündürlük
        targetX: 0.0,
        targetZ: 0.0,
        rotorAngle: 0.0,
        spotlight: {
          x: 0.0,
          z: 0.0,
          radiusX: 0.45,
          radiusZ: 28.0,
          isLocked: false,
          lockTimer: 0.0,
          flicker: 1.0
        },
        dropSpikeTimer: 0.0
      };

      // Təkər partlayışı (Spike Blowout) cərimə taymeri
      this.blowoutRemaining = 0.0;
      this.spikesPassedIds = new Set();
    }

    // ========================================================================
    // 4. MAIN UPDATE LOOP
    // ========================================================================
    /**
     * Call once per frame.
     * @param {number} dt seconds
     * @param {Object} player  (units: see UNITS block at the top of the file)
     *   x            normalised road X, -1..+1
     *   z            world units (racer.html playerZ, 18 units per metre)
     *   speed        km/h
     *   isDrifting   bool
     *   driftAngle   slip angle in RADIANS (signed or not)
     *   isNitro      bool (alias nitroActive accepted)
     *   isInvulnerable / phaseShift  bool, spikes harmless
     * @returns {Object} frame status:
     *   hitStopActive, blowoutActive, blowoutSpeedCap (km/h|null), cameraShake,
     *   alerts (live array), takedownOccurred, spikeEvasionOccurred,
     *   heatLevel, heatPercent, busted, bustedProgress,
     *   playerSpeedScale (1 = no crash this frame; multiply player speed by it),
     *   playerLateralPush (normalised x impulse to apply to the player, usually 0)
     */
    update(dt, player) {
      if (!player) return { hitStopActive: false, blowoutActive: false };
      dt = clamp(dt, 0, 0.1);

      if (this.busted) {
        this._updateParticles(dt);
        this._updateAlerts(dt);
        return this._frame({ busted: true }, 0, false, false, 1, 0);
      }

      this.lastPlayerSpeed = player.speed || 0;

      // Hit-stop (80 ms): world frozen, only particles and alerts animate
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt;
        if (this.hitStopTimer <= 0) this.hitStopTimer = 0;
        this._updateParticlesOnly(dt);
        this._updateAlerts(dt);
        return this._frame({ hitStopActive: true }, 0, false, false, 1, 0);
      }

      this.time += dt;

      let blowoutSpeedCap = null;
      if (this.blowoutRemaining > 0) {
        this.blowoutRemaining -= dt;
        blowoutSpeedCap = 80;
        this._emitRimSparks(player.x, player.z);
        if (this.blowoutRemaining <= 0) {
          this.blowoutRemaining = 0;
          blowoutSpeedCap = null;
          this._addAlert('TIRES REPAIRED', '#00f5ff', 1.8, 'info');
        }
      }

      this._updateHeatSystem(dt, player);
      this._updateDirectorSpawns(dt, player);
      this._updateChopperAI(dt, player);
      this._updatePoliceVehicles(dt, player);
      this._updateTrafficVehicles(dt, player);

      const col = this._resolveCollisions(dt, player);

      this._updateBusted(dt, player);
      this._updateParticles(dt);
      this._updateAlerts(dt);
      this._cullOffscreenEntities(player.z);

      return this._frame({ blowoutSpeedCap }, col.screenShake, col.takedownOccurred,
        col.spikeEvasionOccurred, col.speedScale, col.lateralPush);
    }

    _frame(extra, shake, takedown, spikeEv, speedScale, lateralPush) {
      return Object.assign({
        hitStopActive: false,
        blowoutActive: this.blowoutRemaining > 0,
        blowoutSpeedCap: null,
        cameraShake: shake,
        alerts: this.activeAlerts,
        takedownOccurred: takedown,
        spikeEvasionOccurred: spikeEv,
        heatLevel: this.heatLevel,
        heatPercent: this.heatPercent,
        busted: this.busted,
        bustedProgress: this.bustedProgress,
        playerSpeedScale: speedScale,
        playerLateralPush: lateralPush
      }, extra);
    }

    // ========================================================================
    // 5. HEAT SYSTEM (escalation, de-escalation, evasion)
    // ========================================================================
    _setHeat(level, direction) {
      const prev = this.heatLevel;
      this.heatLevel = clamp(level, 0, 5);
      if (this.heatLevel === prev) return;
      this.peakHeat = Math.max(this.peakHeat, this.heatLevel);
      const cfg = HEAT_CONFIG[this.heatLevel];
      if (direction === 'up') {
        this._addAlert(`HEAT LEVEL ${this.heatLevel}: ${cfg.name}!`, cfg.color, 3.5, 'heat_up');
        this._audio('heat_escalation', { heatLevel: this.heatLevel, previous: prev });
        this._dispatch('onScreenShake', { intensity: 14, duration: 0.5 });
      } else {
        this._audio('heat_deescalation', { heatLevel: this.heatLevel, previous: prev });
      }
      this._dispatch('onHeatChange', this.heatLevel, cfg.name,
        { direction, previous: prev, config: cfg, color: cfg.color, tagline: cfg.tagline });
    }

    _updateHeatSystem(dt, player) {
      const speedKmH = player.speed || 0;
      const cfgNow = HEAT_CONFIG[this.heatLevel];
      const rawDrift = player.driftAngle;
      const driftMag = Math.abs(rawDrift === undefined || rawDrift === null ? 0.5 : rawDrift);

      let gain = 0.012;
      if (speedKmH > 240) gain += ((speedKmH - 240) / 100) * 0.04;
      if (player.isDrifting) gain += 0.05 * driftMag;
      if (this.chopper.active && this.chopper.spotlight.isLocked) gain += 0.08;

      const radiusU = M(this.options.escapeRadius);
      let nearbyPolice = false;
      for (let i = 0; i < this.policeUnits.length; i++) {
        const p = this.policeUnits[i];
        if (p.isWrecked || p.role === 'blockade') continue;
        if (Math.abs(p.z - player.z) < radiusU) { nearbyPolice = true; break; }
      }

      if (this.heatLevel === 0) {
        // Clear: no pursuit. Dispatch re-engages once the player has been loud for a while.
        this.escapeCooldown = 0;
        this.heatProgress += (gain + 0.03) * dt;
        if (this.heatProgress >= 1.0) {
          this.heatProgress = 0.0;
          this._setHeat(1, 'up');
          this.lastSpawnTime = -10; // first cruiser immediately, behind the player
        }
      } else if (nearbyPolice) {
        this.escapeCooldown = 0.0;
        this.heatProgress += gain * dt;
      } else {
        this.escapeCooldown += dt;
        this.heatProgress = Math.max(0, this.heatProgress - 0.06 * dt); // meter visibly drains
        if (this.escapeCooldown >= this.options.escapeTime) {
          const prev = this.heatLevel;
          const reward = cfgNow.evasionReward;
          this.escapeCooldown = 0.0;
          this._setHeat(prev - 1, 'down');
          this.heatProgress = this.heatLevel > 0 ? 0.5 : 0.0;
          if (this.heatLevel === 0) {
            this._pay(reward, 'pursuit_evaded', `PURSUIT EVADED! +$${reward}`, '#00ff66', 3.5, 'evaded');
            this._audio('pursuit_evaded', { reward, previousHeat: prev });
            this._dispatch('onPursuitEvaded', reward, { previousHeat: prev, reward });
          } else {
            this._pay(reward, 'heat_cleared', `HEAT ${prev} SHAKEN! +$${reward}`, '#00ff66', 3.0, 'evaded');
          }
        }
      }

      if (this.heatProgress >= 1.0 && this.heatLevel >= 1) {
        if (this.heatLevel < 5) {
          this.heatProgress = 0.0;
          this._setHeat(this.heatLevel + 1, 'up');
        } else {
          this.heatProgress = 1.0;
        }
      }
      this.heatPercent = clamp(this.heatProgress, 0, 1) * 100;
    }

    // ========================================================================
    // 6. DIRECTOR (spawns)
    // ========================================================================
    _updateDirectorSpawns(dt, player) {
      const cfg = HEAT_CONFIG[this.heatLevel];
      const opt = this.options;

      if (this.heatLevel >= 1) {
        let active = 0;
        for (let i = 0; i < this.policeUnits.length; i++) {
          const u = this.policeUnits[i];
          if (!u.isWrecked && u.role !== 'blockade' && u.type !== 'swat_rhino') active++;
        }
        if (active < cfg.maxPolice && (this.time - this.lastSpawnTime) > cfg.spawnInterval) {
          this._spawnPoliceUnit(player, cfg);
          this.lastSpawnTime = this.time;
        }
      }

      if (this.heatLevel >= 3 && (player.z - this.lastRoadblockZ) > M(opt.roadblockInterval)) {
        this._spawnRoadblockWithSpikes(player.z + M(opt.policeSpawnDistanceAhead));
        this.lastRoadblockZ = player.z;
      }

      if (this.heatLevel >= 5 && Math.random() < 0.4 * dt &&
          !this.policeUnits.some(p => p.type === 'swat_rhino' && !p.isWrecked)) {
        this._spawnSwatRhino(player);
      }

      if (this.heatLevel >= 4 && !this.chopper.active) {
        this._activateChopper(player);
      } else if (this.heatLevel < 4 && this.chopper.active) {
        this.chopper.active = false;
        this.chopper.spotlight.isLocked = false;
      }

      if (opt.trafficEnabled && this.trafficUnits.length < opt.maxTrafficCount &&
          (this.time - this.lastTrafficSpawn) > 0.25) {
        this._spawnCivilianTraffic(player);
        this.lastTrafficSpawn = this.time;
      }
    }

    _makeCop(arch, extra) {
      return Object.assign({
        type: arch.type,
        name: arch.name,
        y: 0,
        vx: 0,
        width: arch.width,
        length: arch.length,
        mass: arch.mass,
        maxSpeed: arch.maxSpeed,
        handling: arch.handling,
        health: arch.health,
        maxHealth: arch.health,
        isWrecked: false,
        wreckAngle: 0,
        wreckSpinSpeed: 0,
        wreckSlideVx: 0,
        wreckSmokeTimer: 0,
        wreckAge: 0,
        role: arch.role,
        strobeTimer: 0,
        strobeState: false,
        hitboxW: arch.hitboxW,
        hitboxL: arch.hitboxL,
        contactHalfW: arch.contactHalfW,   // metres, used by the contact resolver
        contactHalfL: arch.contactHalfL,
        takedownValue: arch.takedownValue,
        bounty: arch.takedownValue,
        color: arch.color,
        accent: arch.accent,
        fade: 1,                           // 0..1 opacity for the renderer (despawn without a pop)
        telegraph: 0,                      // 0..1, >0 while a visible attack windup is running
        stateTimer: 0,
        attackCooldown: 1.0,
        disengage: 0,
        contactTime: 0,
        hitCooldown: 0,
        speed: 0                           // km/h, mirrored from vz for audio
      }, extra);
    }

    _spawnPoliceUnit(player, cfg) {
      const chosenType = (this.heatLevel >= 2 && Math.random() < 0.6) ? 'highway_interceptor' : 'patrol_cruiser';
      const arch = ARCHETYPES[chosenType];
      if (!arch) return;

      const spawnZ = player.z - M(this.options.policeSpawnDistanceBehind + randRange(0, 30));
      const spawnX = (Math.random() > 0.5 ? 1 : -1) * randRange(0.2, 0.7);
      const vz = Math.max(120, (player.speed || 0) * 1.1);

      const police = this._makeCop(arch, {
        id: getUniqueId('cop'),
        x: spawnX,
        z: spawnZ,
        vz,
        speed: vz,
        targetX: player.x,
        state: 'pursuing',
        pitTimer: 0,
        flankSide: (Math.random() > 0.5 ? 1 : -1)
      });
      this.policeUnits.push(police);
      this._audio('siren_spawn', { type: police.type, id: police.id, behind: true });
    }

    _spawnSwatRhino(player) {
      const arch = ARCHETYPES.swat_rhino;
      const spawnZ = player.z + M(this.options.rhinoSpawnDistanceAhead);
      const targetLane = clamp(player.x + (Math.random() * 0.4 - 0.2), -0.7, 0.7);
      const rhino = this._makeCop(arch, {
        id: getUniqueId('rhino'),
        x: targetLane,
        z: spawnZ,
        vz: -arch.maxSpeed,
        speed: arch.maxSpeed,
        targetX: targetLane,
        state: 'charging_head_on',
        telegraph: 1 // visible from spawn: it is hundreds of metres away, horn + alert fire
      });
      this.policeUnits.push(rhino);
      this._addAlert('WARNING: SWAT RHINO CHARGING ONCOMING!', '#ff0033', 3.0, 'warning');
      this._audio('rhino_horn', { id: rhino.id });
      this._dispatch('onScreenShake', { intensity: 10, duration: 0.4 });
    }

    _spawnRoadblockWithSpikes(roadZ) {
      const gapIndex = Math.floor(Math.random() * 3);
      const lanes = [-0.62, 0.0, 0.62];
      const roadblockId = getUniqueId('blockade');

      lanes.forEach((laneX, idx) => {
        if (idx === gapIndex) {
          if (this.heatLevel >= 4 && Math.random() < 0.4) this._deploySpikeStrip(laneX, roadZ, 0.35);
          return;
        }
        if (Math.random() < 0.65) {
          const arch = ARCHETYPES.patrol_cruiser;
          this.policeUnits.push(this._makeCop(arch, {
            id: getUniqueId('roadblock_car'),
            type: 'roadblock_car',
            name: 'Roadblock Cruiser',
            x: laneX,
            z: roadZ + randRange(-M(1.5), M(1.5)),
            vz: 0,
            targetX: laneX,
            mass: arch.mass * 2.0,
            maxSpeed: 0,
            handling: 0,
            health: 220,
            maxHealth: 220,
            wreckAngle: Math.PI / 3,
            role: 'blockade',
            state: 'stationary',
            strobeState: true,
            hitboxW: 0.42,
            hitboxL: 12.0,
            contactHalfW: 2.3,
            contactHalfL: 1.1,
            takedownValue: 0,
            bounty: 0,
            color: '#1a1d2e',
            accent: '#ff0033'
          }));
        } else {
          this._deploySpikeStrip(laneX, roadZ, 0.50);
        }
      });

      this.roadblocks.push({ id: roadblockId, z: roadZ, gapX: lanes[gapIndex], evaded: false });
      this._addAlert('ROADBLOCK AHEAD! FIND THE GAP!', '#ffe600', 2.8, 'warning');
      this._audio('roadblock_alert', { gapX: lanes[gapIndex] });
    }

    _deploySpikeStrip(x, z, width = 0.45) {
      this.spikeStrips.push({
        id: getUniqueId('spike'),
        x, z, width,
        length: M(4.5),     // world units (4.5 m deep)
        hitboxW: width,
        hitboxL: M(4.0),
        triggered: false,
        deployedFromAir: false
      });
    }

    _spawnCivilianTraffic(player) {
      const typeKey = randChoice(['civilian_sedan', 'civilian_sports', 'civilian_truck']);
      const arch = ARCHETYPES[typeKey];
      const isAhead = Math.random() < 0.85;
      const spawnZ = isAhead
        ? player.z + M(randRange(150, 420))
        : player.z - M(randRange(60, 120));
      const lanePositions = [-0.68, -0.34, 0.0, 0.34, 0.68];
      const spawnX = randChoice(lanePositions);

      for (let i = 0; i < this.trafficUnits.length; i++) { // do not stack spawns
        const t = this.trafficUnits[i];
        if (Math.abs(t.x - spawnX) < 0.2 && Math.abs(t.z - spawnZ) < M(40)) return;
      }

      this.trafficUnits.push({
        id: getUniqueId('civ'),
        type: arch.type,
        name: arch.name,
        x: spawnX,
        z: spawnZ,
        y: 0,
        vx: 0,
        vz: arch.baseSpeed * (isAhead ? randRange(0.85, 1.1) : 1.0),
        targetX: spawnX,
        targetLane: spawnX,
        width: arch.width,
        length: arch.length,
        mass: arch.mass,
        maxSpeed: arch.baseSpeed,
        handling: arch.handling,
        health: arch.health,
        maxHealth: arch.health,
        isWrecked: false,
        wreckAngle: 0,
        wreckSpinSpeed: 0,
        wreckSlideVx: 0,
        laneChangeTimer: randRange(3.0, 8.0),
        color: arch.color,
        hitboxW: arch.hitboxW,
        hitboxL: arch.hitboxL,
        contactHalfW: arch.type === 'civilian_truck' ? 1.3 : 1.0,
        contactHalfL: arch.type === 'civilian_truck' ? 5.5 : 2.3,
        isCivilian: true
      });
    }

    // ========================================================================
    // 7. CHOPPER (heat 4+)
    // ========================================================================
    _activateChopper(player) {
      const c = this.chopper;
      c.active = true;
      c.x = player.x;
      c.z = player.z - M(3);
      c.y = 280.0;
      c.spotlight.x = player.x;
      c.spotlight.z = player.z;
      c.spotlight.radiusZ = M(30);
      c.spotlight.isLocked = false;
      c.spotlight.lockTimer = 0.0;
      c.dropSpikeTimer = 6.0;
      this._addAlert('POLICE AIR CHOPPER DEPLOYED!', '#ff007f', 3.2, 'warning');
      this._audio('chopper_enter', {});
    }

    _updateChopperAI(dt, player) {
      if (!this.chopper.active) return;
      const chop = this.chopper;
      const vUnits = (player.speed || 0) * KMH_TO_UNITS;
      chop.rotorAngle = (chop.rotorAngle + dt * 45.0) % (Math.PI * 2);

      const idealZ = player.z + M(30) + vUnits / 2.2; // lead cancels follow lag
      const idealX = player.x * 0.7;
      chop.x = lerp(chop.x, idealX, dt * 1.8);
      chop.z = lerp(chop.z, idealZ, dt * 2.2);

      const spot = chop.spotlight;
      spot.x = lerp(spot.x, player.x, dt * 3.5);
      spot.z = lerp(spot.z, player.z + vUnits * 0.25, dt * 4.0);
      spot.flicker = 0.95 + Math.sin(this.time * 24.0) * 0.05;

      const inside = Math.abs(spot.x - player.x) < spot.radiusX && Math.abs(spot.z - player.z) < spot.radiusZ;
      if (inside) {
        spot.lockTimer += dt;
        if (spot.lockTimer >= 1.2 && !spot.isLocked) {
          spot.isLocked = true;
          this._addAlert('CHOPPER LOCKED ON! EVADE!', '#ff0033', 2.0, 'warning');
          this._dispatch('onSpotlightLock', { locked: true });
          this._audio('spotlight_lock', {});
        }
      } else {
        spot.lockTimer = Math.max(0, spot.lockTimer - dt * 2.0);
        if (spot.lockTimer === 0 && spot.isLocked) {
          spot.isLocked = false;
          this._dispatch('onSpotlightLock', { locked: false });
        }
      }

      chop.dropSpikeTimer -= dt;
      if (chop.dropSpikeTimer <= 0) {
        chop.dropSpikeTimer = randRange(8.0, 14.0);
        const dropZ = player.z + M(randRange(150, 250));
        const dropX = clamp(player.x + randRange(-0.3, 0.3), -0.7, 0.7);
        this._deploySpikeStrip(dropX, dropZ, 0.55);
        this._addAlert('AIR DROP SPIKES INCOMING!', '#ff007f', 2.5, 'warning');
        this._audio('spike_drop', {});
      }
    }

    // ========================================================================
    // 8. POLICE VEHICLE AI
    // ========================================================================
    _updatePoliceVehicles(dt, player) {
      const cfg = HEAT_CONFIG[this.heatLevel] || HEAT_CONFIG[1];
      const wreckDecay = Math.pow(0.96, dt * 60);
      const slideDecay = Math.pow(0.95, dt * 60);

      for (let i = 0; i < this.policeUnits.length; i++) {
        const cop = this.policeUnits[i];

        cop.strobeTimer = (cop.strobeTimer || 0) + dt * cfg.strobeSpeed;
        if (cop.strobeTimer >= 1.0) { cop.strobeTimer = 0; cop.strobeState = !cop.strobeState; }
        if (cop.hitCooldown > 0) cop.hitCooldown -= dt;

        if (cop.isWrecked) {
          cop.wreckAge += dt;
          cop.z += cop.vz * KMH_TO_UNITS * dt;
          cop.x = clamp(cop.x + cop.wreckSlideVx * dt, -1.1, 1.1);
          cop.wreckAngle += cop.wreckSpinSpeed * dt;
          cop.vz *= wreckDecay;
          cop.wreckSlideVx *= slideDecay;
          cop.speed = Math.abs(cop.vz);
          cop.telegraph = 0;
          cop.fade = clamp(1 - (cop.wreckAge - 5.0) / 2.0, 0, 1); // fades out 5..7 s after the wreck
          cop.wreckSmokeTimer -= dt;
          if (cop.wreckSmokeTimer <= 0) {
            cop.wreckSmokeTimer = 0.04;
            this._emitWreckSmoke(cop.x, cop.z);
          }
          continue;
        }

        if (cop.role === 'blockade') continue;

        if (cop.role === 'head_on_ram') {
          cop.z += cop.vz * KMH_TO_UNITS * dt;
          const dX = player.x - cop.x;
          cop.x += Math.sign(dX) * Math.min(Math.abs(dX), cop.handling * 0.4 * dt);
          cop.speed = Math.abs(cop.vz);
          continue;
        }

        if (cop.disengage > 0) {
          this._updateDisengage(cop, player, dt);
        } else if (cop.type === 'patrol_cruiser') {
          this._updatePatrolCruiserAI(cop, player, dt);
        } else if (cop.type === 'highway_interceptor') {
          this._updateInterceptorAI(cop, player, dt);
        }
        cop.speed = cop.vz;
      }
    }

    /** Lateral steering, dt-correct. maxRate in normalised x per second. */
    _steerCop(cop, dt, maxRate) {
      const steer = (cop.targetX - cop.x) * (cop.handling || 1.8);
      cop.x = clamp(cop.x + clamp(steer, -maxRate, maxRate) * dt, -0.95, 0.95);
    }

    /**
     * A cop that has been in non-takedown contact too long backs off or peels away so it can
     * never pin the player (QA #4): behind -> brake and open a gap, ahead -> speed up and leave
     * the player's lane, beside -> steer outward.
     */
    _updateDisengage(cop, player, dt) {
      cop.disengage -= dt;
      cop.telegraph = 0;
      const spd = player.speed || 0;
      const copAhead = cop.z > player.z;
      if (copAhead) {
        cop.vz = Math.min(cop.maxSpeed * 1.1, Math.max(spd + 25, 60));
      } else {
        cop.vz = Math.max(60, spd - 30);
      }
      const side = cop.x >= player.x ? 1 : -1;
      cop.targetX = clamp(player.x + side * 0.6, -0.8, 0.8);
      this._steerCop(cop, dt, 2.4);
      cop.z += cop.vz * KMH_TO_UNITS * dt;
      cop.speed = cop.vz;
      if (cop.disengage <= 0) {
        cop.state = cop.type === 'patrol_cruiser' ? 'recover' : 'recovering';
        cop.stateTimer = 1.0;
        cop.pitTimer = 1.0;
      }
    }

    /**
     * Heat 1 cruiser. States: pursuing -> windup (0.9 s, visible: telegraph 1..0)
     * -> attack (0.5 s lateral shove) -> recover (1.8 s, drops back, punishable) -> pursuing.
     */
    _updatePatrolCruiserAI(cop, player, dt) {
      const distM = (player.z - cop.z) / UNITS_PER_METER; // >0: cop behind the player
      const spd = player.speed || 0;
      const maxSpd = cop.maxSpeed || 270;
      const inLane = Math.abs(player.x - cop.x) < 0.25;
      cop.attackCooldown = Math.max(0, cop.attackCooldown - dt);

      const follow = () => {
        if (distM > 40) {
          cop.vz = Math.min(maxSpd, Math.max(120, spd * 1.2 + 20));       // catch up
        } else if (distM < -15) {
          // Ahead of the player. In the player's path: speed up and swing out so the player is
          // never pinned behind it; otherwise brake and fall back behind.
          if (inLane) {
            cop.vz = Math.min(maxSpd * 1.1, Math.max(spd + 15, 40));
            cop.targetX = clamp(cop.x + (cop.x >= player.x ? 1 : -1) * 0.5, -0.8, 0.8);
          } else {
            cop.vz = Math.max(80, spd * 0.85);
          }
        } else {
          const lead = distM < 0 && inLane ? 15 : 0;                       // never sit in front, slower
          cop.vz = lerp(cop.vz, spd + lead, dt * 2.5);
        }
      };

      switch (cop.state) {
        case 'windup': {
          cop.stateTimer -= dt;
          cop.telegraph = clamp(cop.stateTimer / 0.9, 0, 1);
          cop.vz = lerp(cop.vz, spd, dt * 3);
          cop.targetX = clamp(player.x + cop.flankSide * 0.45, -0.9, 0.9); // pulls out to the side
          if (cop.stateTimer <= 0) { cop.state = 'attack'; cop.stateTimer = 0.5; }
          break;
        }
        case 'attack': {
          cop.stateTimer -= dt;
          cop.telegraph = 0;
          cop.vz = lerp(cop.vz, spd + 8, dt * 3);
          cop.targetX = player.x + cop.flankSide * 0.12;                   // steers into the player
          if (cop.stateTimer <= 0) { cop.state = 'recover'; cop.stateTimer = 1.8; cop.flankSide = -cop.flankSide; }
          break;
        }
        case 'recover': {
          cop.stateTimer -= dt;
          cop.telegraph = 0;
          cop.vz = Math.max(60, spd - 20);
          cop.targetX = clamp(player.x + cop.flankSide * 0.7, -0.9, 0.9);
          if (cop.stateTimer <= 0) {
            cop.state = 'pursuing';
            cop.attackCooldown = 2.5 / Math.max(0.3, (HEAT_CONFIG[this.heatLevel] || HEAT_CONFIG[1]).aggression);
          }
          break;
        }
        default: {
          cop.state = 'pursuing';
          cop.telegraph = 0;
          follow();
          if (Math.abs(distM) < 40 && !(distM < -15 && inLane)) cop.targetX = player.x; // line up behind
          if (distM > -6 && distM < 14 && cop.attackCooldown <= 0 && spd > 40) {
            cop.state = 'windup';
            cop.stateTimer = 0.9;
            cop.flankSide = player.x >= 0 ? -1 : 1;                        // swing toward the open side
            this._audio('cop_windup', { id: cop.id, type: cop.type });
          }
        }
      }

      this._steerCop(cop, dt, 2.4);
      cop.z += cop.vz * KMH_TO_UNITS * dt;
    }

    /**
     * Heat 2+ interceptor. pursuing -> flanking (windup: PIT warning raised HERE, telegraph grows)
     * -> pit_executing (0.9 s) -> recovering (2.5 s) -> pursuing.
     */
    _updateInterceptorAI(cop, player, dt) {
      const distM = (player.z - cop.z) / UNITS_PER_METER;
      const spd = player.speed || 0;
      const maxSpd = cop.maxSpeed || 330;

      switch (cop.state || 'pursuing') {
        case 'pursuing': {
          cop.telegraph = 0;
          cop.vz = Math.min(maxSpd, Math.max(120, spd * 1.35 + 30));
          cop.targetX = player.x + cop.flankSide * 0.42;
          if (Math.abs(distM) < 25) {
            cop.state = 'flanking';
            cop.pitTimer = randRange(1.0, 2.2);
            cop.pitWindup = cop.pitTimer;
            this._addAlert('WARNING: PIT MANEUVER INCOMING!', '#ff0055', 1.8, 'warning');
            this._audio('pit_warning', { id: cop.id });
          }
          break;
        }
        case 'flanking': {
          cop.vz = lerp(cop.vz, spd, dt * 3.5);
          cop.z = lerp(cop.z, player.z - M(8.0), dt * 4.0);
          cop.targetX = player.x + cop.flankSide * 0.38;
          cop.pitTimer -= dt;
          cop.telegraph = clamp(1 - cop.pitTimer / (cop.pitWindup || 1.5), 0, 1); // 1 at impact
          if (cop.pitTimer <= 0) { cop.state = 'pit_executing'; cop.pitTimer = 0.9; }
          break;
        }
        case 'pit_executing': {
          cop.targetX = player.x;
          cop.telegraph = 1;
          cop.pitTimer -= dt;
          if (cop.pitTimer <= 0) {
            cop.state = 'recovering';
            cop.pitTimer = 2.5;
            cop.flankSide = -cop.flankSide;
          }
          break;
        }
        default: { // recovering
          cop.telegraph = 0;
          cop.vz = Math.max(60, spd * 0.95);
          cop.targetX = clamp(cop.flankSide * 0.65, -0.9, 0.9);
          cop.pitTimer -= dt;
          if (cop.pitTimer <= 0) cop.state = 'pursuing';
        }
      }

      if (cop.state === 'pit_executing') {
        const ramDir = Math.sign(player.x - cop.x);
        cop.x = clamp(cop.x + ramDir * (cop.handling || 2.5) * 1.9 * dt, -0.95, 0.95);
        cop.z = lerp(cop.z, player.z - M(3.0), dt * 5.0);
      } else {
        this._steerCop(cop, dt, 3.6);
        cop.z += cop.vz * KMH_TO_UNITS * dt;
      }
    }

    // ========================================================================
    // 9. CIVILIAN TRAFFIC
    // ========================================================================
    _updateTrafficVehicles(dt, player) {
      const wreckDecay = Math.pow(0.95, dt * 60);
      for (let i = 0; i < this.trafficUnits.length; i++) {
        const car = this.trafficUnits[i];
        if (car.isWrecked) {
          car.z += car.vz * KMH_TO_UNITS * dt;
          car.x += car.wreckSlideVx * dt;
          car.wreckAngle += car.wreckSpinSpeed * dt;
          car.vz *= wreckDecay;
          car.wreckSlideVx *= wreckDecay;
          continue;
        }
        car.z += car.vz * KMH_TO_UNITS * dt;
        car.laneChangeTimer -= dt;
        if (car.laneChangeTimer <= 0) {
          car.laneChangeTimer = randRange(4.0, 10.0);
          car.targetLane = randChoice([-0.68, -0.34, 0.0, 0.34, 0.68]);
        }
        const dZ = player.z - car.z; // negative: car is ahead of the player
        if (dZ < 0 && dZ > -M(30) && Math.abs(player.x - car.x) < 0.35) {
          car.targetLane = car.x > 0 ? 0.75 : -0.75;
        }
        const steer = (car.targetLane - car.x) * car.handling;
        car.x += clamp(steer, -1.8, 1.8) * dt;
      }
    }

    // ========================================================================
    // 10. COLLISIONS: ONE COP-CONTACT RESOLVER, ONE PAYOUT PATH
    // ========================================================================
    /** Pay what was announced. The ONLY place credits are granted (-> onCredits). */
    _pay(amount, reason, alertText, color, duration, kind) {
      amount = Math.round(amount);
      if (amount > 0) {
        this.totalCreditsEarned += amount;
        this.sessionCredits += amount;
        this._dispatch('onCredits', amount, reason, { total: this.sessionCredits });
      }
      if (alertText) this._addAlert(alertText, color || '#ffffff', duration || 2.0, kind || 'credits');
    }

    _playerState(player) {
      return {
        x: player.x,
        z: player.z,
        speed: player.speed || 0,
        isDrifting: !!player.isDrifting,
        driftAngle: Math.abs(player.driftAngle || 0),
        isNitro: !!(player.isNitro || player.nitroActive)
      };
    }

    /**
     * Decides whether a takedown happened, which bonuses apply, and applies the result.
     * Rules:
     *   ram         cop is AHEAD of the player and closing speed >= takedownRelSpeedKmh
     *   drift_ram   player drifting with |slip| > 0.12 rad (any contact)       -> +drift bonus
     *   wall_pin    cop at |x| >= 0.85 and outside the player (pinned to rail)  -> +wall bonus
     * Nitro alone never qualifies. Heavy units (rhino, roadblock cars) are never takedowns.
     */
    _resolveCopContact(cop, p, dt, overlapXNorm) {
      const res = { kind: 'none', takedown: false, crash: false, speedScale: 1, lateralPush: 0, shake: 0 };
      if (cop.isWrecked) return res;
      const opt = this.options;
      const sideSign = cop.x >= p.x ? 1 : -1;

      // Heavy units: crash, never a takedown
      if (cop.type === 'swat_rhino' || cop.role === 'blockade') {
        if (cop.hitCooldown > 0) return res;
        cop.hitCooldown = 1.5;
        const rhino = cop.type === 'swat_rhino';
        res.crash = true;
        res.kind = rhino ? 'rhino_crash' : 'roadblock_crash';
        res.speedScale = rhino ? 0.25 : 0.5;
        res.lateralPush = -sideSign * (rhino ? 0.4 : 0.2);
        res.shake = rhino ? 35 : 22;
        cop.health -= 80;
        this._addAlert(rhino ? 'HEAD-ON RHINO IMPACT!' : 'ROADBLOCK HIT!', '#ff0033', 2.5, 'crash');
        this._audio('heavy_crash', { id: cop.id });
        this._emitSparkShower((p.x + cop.x) * 0.5, p.z, rhino ? 70 : 45);
        return res;
      }

      const copAhead = cop.z >= p.z - M(1.0);
      const relSpeed = copAhead ? p.speed - cop.vz : 0;
      const driftRam = p.isDrifting && p.driftAngle > 0.12;
      const wallPin = Math.abs(cop.x) >= 0.85 && Math.abs(cop.x) > Math.abs(p.x);
      const ram = relSpeed >= opt.takedownRelSpeedKmh;

      if (!(ram || driftRam || wallPin)) {
        // plain contact: shove the cop clear, never the player; escalate to disengage
        cop.x = clamp(cop.x + sideSign * Math.min(Math.max(overlapXNorm, 0.01), 0.06), -0.95, 0.95);
        cop.contactTime += dt;
        if (cop.contactTime > 0.5 && cop.disengage <= 0) {
          cop.disengage = 2.5;
          cop.contactTime = 0;
        }
        res.kind = 'bump';
        res.shake = 8;
        if (!cop.scrapeCd || this.time - cop.scrapeCd > 0.35) {
          cop.scrapeCd = this.time;
          this._emitSparkShower((p.x + cop.x) * 0.5, p.z, 20);
          this._audio('metal_scrape', { id: cop.id });
        }
        return res;
      }

      // ---- TAKEDOWN ----
      const base = cop.bounty != null ? cop.bounty : (ARCHETYPES[cop.type] ? ARCHETYPES[cop.type].takedownValue : 800);
      const labels = [];
      let bonus = 0;
      if (driftRam) { bonus += opt.driftRamBonus; labels.push('DRIFT RAM'); }
      if (wallPin) { bonus += opt.wallPinBonus; labels.push('WALL PIN'); }
      const kind = wallPin ? 'wall_pin' : (driftRam ? 'drift_ram' : 'ram');
      const total = base + bonus;

      cop.isWrecked = true;
      cop.health = 0;
      cop.wreckSpinSpeed = randRange(14.0, 24.0) * sideSign;
      cop.wreckSlideVx = sideSign * randRange(1.8, 3.2);
      cop.vz = p.speed * 0.4;
      cop.telegraph = 0;
      cop.state = 'wrecked';
      this.hitStopTimer = opt.hitStopDuration;
      this._emitSparkShower((p.x + cop.x) * 0.5, cop.z, 90);
      this._emitDebris(cop.x, cop.z, 10);
      this.totalTakedowns++;

      const label = (labels.length ? labels.join(' + ') + ': ' : 'TAKEDOWN: ') + cop.name.toUpperCase();
      this._pay(total, 'takedown_' + kind, `${label} +$${total}`, '#ff007f', 3.0, 'takedown');
      this._audio('takedown', { id: cop.id, type: cop.type, kind });
      this._dispatch('onScreenShake', { intensity: 24, duration: 0.45 });
      this._dispatch('onTakedown', {
        copId: cop.id,
        unit: cop,
        copType: cop.type,
        name: cop.name,
        kind,
        labels,
        base,
        bonus,
        bounty: total,   // legacy alias: the amount ALREADY paid via onCredits (do not add it again)
        reward: total,
        relSpeed,
        nitroRefill: 1.0
      });
      res.takedown = true;
      res.kind = kind;
      res.shake = 24;
      return res;
    }

    /**
     * Public hook for the 3D physics solver: call when it detects penetration with a live cop,
     * BEFORE applying its own response. If result.takedown is true the cop is now wrecked
     * (credits and banner were already emitted) and the solver must skip its own takedown code.
     * @param {string} copId
     * @param {Object} playerState same shape as update()'s player
     * @returns {Object|null} {kind, takedown, crash, speedScale, lateralPush, shake}
     */
    reportContact(copId, playerState) {
      const cop = this.policeUnits.find(u => u.id === copId);
      if (!cop || !playerState) return null;
      return this._resolveCopContact(cop, this._playerState(playerState), 1 / 60, 0.02);
    }

    _resolveCollisions(dt, player) {
      let screenShake = 0;
      let takedownOccurred = false;
      let spikeEvasionOccurred = false;
      let speedScale = 1;
      let lateralPush = 0;

      const p = this._playerState(player);
      const roadHalf = this.options.roadHalfWidthM;
      const margin = 0.35; // metres: the physics solver separates objects, so detect "touching"
      const pHalfW = 1.05, pHalfL = 2.3;
      const playerHitW = 0.13;         // normalised, for spikes
      const playerHitL = M(4.6);       // world units

      // A. Police
      for (let i = 0; i < this.policeUnits.length; i++) {
        const cop = this.policeUnits[i];
        if (cop.isWrecked) continue;
        const dXm = Math.abs(p.x - cop.x) * roadHalf;
        const dZm = Math.abs(p.z - cop.z) / UNITS_PER_METER;
        const ovX = (pHalfW + (cop.contactHalfW || 1.1) + margin) - dXm;
        const ovZ = (pHalfL + (cop.contactHalfL || 2.3) + margin) - dZm;
        if (ovX > 0 && ovZ > 0) {
          const r = this._resolveCopContact(cop, p, dt, ovX / roadHalf);
          screenShake = Math.max(screenShake, r.shake);
          if (r.takedown) takedownOccurred = true;
          speedScale = Math.min(speedScale, r.speedScale);
          lateralPush += r.lateralPush;
        } else {
          cop.contactTime = Math.max(0, cop.contactTime - dt * 2);
        }
      }

      // B. Spike strips
      for (let i = 0; i < this.spikeStrips.length; i++) {
        const spike = this.spikeStrips[i];
        const spikeLen = spike.length;
        const spikeHitW = spike.hitboxW || spike.width;
        const spikeHitL = spike.hitboxL || spikeLen;
        const spikeCenterZ = spike.z + spikeLen * 0.5;
        const dX = Math.abs(p.x - spike.x);
        const dZ = Math.abs(p.z - spikeCenterZ);
        const overlapX = (playerHitW + spikeHitW) * 0.5 - dX;
        const overlapZ = (playerHitL + spikeHitL) * 0.5 - dZ;

        if (!spike.triggered && overlapX > 0 && overlapZ > 0) {
          spike.triggered = true;
          if (player.phaseShift || player.isInvulnerable) {
            this._addAlert('PHASE CLOAK: SPIKES BYPASSED!', '#9d00ff', 2.0, 'info');
            continue;
          }
          this.blowoutRemaining = 4.0;
          screenShake = Math.max(screenShake, 22);
          this._emitSparkShower(p.x, p.z, 60);
          this._addAlert('TIRE BLOWOUT! SPEED CAPPED AT 80 KM/H!', '#ff0033', 3.5, 'crash');
          this._dispatch('onSpikeBlowout', { duration: 4.0, maxSpeed: 80 });
          this._audio('tire_blowout', {});
          this._dispatch('onScreenShake', { intensity: 22, duration: 0.5 });
        }

        const playerRearZ = p.z - playerHitL * 0.5;
        if (playerRearZ > spike.z + spikeLen && !this.spikesPassedIds.has(spike.id)) {
          this.spikesPassedIds.add(spike.id);
          if (!spike.triggered && dX < 0.65) {
            spikeEvasionOccurred = true;
            const reward = this.options.spikeEvasionReward;
            this._pay(reward, 'spike_evasion', `SPIKE EVASION! +$${reward}`, '#00f5ff', 2.2, 'credits');
            this._dispatch('onSpikeEvasion', { spikeId: spike.id, reward });
            this._audio('spike_evasion', { reward });
          }
        }
      }

      // C. Civilians + near miss
      if (this.options.trafficEnabled) {
        for (let i = 0; i < this.trafficUnits.length; i++) {
          const civ = this.trafficUnits[i];
          if (civ.isWrecked) continue;
          const dXm = Math.abs(p.x - civ.x) * roadHalf;
          const dZm = Math.abs(p.z - civ.z) / UNITS_PER_METER;
          const gapX = dXm - (pHalfW + civ.contactHalfW);
          const gapZ = dZm - (pHalfL + civ.contactHalfL);

          if (gapX < 0 && gapZ < 0) {
            civ.isWrecked = true;
            civ.wreckSpinSpeed = randRange(10, 18) * (civ.x > p.x ? 1 : -1);
            civ.wreckSlideVx = (civ.x > p.x ? 1 : -1) * randRange(1.2, 2.4);
            speedScale = Math.min(speedScale, 0.65);
            screenShake = Math.max(screenShake, 15);
            this._emitSparkShower((p.x + civ.x) * 0.5, p.z, 40);
            this._audio('traffic_crash', { id: civ.id });
          } else if (!civ.nearMissAwarded && p.speed > 200 && gapX < 1.2 && gapZ < 4.0) {
            civ.nearMissAwarded = true;
            const reward = this.options.nearMissReward;
            this._pay(reward, 'near_miss', `NEAR MISS! +$${reward}`, '#00f5ff', 1.2, 'credits');
            this._audio('near_miss', { id: civ.id, reward });
          }
        }
      }

      return { screenShake, takedownOccurred, spikeEvasionOccurred, speedScale, lateralPush };
    }

    // ========================================================================
    // 10b. BUSTED (fail state)
    // ========================================================================
    _updateBusted(dt, player) {
      const opt = this.options;
      const speed = player.speed || 0;
      let cop = null;
      if (this.heatLevel >= opt.bustedMinHeat && speed < opt.bustedSpeedKmh) {
        for (let i = 0; i < this.policeUnits.length; i++) {
          const u = this.policeUnits[i];
          if (u.isWrecked || u.role === 'blockade') continue;
          if (Math.abs(u.z - player.z) / UNITS_PER_METER < opt.bustedContactRadius &&
              Math.abs(u.x - player.x) * opt.roadHalfWidthM < 4.5) { cop = u; break; }
        }
      }
      if (cop) {
        this.bustedTimer += dt;
        if (!this.bustWarned) {
          this.bustWarned = true;
          this._addAlert('SURROUNDED! KEEP MOVING OR GET BUSTED!', '#ff0033', 2.5, 'warning');
          this._audio('bust_warning', { time: opt.bustedTime });
        }
        if (this.bustedTimer >= opt.bustedTime) {
          this.busted = true;
          this.bustedProgress = 1;
          const info = {
            heat: this.heatLevel,
            peakHeat: this.peakHeat,
            takedowns: this.totalTakedowns,
            credits: this.sessionCredits,
            time: this.time
          };
          this._addAlert('BUSTED!', '#ff0033', 6.0, 'busted');
          this._audio('busted', info);
          this._dispatch('onBusted', info);
          return;
        }
      } else {
        this.bustedTimer = Math.max(0, this.bustedTimer - dt * 1.5);
        if (this.bustedTimer === 0) this.bustWarned = false;
      }
      this.bustedProgress = clamp(this.bustedTimer / opt.bustedTime, 0, 1);
    }

    // ========================================================================
    // 11. ZƏRRƏCİKLƏR (Sparks, Debris, Smoke) VƏ BİLDİRİŞLƏR
    // ========================================================================
    _emitSparkShower(x, z, count = 50) {
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: x + randRange(-0.05, 0.05),
          z: z + randRange(-2, 2),
          y: randRange(0.2, 1.2),
          vx: randRange(-0.8, 0.8),
          vz: randRange(-40, 40),
          vy: randRange(2.0, 7.0),
          color: randChoice(['#ffea00', '#ff007f', '#00f5ff', '#ffffff']),
          size: randRange(2.0, 4.5),
          life: randRange(0.3, 0.75),
          maxLife: 0.75
        });
      }
    }

    _emitDebris(x, z, count = 8) {
      for (let i = 0; i < count; i++) {
        this.debris.push({
          x: x,
          z: z,
          y: randRange(0.5, 2.0),
          vx: randRange(-1.2, 1.2),
          vz: randRange(-20, 30),
          vy: randRange(4.0, 9.0),
          rot: randRange(0, Math.PI * 2),
          vRot: randRange(-12, 12),
          width: randRange(0.04, 0.08),
          height: randRange(0.03, 0.06),
          color: randChoice(['#1a1d2e', '#ff0033', '#ffffff', '#333333']),
          life: randRange(0.8, 1.6),
          maxLife: 1.6
        });
      }
    }

    _emitRimSparks(x, z) {
      // Təkər partlayışı zamanı arxaya çilənən qığılcımlar
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: x + (i % 2 === 0 ? -0.12 : 0.12),
          z: z - 3.0,
          y: 0.1,
          vx: randRange(-0.2, 0.2),
          vz: -randRange(20, 60),
          vy: randRange(0.5, 2.5),
          color: randChoice(['#ff7700', '#ffe600', '#ffffff']),
          size: randRange(1.5, 3.0),
          life: randRange(0.15, 0.35),
          maxLife: 0.35
        });
      }
    }

    _emitWreckSmoke(x, z) {
      this.particles.push({
        x: x + randRange(-0.05, 0.05),
        z: z,
        y: 0.8,
        vx: randRange(-0.1, 0.1),
        vz: -randRange(5, 15),
        vy: randRange(1.2, 3.0),
        color: 'rgba(30, 30, 35, 0.6)',
        size: randRange(5.0, 12.0),
        life: 0.8,
        maxLife: 0.8
      });
    }

    _updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.y += p.vy * dt;
        p.vy -= 9.8 * dt; // Qravitasiya
        if (p.y < 0) p.y = 0;
      }

      for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i];
        d.life -= dt;
        if (d.life <= 0) {
          this.debris.splice(i, 1);
          continue;
        }
        d.x += d.vx * dt;
        d.z += d.vz * dt;
        d.y += d.vy * dt;
        d.rot += d.vRot * dt;
        d.vy -= 14.0 * dt;
        if (d.y < 0) {
          d.y = 0;
          d.vy *= -0.3; // Sıçrama
        }
      }
    }

    _updateParticlesOnly(dt) {
      // Hit-stop zamanı yalnız vizual qığılcım partlayışı oynasın
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.life -= dt * 0.4;
      }
    }

    _addAlert(text, color = '#ffffff', duration = 2.0, kind = 'info') {
      const alert = {
        id: getUniqueId('alert'),
        text,
        kind,
        color,
        duration,
        timeRemaining: duration
      };
      this.activeAlerts.push(alert);
      if (this.activeAlerts.length > 8) this.activeAlerts.shift();
      this._dispatch('onAlert', { text, kind, color, duration });
    }

    _updateAlerts(dt) {
      for (let i = this.activeAlerts.length - 1; i >= 0; i--) {
        const alert = this.activeAlerts[i];
        alert.timeRemaining -= dt;
        if (alert.timeRemaining <= 0) {
          this.activeAlerts.splice(i, 1);
        }
      }
    }

    // ========================================================================
    // 12. OBYEKTLƏRİN TƏMİZLƏNMƏSİ (Culling)
    // ========================================================================
    _cullOffscreenEntities(playerZ) {
      const o = this.options;
      const behind = M(o.cullBehind), fadeFrom = M(o.fadeStart), ahead = M(o.cullAhead);
      // Cops fade out over (fadeStart..cullBehind) metres behind so they never pop.
      this.policeUnits = this.policeUnits.filter(cop => {
        const dZ = cop.z - playerZ;
        if (dZ > ahead) return false;
        if (cop.type === 'swat_rhino' && dZ < -M(80)) return false; // oncoming unit that has passed
        if (dZ < -behind) return false;
        if (cop.isWrecked && cop.fade <= 0) return false;
        if (dZ < -fadeFrom) cop.fade = Math.min(cop.fade, clamp(1 - (-dZ - fadeFrom) / (behind - fadeFrom), 0, 1));
        return true;
      });

      this.trafficUnits = this.trafficUnits.filter(car => {
        const dZ = car.z - playerZ;
        return dZ > -M(150) && dZ < M(500);
      });

      this.spikeStrips = this.spikeStrips.filter(sp => {
        const dZ = sp.z - playerZ;
        const keep = dZ > -M(60) && dZ < M(900);
        if (!keep) this.spikesPassedIds.delete(sp.id);   // no unbounded growth (security #9)
        return keep;
      });

      this.roadblocks = this.roadblocks.filter(r => {
        const dZ = r.z - playerZ;
        return dZ > -M(100) && dZ < M(900);
      });
    }

    // ========================================================================
    // 13. KÖMƏKÇİ RENDERING METODLARI (Canvas Render Routines)
    // ========================================================================
    /**
     * Helikopterin fənərini asfalt üzərinə proyeksiya edib çəkir
     */
    renderChopperSpotlight(ctx, projectFn) {
      if (!this.chopper.active) return;
      const spot = this.chopper.spotlight;

      // Pseudo-3D proyeksiyası vasitəsilə mərkəz nöqtəsinin tapılması
      const p = projectFn(spot.x, 0, spot.z);
      if (!p || p.scale <= 0) return;

      const radiusScreenX = spot.radiusX * p.scale * 800;
      const radiusScreenY = (spot.radiusZ * 0.12) * p.scale * 800;

      ctx.save();
      const grad = ctx.createRadialGradient(p.x, p.y, radiusScreenX * 0.15, p.x, p.y, radiusScreenX);
      const isLocked = spot.isLocked;
      const beamColor = isLocked ? 'rgba(255, 0, 50,' : 'rgba(0, 245, 255,';

      grad.addColorStop(0, `${beamColor} ${0.65 * spot.flicker})`);
      grad.addColorStop(0.6, `${beamColor} ${0.25 * spot.flicker})`);
      grad.addColorStop(1, `${beamColor} 0.0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.max(2, radiusScreenX), Math.max(2, radiusScreenY), 0, 0, Math.PI * 2);
      ctx.fill();

      // Mərkəzi hədəf nişangahı
      if (isLocked) {
        ctx.strokeStyle = '#ff0033';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radiusScreenX * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    /**
     * Tikanlı Zolağı çəkir
     */
    renderSpikeStrip(ctx, spike, projectFn) {
      const p = projectFn(spike.x, 0, spike.z);
      if (!p || p.scale <= 0) return;

      const w = spike.width * p.scale * 1000;
      const h = Math.max(3, p.scale * 18);

      ctx.save();
      // Əsas zolaq çərçivəsi
      ctx.fillStyle = spike.triggered ? '#333333' : '#111116';
      ctx.strokeStyle = spike.triggered ? '#666666' : '#ffaa00';
      ctx.lineWidth = 2;
      ctx.fillRect(p.x - w * 0.5, p.y - h * 0.5, w, h);
      ctx.strokeRect(p.x - w * 0.5, p.y - h * 0.5, w, h);

      // İti tikan dişləri
      if (!spike.triggered) {
        ctx.fillStyle = '#ffffff';
        const teethCount = 7;
        const toothStep = w / teethCount;
        for (let t = 0; t < teethCount; t++) {
          const tx = p.x - w * 0.5 + t * toothStep + toothStep * 0.5;
          ctx.beginPath();
          ctx.moveTo(tx - toothStep * 0.35, p.y + h * 0.5);
          ctx.lineTo(tx, p.y - h * 1.2);
          ctx.lineTo(tx + toothStep * 0.35, p.y + h * 0.5);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    /**
     * Bütün zərrəcikləri (Sparks & Debris) çəkir
     */
    renderParticles(ctx, projectFn) {
      ctx.save();
      for (let i = 0; i < this.particles.length; i++) {
        const pt = this.particles[i];
        const p = projectFn(pt.x, pt.y, pt.z);
        if (!p || p.scale <= 0) continue;

        const size = Math.max(1.5, pt.size * p.scale * 250);
        ctx.fillStyle = pt.color;
        ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
      }

      for (let i = 0; i < this.debris.length; i++) {
        const d = this.debris[i];
        const p = projectFn(d.x, d.y, d.z);
        if (!p || p.scale <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(d.rot);
        ctx.fillStyle = d.color;
        const dw = d.width * p.scale * 400;
        const dh = d.height * p.scale * 400;
        ctx.fillRect(-dw * 0.5, -dh * 0.5, dw, dh);
        ctx.restore();
      }
      ctx.restore();
    }

    /**
     * HUD Bildirişlərini çəkir (Takedown, Spike Evasion və s.)
     */
    renderHUDAlerts(ctx, screenWidth, screenHeight) {
      if (this.activeAlerts.length === 0) return;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let startY = screenHeight * 0.28;
      for (let i = 0; i < this.activeAlerts.length; i++) {
        const alert = this.activeAlerts[i];
        const alpha = clamp(alert.timeRemaining / (alert.duration * 0.3), 0, 1);

        ctx.font = '900 24px "Orbitron", "Segoe UI", sans-serif';
        ctx.shadowColor = alert.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = alert.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(alert.text, screenWidth * 0.5, startY);

        startY += 34;
      }
      ctx.restore();
    }

    /**
     * Polis Avtomobilini Proyeksiya Edərək Çəkir (Crown Vic, Interceptor, SWAT Rhino)
     */
    renderPoliceVehicle(ctx, cop, projectFn) {
      const p = projectFn(cop.x, cop.y || 0, cop.z);
      if (!p || p.scale <= 0) return;

      const w = Math.max(12, (cop.width || 0.32) * p.scale * 1200);
      const h = Math.max(8, w * (cop.type === 'swat_rhino' ? 0.65 : 0.46));

      ctx.save();
      ctx.globalAlpha = cop.fade === undefined ? 1 : clamp(cop.fade, 0, 1);
      ctx.translate(p.x, p.y);

      // Qəzaya uğrayıbsa fırlanma bucağı
      if (cop.isWrecked) {
        ctx.rotate(cop.wreckAngle || 0);
      } else if (cop.role === 'blockade') {
        ctx.rotate(cop.wreckAngle || 0.35);
      }

      const halfW = w * 0.5;
      const halfH = h * 0.5;

      // ----------------------------------------------------------------------
      // Tip 1: SWAT RHINO APC (Heat 5 Ağır Zirehli Zərbə Avtomobili)
      // ----------------------------------------------------------------------
      if (cop.type === 'swat_rhino') {
        // Alt kölgə
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-halfW * 1.1, halfH * 0.6, w * 1.1, halfH * 0.5);

        // Əsas zirehli korpus (Matte carbon steel)
        ctx.fillStyle = cop.isWrecked ? '#1a1a1a' : '#0c0e14';
        ctx.strokeStyle = '#333b4d';
        ctx.lineWidth = Math.max(1.5, p.scale * 4);
        ctx.fillRect(-halfW, -halfH, w, h);
        ctx.strokeRect(-halfW, -halfH, w, h);

        // Zirehli ön kəllə (Bull-bar ramming wedge)
        ctx.fillStyle = '#ffaa00';
        // Sarı/Qara zolaqlı təhlükə chevrons
        const stripeCount = 6;
        const stripeW = w / stripeCount;
        for (let s = 0; s < stripeCount; s++) {
          ctx.fillStyle = (s % 2 === 0) ? '#ffcc00' : '#111111';
          ctx.fillRect(-halfW + s * stripeW, halfH - h * 0.32, stripeW, h * 0.32);
        }

        // Gücləndirilmiş polad ön bufer
        ctx.strokeStyle = '#8899aa';
        ctx.lineWidth = Math.max(2, p.scale * 6);
        ctx.strokeRect(-halfW * 1.04, halfH - h * 0.35, w * 1.04, h * 0.35);

        // Dar gülləkeçirməz şüşə yarığı (Visor slit)
        ctx.fillStyle = '#00f5ff';
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(-halfW * 0.6, -halfH * 0.5, w * 0.6, h * 0.22);
        ctx.shadowBlur = 0;

        // Damda yüksək intensivlikli halogen fənərlər və mayaklar
        const strobeRed = cop.strobeState;
        ctx.fillStyle = strobeRed ? '#ff0033' : '#00f5ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 18;
        ctx.fillRect(-halfW * 0.4, -halfH - h * 0.22, w * 0.8, h * 0.22);
        ctx.shadowBlur = 0;
      }

      // ----------------------------------------------------------------------
      // Tip 2: HIGHWAY INTERCEPTOR (Heat 2 Corvette Tərzi Sürətli İdman Maşını)
      // ----------------------------------------------------------------------
      else if (cop.type === 'highway_interceptor') {
        // Neon underglow
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(0, 245, 255, 0.35)';
        ctx.fillRect(-halfW * 0.9, halfH * 0.4, w * 0.9, halfH * 0.4);
        ctx.shadowBlur = 0;

        // Aerodinamik kəsik gövdə
        ctx.fillStyle = cop.isWrecked ? '#222222' : '#0a0b10';
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = Math.max(1, p.scale * 3);

        ctx.beginPath();
        ctx.moveTo(-halfW * 0.8, -halfH);
        ctx.lineTo(halfW * 0.8, -halfH);
        ctx.lineTo(halfW, halfH);
        ctx.lineTo(-halfW, halfH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Arxa idman spoyleri (Rear GT wing)
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-halfW * 1.02, -halfH - h * 0.18, w * 1.02, h * 0.16);

        // İncə neon arxa stop işıqları
        ctx.fillStyle = '#ff0033';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 10;
        ctx.fillRect(-halfW * 0.85, halfH - h * 0.25, halfW * 0.6, h * 0.18);
        ctx.fillRect(halfW * 0.25, halfH - h * 0.25, halfW * 0.6, h * 0.18);
        ctx.shadowBlur = 0;

        // Aerodinamik dam mayakları (Slim LED Lightbar)
        const isRed = cop.strobeState;
        ctx.fillStyle = isRed ? '#ff0055' : '#00f5ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 16;
        ctx.fillRect(-halfW * 0.35, -halfH * 0.4, halfW * 0.32, h * 0.16);
        ctx.fillStyle = isRed ? '#00f5ff' : '#ff0055';
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(halfW * 0.03, -halfH * 0.4, halfW * 0.32, h * 0.16);
        ctx.shadowBlur = 0;
      }

      // ----------------------------------------------------------------------
      // Tip 3: PATROL CRUISER (Heat 1 Ford Crown Vic Klassik Patrul)
      // ----------------------------------------------------------------------
      else {
        // Gövdə (Qara kənarlar, ağ tavan və qapılar)
        ctx.fillStyle = cop.isWrecked ? '#252528' : '#14161f';
        ctx.fillRect(-halfW, -halfH, w, h);

        // Ağ mərkəzi zolaq (Classic Metro Police livery)
        ctx.fillStyle = '#e6edf5';
        ctx.fillRect(-halfW * 0.7, -halfH * 0.7, w * 0.7, h * 0.7);

        // Arxa bufer və nömrə nişanı
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(-halfW * 0.9, halfH - h * 0.28, w * 0.9, h * 0.28);

        // Klassik arxa stop fənərləri
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(-halfW * 0.88, halfH - h * 0.32, halfW * 0.4, h * 0.24);
        ctx.fillRect(halfW * 0.48, halfH - h * 0.32, halfW * 0.4, h * 0.24);

        // Dam mayak bloku (Heavy Dual Lightbar with Halo Flashes)
        const isRed = cop.strobeState;
        const lightbarW = halfW * 0.75;
        const lightbarH = h * 0.24;

        // Sol mayak (Qırmızı)
        ctx.fillStyle = isRed ? '#ff0033' : '#440011';
        ctx.fillRect(-lightbarW, -halfH - lightbarH, lightbarW * 0.9, lightbarH);

        // Sağ mayak (Göy)
        ctx.fillStyle = !isRed ? '#0088ff' : '#001144';
        ctx.fillRect(lightbarW * 0.1, -halfH - lightbarH, lightbarW * 0.9, lightbarH);

        // Mayak parıltısı (Bloom strobe halo)
        if (!cop.isWrecked) {
          ctx.fillStyle = isRed ? 'rgba(255, 0, 50, 0.45)' : 'rgba(0, 160, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(isRed ? -lightbarW * 0.5 : lightbarW * 0.55, -halfH - lightbarH * 0.5, Math.max(8, w * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    /**
     * Polis Helikopterini Havada Çəkir (Heat 4 & 5 Cyber-Copter)
     */
    renderChopper(ctx, projectFn) {
      if (!this.chopper.active) return;
      const chop = this.chopper;

      const p = projectFn(chop.x, chop.y, chop.z);
      if (!p || p.scale <= 0) return;

      const size = Math.max(28, p.scale * 1600);
      const halfS = size * 0.5;

      ctx.save();
      ctx.translate(p.x, p.y);

      // Helikopter gövdəsi (Aerodinamik qara korpus)
      ctx.fillStyle = '#0c0f17';
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfS * 0.65, halfS * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Kokpit şüşəsi (Neon Cyan parıltı)
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(halfS * 0.15, halfS * 0.05, halfS * 0.28, halfS * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Quyruq qolu (Tail boom)
      ctx.strokeStyle = '#0c0f17';
      ctx.lineWidth = Math.max(3, size * 0.08);
      ctx.beginPath();
      ctx.moveTo(-halfS * 0.45, 0);
      ctx.lineTo(-halfS * 1.25, -halfS * 0.15);
      ctx.stroke();

      // Quyruq pəri (Tail rotor)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-halfS * 1.25, -halfS * 0.35);
      ctx.lineTo(-halfS * 1.25, halfS * 0.15);
      ctx.stroke();

      // Əsas fırlanan pərlər (Main spinning rotor blades with blur disk)
      ctx.save();
      ctx.rotate(chop.rotorAngle);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.beginPath();
      ctx.moveTo(-halfS * 1.3, 0);
      ctx.lineTo(halfS * 1.3, 0);
      ctx.stroke();
      ctx.restore();

      // Qırmızı təhlükə xəbərdarlıq mayakı
      const beaconOn = Math.sin(this.time * 12.0) > 0;
      if (beaconOn) {
        ctx.fillStyle = '#ff0033';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(-halfS * 1.25, -halfS * 0.2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    /**
     * Mülki Trafik Avtomobilini Çəkir
     */
    renderTrafficVehicle(ctx, car, projectFn) {
      const p = projectFn(car.x, car.y || 0, car.z);
      if (!p || p.scale <= 0) return;

      const w = Math.max(10, (car.width || 0.28) * p.scale * 1200);
      const h = Math.max(6, w * (car.type === 'civilian_truck' ? 0.75 : 0.45));

      ctx.save();
      ctx.translate(p.x, p.y);
      if (car.isWrecked) {
        ctx.rotate(car.wreckAngle || 0);
      }

      const halfW = w * 0.5;
      const halfH = h * 0.5;

      // Avtomobil gövdəsi
      ctx.fillStyle = car.isWrecked ? '#222222' : (car.color || '#ff8800');
      ctx.fillRect(-halfW, -halfH, w, h);

      // Şüşələr
      ctx.fillStyle = '#05070a';
      ctx.fillRect(-halfW * 0.7, -halfH * 0.6, w * 0.7, h * 0.4);

      // Arxa neon stop zolağı
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 6;
      ctx.fillRect(-halfW * 0.8, halfH - h * 0.24, w * 0.8, h * 0.18);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // ========================================================================
    // 14. HADİSƏLƏRİN DİSPETÇERİ (Event Dispatcher)
    // ========================================================================
    /**
     * Calls the callback given in constructor options AND the one assigned as a property
     * (ai.onAudioEvent = fn, as racer_audio.connectToAI does). If both exist both are called.
     */
    _dispatch(eventName, ...args) {
      const a = this.options[eventName];
      const b = this[eventName];
      if (typeof a === 'function') this._safeCall(eventName, a, args);
      if (typeof b === 'function' && b !== a) this._safeCall(eventName, b, args);
    }

    _safeCall(name, fn, args) {
      try {
        fn.apply(this, args);
      } catch (err) {
        console.error(`[NeonPursuitAI] Event error in ${name}:`, err);
      }
    }

    /** onAudioEvent(cue, data). data always carries .cue as well. */
    _audio(cue, data) {
      const d = Object.assign({ cue }, data || {});
      this._dispatch('onAudioEvent', cue, d);
    }
  }

  // --------------------------------------------------------------------------
  // 15. İxrac və Qlobal Təyinat
  // --------------------------------------------------------------------------
  const ExportModule = {
    NeonPursuitAI,
    HEAT_CONFIG,
    ARCHETYPES,
    UNITS_PER_METER
  };

  if (typeof window !== 'undefined') {
    window.NeonPursuitAI = NeonPursuitAI;
    window.NeonRacerAI = ExportModule;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportModule;
  }

})(typeof window !== 'undefined' ? window : globalThis);
