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

  let _idSeq = 0;
  const getUniqueId = (prefix = 'ai') => `${prefix}_${++_idSeq}`;

  // --------------------------------------------------------------------------
  // 2. Heat Səviyyələri və Vahid Arxitip Konfiqurasiyaları
  // --------------------------------------------------------------------------
  const HEAT_CONFIG = {
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
      role: 'boxer'      // Arxadan yaxınlaşır, sıxışdırır
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
      role: 'pit_flanker' // Yan cinahdan PIT manevri edir
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
      role: 'head_on_ram' // Ön-önə ramming
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
        policeSpawnDistanceBehind: -140, // Metr
        policeSpawnDistanceAhead: 850,   // Metr
        rhinoSpawnDistanceAhead: 950,
        roadblockInterval: 2200,         // Hər 2.2 km-də bir blokada
        hitStopDuration: 0.080,          // 80ms hit-stop tələbi!
        onTakedown: null,
        onSpikeBlowout: null,
        onSpikeEvasion: null,
        onHeatChange: null,
        onSpotlightLock: null,
        onPursuitEvaded: null,
        onScreenShake: null,
        onAudioEvent: null
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
      this.pursuitActive = true;
      this.escapeCooldown = 0.0;
      this.totalTakedowns = 0;
      this.totalCreditsEarned = 0;

      // Vaxt və Zaman Qrafiki
      this.time = 0.0;
      this.lastSpawnTime = -10.0;
      this.lastRoadblockZ = 1200; // İlk blokadanın başlama məsafəsi

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
    // 4. ƏSAS YENİLƏNMƏ DÖVRÜ (Frame Update Loop)
    // ========================================================================
    /**
     * Hər kadr çağırılan əsas metod
     * @param {number} dt - Saniyə ilə delta vaxt (məs: 0.016)
     * @param {Object} player - Oyunçunun avtomobil məlumatları:
     *   { x, z, y, speed, isDrifting, driftAngle, isNitro, isInvulnerable, phaseShift }
     * @returns {Object} Frame statusu (hitStopActive, blowoutActive, alerts, cameraShake, audioTriggers)
     */
    update(dt, player) {
      if (!player) return { hitStopActive: false, blowoutActive: false };

      // 1. Burnout Hit-stop (80ms dondurma effekti)
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt;
        if (this.hitStopTimer <= 0) {
          this.hitStopTimer = 0;
        }
        // Hit-stop zamanı dünyanı dondururuq, yalnız zərbə vizuallarını canlandırırıq
        this._updateParticlesOnly(dt);
        return {
          hitStopActive: true,
          blowoutActive: this.blowoutRemaining > 0,
          cameraShake: 0,
          alerts: this.activeAlerts
        };
      }

      this.time += dt;

      // 2. Təkər partlayışı taymeri
      let blowoutSpeedCap = null;
      if (this.blowoutRemaining > 0) {
        this.blowoutRemaining -= dt;
        blowoutSpeedCap = 80; // km/h tavan məhdudiyyəti
        // Təkər disklərindən qığılcım yağdırırıq
        this._emitRimSparks(player.x, player.z);
        if (this.blowoutRemaining <= 0) {
          this.blowoutRemaining = 0;
          this._addAlert('TIRES REPAIRED', '#00f5ff', 1.8);
        }
      }

      // 3. Heat Səviyyəsinin Hesablanması və İdarəsi
      this._updateHeatSystem(dt, player);

      // 4. Trafik və Polis Vahidləri Spawner Rejissoru
      this._updateDirectorSpawns(dt, player);

      // 5. Helikopterin İdarəetmə AI (Heat 4 & 5)
      this._updateChopperAI(dt, player);

      // 6. Polis və Trafik Avtomobillərinin Fiziki AI Davranışları
      this._updatePoliceVehicles(dt, player);
      this._updateTrafficVehicles(dt, player);

      // 7. Toqquşma, PIT Manevri, Tikanlar və Burnout Takedown Yoxlaması
      const collisionResult = this._resolveCollisions(dt, player);

      // 8. Zərrəciklər (Sparks, Debris) və Bildirişlər
      this._updateParticles(dt);
      this._updateAlerts(dt);

      // 9. Ekrandan uzaqlaşmış obyektlərin təmizlənməsi (Zero memory leak)
      this._cullOffscreenEntities(player.z);

      return {
        hitStopActive: false,
        blowoutActive: this.blowoutRemaining > 0,
        blowoutSpeedCap: blowoutSpeedCap,
        cameraShake: collisionResult.screenShake,
        alerts: this.activeAlerts,
        takedownOccurred: collisionResult.takedownOccurred,
        spikeEvasionOccurred: collisionResult.spikeEvasionOccurred
      };
    }

    // ========================================================================
    // 5. HEAT VƏ TƏQİB SİSTEMİ (Heat Progression & Escalation)
    // ========================================================================
    _updateHeatSystem(dt, player) {
      const speedKmH = player.speed || 0;

      // Sürət > 220 km/h, Drift və Near-Miss heat artırır
      let heatGainRate = 0.012; // Sabit fon axtarış təzyiqi

      if (speedKmH > 240) {
        heatGainRate += ((speedKmH - 240) / 100) * 0.04;
      }
      if (player.isDrifting) {
        heatGainRate += 0.05 * Math.abs(player.driftAngle || 0.5);
      }
      if (this.chopper.active && this.chopper.spotlight.isLocked) {
        heatGainRate += 0.08; // Helikopter fənəri altında olanda axtarış pik həddə çatır
      }

      // Əgər ətrafda heç bir polis yoxdursa və oyunçu gizlənirsə / uzaqlaşırsa təqibdən qaçış
      const nearbyPolice = this.policeUnits.some(p => Math.abs(p.z - player.z) < 450 && !p.isWrecked);
      if (!nearbyPolice) {
        this.escapeCooldown += dt;
        if (this.escapeCooldown >= 7.0 && this.heatLevel > 1) {
          // Təqibdən yayındı!
          const reward = HEAT_CONFIG[this.heatLevel].evasionReward;
          this.totalCreditsEarned += reward;
          this._addAlert(`PURSUIT EVADED! +$${reward}`, '#00ff66', 3.0);
          this._dispatch('onPursuitEvaded', { reward, previousHeat: this.heatLevel });
          this._dispatch('onAudioEvent', { cue: 'pursuit_evaded' });

          // Heat səviyyəsini 1 pillə azaldırıq
          this.heatLevel = Math.max(1, this.heatLevel - 1);
          this.heatProgress = 0.2;
          this.escapeCooldown = 0.0;
          this._dispatch('onHeatChange', { heatLevel: this.heatLevel });
        }
      } else {
        this.escapeCooldown = 0.0;
        this.heatProgress += heatGainRate * dt;
      }

      // Heat pilləsinin artması (Level Up 1 -> 5)
      if (this.heatProgress >= 1.0 && this.heatLevel < 5) {
        this.heatProgress = 0.0;
        this.heatLevel++;
        const cfg = HEAT_CONFIG[this.heatLevel];
        this._addAlert(`HEAT LEVEL ${this.heatLevel}: ${cfg.name}!`, cfg.color, 3.5);
        this._dispatch('onHeatChange', { heatLevel: this.heatLevel, config: cfg });
        this._dispatch('onAudioEvent', { cue: 'heat_escalation', heatLevel: this.heatLevel });
        this._dispatch('onScreenShake', { intensity: 14, duration: 0.5 });
      }
    }

    // ========================================================================
    // 6. DİREKTOR SPONS (Dinamik Trafik və Polis Doğulması)
    // ========================================================================
    _updateDirectorSpawns(dt, player) {
      const cfg = HEAT_CONFIG[this.heatLevel];

      // 1. Polis Spawn İntellekti
      const activePoliceCount = this.policeUnits.filter(u => !u.isWrecked).length;
      if (activePoliceCount < cfg.maxPolice && (this.time - this.lastSpawnTime) > cfg.spawnInterval) {
        this._spawnPoliceUnit(player, cfg);
        this.lastSpawnTime = this.time;
      }

      // 2. Blokada və Tikanlı Zolaq Doğulması (Heat 3+)
      if (this.heatLevel >= 3 && (player.z - this.lastRoadblockZ) > this.options.roadblockInterval) {
        this._spawnRoadblockWithSpikes(player.z + this.options.policeSpawnDistanceAhead);
        this.lastRoadblockZ = player.z;
      }

      // 3. SWAT Rhino Spawn (Heat 5)
      if (this.heatLevel >= 5 && Math.random() < 0.008 && !this.policeUnits.some(p => p.type === 'swat_rhino' && !p.isWrecked)) {
        this._spawnSwatRhino(player);
      }

      // 4. Helikopter Aktivləşdirmə (Heat 4 & 5)
      if (this.heatLevel >= 4 && !this.chopper.active) {
        this._activateChopper(player);
      } else if (this.heatLevel < 4 && this.chopper.active) {
        this.chopper.active = false;
      }

      // 5. Mülki Trafik Axını
      if (this.trafficUnits.length < this.options.maxTrafficCount) {
        this._spawnCivilianTraffic(player);
      }
    }

    /**
     * Polis maşınını arxipetə uyğun doğurmaq
     */
    _spawnPoliceUnit(player, cfg) {
      const eligibleTypes = cfg.allowedTypes.filter(t => t !== 'roadblock' && t !== 'chopper' && t !== 'swat_rhino');
      if (eligibleTypes.length === 0) return;

      const chosenType = (this.heatLevel >= 2 && Math.random() < 0.6) 
        ? 'highway_interceptor' 
        : 'patrol_cruiser';

      const arch = ARCHETYPES[chosenType];
      if (!arch) return;

      // Arxadan gəlmə (Heat 1 & 2 arxadan hücum edir)
      const spawnZ = player.z + this.options.policeSpawnDistanceBehind - randRange(10, 40);
      const spawnX = (Math.random() > 0.5 ? 1 : -1) * randRange(0.2, 0.7);

      const police = {
        id: getUniqueId('cop'),
        type: arch.type,
        name: arch.name,
        x: spawnX,
        z: spawnZ,
        y: 0,
        vx: 0,
        vz: (player.speed || 200) * 1.15, // Oyunçunu qovmaq üçün yüksək başlanğıc sürəti
        targetX: player.x,
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
        role: arch.role,
        state: 'pursuing', // 'pursuing', 'flanking', 'pit_executing', 'recovering'
        strobeTimer: 0,
        strobeState: false, // true = red, false = blue
        pitTimer: 0,
        flankSide: (Math.random() > 0.5 ? 1 : -1), // 1 = sağ, -1 = sol cinah
        hitboxW: arch.hitboxW,
        hitboxL: arch.hitboxL,
        takedownValue: arch.takedownValue,
        color: arch.color,
        accent: arch.accent
      };

      this.policeUnits.push(police);
      this._dispatch('onAudioEvent', { cue: 'siren_spawn', type: police.type });
    }

    /**
     * Heat 5 SWAT Rhino APC Spawner (Ağır zirehli əks zolaq canavarı)
     */
    _spawnSwatRhino(player) {
      const arch = ARCHETYPES.swat_rhino;
      // Qarşıdan, oyunçunun getdiyi zolağa yaxın mövqedən doğulur
      const spawnZ = player.z + this.options.rhinoSpawnDistanceAhead;
      // Oyunçunun getdiyi zolağın qarşısına hədəflənir
      const targetLane = clamp(player.x + (Math.random() * 0.4 - 0.2), -0.7, 0.7);

      const rhino = {
        id: getUniqueId('rhino'),
        type: 'swat_rhino',
        name: arch.name,
        x: targetLane,
        z: spawnZ,
        y: 0,
        vx: 0,
        vz: -arch.maxSpeed, // Əks istiqamətdə tam sürətlə irəliləyir!
        targetX: targetLane,
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
        role: arch.role,
        state: 'charging_head_on',
        strobeTimer: 0,
        strobeState: false,
        hitboxW: arch.hitboxW,
        hitboxL: arch.hitboxL,
        takedownValue: arch.takedownValue,
        color: arch.color,
        accent: arch.accent
      };

      this.policeUnits.push(rhino);
      this._addAlert('⚠️ WARNING: SWAT RHINO CHARGING ONCOMING!', '#ff0033', 3.0);
      this._dispatch('onAudioEvent', { cue: 'rhino_horn' });
      this._dispatch('onScreenShake', { intensity: 10, duration: 0.4 });
    }

    /**
     * Heat 3: Taktiki Blokadalar və Tikanlı Zolaqlar (Roadblocks & Spike Strips)
     */
    _spawnRoadblockWithSpikes(roadZ) {
      // Yol eni 3 zolaqdan ibarət hesab olunur: Sol (-0.6), Orta (0.0), Sağ (+0.6)
      // Təsadüfi bir keçid dəliyi (Evasion Gap) buraxırıq
      const gapIndex = Math.floor(Math.random() * 3); // 0 = Sol açıq, 1 = Orta açıq, 2 = Sağ açıq
      const lanes = [-0.62, 0.0, 0.62];

      const roadblockId = getUniqueId('blockade');

      lanes.forEach((laneX, idx) => {
        if (idx === gapIndex) {
          // Bu zolaq boş buraxılır, LAKİN Heat 4 və 5-də bu zolağın ortasına dar tikan zolağı qoyula bilər
          if (this.heatLevel >= 4 && Math.random() < 0.4) {
            this._deploySpikeStrip(laneX, roadZ, 0.35);
          }
          return;
        }

        // Qalan zolaqlara polis patrul maşını eninə və ya tikanlı baryer qoyulur
        if (Math.random() < 0.65) {
          // Blokada maşını (bucaq altında dayanıb)
          const arch = ARCHETYPES.patrol_cruiser;
          this.policeUnits.push({
            id: getUniqueId('roadblock_car'),
            type: 'roadblock_car',
            name: 'Roadblock Cruiser',
            x: laneX,
            z: roadZ + randRange(-5, 5),
            y: 0,
            vx: 0,
            vz: 0, // Tərpənməz maneə
            targetX: laneX,
            width: arch.length / 35.0, // Eninə durduğu üçün ölçülər dəyişir
            length: arch.width * 25.0,
            mass: arch.mass * 2.0,     // Əyləci çəkilib, kütləsi artıqdır
            maxSpeed: 0,
            handling: 0,
            health: 220,
            maxHealth: 220,
            isWrecked: false,
            wreckAngle: Math.PI / 3, // Bucaq altında dayanıb
            wreckSpinSpeed: 0,
            wreckSlideVx: 0,
            wreckSmokeTimer: 0,
            role: 'blockade',
            state: 'stationary',
            strobeTimer: 0,
            strobeState: true,
            hitboxW: 0.42,
            hitboxL: 12.0,
            takedownValue: 1200,
            color: '#1a1d2e',
            accent: '#ff0033'
          });
        } else {
          // Tikanlı zolaq (Spike Strip)
          this._deploySpikeStrip(laneX, roadZ, 0.50);
        }
      });

      this.roadblocks.push({
        id: roadblockId,
        z: roadZ,
        gapX: lanes[gapIndex],
        evaded: false
      });

      this._addAlert('⚠️ ROADBLOCK AHEAD! FIND THE GAP!', '#ffe600', 2.8);
      this._dispatch('onAudioEvent', { cue: 'roadblock_alert' });
    }

    /**
     * Tikanlı zolağın yerləşdirilməsi
     */
    _deploySpikeStrip(x, z, width = 0.45) {
      this.spikeStrips.push({
        id: getUniqueId('spike'),
        x: x,
        z: z,
        width: width,
        length: 4.5, // 4.5 metr dərinlik
        hitboxW: width,
        hitboxL: 4.0,
        triggered: false,
        deployedFromAir: false
      });
    }

    /**
     * Mülki Trafik Spawner
     */
    _spawnCivilianTraffic(player) {
      const typeKey = randChoice(['civilian_sedan', 'civilian_sports', 'civilian_truck']);
      const arch = ARCHETYPES[typeKey];

      // Həm qarşıdan, həm arxadan doğula bilər
      const isAhead = Math.random() < 0.85;
      const spawnZ = isAhead
        ? player.z + randRange(250, 750)
        : player.z - randRange(150, 300);

      const lanePositions = [-0.68, -0.34, 0.0, 0.34, 0.68];
      const spawnX = randChoice(lanePositions);

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
        isCivilian: true
      });
    }

    // ========================================================================
    // 7. POLİS HELİKOPTERİ AI (Heat 4 & 5 Aerial Spotlight & Spike Drops)
    // ========================================================================
    _activateChopper(player) {
      this.chopper.active = true;
      this.chopper.x = player.x;
      this.chopper.z = player.z - 50;
      this.chopper.y = 280.0;
      this.chopper.spotlight.x = player.x;
      this.chopper.spotlight.z = player.z;
      this.chopper.spotlight.isLocked = false;
      this.chopper.spotlight.lockTimer = 0.0;
      this.chopper.dropSpikeTimer = 6.0;

      this._addAlert('🚁 POLICE AIR CHOPPER DEPLOYED!', '#ff007f', 3.2);
      this._dispatch('onAudioEvent', { cue: 'chopper_enter' });
    }

    _updateChopperAI(dt, player) {
      if (!this.chopper.active) return;

      const chop = this.chopper;
      chop.rotorAngle = (chop.rotorAngle + dt * 45.0) % (Math.PI * 2);

      // Helikopter oyunçunun üstündə və bir qədər qabaqda uçur
      const idealZ = player.z + 40.0;
      const idealX = player.x * 0.7; // Kamera daxilində qalmaq üçün yüngül mərkəzləşmə

      chop.x = lerp(chop.x, idealX, dt * 1.8);
      chop.z = lerp(chop.z, idealZ, dt * 2.2);

      // Fənər (Spotlight) İdarəetməsi
      const spot = chop.spotlight;
      // Fənər şüası elastik şəkildə oyunçunu izləyir
      spot.x = lerp(spot.x, player.x, dt * 3.5);
      spot.z = lerp(spot.z, player.z + 10.0, dt * 4.0);
      spot.flicker = 0.95 + Math.sin(this.time * 24.0) * 0.05;

      // Oyunçu fənərin konusundadırmı?
      const dx = Math.abs(spot.x - player.x);
      const dz = Math.abs(spot.z - player.z);
      const isInsideBeam = dx < spot.radiusX && dz < spot.radiusZ;

      if (isInsideBeam) {
        spot.lockTimer += dt;
        if (spot.lockTimer >= 1.2 && !spot.isLocked) {
          spot.isLocked = true;
          this._addAlert('🎯 CHOPPER LOCKED ON! EVADE!', '#ff0033', 2.0);
          this._dispatch('onSpotlightLock', { locked: true });
          this._dispatch('onAudioEvent', { cue: 'spotlight_lock' });
        }
      } else {
        spot.lockTimer = Math.max(0, spot.lockTimer - dt * 2.0);
        if (spot.lockTimer === 0 && spot.isLocked) {
          spot.isLocked = false;
          this._dispatch('onSpotlightLock', { locked: false });
        }
      }

      // Havadan Tikan Atma (Aerial Spike Drop)
      chop.dropSpikeTimer -= dt;
      if (chop.dropSpikeTimer <= 0) {
        chop.dropSpikeTimer = randRange(8.0, 14.0);
        // Oyunçunun 250 metr qabağına tikan paketi atır
        const dropZ = player.z + randRange(260, 360);
        const dropX = clamp(player.x + randRange(-0.3, 0.3), -0.7, 0.7);

        this._deploySpikeStrip(dropX, dropZ, 0.55);
        this._addAlert('⚠️ AIR DROP SPIKES INCOMING!', '#ff007f', 2.5);
        this._dispatch('onAudioEvent', { cue: 'spike_drop' });
      }
    }

    // ========================================================================
    // 8. POLİS AVTOMOBİLLƏRİNİN AVTONOM AI DAVRANIŞLARI (Cruiser & Interceptor)
    // ========================================================================
    _updatePoliceVehicles(dt, player) {
      const cfg = HEAT_CONFIG[this.heatLevel];

      for (let i = 0; i < this.policeUnits.length; i++) {
        const cop = this.policeUnits[i];
        const maxSpd = cop.maxSpeed || 300;
        const handling = cop.handling || 1.8;

        // Yanıb-sönən mayakların (Strobe lightbar) taymeri
        cop.strobeTimer = (cop.strobeTimer || 0) + dt * cfg.strobeSpeed;
        if (cop.strobeTimer >= 1.0) {
          cop.strobeTimer = 0;
          cop.strobeState = !cop.strobeState; // Qırmızı <-> Göy dəyişməsi
        }

        // Qəzaya uğramış (Wrecked) maşının fizikası
        if (cop.isWrecked) {
          cop.z += (cop.vz * 5.0) * dt;
          cop.x += cop.wreckSlideVx * dt;
          cop.wreckAngle += cop.wreckSpinSpeed * dt;
          cop.vz *= 0.96; // Tədricən dayanır
          cop.wreckSlideVx *= 0.95;

          // Qara tüstü və qığılcım
          cop.wreckSmokeTimer -= dt;
          if (cop.wreckSmokeTimer <= 0) {
            cop.wreckSmokeTimer = 0.04;
            this._emitWreckSmoke(cop.x, cop.z);
          }
          continue;
        }

        // Stasionar Blokada Maşını
        if (cop.role === 'blockade') {
          continue;
        }

        // SWAT Rhino Head-on Hücum AI
        if (cop.role === 'head_on_ram') {
          cop.z += (cop.vz * 5.0) * dt; // Əks yolda irəliləyir
          // Oyunçunun zolağına doğru ləng, amma qətiyyətlə yönəlir
          const dX = player.x - cop.x;
          cop.x += Math.sign(dX) * Math.min(Math.abs(dX), cop.handling * 0.4 * dt);
          continue;
        }

        // Heat 1: Crown Patrul Kreyseri AI (Arxadan qovma və sıxışdırma)
        if (cop.type === 'patrol_cruiser') {
          this._updatePatrolCruiserAI(cop, player, dt);
        }

        // Heat 2: Corvette Interceptor AI (Yan cinahlardan aqressiv PIT manevri)
        else if (cop.type === 'highway_interceptor') {
          this._updateInterceptorAI(cop, player, dt);
        }
      }
    }

    /**
     * Heat 1: Patrul Kreyseri Taktikası (Crown Vic Boxing)
     */
    _updatePatrolCruiserAI(cop, player, dt) {
      const distZ = player.z - cop.z;

      // 1. Sürət İdarəsi (Catch-up boost və ya yaxınlaşma)
      const maxSpd = cop.maxSpeed || 280;
      const handling = cop.handling || 1.8;
      if (distZ > 30) {
        // Çox geridədir — sürəti artırır
        cop.vz = Math.min(maxSpd, (player.speed || 180) * 1.20 + 20);
      } else if (distZ < -20) {
        // Oyunçunu ötüb keçib — tormozlayır
        cop.vz = Math.max(80, (player.speed || 180) * 0.85);
      } else {
        // Bumper-to-bumper məsafəsi: sürəti oyunçu ilə eyniləşdirir
        cop.vz = lerp(cop.vz || 180, player.speed || 180, dt * 2.5);
      }

      // 2. Sıxışdırma (Boxing & Pinning)
      // Əgər arxadan çatırsa, oyunçunun yanına keçib onu yol kənarına doğru sıxışdırır
      if (Math.abs(distZ) < 35) {
        // Oyunçunu sol və ya sağ baryerə tərəf itələmə hədəfi seçir
        const pushDirection = player.x >= 0 ? 1.05 : -1.05;
        cop.targetX = lerp(player.x, pushDirection, 0.4);
      } else {
        // Arxadan oyunçunun izinə düzlənir
        cop.targetX = player.x;
      }

      // X koordinatı üzrə hərəkət
      const steerX = (cop.targetX - cop.x);
      cop.x += clamp(steerX * handling * dt, -0.04, 0.04);
      cop.z += ((cop.vz || 180) * 5.0) * dt;
    }

    /**
     * Heat 2: Corvette Interceptor PIT Manevri AI
     */
    _updateInterceptorAI(cop, player, dt) {
      const distZ = player.z - cop.z;
      const maxSpd = cop.maxSpeed || 330;
      const handling = cop.handling || 2.5;

      // Vəziyyət Maşını (State Machine): APPROACH -> FLANK -> EXECUTE_PIT -> RECOVER
      switch (cop.state || 'pursuing') {
        case 'pursuing': {
          // Arxadan sürətlə oyunçunun cinahına gəlir
          cop.vz = Math.min(maxSpd, (player.speed || 200) * 1.35 + 30);
          cop.targetX = player.x + (cop.flankSide || 1) * 0.42;

          if (Math.abs(distZ) < 25) {
            cop.state = 'flanking';
            cop.pitTimer = randRange(1.0, 2.2);
          }
          break;
        }

        case 'flanking': {
          // Oyunçunun arxa cinahında (rear quarter) mövqe saxlayır
          // Z məsafəsi: Oyunçudan 8-12 metr geridə
          const idealZ = player.z - 8.0;
          cop.vz = lerp(cop.vz || 200, (player.speed || 200), dt * 3.5);
          cop.z = lerp(cop.z, idealZ, dt * 4.0);

          cop.targetX = player.x + (cop.flankSide || 1) * 0.38;
          cop.pitTimer = (cop.pitTimer || 1.5) - dt;

          if (cop.pitTimer <= 0) {
            // PIT manevri başladılır!
            cop.state = 'pit_executing';
            cop.pitTimer = 0.9; // 900ms zərbə pəncərəsi
            this._addAlert('⚠️ WARNING: PIT MANEUVER INCOMING!', '#ff0055', 1.8);
            this._dispatch('onAudioEvent', { cue: 'pit_warning' });
          }
          break;
        }

        case 'pit_executing': {
          // Aqressiv lateral kəllə-çarx: Oyunçunun arxa təkər qövsünə doğru kəskin dönür!
          cop.targetX = player.x;
          // Güclü lateral zərbə impulsu
          const ramDirection = (player.x - cop.x);
          cop.x += Math.sign(ramDirection) * handling * 1.9 * dt;

          // Sürəti oyunçunun arxa cinahına kilidləyir
          cop.z = lerp(cop.z, player.z - 3.0, dt * 5.0);

          cop.pitTimer -= dt;
          if (cop.pitTimer <= 0) {
            cop.state = 'recovering';
            cop.pitTimer = 2.5;
            cop.flankSide = -(cop.flankSide || 1); // Növbəti dəfə o biri cinaha keçəcək
          }
          break;
        }

        case 'recovering': {
          // Uğursuz zərbədən sonra bir qədər geri çəkilir və yeni hücum hazırlayır
          cop.vz = (player.speed || 200) * 0.95;
          cop.targetX = (cop.flankSide || 1) * 0.65;
          cop.pitTimer -= dt;
          if (cop.pitTimer <= 0) {
            cop.state = 'pursuing';
          }
          break;
        }
      }

      // X koordinatının hamarlaşdırılmış inteqrasiyası
      if (cop.state !== 'pit_executing') {
        const steer = (cop.targetX - cop.x);
        cop.x += clamp(steer * handling * dt, -0.06, 0.06);
        cop.z += ((cop.vz || 200) * 5.0) * dt;
      }
    }

    // ========================================================================
    // 9. MÜLKİ TRAFİK AI (Zolaq Dəyişmə və Qaçış)
    // ========================================================================
    _updateTrafficVehicles(dt, player) {
      for (let i = 0; i < this.trafficUnits.length; i++) {
        const car = this.trafficUnits[i];

        if (car.isWrecked) {
          car.z += (car.vz * 5.0) * dt;
          car.x += car.wreckSlideVx * dt;
          car.wreckAngle += car.wreckSpinSpeed * dt;
          car.vz *= 0.95;
          car.wreckSlideVx *= 0.95;
          continue;
        }

        car.z += (car.vz * 5.0) * dt;

        // Dövri zolaq dəyişmə
        car.laneChangeTimer -= dt;
        if (car.laneChangeTimer <= 0) {
          car.laneChangeTimer = randRange(4.0, 10.0);
          const lanes = [-0.68, -0.34, 0.0, 0.34, 0.68];
          car.targetLane = randChoice(lanes);
        }

        // Əgər arxadan yüksək sürətlə oyunçu və ya sirenli polis gəlirsə, kənara çəkilir (Panic yield)
        const dZ = player.z - car.z;
        if (dZ < 0 && dZ > -70 && Math.abs(player.x - car.x) < 0.35) {
          // Oyunçu arxadan yaxınlaşır — sağa və ya sola çəkil
          car.targetLane = car.x > 0 ? 0.75 : -0.75;
        }

        const steer = car.targetLane - car.x;
        car.x += clamp(steer * car.handling * dt, -0.03, 0.03);
      }
    }

    // ========================================================================
    // 10. TOQQUŞMA, TAKEDOWN VƏ TİKAN ƏMƏLİYYATLARI (Collision & Physics)
    // ========================================================================
    _resolveCollisions(dt, player) {
      let screenShake = 0;
      let takedownOccurred = false;
      let spikeEvasionOccurred = false;

      const playerHitW = 0.22;
      const playerHitL = 75.0;

      // ----------------------------------------------------------------------
      // A. POLİS MAŞINLARI İLƏ TOQQUŞMALAR (Burnout Takedown Yoxlaması)
      // ----------------------------------------------------------------------
      for (let i = 0; i < this.policeUnits.length; i++) {
        const cop = this.policeUnits[i];
        if (cop.isWrecked) continue;

        const copHitW = cop.hitboxW || 0.22;
        const copHitL = cop.hitboxL ? (cop.hitboxL * 6.5) : 75.0;

        const dX = Math.abs(player.x - cop.x);
        const dZ = Math.abs(player.z - cop.z);

        const overlapX = (playerHitW + copHitW) * 0.5 - dX;
        const overlapZ = (playerHitL + copHitL) * 0.5 - dZ;

        // Əgər toxunma varsa:
        if (overlapX > 0 && overlapZ > 0) {
          // SWAT Rhino ilə toqquşma
          if (cop.type === 'swat_rhino') {
            screenShake = Math.max(screenShake, 35);
            this._addAlert('💥 HEAD-ON RHINO IMPACT!', '#ff0033', 2.5);
            this._dispatch('onAudioEvent', { cue: 'heavy_crash' });
            // Oyunçuya zərbə: sürət kəskin azalır
            player.speed = Math.max(30, (player.speed || 150) * 0.25);
            player.x += (player.x > cop.x ? 0.4 : -0.4);
            cop.health -= 80;
            this._emitSparkShower((player.x + cop.x) * 0.5, player.z, 70);
            continue;
          }

          // Burnout Takedown Şərtləri:
          // 1. Oyunçu Nitrodadırsa VƏ YA Driftdədirsə VƏ YA
          // 2. Nisbi toqquşma sürəti yüksəkdirsə (Delta V > 50 km/h) VƏ YA
          // 3. Oyunçu polisi çəpərə sıxışdırıbsa (|cop.x| >= 0.88)
          const relSpeed = (player.speed || 200) - cop.vz;
          const isDrifting = !!player.isDrifting;
          const isNitro = !!player.isNitro;
          const isWallPin = Math.abs(cop.x) >= 0.85;

          const qualifiesForTakedown = (isNitro || (isDrifting && Math.abs(player.driftAngle || 0) > 0.3) || relSpeed > 50 || isWallPin);

          if (qualifiesForTakedown) {
            // ================================================================
            // TAKEDOWN BAŞ VERDİ! (Burnout Style)
            // ================================================================
            cop.isWrecked = true;
            cop.health = 0;
            cop.wreckSpinSpeed = randRange(14.0, 24.0) * (cop.x > player.x ? 1 : -1);
            cop.wreckSlideVx = (cop.x > player.x ? 1 : -1) * randRange(1.8, 3.2);
            cop.vz = (player.speed || 200) * 0.4;

            // 1. Tələb olunan dəqiq 80ms Hit-stop dondurma taymeri!
            this.hitStopTimer = this.options.hitStopDuration;

            // 2. Qığılcım yağışı və zibil qırıntıları
            this._emitSparkShower((player.x + cop.x) * 0.5, cop.z, 90);
            this._emitDebris(cop.x, cop.z, 10);

            // 3. Kamera titrəməsi
            screenShake = Math.max(screenShake, 24);

            // 4. Mükafatlar: 100% Nitro bərpası və Pul
            const reward = cop.takedownValue || 1500;
            this.totalTakedowns++;
            this.totalCreditsEarned += reward;

            this._addAlert(`🔥 TAKEDOWN! +$${reward}`, '#ff007f', 3.0);
            takedownOccurred = true;

            this._dispatch('onTakedown', {
              copId: cop.id,
              copType: cop.type,
              reward: reward,
              nitroRefill: 1.0 // 100% nitro
            });
            this._dispatch('onAudioEvent', { cue: 'takedown' });
            this._dispatch('onScreenShake', { intensity: 24, duration: 0.45 });

          } else {
            // Adi yan toqquşma (Ramming bounce)
            const pushDir = player.x > cop.x ? 1 : -1;
            player.x += pushDir * 0.08;
            cop.x -= pushDir * 0.08;
            screenShake = Math.max(screenShake, 8);
            this._emitSparkShower((player.x + cop.x) * 0.5, player.z, 20);
            this._dispatch('onAudioEvent', { cue: 'metal_scrape' });
          }
        }
      }

      // ----------------------------------------------------------------------
      // B. TİKANLI ZOLAQLARLA TOQQUŞMA VƏ EVASION (Heat 3 Spikes)
      // ----------------------------------------------------------------------
      for (let i = 0; i < this.spikeStrips.length; i++) {
        const spike = this.spikeStrips[i];
        const spikeLen = spike.length || 4.5;
        const spikeHitW = spike.hitboxW || spike.width || 0.45;
        const spikeHitL = spike.hitboxL || spikeLen;
        const spikeCenterZ = spike.z + spikeLen * 0.5;

        const dX = Math.abs(player.x - spike.x);
        const dZ = Math.abs(player.z - spikeCenterZ);

        const overlapX = (playerHitW + spikeHitW) * 0.5 - dX;
        const overlapZ = (playerHitL + spikeHitL) * 0.5 - dZ;

        // Tikanlara toxunma (Bounding Box Overlap)
        if (!spike.triggered && overlapX > 0 && overlapZ > 0) {
          // Əgər oyunçunun 'phaseShift' qabiliyyəti (Phantom car) aktivdirsə, ziyansız keçir
          if (player.phaseShift || player.isInvulnerable) {
            this._addAlert('PHASE CLOAK: SPIKES BYPASSED!', '#9d00ff', 2.0);
            spike.triggered = true;
            continue;
          }

          // TƏKƏR PARTLAYIŞI! (Tire Blowout)
          spike.triggered = true;
          this.blowoutRemaining = 4.0; // 4 saniyəlik partlaq təkər
          screenShake = Math.max(screenShake, 22);

          this._emitSparkShower(player.x, player.z, 60);
          this._addAlert('💥 TIRE BLOWOUT! SPEED CAPPED AT 80 KM/H!', '#ff0033', 3.5);

          this._dispatch('onSpikeBlowout', { duration: 4.0, maxSpeed: 80 });
          this._dispatch('onAudioEvent', { cue: 'tire_blowout' });
          this._dispatch('onScreenShake', { intensity: 22, duration: 0.5 });
        }

        // Tikanlardan yan keçmə (Spike Evasion Bonusu)
        // Oyunçu tikan zolağını tam geridə qoyduqda (arxa bufer tikanı ötüb):
        const playerRearZ = player.z - playerHitL * 0.5;
        if (playerRearZ > spike.z + spikeLen && !this.spikesPassedIds.has(spike.id)) {
          this.spikesPassedIds.add(spike.id);
          // Əgər toxunulmayıbsa və oyunçu kifayət qədər yaxınlıqdan (dX < 0.65) keçibsə:
          if (!spike.triggered && dX < 0.65) {
            spikeEvasionOccurred = true;
            const reward = 1000;
            this.totalCreditsEarned += reward;
            this._addAlert(`⚡ SPIKE EVASION! +$${reward}`, '#00f5ff', 2.2);
            this._dispatch('onSpikeEvasion', { spikeId: spike.id, reward });
            this._dispatch('onAudioEvent', { cue: 'spike_evasion' });
          }
        }
      }

      // ----------------------------------------------------------------------
      // C. MÜLKİ MAŞINLARLA TOQQUŞMA VƏ NEAR-MISS
      // ----------------------------------------------------------------------
      for (let i = 0; i < this.trafficUnits.length; i++) {
        const civ = this.trafficUnits[i];
        if (civ.isWrecked) continue;

        const civHitW = civ.hitboxW || civ.width || 0.28;
        const civHitL = civ.hitboxL || civ.length || 12.0;
        const dX = Math.abs(player.x - civ.x);
        const dZ = Math.abs(player.z - civ.z);

        // Toqquşma
        if (dX < (playerHitW + civHitW) * 0.5 && dZ < (playerHitL + civHitL) * 0.5) {
          civ.isWrecked = true;
          civ.wreckSpinSpeed = randRange(10, 18) * (civ.x > player.x ? 1 : -1);
          civ.wreckSlideVx = (civ.x > player.x ? 1 : -1) * randRange(1.2, 2.4);
          player.speed = Math.max(60, (player.speed || 180) * 0.65);
          screenShake = Math.max(screenShake, 15);
          this._emitSparkShower((player.x + civ.x) * 0.5, player.z, 40);
          this._dispatch('onAudioEvent', { cue: 'traffic_crash' });
        }
        // Near-Miss (Təhlükəli Yaxın Ötmə Bonusu)
        else if (dX < 0.32 && dZ < 15.0 && (player.speed || 0) > 200 && !civ.nearMissAwarded) {
          civ.nearMissAwarded = true;
          this.totalCreditsEarned += 150;
          this._addAlert('⚡ NEAR MISS! +$150', '#00f5ff', 1.2);
          this._dispatch('onAudioEvent', { cue: 'near_miss' });
        }
      }

      return { screenShake, takedownOccurred, spikeEvasionOccurred };
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

    _addAlert(text, color = '#ffffff', duration = 2.0) {
      this.activeAlerts.push({
        id: getUniqueId('alert'),
        text,
        color,
        duration,
        timeRemaining: duration
      });
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
      // Arxada çox uzaqda qalan (> 400m) və ya qabaqda çox uzaqda olanları silirik
      this.policeUnits = this.policeUnits.filter(cop => {
        const dZ = cop.z - playerZ;
        return dZ > -350 && dZ < 1500;
      });

      this.trafficUnits = this.trafficUnits.filter(car => {
        const dZ = car.z - playerZ;
        return dZ > -300 && dZ < 1200;
      });

      this.spikeStrips = this.spikeStrips.filter(s => {
        const dZ = s.z - playerZ;
        return dZ > -150 && dZ < 1600;
      });

      this.roadblocks = this.roadblocks.filter(b => {
        const dZ = b.z - playerZ;
        return dZ > -200 && dZ < 1800;
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
    _dispatch(eventName, data) {
      if (typeof this.options[eventName] === 'function') {
        try {
          this.options[eventName](data);
        } catch (err) {
          console.error(`[NeonPursuitAI] Event error in ${eventName}:`, err);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 15. İxrac və Qlobal Təyinat
  // --------------------------------------------------------------------------
  const ExportModule = {
    NeonPursuitAI,
    HEAT_CONFIG,
    ARCHETYPES
  };

  if (typeof window !== 'undefined') {
    window.NeonPursuitAI = NeonPursuitAI;
    window.NeonRacerAI = ExportModule;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportModule;
  }

})(typeof window !== 'undefined' ? window : globalThis);
