/**
 * NEON VELOCITY: KİNETİK AVTOMOBİL FİZİKASI VƏ TRANSMİSSİYA MODULU
 * Modul: Vehicle Kinematics, Pacejka Drift & Suspension Dynamics
 * Fayl: src/vehicle_physics.js
 * Qlobal Obyekt: window.NeonVehiclePhysics
 * Məsul Agent: physics_juice_specialist (Agent 20)
 *
 * Xüsusiyyətlər:
 * 1. Multi-Gear Transmissiya: 1-6 ötürmə + Reverse, Debraj (clutch), Shift-kick zərbəsi, RPM əyrisi (0-9000 RPM, 7500 redline, 8800 hard-cut).
 * 2. Egzoz Backfire & Crackle: Ötürmə dəyişməsi, redline limiter və qaz buraxıldıqda alov partlayışları.
 * 3. Pacejka Magic Formula & Nyuton Slip-Angle Drift: Statik zona, kritik sürüşmə bucağı, əks-sükan (counter-steering) tarazlığı.
 * 4. 1.5s Təmiz Drift Çıxışında Mini-Turbo Partlayışı (+25% sürət, plazma alovları, zoom-punch).
 * 5. Handbrake (SPACE/Down): Arxa təkərlərin ani kilidlənməsi, arxa tutuşun 80% itirilməsi və kəskin driftə snap-oversteer girişi.
 * 6. 2-DOF Asqı Meyilliliyi (Suspension Body Roll & Pitch): Dönüşlərdə gövdənin yana yatması (roll), tormozda önün çökməsi (dive), qazda arxanın oturması (squat).
 * 7. Skid Marks (Təkər İzləri) & Particle Puff System: Sıfır-zibil (Zero-GC) ring buffer ilə asfaltda rezin izləri, tüstü və qığılcım generatoru.
 */

(function () {
  'use strict';

  // --- PACEJKA "MAGIC FORMULA" KÖMƏKÇİSİ ---
  const PACEJKA = {
    B: 10.0,   // Stiffness factor
    C: 1.65,   // Shape factor
    D: 1.00,   // Peak friction coefficient (mu)
    E: -0.60,  // Curvature factor
    /**
     * Slip-angle (alpha rad) əsasında yan sürtünmə əmsalını hesablayır
     * Fy = D * sin(C * atan(B * alpha - E * (B * alpha - atan(B * alpha))))
     */
    calculateLateralFriction: function (alpha, customMu) {
      const peak = customMu || this.D;
      const bAlpha = this.B * alpha;
      const atanBAlpha = Math.atan(bAlpha);
      const inner = bAlpha - this.E * (bAlpha - atanBAlpha);
      return peak * Math.sin(this.C * Math.atan(inner));
    }
  };

  /**
   * 1-dən 6-cı ötürməyə qədər transmissiya və mühərrik parametrləri
   */
  const TRANSMISSION_SPECS = {
    gearRatios: {
      '-1': -3.50, // Geri ötürmə (Reverse)
      0: 0.00,     // Neytral (Neutral)
      1: 3.82,     // 1-ci ötürmə: 0 - 65 km/h
      2: 2.36,     // 2-ci ötürmə: 55 - 115 km/h
      3: 1.68,     // 3-cü ötürmə: 105 - 170 km/h
      4: 1.31,     // 4-cü ötürmə: 155 - 225 km/h
      5: 1.00,     // 5-ci ötürmə: 210 - 285 km/h
      6: 0.79      // 6-cı ötürmə: 270 - 360+ km/h
    },
    finalDrive: 3.73,
    tireRadius: 0.33,       // metr (təkər radiusu)
    idleRPM: 1000,
    peakTorqueRPM: 5200,
    redlineRPM: 7500,
    limiterCutRPM: 8800,
    maxRPM: 9200,
    shiftDuration: 0.12,    // Debraj ayrılma müddəti (saniyə)
    shiftKickForce: 420.0   // Ötürmə bağlananda mikro-itələmə qüvvəsi
  };

  /**
   * Avtomobil Kinematikası və Fiziki Dinamika Sinifi
   */
  class VehiclePhysicsEngine {
    constructor(config = {}) {
      this.config = Object.assign({
        mass: 1250,               // Avtomobilin kütləsi (kq)
        wheelbase: 2.65,          // Təkər bazası (L = Lf + Lr) metr
        trackWidth: 1.80,         // Təkər eni (metr)
        weightDistrFront: 0.52,   // Kütlə bölgüsü: 52% ön, 48% arxa
        baseTopSpeed: 320,        // Maksimum dizayn sürəti (km/h)
        baseHorsepower: 580,      // Mühərrik gücü (a.g.)
        peakTorque: 650,          // Mühərrik fırlanma anı (Nm)
        brakeTorque: 3800,        // Əyləc qüvvəsi momenti (Nm)
        handbrakeBrakeFactor: 0.82, // Handbrake zamanı arxa təkərlərin ani bloklanması
        tireGripBase: 1.15,       // Standart şin tutuş əmsalı
        driftGripDrop: 0.52,      // Sürüşmədə şin tutuşu itkisi
        aerodynamicDrag: 0.33,    // Cd hava müqaviməti
        rollingResistance: 14.0,  // Təkər diyirlənmə sürtünməsi
        // --- Added by the v6 physics fix (all optional, all overridable) ---
        nitroTopSpeedBonus: 0.08,   // top-speed ceiling raise while nitro is held (+8%)
        miniTurboTopSpeedBonus: 0.05, // ceiling raise while the mini-turbo is active (+5%)
        topSpeedSoftZone: 0.025,    // drive force fades to 0 over the last 4% below the ceiling
        minDriftSpeedKmh: 35,       // drift entry/sustain/scoring gate
        driftScoreMult: 2.0,        // points multiplier (ARCADE_SPEC driftScoreMult)
        driftScoreSlipCapRad: 1.05, // slip angle above this (~60 deg) earns no extra points
        nitroDuration: 4.2,         // seconds of nitro from a full tank (ARCADE_SPEC)
        wallRestitution: 0.5,       // lateral bounce off a guardrail
        wallBaseLossPerSec: 0.10,   // fraction of forward speed lost per second of grinding
        wallMaxLossPerSec: 0.22,    // hard cap on that fraction (never above 25 %/s)
        wallMinImpactSpeed: 3.0     // m/s of normal speed that counts as an "impact" (shake/audio)
      }, config);

      // --- Upgrade / stat hooks (multipliers, 1.0 = stock). See setStats() ---
      this.stats = { topSpeed: 1, accel: 1, handling: 1, nitroCapacity: 1, nitroPower: 1 };
      this.nitroCapacity = 100;    // tank size racer.html should use instead of a literal 100
      this.topSpeedKmh = this.config.baseTopSpeed; // effective stock+upgrade ceiling
      this.gearScale = 1;          // final-drive scaling so 6th gear tops out at the ceiling
      this._ceilingMs = this.config.baseTopSpeed / 3.6 * 1.025; // smoothed top-speed ceiling (m/s)
      this.driftScore = 0;         // float accumulator (points), never rounded
      this.driftScoreRate = 0;     // points per second right now (0 when gated)
      this.miniTurboCount = 0;
      this.wallContactTime = 0;    // seconds of continuous guardrail contact
      this.wallImpactCooldown = 0;
      this._wallSparkAccum = 0;
      this.onEvent = null;         // optional callback(name, detail)
      // Reused every update(): zero GC. See update() for the field list.
      this.stepResult = {
        miniTurbo: false, miniTurboActive: false, miniTurboCount: 0,
        driftScoreDelta: 0, driftScore: 0, driftScoreRate: 0, drifting: false,
        spinout: false, shifted: false, backfire: 0
      };
      this.wallResult = {
        collided: false, resolvedLaneX: 0, side: 0, impact: false, normalSpeed: 0,
        impactSpeed: 0, lossPerSec: 0, energy: 0, sparks: 0, shake: 0, rumble: 0, scrape: 0
      };
      this._applyStats();

      // --- Kinematik Mövqe və Hərəkət Vektorları ---
      this.x = 0;                  // Dünya X (və ya yolda lateral ofset [-1.0 .. 1.0])
      this.y = 0;                  // Hündürlük / Elevation
      this.z = 0;                  // Yolda qət edilən məsafə (m)
      
      this.velocityLong = 0;       // Boyuna sürət (m/s)
      this.velocityLat = 0;        // Eninə / yan sürət (m/s)
      this.speedKmh = 0;           // km/h vahidində ekran sürəti
      this.accelerationLong = 0;   // Boyuna təcil (m/s^2)
      this.accelerationLat = 0;    // Yan təcil / mərkəzdənqaçma (m/s^2)
      this.headingAngle = 0;       // Avtomobilin gövdə bucağı (rad)
      this.yawRate = 0;            // Dönmə bucaq sürəti (rad/s)
      this.steerAngle = 0;         // Sükanın hazırkı bucağı (rad)
      this.targetSteerAngle = 0;   // Sürücünün sükan tələbi ([-0.45 .. +0.45] rad)

      // --- Transmissiya və RPM Vəziyyəti ---
      this.gear = 1;               // Hazırkı ötürmə (1 - 6, -1: R, 0: N)
      this.targetGear = 1;
      this.rpm = TRANSMISSION_SPECS.idleRPM;
      this.clutchDisengaged = false;
      this.shiftTimer = 0;
      this.limiterBounceTimer = 0;
      this.limiterCutActive = false;
      this.autoShift = true;       // Avtomatik transmissiya rejimi

      // --- Backfire və Egzoz Sistemi ---
      this.backfireTimer = 0;
      this.backfireIntensity = 0;
      this.backfireFlames = [];    // Aktiv alovlar [{ side: 'left'|'right', size, life }]
      this.lastThrottle = 0;

      // --- Pacejka & Drift Dinamikası ---
      this.slipAngleFront = 0;     // Ön təkər sürüşmə bucağı (rad)
      this.slipAngleRear = 0;      // Arxa təkər sürüşmə bucağı (rad)
      this.overallSlipAngle = 0;   // Ümumi gövdə sürüşmə bucağı (drift angle)
      this.isDrifting = false;
      this.driftDuration = 0;      // Fasiləsiz təmiz drift müddəti (saniyə)
      this.driftDirection = 0;     // -1 (sol), +1 (sağ), 0 (düz)
      this.counterSteerScore = 0;  // Əks-sükan tarazlıq balı
      this.isSpinout = false;      // Aşırı sürüşmə nəticəsində fırlanma
      this.spinoutTimer = 0;

      // --- Mini-Turbo Boost Sistemi ---
      this.miniTurboCharge = 0;    // 0.0 .. 1.0 (1.5s drift ilə dolur)
      this.miniTurboReady = false;
      this.miniTurboActive = false;
      this.miniTurboTimer = 0;
      this.miniTurboDuration = 1.5;// 1.5s boost müddəti
      this.miniTurboMultiplier = 1.25; // +25% sürət və güc

      // --- Handbrake Vəziyyəti ---
      this.handbrakeActive = false;
      this.rearWheelsLocked = false;

      // --- Asqı və Gövdə Meyilliliyi (Roll & Pitch 2-DOF) ---
      this.suspension = {
        rollAngle: 0,              // Gövdənin yana meyilliliyi (rad)
        rollVelocity: 0,
        pitchAngle: 0,             // Gövdənin ön/arxa çökməsi (rad)
        pitchVelocity: 0,
        springStiffnessRoll: 48.0, // Yay sərtliyi
        dampingRoll: 7.2,          // Amortizator sönməsi
        springStiffnessPitch: 55.0,
        dampingPitch: 8.5,
        squatFactor: 0.0016,       // Qaz anında arxaya yatma əmsalı
        diveFactor: 0.0028,        // Əyləc anında önə çöküş əmsalı
        rollFactor: 0.0024         // Dönüşdə xaricə əyilmə əmsalı
      };

      // --- Asfaltdakı Təkər İzləri (Skid Marks) və Zərrəciklər ---
      this.skidMarksManager = new SkidMarkManager(700);
      this.particleManager = new VehicleParticleManager(350);

      // Daxili təkər koordinat ofsetləri (gövdə mərkəzinə görə)
      const halfW = this.config.trackWidth * 0.5;
      const frontL = this.config.wheelbase * (1 - this.config.weightDistrFront);
      const rearL = this.config.wheelbase * this.config.weightDistrFront;
      this.wheelOffsets = {
        fl: { x: -halfW, z: frontL },
        fr: { x: halfW, z: frontL },
        rl: { x: -halfW, z: -rearL },
        rr: { x: halfW, z: -rearL }
      };
    }

    // ------------------------------------------------------------------
    // Upgrade / stat hooks
    // ------------------------------------------------------------------
    /** Recompute everything derived from config + this.stats. Safe to call any time. */
    _applyStats() {
      const st = this.stats;
      const clampM = (v) => Math.max(0.5, Math.min(3, Number(v) || 1));
      st.topSpeed = clampM(st.topSpeed); st.accel = clampM(st.accel); st.handling = clampM(st.handling);
      st.nitroCapacity = clampM(st.nitroCapacity); st.nitroPower = clampM(st.nitroPower);
      this.topSpeedKmh = this.config.baseTopSpeed * st.topSpeed;
      this.nitroCapacity = 100 * st.nitroCapacity;
      // Scale all gears so 6th gear reaches ~7300 rpm just above the ceiling (+3 %):
      // the stated top speed is then really reachable and not far exceeded.
      const sp = TRANSMISSION_SPECS;
      const circ = 2 * Math.PI * sp.tireRadius;
      const vCeil = (this.topSpeedKmh / 3.6) * 1.03;
      const scale = (7300 / 60 * circ) / (sp.gearRatios[6] * sp.finalDrive * vCeil);
      this.gearScale = Math.max(0.6, Math.min(1.5, scale));
    }

    /**
     * Apply upgrade multipliers (1.0 = stock). Any subset of
     * { topSpeed, accel, handling, nitroCapacity, nitroPower }.
     * topSpeed scales the km/h ceiling, accel scales engine torque, handling scales
     * tyre grip and steering response, nitroCapacity scales the tank (this.nitroCapacity,
     * 100 = stock), nitroPower scales the nitro torque bonus.
     */
    setStats(partial) {
      if (partial) Object.assign(this.stats, partial);
      this._applyStats();
      return this.getStats();
    }

    getStats() {
      return Object.assign({ topSpeedKmh: this.topSpeedKmh, nitroCapacity: this.nitroCapacity }, this.stats);
    }

    /** Nitro tank units per second racer.html should drain (full tank lasts config.nitroDuration s). */
    getNitroDrainPerSecond() {
      return 100 / this.config.nitroDuration;
    }

    /** Gear ratio including the per-car gearScale. */
    _ratio(gear) {
      const r = TRANSMISSION_SPECS.gearRatios[gear];
      return r ? r * this.gearScale : 1.0;
    }

    /**
     * Hər fiziki kadrda avtomobilin bütün sistemlərini yeniləyir.
     * @param {number} dt - Addım zamanı (saniyə)
     * @param {object} inputs - { throttle: 0..1, brake: 0..1, steer: -1..1, handbrake: boolean, nitro: boolean, shiftUp: boolean, shiftDown: boolean }
     * @param {object} environment - { roadCurve: number, roadElevation: number, roadFriction: number }
     */
    update(dt, inputs = {}, environment = {}) {
      const r = this.stepResult;
      r.miniTurbo = false; r.driftScoreDelta = 0; r.spinout = false; r.shifted = false; r.backfire = 0;
      const total = Math.min(Math.max(isFinite(dt) && dt > 0 ? dt : 0.016, 0.001), 0.2);
      // Long frames are split so integration stays stable and dt-independent (<= ~1/30 s each).
      const n = Math.max(1, Math.ceil(total / 0.034));
      const h = total / n;
      let sub = inputs;
      for (let i = 0; i < n; i++) {
        this._step(h, sub, environment);
        if (i === 0 && n > 1 && (inputs.shiftUp || inputs.shiftDown)) {
          sub = Object.assign({}, inputs, { shiftUp: false, shiftDown: false });
        }
      }
      r.miniTurboActive = this.miniTurboActive;
      r.miniTurboCount = this.miniTurboCount;
      r.driftScore = this.driftScore;
      r.driftScoreRate = this.driftScoreRate;
      r.drifting = this.isDrifting;
      return r;
    }

    /** One fixed integration step of length safeDt (<= ~0.034 s). */
    _step(safeDt, inputs = {}, environment = {}) {

      // 1. Giriş siqnallarını normallaşdır
      const throttleInput = Math.max(0, Math.min(1, inputs.throttle || 0));
      const brakeInput = Math.max(0, Math.min(1, inputs.brake || 0));
      const steerInput = Math.max(-1, Math.min(1, inputs.steer || 0));
      const handbrakeInput = Boolean(inputs.handbrake);
      const nitroInput = Boolean(inputs.nitro);
      const roadCurve = environment.roadCurve || 0;
      const roadFriction = environment.roadFriction || 1.0;

      this.handbrakeActive = handbrakeInput;

      // 2. Transmissiya və RPM İdarəetməsi
      this._updateTransmission(safeDt, throttleInput, brakeInput, inputs.shiftUp, inputs.shiftDown);

      // 3. Sükan idarəetməsi (Sürətlə azalan dinamik sükan bucağı)
      this._updateSteering(safeDt, steerInput);

      // 4. Pacejka Lateral Qüvvələri və Nyuton Tənlikləri
      this._updateKinematicsAndDrift(safeDt, throttleInput, brakeInput, nitroInput, roadCurve, roadFriction);

      // 5. Mini-Turbo Yoxlanışı və İdarəsi
      this._updateMiniTurbo(safeDt);

      // 6. Asqı Dinamikası (Roll & Pitch Hesablanması)
      this._updateSuspensionDynamics(safeDt);

      // 7. Egzoz Backfire və Alov Zərrəcikləri
      this._updateBackfireAndParticles(safeDt, throttleInput, nitroInput);

      // 8. Təkər İzləri (Skid Marks) Generasiyası
      this._updateSkidMarks(safeDt);

      this.lastThrottle = throttleInput;
    }

    /**
     * Dərin Multi-Gear Transmissiya və RPM Əyrisi Simulyasiyası
     */
    _updateTransmission(dt, throttle, brake, manualShiftUp, manualShiftDown) {
      const specs = TRANSMISSION_SPECS;

      // Manuel ötürmə dəyişməsi əmrləri
      if (manualShiftUp && this.gear < 6 && this.shiftTimer <= 0) {
        this._shiftToGear(this.gear + 1);
      } else if (manualShiftDown && this.gear > 1 && this.shiftTimer <= 0) {
        this._shiftToGear(this.gear - 1);
      }

      // Shift taymerinin azalması (Debraj ayrılma dövrü)
      if (this.shiftTimer > 0) {
        this.shiftTimer -= dt;
        this.clutchDisengaged = true;
        // Debraj açıq olanda RPM sürətlə yeni ötürmənin gözlənilən dövrünə doğru gedir
        const targetRPM = this._calculateRPMForSpeed(this.velocityLong, this.gear);
        this.rpm += (targetRPM - this.rpm) * (1 - Math.exp(-22 * dt));
        if (this.shiftTimer <= 0) {
          this.clutchDisengaged = false;
          // Ötürmə tam oturduqda "Shift-Kick" mikro itələməsi yaradılır!
          this._triggerShiftKick();
        }
        return;
      }

      // Təkər sürətinə əsasən ötürmə qutusundan gələn nəzəri RPM
      const currentGearRatio = this._ratio(this.gear);
      const wheelCircumference = 2 * Math.PI * specs.tireRadius;
      const wheelRps = Math.max(0, this.velocityLong) / wheelCircumference;
      let driveRPM = wheelRps * currentGearRatio * specs.finalDrive * 60;

      // Əgər qaz basılıbsa və təkərlər boş fırlanırsa və ya aşağı sürətdədirsə
      if (driveRPM < specs.idleRPM) {
        driveRPM = specs.idleRPM + throttle * 1200;
      }

      // Qaz əlavəsi və rev limiter dinamikası
      if (throttle > 0 && !this.clutchDisengaged) {
        const powerBandBonus = Math.max(0, 1 - Math.abs(driveRPM - specs.peakTorqueRPM) / 4500) * 450;
        driveRPM += throttle * powerBandBonus;
      }

      // RPM Limiter Hard-Cut (8800 RPM Redline kəsilməsi)
      if (driveRPM >= specs.limiterCutRPM) {
        this.limiterBounceTimer += dt;
        this.limiterCutActive = true;
        // 8800-də osilyasiya ("brap-brap-brap" effekti)
        const bouncePhase = Math.sin(this.limiterBounceTimer * 45);
        this.rpm = specs.limiterCutRPM - 250 + bouncePhase * 280;

        // Limiterdə yanmamış yanacaq egzozda partlayır
        if (Math.random() < 1 - Math.exp(-19.7 * dt)) { // 28 %/frame at 60 Hz
          this.triggerBackfire(0.65);
        }
      } else {
        this.limiterCutActive = false;
        this.limiterBounceTimer = 0;
        this.rpm = Math.max(specs.idleRPM, Math.min(specs.maxRPM, driveRPM));
      }

      // Avtomatik Transmissiya Məntiqi (Auto Shift Up / Down)
      if (this.autoShift && this.shiftTimer <= 0) {
        // Redline yaxınlığında (7300+ RPM) yuxarı ötürməyə keç
        if (this.rpm >= 7300 && this.gear < 6 && this.velocityLong > 5) {
          this._shiftToGear(this.gear + 1);
        }
        // Aşağı dövrlərdə (3000 RPM-dən aşağı düşəndə və sürət azaldıqda) aşağı ötürməyə keç
        else if (this.rpm < 2900 && this.gear > 1) {
          const lowerGearRatio = this._ratio(this.gear - 1);
          const predictedLowerRPM = wheelRps * lowerGearRatio * specs.finalDrive * 60;
          if (predictedLowerRPM < 6800) {
            this._shiftToGear(this.gear - 1);
          }
        }
      }

      // 6000+ RPM-də qaz ani buraxıldıqda egzoz crackle & pop
      if (this.lastThrottle > 0.7 && throttle < 0.1 && this.rpm > 5500) {
        this.triggerBackfire(0.85);
      }
    }

    /**
     * Müəyyən sürət və ötürmə üçün mühərrik RPM-ni hesablayır
     */
    _calculateRPMForSpeed(speedMs, gear) {
      const specs = TRANSMISSION_SPECS;
      const ratio = this._ratio(gear);
      const wheelCircumference = 2 * Math.PI * specs.tireRadius;
      const rps = Math.max(0, speedMs) / wheelCircumference;
      return Math.max(specs.idleRPM, Math.min(specs.maxRPM, rps * ratio * specs.finalDrive * 60));
    }

    /**
     * Ötürmə dəyişməsi başladır
     */
    _shiftToGear(newGear) {
      if (newGear === this.gear || newGear < 1 || newGear > 6) return;
      this.gear = newGear;
      this.shiftTimer = TRANSMISSION_SPECS.shiftDuration;
      this.clutchDisengaged = true;
      this.stepResult.shifted = true;

      // Yuxarı ötürməyə keçəndə həmişə aqressiv backfire alovu çıxır
      this.triggerBackfire(0.9);

      // Asqıda yüngül ötürmə silkələnməsi (pitch jerk)
      this.suspension.pitchVelocity += 0.08;
    }

    /**
     * Debraj qapandıqda yaranan mikro-itələmə (Shift-Kick)
     */
    _triggerShiftKick() {
      // Yüksək ötürmələrdə və qaz basılı olanda güclü boyuna təkan
      const kickImpulse = (TRANSMISSION_SPECS.shiftKickForce / this.config.mass) * (7 - this.gear) * 0.28;
      this.velocityLong += kickImpulse;
      this.suspension.pitchVelocity -= 0.14; // Arxaya çöküş impulsu

      // Oyun suyu: Ekran silkələnməsi və ya partlayış triggeri
      if (typeof window !== 'undefined' && window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(3.5, 0.12);
      }
    }

    /**
     * Sürətdən asılı dinamik sükan bucağının hesablanması
     */
    _updateSteering(dt, steerInput) {
      // Sürət artdıqca avtomobili sabit saxlamaq üçün maksimum sükan bucağı azalır
      const speed = Math.max(0, this.velocityLong);
      const speedFactor = Math.max(0.25, 1.0 - (speed / 100) * 0.65);
      const maxSteer = 0.44 * speedFactor; // radyan (~25 dərəcə maksimum)

      this.targetSteerAngle = steerInput * maxSteer;

      // Sükanın dönmə ətaləti (steering response lerp)
      const steerSpeed = 14.0 * this.stats.handling;
      this.steerAngle += (this.targetSteerAngle - this.steerAngle) * (1 - Math.exp(-steerSpeed * dt));
    }

    /**
     * Pacejka Magic Formula, Nyuton tənlikləri və Drift Dinamikası
     */
    _updateKinematicsAndDrift(dt, throttle, brake, nitro, roadCurve, roadFriction) {
      const cfg = this.config;
      const specs = TRANSMISSION_SPECS;

      // 1. Mühərrik Qüvvəsi (Tractive Force)
      let engineTorque = 0;
      if (!this.clutchDisengaged && !this.limiterCutActive && throttle > 0) {
        // Tork əyrisi: peakTorqueRPM ətrafında maksimum
        const rpmNorm = (this.rpm - specs.idleRPM) / (specs.maxRPM - specs.idleRPM);
        const torqueCurve = Math.sin(Math.max(0, Math.min(Math.PI, rpmNorm * Math.PI)));
        engineTorque = cfg.peakTorque * (0.45 + 0.55 * torqueCurve) * throttle * this.stats.accel;

        // Nitro aktivdirsə +45% güc artımı (x nitroPower stat)
        if (nitro) {
          engineTorque *= 1 + 0.45 * this.stats.nitroPower;
        }
        // Mini-Turbo aktivdirsə +25% güc
        if (this.miniTurboActive) {
          engineTorque *= this.miniTurboMultiplier;
        }
      }

      const gearRatio = this._ratio(this.gear);
      const wheelDriveTorque = engineTorque * gearRatio * specs.finalDrive * 0.88; // %88 ötürücü faydalı iş əmsalı
      let tractiveForce = wheelDriveTorque / specs.tireRadius;

      // Top-speed governor: ceiling = topSpeed (+ nitro / mini-turbo headroom), smoothed so
      // the headroom fades out over ~0.5 s. Drive force fades to 0 in the last few percent;
      // drag then pulls any overshoot (e.g. the mini-turbo kick) back down.
      const topMs = this.topSpeedKmh / 3.6;
      const ceilTarget = topMs * (1.025 + (nitro && throttle > 0 ? cfg.nitroTopSpeedBonus : 0) +
                                      (this.miniTurboActive ? cfg.miniTurboTopSpeedBonus : 0));
      this._ceilingMs += (ceilTarget - this._ceilingMs) * (1 - Math.exp(-6 * dt));
      const fade = Math.max(0, Math.min(1, (this._ceilingMs - this.velocityLong) / (this._ceilingMs * cfg.topSpeedSoftZone)));
      tractiveForce *= fade;

      // 2. Əyləc və Handbrake Qüvvələri
      let brakeForceLong = (brake * cfg.brakeTorque) / specs.tireRadius;
      if (this.handbrakeActive) {
        // Handbrake arxa təkərləri dərhal kilidləyir
        brakeForceLong += (cfg.brakeTorque * cfg.handbrakeBrakeFactor) / specs.tireRadius;
        this.rearWheelsLocked = true;
      } else {
        this.rearWheelsLocked = false;
      }

      // 3. Ətraf Mühit Müqaviməti (Aerodynamic Drag & Rolling Resistance)
      const speedSign = Math.sign(this.velocityLong);
      const aeroDragForce = 0.5 * 1.225 * cfg.aerodynamicDrag * 2.2 * (this.velocityLong * this.velocityLong) * speedSign;
      const rollResistForce = cfg.rollingResistance * cfg.mass * 9.81 * 0.001 * speedSign;

      // Boyuna xalis qüvvə
      const netLongForce = tractiveForce - brakeForceLong - aeroDragForce - rollResistForce;
      this.accelerationLong = netLongForce / cfg.mass;
      this.velocityLong += this.accelerationLong * dt;

      // Avtomobil arxaya sürüşməsinin qarşısını al (əgər 1-ci ötürmədədirsə)
      if (this.gear > 0 && this.velocityLong < 0) {
        this.velocityLong = 0;
      }

      // 4. Yan Sürüşmə Bucaqlarının Hesablanması (Slip Angles)
      const absVLong = Math.max(1.5, Math.abs(this.velocityLong)); // 0-a bölünmənin qarşısını alırıq
      const Lf = cfg.wheelbase * (1 - cfg.weightDistrFront);
      const Lr = cfg.wheelbase * cfg.weightDistrFront;

      // Ön və arxa təkər sürüşmə bucaqları (Kinematik tənliklər)
      this.slipAngleFront = Math.atan2(this.velocityLat + this.yawRate * Lf, absVLong) - this.steerAngle;
      this.slipAngleRear = Math.atan2(this.velocityLat - this.yawRate * Lr, absVLong);

      // Ümumi avtomobil sürüşmə bucağı (Body Drift Angle)
      this.overallSlipAngle = Math.atan2(this.velocityLat, absVLong);

      // 5. Həqiqi Dinamik Çəki Keçidi və Aerodinamik Təzyiq Qüvvəsi (Normal Loads Fz)
      const hCom = 0.48; // Ağırlıq mərkəzinin hündürlüyü (m)
      const deltaFzLong = (cfg.mass * this.accelerationLong * hCom) / cfg.wheelbase;
      const downforce = 0.5 * 1.225 * (this.velocityLong * this.velocityLong) * 0.42 * 2.2;

      const normalLoadFront = Math.max(600, (cfg.mass * 9.81 * cfg.weightDistrFront) - deltaFzLong + downforce * 0.45);
      const normalLoadRear = Math.max(600, (cfg.mass * 9.81 * (1 - cfg.weightDistrFront)) + deltaFzLong + downforce * 0.55);

      let frontMu = cfg.tireGripBase * roadFriction * this.stats.handling;
      let rearMu = cfg.tireGripBase * roadFriction * this.stats.handling;

      // Handbrake çəkildikdə arxa tutuşun 80%-i itirilir! (Kəskin driftə ani giriş)
      if (this.handbrakeActive) {
        rearMu *= 0.20;
      }

      // Drift rejimində arxa təkərlərin sürüşmə sürtünməsi
      if (Math.abs(this.slipAngleRear) > 0.14) { // ~8 dərəcə kritik hədd
        rearMu *= (1.0 - cfg.driftGripDrop * 0.65);
      }

      const lateralForceFront = -PACEJKA.calculateLateralFriction(this.slipAngleFront, frontMu) * normalLoadFront;
      const lateralForceRear = -PACEJKA.calculateLateralFriction(this.slipAngleRear, rearMu) * normalLoadRear;

      // 6. Dönmə Ətaləti (Yaw Inertia & Body Frame Dynamic Equations)
      // Body-frame lateral acceleration: v_dot = (Fy_total / m) - u * yawRate
      const roadCentrifugalForce = (this.velocityLong * this.velocityLong) * roadCurve * 0.85;
      const totalLateralForce = lateralForceFront * Math.cos(this.steerAngle) + lateralForceRear + roadCentrifugalForce;

      // Nyuton-Eyler gövdə koordinat sistemində yan təcil və mərkəzdənqaçma inersiyası
      const kinematicCentrifugal = this.velocityLong * this.yawRate;
      this.accelerationLat = (totalLateralForce / cfg.mass) - kinematicCentrifugal * 0.75;
      this.velocityLat += this.accelerationLat * dt;

      // Yan sürətin təbii dampingi və şinlərin düzəlmə qabiliyyəti (grip recovery)
      const isStraightening = Math.abs(this.steerAngle) < 0.08 && !this.handbrakeActive;
      const latDamping = isStraightening ? 4.8 : (this.isDrifting ? 2.0 : 5.5);
      this.velocityLat *= Math.exp(-latDamping * dt);

      // Handbrake zamanı arxa tərəfin ani kənara atılması (snap oversteer kick)
      let snapKick = 0;
      if (this.handbrakeActive && Math.abs(this.steerAngle) > 0.05) {
        snapKick = Math.sign(this.steerAngle) * 4.2;
      }

      // Self-aligning bərpaedici moment (Caster & Trail effekti)
      const selfAlignTorque = isStraightening ? -this.yawRate * 1800 : 0;

      const yawTorque = (Lf * lateralForceFront * Math.cos(this.steerAngle)) - (Lr * lateralForceRear) + snapKick * cfg.mass + selfAlignTorque;
      const yawInertia = cfg.mass * (cfg.wheelbase * cfg.wheelbase) * 0.22;
      const yawAcceleration = yawTorque / yawInertia;

      this.yawRate += yawAcceleration * dt;
      const yawDamping = isStraightening ? 5.5 : 3.4;
      this.yawRate *= Math.exp(-yawDamping * dt);
      this.headingAngle += this.yawRate * dt;

      // 7. DRIFT STATUSU, ƏKS-SÜKAN (COUNTER-STEERING) VƏ MİNİ-TURBO SİSTEMİ
      const maxEffectiveSlip = Math.max(Math.abs(this.overallSlipAngle), Math.abs(this.slipAngleRear));
      const absDriftAngleDeg = maxEffectiveSlip * (180 / Math.PI);
      const minDriftSpeed = cfg.minDriftSpeedKmh / 3.6; // 35 km/h minimum drift sürəti

      // Driftə giriş tətikləyiciləri: Handbrake, Brake+Steer və ya yüksək sürətli yan sürüşmə
      const initiateDrift = (this.velocityLong >= minDriftSpeed) && (
        absDriftAngleDeg >= 6.5 ||
        (this.handbrakeActive && Math.abs(this.targetSteerAngle) > 0.04) ||
        (brake > 0.35 && Math.abs(this.targetSteerAngle) > 0.08)
      );

      // Drifti davam etdirmə şərti (qaz, sükan və ya aktiv sürüşmə)
      const sustainDrift = this.isDrifting && (this.velocityLong >= minDriftSpeed) && (
        (throttle > 0.2 && Math.abs(this.targetSteerAngle) > 0.04) ||
        absDriftAngleDeg >= 4.8 ||
        this.handbrakeActive
      );

      this.driftScoreRate = 0;
      if (initiateDrift || sustainDrift) {
        this.isDrifting = true;
        // Frame-rate independent float score (no per-frame rounding). Only above minDriftSpeed
        // (guaranteed by the gate above) and never while spinning out.
        if (!this.isSpinout) {
          const slip = Math.min(Math.abs(this.overallSlipAngle), cfg.driftScoreSlipCapRad);
          this.driftScoreRate = slip * 3000 * cfg.driftScoreMult; // = |slip|*50*mult*60 pts/s
          const inc = this.driftScoreRate * dt;
          this.driftScore += inc;
          this.stepResult.driftScoreDelta += inc;
        }
        this.driftDirection = Math.sign(this.yawRate) || Math.sign(this.overallSlipAngle) || Math.sign(this.steerAngle) || 1;

        // Əks-sükan (Counter-steering) Yoxlanışı:
        // Sürüşmə sağadırsa (driftDirection > 0) sürücü sola sükan qırır (steerAngle < 0)
        const isCounterSteering = (this.driftDirection > 0 && this.steerAngle < -0.01) ||
                                  (this.driftDirection < 0 && this.steerAngle > 0.01);

        if (isCounterSteering) {
          this.counterSteerScore = Math.min(1.0, this.counterSteerScore + dt * 2.2);
          this.driftDuration += dt * 1.35; // Düzgün əks-sükan mini-turbonu daha tez doldurur
        } else {
          this.driftDuration += dt;
          if (absDriftAngleDeg > 70.0) {
            this._triggerSpinout();
          }
        }

        // Mini-Turbo şarjı: 1.5 saniyə fasiləsiz təmiz drift ilə 100%-ə çatır
        this.miniTurboCharge = Math.min(1.0, this.driftDuration / 1.5);
        if (this.miniTurboCharge >= 1.0) {
          this.miniTurboReady = true;
        }
      } else if (this.isDrifting) {
        // Avtomobil təkərlərini düzəltdi və drift zonasından çıxdı
        if (this.miniTurboReady && !this.isSpinout) {
          // 1.5s təmiz drift çıxışında Mini-Turbo PARTLAYIŞI!
          this.triggerMiniTurbo();
        }
        this.isDrifting = false;
        this.driftDuration = 0;
        this.miniTurboCharge = 0;
        this.miniTurboReady = false;
      }

      // Spinout sönməsi
      if (this.isSpinout) {
        this.spinoutTimer -= dt;
        this.velocityLong *= Math.exp(-2.5 * dt); // Sürət kəskin azalır
        this.yawRate += (Math.random() - 0.5) * 8 * Math.sqrt(dt / 60); // random walk: sqrt(dt) keeps variance dt-independent
        if (this.spinoutTimer <= 0) {
          this.isSpinout = false;
        }
      }

      // Ekran və dünyadakı kəmiyyətlər
      this.speedKmh = Math.max(0, this.velocityLong * 3.6);
      this.z += this.velocityLong * dt;
      // Lateral yol ofseti [-1.0 .. +1.0] aralığında sürüşmə
      const roadHalfWidth = 14.0; // metr
      this.x += (this.velocityLat / roadHalfWidth) * dt * 2.8;
    }

    /**
     * İdarəetmə itirildikdə fırlanma (Spinout)
     */
    _triggerSpinout() {
      if (this.isSpinout) return;
      this.isSpinout = true;
      this.stepResult.spinout = true;
      this.spinoutTimer = 1.4; // 1.4 saniyə fırlanma
      this.miniTurboReady = false;
      this.miniTurboCharge = 0;

      // Ekran silkələnməsi və qəza pufu
      if (typeof window !== 'undefined' && window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(12.0, 0.45);
      }
      this.triggerBackfire(1.0);
    }

    /**
     * 1.5s Təmiz Drift Çıxışında Mini-Turbo Partlayışı
     */
    triggerMiniTurbo() {
      this.miniTurboCount++;
      this.stepResult.miniTurbo = true;
      this.miniTurboActive = true;
      this.miniTurboTimer = this.miniTurboDuration;

      // Ani sürət sıçrayışı (+20 km/h ani + güc artımı)
      this.velocityLong += 6.5;

      // Egzoz alov şousu və ekran punch
      this.triggerBackfire(1.0);

      if (typeof window !== 'undefined' && window.GameJuice) {
        if (typeof window.GameJuice.zoomPunch === 'function') {
          window.GameJuice.zoomPunch(0.12, 0.35);
        }
        if (typeof window.GameJuice.shake === 'function') {
          window.GameJuice.shake(6.0, 0.25);
        }
      }

      // Qlobal hadisə bildirimi
      const detail = { speedKmh: this.speedKmh, duration: this.miniTurboDuration, count: this.miniTurboCount };
      if (typeof this.onEvent === 'function') this.onEvent('miniturbo', detail);
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('neon:miniturbo', { detail }));
      }
    }

    /**
     * Mini-Turbo taymerini yeniləyir
     */
    _updateMiniTurbo(dt) {
      if (this.miniTurboActive) {
        this.miniTurboTimer -= dt;
        if (this.miniTurboTimer <= 0) {
          this.miniTurboActive = false;
        }
      }
    }

    /**
     * GUARDRAIL SCRAPE (call once per physics step, touching or not).
     * dt-scaled and capped: the lateral velocity into the rail is reflected with
     * restitution (cfg.wallRestitution, 0.5); forward speed decays exponentially at
     * min(wallMaxLossPerSec, wallBaseLossPerSec + 0.015 * normalSpeed) per second
     * (capped at 22 %/s, so 1 s of grinding at 180 km/h keeps >= ~140 km/h before engine thrust).
     * The lane is clamped to the rail, so there is never any interpenetration.
     * Returns a REUSED object (copy fields if you keep it):
     *  collided, resolvedLaneX, side (+1 right / -1 left / 0), impact (true once per hit, >= wallMinImpactSpeed),
     *  normalSpeed (m/s into the rail before reflection), impactSpeed (km/h), lossPerSec (fraction),
     *  energy (J dissipated this step), sparks (integer count to emit this step, rate-based),
     *  shake (one-shot camera intensity on impact, else 0), rumble 0..1 (continuous, for audio/camera),
     *  scrape 0..1 (metal-scrape loudness, speed based).
     * GameJuice.shake is called only on impact, rate-limited by a 0.25 s cooldown.
     */
    scrapeWall(laneX, limitX = 14.45, dt = 1 / 60) {
      const h = Math.min(Math.max(isFinite(dt) && dt > 0 ? dt : 1 / 60, 0.0005), 0.2);
      const cfg = this.config;
      const r = this.wallResult;
      this.wallImpactCooldown = Math.max(0, this.wallImpactCooldown - h);
      r.collided = false; r.resolvedLaneX = laneX; r.side = 0; r.impact = false; r.normalSpeed = 0;
      r.impactSpeed = 0; r.lossPerSec = 0; r.energy = 0; r.sparks = 0; r.shake = 0; r.rumble = 0; r.scrape = 0;

      const side = laneX >= limitX ? 1 : (laneX <= -limitX ? -1 : 0);
      if (side === 0) { this.wallContactTime = 0; this._wallSparkAccum = 0; return r; }

      this.wallContactTime += h;
      r.collided = true;
      r.side = side;
      r.resolvedLaneX = side * limitX;

      // Lateral: reflect the component moving into the rail.
      const vOut = this.velocityLat * side;
      const normalSpeed = vOut > 0 ? vOut : 0;
      if (normalSpeed > 0) this.velocityLat = -side * normalSpeed * cfg.wallRestitution;
      r.normalSpeed = normalSpeed;

      // Longitudinal: capped friction loss, exponential so it is dt-independent.
      const before = Math.max(0, this.velocityLong);
      const lossPerSec = Math.min(cfg.wallMaxLossPerSec, cfg.wallBaseLossPerSec + 0.015 * normalSpeed);
      if (this.velocityLong > 0) this.velocityLong *= Math.exp(-lossPerSec * h);
      this.speedKmh = Math.max(0, this.velocityLong * 3.6);
      r.lossPerSec = lossPerSec;
      r.impactSpeed = this.speedKmh;

      const m = cfg.mass;
      r.energy = 0.5 * m * (before * before - this.velocityLong * this.velocityLong) +
                 0.5 * m * (1 - cfg.wallRestitution * cfg.wallRestitution) * normalSpeed * normalSpeed;

      // Feedback (rate-based so 60 and 144 Hz look the same).
      const spd = Math.max(0, this.velocityLong);
      r.scrape = Math.min(1, spd / 80);
      r.rumble = r.scrape;
      this._wallSparkAccum += (25 + 0.25 * this.speedKmh) * h;
      r.sparks = Math.floor(this._wallSparkAccum);
      this._wallSparkAccum -= r.sparks;

      if (normalSpeed >= cfg.wallMinImpactSpeed && this.wallImpactCooldown <= 0) {
        this.wallImpactCooldown = 0.25;
        r.impact = true;
        r.shake = Math.min(8, 2 + normalSpeed * 0.8);
        r.sparks += 12;
        this.suspension.rollVelocity -= side * Math.min(0.18, 0.02 * normalSpeed);
        if (typeof window !== 'undefined' && window.GameJuice && typeof window.GameJuice.shake === 'function') {
          window.GameJuice.shake(Math.min(14, 4 + normalSpeed * 1.5), 0.22);
        }
        if (typeof this.onEvent === 'function') this.onEvent('wallimpact', { normalSpeed, speedKmh: this.speedKmh, side });
      }
      return r;
    }

    /** Back-compat wrapper around scrapeWall(). */
    resolveGuardrailCollision(currentLaneX, limitX = 14.45, dt = 0.016) {
      const r = this.scrapeWall(currentLaneX, limitX, dt);
      return { collided: r.collided, resolvedLaneX: r.resolvedLaneX, side: r.side, impactSpeed: r.impactSpeed };
    }

    /**
     * AVTOMOBİLLƏRARASI 3D BƏRK CİSİM AYRILMASI (MTV Anti-Clipping Solver)
     * Heç bir maşın bir-birinin içinə girmir. Minimum Translation Vector ilə dərhal həndəsi aralanır.
     * @param {object} playerBox - { x, z, halfW, halfL, mass }
     * @param {object} otherBox - { x, z, halfW, halfL, mass, vz }
     * @returns {object|null} Toqquşma baş veribsə həll olunmuş itələmə və impuls parametrləri
     */
    resolve3DMTVCollision(playerBox, otherBox, dt = 1 / 60) {
      const dx = playerBox.x - otherBox.x;
      const dz = playerBox.z - otherBox.z;

      const penX = (playerBox.halfW + otherBox.halfW) - Math.abs(dx);
      const penZ = (playerBox.halfL + otherBox.halfL) - Math.abs(dz);

      if (penX > 0 && penZ > 0) {
        const totalMass = (playerBox.mass || 1500) + (otherBox.mass || 1600);
        const pRatio = (otherBox.mass || 1600) / totalMass;
        const cRatio = (playerBox.mass || 1500) / totalMass;

        if (penX < penZ) {
          // Yan toqquşma (Door-to-door sideswipe)
          const signX = dx >= 0 ? 1 : -1;
          const shiftPlayerX = signX * penX * pRatio;
          const shiftOtherX = -signX * penX * cRatio;

          // Lateral impuls mübadiləsi
          this.velocityLat += signX * 4.8 * Math.min(1, dt * 60);
          this.velocityLong = Math.max(5.0, this.velocityLong * Math.exp(-3.08 * dt));

          return {
            collided: true,
            axis: 'lateral',
            penX: penX,
            shiftPlayerX: shiftPlayerX,
            shiftOtherX: shiftOtherX,
            signX: signX,
            sparkX: (playerBox.x + otherBox.x) * 0.5,
            sparkZ: (playerBox.z + otherBox.z) * 0.5
          };
        } else {
          // Boyuna toqquşma (Front/Rear bumper impact)
          const signZ = dz >= 0 ? 1 : -1;
          const shiftPlayerZ = signZ * penZ * pRatio;
          const shiftOtherZ = -signZ * penZ * cRatio;

          return {
            collided: true,
            axis: 'longitudinal',
            penZ: penZ,
            shiftPlayerZ: shiftPlayerZ,
            shiftOtherZ: shiftOtherZ,
            signZ: signZ,
            sparkX: (playerBox.x + otherBox.x) * 0.5,
            sparkZ: (playerBox.z + otherBox.z) * 0.5
          };
        }
      }

      return null;
    }

    /**
     * HƏQİQİ NYUTON TOXUNMA İMPULSU VƏ DÖNMƏ MOMENTİ (Rotational Torque Solver)
     * Toqquşma təmas nöqtəsi ağırlıq mərkəzindən aralı olduqda fırlanma momenti (tau = r x J) yaradır!
     * @param {number} rx - Ağırlıq mərkəzindən təmas nöqtəsinə qədər olan X qolu (m)
     * @param {number} rz - Ağırlıq mərkəzindən təmas nöqtəsinə qədər olan Z qolu (m)
     * @param {number} jx - Toqquşma impulsu X komponenti (N*s)
     * @param {number} jz - Toqquşma impulsu Z komponenti (N*s)
     * @returns {number} Dissipasiya olunan kinetik enerji (Joule)
     */
    applyContactImpulse(rx, rz, jx, jz) {
      const m = this.config.mass;
      // 1. Xətti sürət dəyişməsi: Delta v = J / m
      this.velocityLat += jx / m;
      this.velocityLong += jz / m;

      // 2. Təmas ofsetindən fırlanma momenti: tau = rx * jz - rz * jx
      const torque = (rx * jz) - (rz * jx);
      // Ətalət momenti: Iz = (1/12) * m * (w^2 + l^2)
      const yawInertia = (1 / 12) * m * (this.config.trackWidth * this.config.trackWidth + this.config.wheelbase * this.config.wheelbase);
      const deltaYawRate = torque / yawInertia;
      this.yawRate += deltaYawRate * 0.45;

      // 3. Şassi asqı reaksiyası (Roll və Pitch təkantəkəri)
      if (this.suspension) {
        this.suspension.rollVelocity += (jx / m) * 0.22;
        this.suspension.pitchVelocity -= (jz / m) * 0.20;
      }

      // Dissipasiya olunan kinetik enerji (Joule)
      return 0.5 * (jx * jx + jz * jz) / m;
    }

    /**
     * Asqı Dinamikası: 2-Dərəcəli Roll və Pitch Harmonik Rəqsləri
     */
    _updateSuspensionDynamics(dt) {
      const susp = this.suspension;

      // 1. Roll (Dönüşlərdə mərkəzdənqaçma təcilindən yaranan yana əyilmə)
      // aLat müsbətdirsə avtomobil xaricə tərəf əyilir
      const targetRoll = -this.accelerationLat * susp.rollFactor;
      const rollSpringForce = -susp.springStiffnessRoll * (susp.rollAngle - targetRoll);
      const rollDampForce = -susp.dampingRoll * susp.rollVelocity;
      const rollAcc = rollSpringForce + rollDampForce;

      susp.rollVelocity += rollAcc * dt;
      susp.rollAngle += susp.rollVelocity * dt;

      // 2. Pitch (Qaz basıldıqda Squat, Əyləc basıldıqda Dive)
      // accelerationLong müsbət olduqda squat (arxaya çöküş), mənfi olanda dive (önə çöküş)
      const targetPitch = this.accelerationLong * (this.accelerationLong >= 0 ? susp.squatFactor : susp.diveFactor);
      const pitchSpringForce = -susp.springStiffnessPitch * (susp.pitchAngle - targetPitch);
      const pitchDampForce = -susp.dampingPitch * susp.pitchVelocity;
      const pitchAcc = pitchSpringForce + pitchDampForce;

      susp.pitchVelocity += pitchAcc * dt;
      susp.pitchAngle += susp.pitchVelocity * dt;

      // Hədlər daxilində məhdudlaşdırma
      susp.rollAngle = Math.max(-0.25, Math.min(0.25, susp.rollAngle));
      susp.pitchAngle = Math.max(-0.20, Math.min(0.20, susp.pitchAngle));
    }

    /**
     * Egzoz Backfire və Alov Zərrəcikləri
     */
    triggerBackfire(intensity = 0.8) {
      if (intensity > this.stepResult.backfire) this.stepResult.backfire = Math.min(1, intensity);
      this.backfireTimer = 0.22;
      this.backfireIntensity = Math.min(1.0, intensity);

      // Sol və sağ egzozlardan alov partlayışı
      this.backfireFlames = [
        { side: 'left', size: 1.0 + intensity * 0.8, life: 1.0 },
        { side: 'right', size: 1.0 + intensity * 0.8, life: 1.0 }
      ];

      // Zərrəcik hovuzuna alov qığılcımları əlavə et
      this.particleManager.spawnBackfireSparks(this, intensity);
    }

    _updateBackfireAndParticles(dt, throttle, nitro) {
      if (this.backfireTimer > 0) {
        this.backfireTimer -= dt;
        for (let i = 0; i < this.backfireFlames.length; i++) {
          const f = this.backfireFlames[i];
          f.life -= dt * 4.5;
        }
      }

      // Təkər tüstüsü generasiyası (drift, handbrake və ya kəskin tormozda)
      const absRearSlip = Math.abs(this.slipAngleRear);
      const isSlipping = absRearSlip > 0.15 || this.handbrakeActive || (this.speedKmh > 30 && this.accelerationLong < -5);

      if (isSlipping && this.speedKmh > 15) {
        const intensity = Math.min(1.0, (absRearSlip / 0.5) + (this.handbrakeActive ? 0.6 : 0.0));
        this.particleManager.spawnTireSmoke(this, intensity, dt);
      }

      // Zərrəciklərin fiziki hərəkətini yenilə
      this.particleManager.update(dt);
    }

    /**
     * Asfaltda təkər izlərinin (Skid Marks) qeydiyyatı
     */
    _updateSkidMarks(dt) {
      const absRearSlip = Math.abs(this.slipAngleRear);
      const shouldMark = (absRearSlip > 0.16) || this.handbrakeActive;

      if (shouldMark && this.speedKmh > 12) {
        const opacity = Math.min(0.85, 0.25 + absRearSlip * 0.9 + (this.handbrakeActive ? 0.35 : 0.0));
        // Arxa sol və sağ təkərlər üçün iz qoy
        this.skidMarksManager.addMark(this, 'rl', opacity);
        this.skidMarksManager.addMark(this, 'rr', opacity);

        // Kəskin drift zamanı ön xarici təkər də iz qoyur
        if (absRearSlip > 0.32) {
          const outerFront = this.driftDirection > 0 ? 'fl' : 'fr';
          this.skidMarksManager.addMark(this, outerFront, opacity * 0.6);
        }
      } else {
        this.skidMarksManager.breakMark();
      }

      this.skidMarksManager.update(dt);
    }

    /**
     * Avtomobilin hazırkı telemetriya məlumatlarını qaytarır
     */
    getTelemetry() {
      return {
        speedKmh: Math.round(this.speedKmh),
        rpm: Math.round(this.rpm),
        gear: this.gear,
        isDrifting: this.isDrifting,
        driftAngleDeg: Math.round(this.overallSlipAngle * (180 / Math.PI)),
        driftDuration: this.driftDuration.toFixed(2),
        miniTurboCharge: Math.round(this.miniTurboCharge * 100),
        miniTurboActive: this.miniTurboActive,
        driftScore: this.driftScore,
        driftScoreRate: this.driftScoreRate,
        topSpeedKmh: this.topSpeedKmh,
        nitroCapacity: this.nitroCapacity,
        handbrake: this.handbrakeActive,
        rollDeg: (this.suspension.rollAngle * (180 / Math.PI)).toFixed(1),
        pitchDeg: (this.suspension.pitchAngle * (180 / Math.PI)).toFixed(1),
        backfireActive: this.backfireTimer > 0,
        lateralG: (this.accelerationLat / 9.81).toFixed(2),
        longitudinalG: (this.accelerationLong / 9.81).toFixed(2)
      };
    }

    /**
     * Avtomobil vəziyyətini ilkin vəziyyətə sıfırlayır
     */
    reset() {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.velocityLong = 0;
      this.velocityLat = 0;
      this.speedKmh = 0;
      this.accelerationLong = 0;
      this.accelerationLat = 0;
      this.headingAngle = 0;
      this.yawRate = 0;
      this.steerAngle = 0;
      this.gear = 1;
      this.rpm = TRANSMISSION_SPECS.idleRPM;
      this.shiftTimer = 0;
      this.clutchDisengaged = false;
      this.isDrifting = false;
      this.driftDuration = 0;
      this.miniTurboCharge = 0;
      this.miniTurboReady = false;
      this.miniTurboActive = false;
      this.isSpinout = false;
      this.driftScore = 0;
      this.driftScoreRate = 0;
      this.wallContactTime = 0;
      this.wallImpactCooldown = 0;
      this._ceilingMs = this.topSpeedKmh / 3.6 * 1.025;
      this.suspension.rollAngle = 0;
      this.suspension.pitchAngle = 0;
      this.suspension.rollVelocity = 0;
      this.suspension.pitchVelocity = 0;
      this.skidMarksManager.clear();
      this.particleManager.clear();
    }
  }

  /**
   * --- SIFIR ZİBİL (ZERO-GC) TƏKƏR İZLƏRİ (SKID MARKS) MENECERİ ---
   */
  class SkidMarkManager {
    constructor(maxSegments = 600) {
      this.maxSegments = maxSegments;
      this.buffer = new Array(maxSegments);
      for (let i = 0; i < maxSegments; i++) {
        this.buffer[i] = {
          active: false,
          x1: 0, z1: 0,
          x2: 0, z2: 0,
          width: 0.28,
          opacity: 0,
          life: 0,
          wheel: ''
        };
      }
      this.head = 0;
      this.lastPoints = { fl: null, fr: null, rl: null, rr: null };
    }

    addMark(vehicle, wheelKey, opacity) {
      const offset = vehicle.wheelOffsets[wheelKey];
      if (!offset) return;

      // Təkərin dünyadakı mövqeyi
      const cosH = Math.cos(vehicle.headingAngle);
      const sinH = Math.sin(vehicle.headingAngle);
      const wx = vehicle.x + (offset.x * cosH - offset.z * sinH);
      const wz = vehicle.z + (offset.x * sinH + offset.z * cosH);

      const last = this.lastPoints[wheelKey];
      if (last && Math.hypot(wx - last.x, wz - last.z) < 0.25) return; // distance-based spacing, not per frame
      if (last) {
        const seg = this.buffer[this.head];
        seg.active = true;
        seg.x1 = last.x;
        seg.z1 = last.z;
        seg.x2 = wx;
        seg.z2 = wz;
        seg.opacity = opacity;
        seg.life = 1.0;
        seg.wheel = wheelKey;

        this.head = (this.head + 1) % this.maxSegments;
      }

      this.lastPoints[wheelKey] = { x: wx, z: wz };
    }

    breakMark() {
      this.lastPoints.fl = null;
      this.lastPoints.fr = null;
      this.lastPoints.rl = null;
      this.lastPoints.rr = null;
    }

    update(dt) {
      // İzlərin yavaş-yavaş solması
      const fadeRate = 0.08;
      for (let i = 0; i < this.maxSegments; i++) {
        const seg = this.buffer[i];
        if (seg.active) {
          seg.life -= dt * fadeRate;
          if (seg.life <= 0) {
            seg.active = false;
          }
        }
      }
    }

    clear() {
      for (let i = 0; i < this.maxSegments; i++) {
        this.buffer[i].active = false;
      }
      this.breakMark();
      this.head = 0;
    }

    /**
     * Pseudo-3D və ya 2D Kətan üzərinə render etmək üçün aktiv seqmentləri qaytarır
     */
    getActiveSegments() {
      const active = [];
      for (let i = 0; i < this.maxSegments; i++) {
        if (this.buffer[i].active) {
          active.push(this.buffer[i]);
        }
      }
      return active;
    }
  }

  /**
   * --- SIFIR ZİBİL ZƏRRƏCİK SİSTEMİ (Tire Smoke, Sparks, Backfire) ---
   */
  class VehicleParticleManager {
    constructor(poolSize = 350) {
      this.poolSize = poolSize;
      this.pool = new Array(poolSize);
      for (let i = 0; i < poolSize; i++) {
        this.pool[i] = {
          active: false,
          type: 'smoke', // 'smoke', 'spark', 'flame'
          x: 0, y: 0, z: 0,
          vx: 0, vy: 0, vz: 0,
          size: 1,
          size0: 1,
          maxSize: 1,
          opacity: 1,
          life: 0,
          maxLife: 1,
          color: '#ffffff'
        };
      }
      this.nextIdx = 0;
    }

    _getFreeParticle() {
      for (let i = 0; i < this.poolSize; i++) {
        const idx = (this.nextIdx + i) % this.poolSize;
        if (!this.pool[idx].active) {
          this.nextIdx = (idx + 1) % this.poolSize;
          return this.pool[idx];
        }
      }
      // Hamısı doludursa ən köhnəsini yenidən istifadə et
      const p = this.pool[this.nextIdx];
      this.nextIdx = (this.nextIdx + 1) % this.poolSize;
      return p;
    }

    spawnTireSmoke(vehicle, intensity, dt = 1 / 60) {
      // Rate-based emission (3 puffs/wheel per 1/60 s at full intensity) so it is frame-rate independent.
      this._smokeAccum = (this._smokeAccum || 0) + 3 * intensity * 60 * dt;
      const count = Math.floor(this._smokeAccum);
      this._smokeAccum -= count;
      if (count <= 0) return;
      const rearWheels = ['rl', 'rr'];

      for (let w = 0; w < rearWheels.length; w++) {
        const off = vehicle.wheelOffsets[rearWheels[w]];
        for (let c = 0; c < count; c++) {
          const p = this._getFreeParticle();
          p.active = true;
          p.type = 'smoke';
          p.x = vehicle.x + off.x + (Math.random() - 0.5) * 0.4;
          p.y = 0.15;
          p.z = vehicle.z + off.z - 0.2;
          p.vx = (Math.random() - 0.5) * 2.5 - vehicle.velocityLat * 0.4;
          p.vy = 0.8 + Math.random() * 1.8;
          p.vz = -vehicle.velocityLong * 0.15 + (Math.random() - 0.5) * 1.5;
          p.size = 0.5 + Math.random() * 0.8;
          p.size0 = p.size;
          p.maxSize = 2.4 + Math.random() * 2.2;
          p.life = 0;
          p.maxLife = 0.45 + Math.random() * 0.4;
          p.opacity = 0.65 * intensity;
          // Neon çalarlı tüstü (ağ-bənövşəyi-cyan qarışığı)
          p.color = Math.random() < 0.3 ? '#ff007f' : (Math.random() < 0.5 ? '#00f5ff' : '#e6e6fa');
        }
      }
    }

    spawnBackfireSparks(vehicle, intensity) {
      const sparkCount = Math.floor(12 * intensity);
      for (let i = 0; i < sparkCount; i++) {
        const p = this._getFreeParticle();
        p.active = true;
        p.type = 'spark';
        const side = Math.random() < 0.5 ? -0.65 : 0.65;
        p.x = vehicle.x + side;
        p.y = 0.35 + (Math.random() - 0.5) * 0.15;
        p.z = vehicle.z - 1.8;
        p.vx = (Math.random() - 0.5) * 4.0;
        p.vy = 1.0 + Math.random() * 3.5;
        p.vz = -vehicle.velocityLong * 0.8 - (8.0 + Math.random() * 12.0);
        p.size = 0.25;
        p.maxSize = 0.1;
        p.life = 0;
        p.maxLife = 0.18 + Math.random() * 0.22;
        p.opacity = 1.0;
        p.color = Math.random() < 0.6 ? '#00f5ff' : '#ffe600';
      }
    }

    update(dt) {
      for (let i = 0; i < this.poolSize; i++) {
        const p = this.pool[i];
        if (!p.active) continue;

        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }

        const progress = p.life / p.maxLife;

        if (p.type === 'smoke') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          // Tüstü böyüyür və solur
          p.size = p.size0 + (p.maxSize - p.size0) * Math.min(1, progress * 1.5);
          p.opacity = (1 - progress) * 0.7;
          p.vy *= Math.exp(-3.08 * dt); // 0.95/frame at 60 Hz
        } else if (p.type === 'spark') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 9.81 * dt; // Cazibə qüvvəsi
          p.opacity = 1 - progress;
        }
      }
    }

    clear() {
      for (let i = 0; i < this.poolSize; i++) {
        this.pool[i].active = false;
      }
    }

    getActiveParticles() {
      const active = [];
      for (let i = 0; i < this.poolSize; i++) {
        if (this.pool[i].active) {
          active.push(this.pool[i]);
        }
      }
      return active;
    }
  }

  // Car roster. baseTopSpeed / driftScoreMult / nitroDuration follow ARCADE_SPEC.md section 2.2.
  const CAR_TUNING = {
    interceptor:   { mass: 1380, driftGripDrop: 0.50, tireGripBase: 1.20, peakTorque: 710, baseTopSpeed: 300, aerodynamicDrag: 0.30, driftScoreMult: 1.5, nitroDuration: 3.5 },
    cyber_drifter: { mass: 1180, driftGripDrop: 0.62, tireGripBase: 1.05, peakTorque: 690, baseTopSpeed: 320, aerodynamicDrag: 0.30, driftScoreMult: 3.0, nitroDuration: 4.2 },
    phantom:       { mass: 1100, driftGripDrop: 0.48, tireGripBase: 1.25, peakTorque: 740, baseTopSpeed: 360, aerodynamicDrag: 0.25, driftScoreMult: 2.0, nitroDuration: 5.0 }
  };

  // --- QLOBAL İXRAC VƏ QEYDİYYAT ---
  const NeonVehiclePhysics = {
    Engine: VehiclePhysicsEngine,
    SkidMarkManager: SkidMarkManager,
    ParticleManager: VehicleParticleManager,
    Pacejka: PACEJKA,
    TransmissionSpecs: TRANSMISSION_SPECS,

    /**
     * Hazır sazlanmış avtomobil fizika nüsxəsi yaradır
     * @param {string} tunerModel - 'interceptor' | 'cyber_drifter' | 'phantom'
     */
    createVehicle: function (tunerModel = 'cyber_drifter') {
      const tuning = Object.assign({}, CAR_TUNING[tunerModel] || CAR_TUNING.cyber_drifter);
      const v = new VehiclePhysicsEngine(tuning);
      v.model = CAR_TUNING[tunerModel] ? tunerModel : 'cyber_drifter';
      return v;
    },

    CarTuning: null, // filled below

    /**
     * Headless measurement of a car's real numbers for the garage cards.
     * Returns { topSpeedKmh, zeroTo100 } from the same model the race uses (takes ~ms).
     */
    measureGarageStats: function (model) {
      const v = this.createVehicle(model);
      const dt = 1 / 60;
      let t = 0, t100 = null, top = 0;
      while (t < 45) {
        v.update(dt, { throttle: 1 });
        t += dt;
        if (t100 === null && v.speedKmh >= 100) t100 = t;
        if (v.speedKmh > top) top = v.speedKmh;
      }
      return { topSpeedKmh: top, zeroTo100: t100 };
    }
  };
  NeonVehiclePhysics.CarTuning = CAR_TUNING;

  // Brauzer qlobal pəncərəsinə təqdim et
  if (typeof window !== 'undefined') {
    window.NeonVehiclePhysics = NeonVehiclePhysics;
    // Mövcud GameJuice varsa, oraya da əlavə edirik
    if (window.GameJuice) {
      window.GameJuice.NeonVehiclePhysics = NeonVehiclePhysics;
    }
  }

  // Node.js mühiti üçün ixrac
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonVehiclePhysics;
  }
})();
