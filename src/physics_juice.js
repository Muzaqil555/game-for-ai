/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ
 * Modul: Physics & Game Feel / Juice Engine
 * Fayl: src/physics_juice.js
 * Qlobal Obyekt: window.GameJuice
 * Məsul Agent: physics_juice_specialist (Agent 20)
 *
 * Təsvir:
 * Bu modul oyunun canlı, dinamik və kinetik zövq ("game juice") verməsini təmin edir:
 * - Hamar kamera izləməsi (smooth lerp damping), dünya sərhədləri daxilində məhdudlaşdırma (clamping)
 * - Yüksək keyfiyyətli kamera silkələnməsi (directional & perlin-like multi-harmonic screen-shake)
 * - Zərbə anı donması (hit-stop / freeze frame)
 * - Taktiki ağır çəkim (bullet-time / slow-motion)
 * - Zoom-punch (zərbə və partlayış anında ani yaxınlaşma)
 * - Realistik fizika: Dairəvi toqquşma, sürüşməli maneə həlli (sliding collision), geri təpmə (knockback) və sürtünmə
 */

(function () {
  'use strict';

  class PhysicsJuiceEngine {
    constructor() {
      // Kamera vəziyyəti (GAME_SPEC.md müqaviləsi)
      this.camera = {
        x: 0,
        y: 0,
        zoom: 1.0,
        targetZoom: 1.0,
        baseZoom: 1.0,
        shakeTimer: 0,
        shakeDuration: 0,
        shakeIntensity: 0,
        shakeOffsetX: 0,
        shakeOffsetY: 0,
        shakeRotOffset: 0
      };

      // Zaman şkalası və xüsusi zaman taymerləri
      this.timeScale = 1.0;
      this.hitStopTimer = 0;
      this.slowMoTimer = 0;
      this.slowMoScale = 1.0;
      this.zoomPunchTimer = 0;

      // Daxili təsadüfi harmonik faza ofsetləri (shake üçün)
      this._shakePhaseX = Math.random() * 100;
      this._shakePhaseY = Math.random() * 100;
    }

    /**
     * Hər frame-də kameranı, zaman miqyasını və effekt taymerlərini yeniləyir.
     * @param {number} dt - Keçən real zaman addımı (saniyə)
     * @param {number} targetX - İzlənilən obyektin (oyunçunun) X koordinatı
     * @param {number} targetY - İzlənilən obyektin (oyunçunun) Y koordinatı
     * @param {number} viewWidth - Kətanın/ekranın eni
     * @param {number} viewHeight - Kətanın/ekranın hündürlüyü
     * @param {number} worldWidth - Oyun dünyasının eni
     * @param {number} worldHeight - Oyun dünyasının hündürlüyü
     * @returns {number} scaledDt - Oyun obyektləri üçün tənzimlənmiş effektiv delta zamanı
     */
    update(dt, targetX, targetY, viewWidth, viewHeight, worldWidth, worldHeight) {
      // Frame drop və kəskin sıçrayışların qarşısını almaq üçün təhlükəsiz limit
      const safeDt = Math.min(Math.max(dt || 0.016, 0.0001), 0.1);

      // --- 1. HIT-STOP (ZƏRBƏ DONMASI) HESABLANMASI ---
      let scaledDt = safeDt;
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= safeDt;
        // Hit-stop zamanı obyektlər donur (scaledDt = 0)
        scaledDt = 0;
      } else {
        // --- 2. SLOW-MOTION (AĞIR ÇƏKİM) HESABLANMASI ---
        if (this.slowMoTimer > 0) {
          this.slowMoTimer -= safeDt;
          this.timeScale = this.slowMoScale;
          scaledDt = safeDt * this.slowMoScale;
          if (this.slowMoTimer <= 0) {
            this.timeScale = 1.0;
          }
        } else {
          this.timeScale = 1.0;
          scaledDt = safeDt * this.timeScale;
        }
      }

      // --- 3. ZOOM VƏ ZOOM-PUNCH DİNAMİKASI ---
      if (this.zoomPunchTimer > 0) {
        this.zoomPunchTimer -= safeDt;
        // Zoom punch zamanı tədricən targetZoom-a qayıtma
        const zoomReturnRate = 1 - Math.exp(-10 * safeDt);
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * zoomReturnRate;
      } else {
        // Normal vəziyyətdə targetZoom-a hamar keçid
        const zoomRate = 1 - Math.exp(-6 * safeDt);
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * zoomRate;
      }

      // Zoom-u minimum və maksimum təhlükəsiz hədlərdə saxla
      this.camera.zoom = Math.max(0.4, Math.min(2.5, this.camera.zoom));

      // --- 4. YUMŞAQ KAMERA İZLƏMƏSİ (SMOOTH LERP / SPRING FOLLOW) ---
      if (typeof targetX === 'number' && typeof targetY === 'number') {
        const followSpeed = 8.5; // Kinetik, təbii izləmə sürəti
        const t = 1 - Math.exp(-followSpeed * safeDt);
        this.camera.x += (targetX - this.camera.x) * t;
        this.camera.y += (targetY - this.camera.y) * t;
      }

      // --- 5. DÜNYA SƏRHƏDLƏRİ DAXİLİNDƏ SAXLAMA (CLAMPING) ---
      const currentZoom = this.camera.zoom;
      const vW = viewWidth || 800;
      const vH = viewHeight || 600;
      const halfVisibleW = vW / (2 * currentZoom);
      const halfVisibleH = vH / (2 * currentZoom);

      if (worldWidth && worldHeight) {
        if (worldWidth >= halfVisibleW * 2) {
          this.camera.x = Math.max(halfVisibleW, Math.min(worldWidth - halfVisibleW, this.camera.x));
        } else {
          this.camera.x = worldWidth / 2;
        }

        if (worldHeight >= halfVisibleH * 2) {
          this.camera.y = Math.max(halfVisibleH, Math.min(worldHeight - halfVisibleH, this.camera.y));
        } else {
          this.camera.y = worldHeight / 2;
        }
      }

      // --- 6. KAMERA TİTRƏMƏSİ (SCREEN SHAKE - DIRECTIONAL & PERLIN-LIKE) ---
      if (this.camera.shakeTimer > 0) {
        this.camera.shakeTimer -= safeDt;
        const progress = Math.max(0, this.camera.shakeTimer / (this.camera.shakeDuration || 1));
        // Qeyri-xətti, kvadratik sönmə (daha təbii zərbə hissi)
        const currentIntensity = this.camera.shakeIntensity * (progress * progress);

        // Çoxharmonik sinusoidal dalğalar + yüksək tezlikli silkələnmə
        const time = performance.now() * 0.055;
        const waveX = Math.sin(time * 1.73 + this._shakePhaseX) + Math.cos(time * 2.81);
        const waveY = Math.cos(time * 1.91 + this._shakePhaseY) + Math.sin(time * 3.17);
        const jitterX = (Math.random() * 2 - 1) * 0.55;
        const jitterY = (Math.random() * 2 - 1) * 0.55;

        this.camera.shakeOffsetX = (waveX * 0.6 + jitterX) * currentIntensity;
        this.camera.shakeOffsetY = (waveY * 0.6 + jitterY) * currentIntensity;
        this.camera.shakeRotOffset = (Math.sin(time * 2.1) + (Math.random() * 2 - 1) * 0.3) * 0.0035 * currentIntensity;
      } else {
        this.camera.shakeTimer = 0;
        this.camera.shakeDuration = 0;
        this.camera.shakeIntensity = 0;
        this.camera.shakeOffsetX = 0;
        this.camera.shakeOffsetY = 0;
        this.camera.shakeRotOffset = 0;
      }

      return scaledDt;
    }

    /**
     * 2D Canvas kontekstinə kamera transformasiyasını (translate, rotate, scale) tətbiq edir.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {HTMLCanvasElement} canvas 
     */
    applyCameraTransform(ctx, canvas) {
      if (!ctx || !canvas) return;
      ctx.save();
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.translate(cx, cy);

      if (this.camera.shakeRotOffset) {
        ctx.rotate(this.camera.shakeRotOffset);
      }

      ctx.scale(this.camera.zoom, this.camera.zoom);

      const renderCamX = this.camera.x + this.camera.shakeOffsetX;
      const renderCamY = this.camera.y + this.camera.shakeOffsetY;

      ctx.translate(-renderCamX, -renderCamY);
    }

    /**
     * Kamera transformasiyasını bərpa edir.
     * @param {CanvasRenderingContext2D} ctx 
     */
    restoreCameraTransform(ctx) {
      if (!ctx) return;
      ctx.restore();
    }

    /**
     * Kameranı silkələyir (screen shake).
     * @param {number} intensity - Zərbənin intensivliyi (piksel miqyası)
     * @param {number} duration - Davametmə müddəti (saniyə)
     */
    shake(intensity, duration) {
      const dur = duration || 0.2;
      const inten = intensity || 5;

      if (this.camera.shakeTimer > 0) {
        // Mövcud silkələnmədən güclüdürsə yenilə, zəifdirsə mövcudu qoru
        this.camera.shakeIntensity = Math.max(this.camera.shakeIntensity, inten);
        this.camera.shakeTimer = Math.max(this.camera.shakeTimer, dur);
        this.camera.shakeDuration = Math.max(this.camera.shakeDuration, dur);
      } else {
        this.camera.shakeIntensity = inten;
        this.camera.shakeTimer = dur;
        this.camera.shakeDuration = dur;
      }

      // Təsadüfi silkələnmə fazasını yenilə
      this._shakePhaseX = Math.random() * 100;
      this._shakePhaseY = Math.random() * 100;
    }

    /**
     * Hit-Stop (zərbə anında mikro-donma) yaradır.
     * Oyunçu düşmənə və ya boss-a güclü zərbə vurduqda fiziki ağırlıq hissi verir.
     * @param {number} duration - Donma müddəti (saniyə, məs: 0.045)
     */
    hitStop(duration) {
      const dur = duration || 0.04;
      this.hitStopTimer = Math.max(this.hitStopTimer, dur);
    }

    /**
     * Taktiki Slow-Motion (ağır çəkim) effekti başladır.
     * @param {number} scale - Zamanın yavaşlama dərəcəsi (məs: 0.25)
     * @param {number} duration - Yavaşlamanın real saniyə ilə müddəti (məs: 0.8)
     */
    triggerSlowMo(scale, duration) {
      const s = Math.max(0.01, Math.min(1.0, scale || 0.3));
      const dur = duration || 0.5;

      this.slowMoScale = s;
      this.slowMoTimer = Math.max(this.slowMoTimer, dur);
      this.timeScale = s;
    }

    /**
     * Zərbə, partlayış və ya kombo anında kameranı ani yaxınlaşdırır (zoom-punch).
     * @param {number} amount - Zoom artım miqdarı (məs: 0.08)
     * @param {number} duration - Normal vəziyyətə qayıtma müddəti
     */
    zoomPunch(amount, duration) {
      const punchAmount = amount || 0.06;
      const dur = duration || 0.22;

      this.camera.zoom = Math.min(2.5, this.camera.zoom + punchAmount);
      this.zoomPunchTimer = Math.max(this.zoomPunchTimer, dur);
    }

    /**
     * Obyektə təkan / geri təpmə (knockback) sürəti əlavə edir.
     * @param {object} entity - Təsir edilən obyekt ({ vx, vy, ... })
     * @param {number} dirX - İtələmə istiqamətinin X komponenti
     * @param {number} dirY - İtələmə istiqamətinin Y komponenti
     * @param {number} force - Təkan gücü
     */
    applyKnockback(entity, dirX, dirY, force) {
      if (!entity) return;
      const f = force || 0;
      const len = Math.hypot(dirX, dirY);

      let nx = 0;
      let ny = 0;
      if (len > 0.0001) {
        nx = dirX / len;
        ny = dirY / len;
      } else {
        // Əgər istiqamət 0-dırsa, təsadüfi istiqamət seç
        const randAngle = Math.random() * Math.PI * 2;
        nx = Math.cos(randAngle);
        ny = Math.sin(randAngle);
      }

      entity.vx = (entity.vx || 0) + nx * f;
      entity.vy = (entity.vy || 0) + ny * f;
    }

    /**
     * Obyektin fizikasını yeniləyir:
     * - Sürət inteqrasiyası
     * - Sürtünmə / Damping
     * - Maneələrlə (obstacles) dairəvi toqquşma və sürüşmə (sliding collision resolution)
     * - Dünya sərhədləri daxilində məhdudlaşdırma
     * @param {object} entity - { x, y, vx, vy, radius, friction }
     * @param {number} dt - Efektiv zaman addımı
     * @param {Array} obstacles - Maneələr massivi [{ x, y, radius }]
     * @param {object} worldBounds - Dünya hüdudları ({ minX, minY, maxX, maxY } və ya { width, height })
     */
    updateEntityPhysics(entity, dt, obstacles, worldBounds) {
      if (!entity || dt <= 0) return;

      if (typeof entity.vx !== 'number') entity.vx = 0;
      if (typeof entity.vy !== 'number') entity.vy = 0;

      // 1. Sürtünmə (Friction / Damping)
      const friction = typeof entity.friction === 'number' ? entity.friction : 8.5;
      const damping = Math.exp(-friction * dt);
      entity.vx *= damping;
      entity.vy *= damping;

      // Həddindən artıq kiçik sürəti tam sıfırla
      if (Math.abs(entity.vx) < 0.05) entity.vx = 0;
      if (Math.abs(entity.vy) < 0.05) entity.vy = 0;

      // 2. Pozisiya inteqrasiyası
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;

      const entityRadius = entity.radius || 16;

      // 3. Maneələrlə dairəvi toqquşma və sürüşmə həlli (Sliding Collision Resolution)
      if (obstacles && Array.isArray(obstacles) && obstacles.length > 0) {
        for (let i = 0; i < obstacles.length; i++) {
          const obs = obstacles[i];
          if (!obs) continue;

          const obsRadius = obs.radius || 24;
          const minDistance = entityRadius + obsRadius;
          const dx = entity.x - obs.x;
          const dy = entity.y - obs.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDistance * minDistance && distSq > 0.000001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDistance - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Obyekti maneə xaricinə çıxar
            entity.x += nx * overlap;
            entity.y += ny * overlap;

            // Sürüşmə fizikası: Sürətin maneəyə doğru olan komponentini ləğv et
            const normalVelocity = entity.vx * nx + entity.vy * ny;
            if (normalVelocity < 0) {
              entity.vx -= normalVelocity * nx;
              entity.vy -= normalVelocity * ny;
            }
          }
        }
      }

      // 4. Dünya sərhədləri daxilində saxlama
      if (worldBounds) {
        let minX = 0;
        let minY = 0;
        let maxX = 3000;
        let maxY = 3000;

        if (typeof worldBounds.minX === 'number') {
          minX = worldBounds.minX;
          maxX = worldBounds.maxX;
          minY = worldBounds.minY;
          maxY = worldBounds.maxY;
        } else if (typeof worldBounds.width === 'number') {
          minX = worldBounds.x || 0;
          minY = worldBounds.y || 0;
          maxX = minX + worldBounds.width;
          maxY = minY + worldBounds.height;
        } else if (typeof worldBounds.w === 'number') {
          minX = worldBounds.x || 0;
          minY = worldBounds.y || 0;
          maxX = minX + worldBounds.w;
          maxY = minY + worldBounds.h;
        }

        // X sərhədi
        if (entity.x - entityRadius < minX) {
          entity.x = minX + entityRadius;
          if (entity.vx < 0) entity.vx = 0;
        } else if (entity.x + entityRadius > maxX) {
          entity.x = maxX - entityRadius;
          if (entity.vx > 0) entity.vx = 0;
        }

        // Y sərhədi
        if (entity.y - entityRadius < minY) {
          entity.y = minY + entityRadius;
          if (entity.vy < 0) entity.vy = 0;
        } else if (entity.y + entityRadius > maxY) {
          entity.y = maxY - entityRadius;
          if (entity.vy > 0) entity.vy = 0;
        }
      }
    }

    /**
     * İki dairəvi obyektin toqquşmasını yoxlayır.
     * @param {object} a - { x, y, radius }
     * @param {object} b - { x, y, radius }
     * @returns {boolean}
     */
    checkCircleCollision(a, b) {
      if (!a || !b) return false;
      const rA = a.radius || 0;
      const rB = b.radius || 0;
      const totalR = rA + rB;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return (dx * dx + dy * dy) <= (totalR * totalR);
    }

    /**
     * İki obyekt arasındakı Evklid məsafəsini hesablayır.
     * @param {object} a - { x, y }
     * @param {object} b - { x, y }
     * @returns {number}
     */
    distance(a, b) {
      if (!a || !b) return 0;
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    /**
     * Ekran koordinatını (məs: siçan mövqeyi) dünya koordinatına çevirir.
     * @param {number} screenX 
     * @param {number} screenY 
     * @param {HTMLCanvasElement} canvas 
     * @returns {{ x: number, y: number }}
     */
    screenToWorld(screenX, screenY, canvas) {
      if (!canvas) return { x: screenX, y: screenY };
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const offX = screenX - cx;
      const offY = screenY - cy;
      const z = this.camera.zoom || 1.0;

      return {
        x: this.camera.x + this.camera.shakeOffsetX + offX / z,
        y: this.camera.y + this.camera.shakeOffsetY + offY / z
      };
    }

    /**
     * Dünya koordinatını ekran koordinatına çevirir.
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {HTMLCanvasElement} canvas 
     * @returns {{ x: number, y: number }}
     */
    worldToScreen(worldX, worldY, canvas) {
      if (!canvas) return { x: worldX, y: worldY };
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const z = this.camera.zoom || 1.0;

      return {
        x: (worldX - (this.camera.x + this.camera.shakeOffsetX)) * z + cx,
        y: (worldY - (this.camera.y + this.camera.shakeOffsetY)) * z + cy
      };
    }

    /**
     * Kameranın mövqeyini ani olaraq qurur (səviyyə dəyişəndə və ya tullanışlarda).
     * @param {number} x 
     * @param {number} y 
     */
    setCameraPosition(x, y) {
      this.camera.x = x;
      this.camera.y = y;
    }

    /**
     * Kameranın böyütmə dərəcəsini təyin edir.
     * @param {number} zoom 
     * @param {boolean} immediate - Dərhal təyin edilsin, yoxsa hamar keçidlə
     */
    setZoom(zoom, immediate = false) {
      this.camera.targetZoom = Math.max(0.4, Math.min(2.5, zoom));
      if (immediate) {
        this.camera.zoom = this.camera.targetZoom;
      }
    }

    /**
     * Xətti interpolyasiya köməkçi funksiyası.
     */
    lerp(a, b, t) {
      return a + (b - a) * Math.max(0, Math.min(1, t));
    }

    /**
     * Dəyəri [min, max] aralığında saxlayan köməkçi funksiya.
     */
    clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    }

    /**
     * Kamera və taymer vəziyyətlərini ilkin hala qaytarır.
     */
    reset() {
      this.camera.x = 0;
      this.camera.y = 0;
      this.camera.zoom = 1.0;
      this.camera.targetZoom = 1.0;
      this.camera.shakeTimer = 0;
      this.camera.shakeDuration = 0;
      this.camera.shakeIntensity = 0;
      this.camera.shakeOffsetX = 0;
      this.camera.shakeOffsetY = 0;
      this.camera.shakeRotOffset = 0;
      this.timeScale = 1.0;
      this.hitStopTimer = 0;
      this.slowMoTimer = 0;
      this.slowMoScale = 1.0;
      this.zoomPunchTimer = 0;
    }
  }

  // =========================================================================
  // NEON VELOCITY: KİNETİK AVTOMOBİL FİZİKASI, MULTI-GEAR TRANSMİSSİYA VƏ PACEJKA DRİFT
  // =========================================================================

  const PACEJKA = {
    B: 10.0,
    C: 1.65,
    D: 1.00,
    E: -0.60,
    calculateLateralFriction: function (alpha, customMu) {
      const peak = customMu || this.D;
      const bAlpha = this.B * alpha;
      const atanBAlpha = Math.atan(bAlpha);
      const inner = bAlpha - this.E * (bAlpha - atanBAlpha);
      return peak * Math.sin(this.C * Math.atan(inner));
    }
  };

  const TRANSMISSION_SPECS = {
    gearRatios: {
      '-1': -3.50,
      0: 0.00,
      1: 3.82,
      2: 2.36,
      3: 1.68,
      4: 1.31,
      5: 1.00,
      6: 0.79
    },
    finalDrive: 3.73,
    tireRadius: 0.33,
    idleRPM: 1000,
    peakTorqueRPM: 5200,
    redlineRPM: 7500,
    limiterCutRPM: 8800,
    maxRPM: 9200,
    shiftDuration: 0.12,
    shiftKickForce: 420.0
  };

  class VehiclePhysicsEngine {
    constructor(config = {}) {
      this.config = Object.assign({
        mass: 1250,
        wheelbase: 2.65,
        trackWidth: 1.80,
        weightDistrFront: 0.52,
        baseTopSpeed: 320,
        baseHorsepower: 580,
        peakTorque: 650,
        brakeTorque: 3800,
        handbrakeBrakeFactor: 0.82,
        tireGripBase: 1.15,
        driftGripDrop: 0.52,
        aerodynamicDrag: 0.33,
        rollingResistance: 14.0
      }, config);

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
      this.targetSteerAngle = 0;

      this.gear = 1;
      this.targetGear = 1;
      this.rpm = TRANSMISSION_SPECS.idleRPM;
      this.clutchDisengaged = false;
      this.shiftTimer = 0;
      this.limiterBounceTimer = 0;
      this.limiterCutActive = false;
      this.autoShift = true;

      this.backfireTimer = 0;
      this.backfireIntensity = 0;
      this.backfireFlames = [];
      this.lastThrottle = 0;

      this.slipAngleFront = 0;
      this.slipAngleRear = 0;
      this.overallSlipAngle = 0;
      this.isDrifting = false;
      this.driftDuration = 0;
      this.driftDirection = 0;
      this.counterSteerScore = 0;
      this.isSpinout = false;
      this.spinoutTimer = 0;

      this.miniTurboCharge = 0;
      this.miniTurboReady = false;
      this.miniTurboActive = false;
      this.miniTurboTimer = 0;
      this.miniTurboDuration = 1.5;
      this.miniTurboMultiplier = 1.25;

      this.handbrakeActive = false;
      this.rearWheelsLocked = false;

      this.suspension = {
        rollAngle: 0,
        rollVelocity: 0,
        pitchAngle: 0,
        pitchVelocity: 0,
        springStiffnessRoll: 48.0,
        dampingRoll: 7.2,
        springStiffnessPitch: 55.0,
        dampingPitch: 8.5,
        squatFactor: 0.0016,
        diveFactor: 0.0028,
        rollFactor: 0.0024
      };

      this.skidMarksManager = new SkidMarkManager(700);
      this.particleManager = new VehicleParticleManager(350);

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

    update(dt, inputs = {}, environment = {}) {
      const safeDt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);
      const throttleInput = Math.max(0, Math.min(1, inputs.throttle || 0));
      const brakeInput = Math.max(0, Math.min(1, inputs.brake || 0));
      const steerInput = Math.max(-1, Math.min(1, inputs.steer || 0));
      const handbrakeInput = Boolean(inputs.handbrake);
      const nitroInput = Boolean(inputs.nitro);
      const roadCurve = environment.roadCurve || 0;
      const roadFriction = environment.roadFriction || 1.0;

      this.handbrakeActive = handbrakeInput;

      this._updateTransmission(safeDt, throttleInput, brakeInput, inputs.shiftUp, inputs.shiftDown);
      this._updateSteering(safeDt, steerInput);
      this._updateKinematicsAndDrift(safeDt, throttleInput, brakeInput, nitroInput, roadCurve, roadFriction);
      this._updateMiniTurbo(safeDt);
      this._updateSuspensionDynamics(safeDt);
      this._updateBackfireAndParticles(safeDt, throttleInput, nitroInput);
      this._updateSkidMarks(safeDt);

      this.lastThrottle = throttleInput;
    }

    _updateTransmission(dt, throttle, brake, manualShiftUp, manualShiftDown) {
      const specs = TRANSMISSION_SPECS;

      if (manualShiftUp && this.gear < 6 && this.shiftTimer <= 0) {
        this._shiftToGear(this.gear + 1);
      } else if (manualShiftDown && this.gear > 1 && this.shiftTimer <= 0) {
        this._shiftToGear(this.gear - 1);
      }

      if (this.shiftTimer > 0) {
        this.shiftTimer -= dt;
        this.clutchDisengaged = true;
        const targetRPM = this._calculateRPMForSpeed(this.velocityLong, this.gear);
        this.rpm += (targetRPM - this.rpm) * (1 - Math.exp(-22 * dt));
        if (this.shiftTimer <= 0) {
          this.clutchDisengaged = false;
          this._triggerShiftKick();
        }
        return;
      }

      const currentGearRatio = specs.gearRatios[this.gear] || 1.0;
      const wheelCircumference = 2 * Math.PI * specs.tireRadius;
      const wheelRps = Math.max(0, this.velocityLong) / wheelCircumference;
      let driveRPM = wheelRps * currentGearRatio * specs.finalDrive * 60;

      if (driveRPM < specs.idleRPM) {
        driveRPM = specs.idleRPM + throttle * 1200;
      }

      if (throttle > 0 && !this.clutchDisengaged) {
        const powerBandBonus = Math.max(0, 1 - Math.abs(driveRPM - specs.peakTorqueRPM) / 4500) * 450;
        driveRPM += throttle * powerBandBonus;
      }

      if (driveRPM >= specs.limiterCutRPM) {
        this.limiterBounceTimer += dt;
        this.limiterCutActive = true;
        const bouncePhase = Math.sin(this.limiterBounceTimer * 45);
        this.rpm = specs.limiterCutRPM - 250 + bouncePhase * 280;
        if (Math.random() < 0.28) {
          this.triggerBackfire(0.65);
        }
      } else {
        this.limiterCutActive = false;
        this.limiterBounceTimer = 0;
        this.rpm = Math.max(specs.idleRPM, Math.min(specs.maxRPM, driveRPM));
      }

      if (this.autoShift && this.shiftTimer <= 0) {
        if (this.rpm >= 7300 && this.gear < 6 && this.velocityLong > 5) {
          this._shiftToGear(this.gear + 1);
        } else if (this.rpm < 2900 && this.gear > 1) {
          const lowerGearRatio = specs.gearRatios[this.gear - 1];
          const predictedLowerRPM = wheelRps * lowerGearRatio * specs.finalDrive * 60;
          if (predictedLowerRPM < 6800) {
            this._shiftToGear(this.gear - 1);
          }
        }
      }

      if (this.lastThrottle > 0.7 && throttle < 0.1 && this.rpm > 5500) {
        this.triggerBackfire(0.85);
      }
    }

    _calculateRPMForSpeed(speedMs, gear) {
      const specs = TRANSMISSION_SPECS;
      const ratio = specs.gearRatios[gear] || 1.0;
      const wheelCircumference = 2 * Math.PI * specs.tireRadius;
      const rps = Math.max(0, speedMs) / wheelCircumference;
      return Math.max(specs.idleRPM, Math.min(specs.maxRPM, rps * ratio * specs.finalDrive * 60));
    }

    _shiftToGear(newGear) {
      if (newGear === this.gear || newGear < 1 || newGear > 6) return;
      this.gear = newGear;
      this.shiftTimer = TRANSMISSION_SPECS.shiftDuration;
      this.clutchDisengaged = true;
      this.triggerBackfire(0.9);
      this.suspension.pitchVelocity += 0.08;
    }

    _triggerShiftKick() {
      const kickImpulse = (TRANSMISSION_SPECS.shiftKickForce / this.config.mass) * (7 - this.gear) * 0.28;
      this.velocityLong += kickImpulse;
      this.suspension.pitchVelocity -= 0.14;
      if (typeof window !== 'undefined' && window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(3.5, 0.12);
      }
    }

    _updateSteering(dt, steerInput) {
      const speed = Math.max(0, this.velocityLong);
      const speedFactor = Math.max(0.25, 1.0 - (speed / 100) * 0.65);
      const maxSteer = 0.44 * speedFactor;
      this.targetSteerAngle = steerInput * maxSteer;
      const steerSpeed = 14.0;
      this.steerAngle += (this.targetSteerAngle - this.steerAngle) * (1 - Math.exp(-steerSpeed * dt));
    }

    _updateKinematicsAndDrift(dt, throttle, brake, nitro, roadCurve, roadFriction) {
      const cfg = this.config;
      const specs = TRANSMISSION_SPECS;

      let engineTorque = 0;
      if (!this.clutchDisengaged && !this.limiterCutActive && throttle > 0) {
        const rpmNorm = (this.rpm - specs.idleRPM) / (specs.maxRPM - specs.idleRPM);
        const torqueCurve = Math.sin(Math.max(0, Math.min(Math.PI, rpmNorm * Math.PI)));
        engineTorque = cfg.peakTorque * (0.45 + 0.55 * torqueCurve) * throttle;
        if (nitro) engineTorque *= 1.45;
        if (this.miniTurboActive) engineTorque *= this.miniTurboMultiplier;
      }

      const gearRatio = specs.gearRatios[this.gear] || 1.0;
      const wheelDriveTorque = engineTorque * gearRatio * specs.finalDrive * 0.88;
      const tractiveForce = wheelDriveTorque / specs.tireRadius;

      let brakeForceLong = (brake * cfg.brakeTorque) / specs.tireRadius;
      if (this.handbrakeActive) {
        brakeForceLong += (cfg.brakeTorque * cfg.handbrakeBrakeFactor) / specs.tireRadius;
        this.rearWheelsLocked = true;
      } else {
        this.rearWheelsLocked = false;
      }

      const speedSign = Math.sign(this.velocityLong);
      const aeroDragForce = 0.5 * 1.225 * cfg.aerodynamicDrag * 2.2 * (this.velocityLong * this.velocityLong) * speedSign;
      const rollResistForce = cfg.rollingResistance * cfg.mass * 9.81 * 0.001 * speedSign;

      const netLongForce = tractiveForce - brakeForceLong - aeroDragForce - rollResistForce;
      this.accelerationLong = netLongForce / cfg.mass;
      this.velocityLong += this.accelerationLong * dt;

      if (this.gear > 0 && this.velocityLong < 0) {
        this.velocityLong = 0;
      }

      const absVLong = Math.max(1.5, Math.abs(this.velocityLong));
      const Lf = cfg.wheelbase * (1 - cfg.weightDistrFront);
      const Lr = cfg.wheelbase * cfg.weightDistrFront;

      this.slipAngleFront = Math.atan2(this.velocityLat + this.yawRate * Lf, absVLong) - this.steerAngle;
      this.slipAngleRear = Math.atan2(this.velocityLat - this.yawRate * Lr, absVLong);
      this.overallSlipAngle = Math.atan2(this.velocityLat, absVLong);

      const normalLoadFront = cfg.mass * 9.81 * cfg.weightDistrFront;
      const normalLoadRear = cfg.mass * 9.81 * (1 - cfg.weightDistrFront);

      let frontMu = cfg.tireGripBase * roadFriction;
      let rearMu = cfg.tireGripBase * roadFriction;

      if (this.handbrakeActive) {
        rearMu *= 0.20;
      }
      if (Math.abs(this.slipAngleRear) > 0.14) {
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
      const minDriftSpeed = 35 / 3.6;

      const initiateDrift = (this.velocityLong >= minDriftSpeed) && (
        absDriftAngleDeg >= 6.5 ||
        (this.handbrakeActive && Math.abs(this.targetSteerAngle) > 0.04) ||
        (brake > 0.35 && Math.abs(this.targetSteerAngle) > 0.08)
      );

      const sustainDrift = this.isDrifting && (
        (throttle > 0.2 && Math.abs(this.targetSteerAngle) > 0.04) ||
        absDriftAngleDeg >= 4.8 ||
        this.handbrakeActive
      );

      if (initiateDrift || sustainDrift) {
        this.isDrifting = true;
        this.driftDirection = Math.sign(this.yawRate) || Math.sign(this.overallSlipAngle) || Math.sign(this.steerAngle) || 1;

        const isCounterSteering = (this.driftDirection > 0 && this.steerAngle < -0.01) ||
                                  (this.driftDirection < 0 && this.steerAngle > 0.01);

        if (isCounterSteering) {
          this.counterSteerScore = Math.min(1.0, this.counterSteerScore + dt * 2.2);
          this.driftDuration += dt * 1.35;
        } else {
          this.driftDuration += dt;
          if (absDriftAngleDeg > 70.0) {
            this._triggerSpinout();
          }
        }

        this.miniTurboCharge = Math.min(1.0, this.driftDuration / 1.5);
        if (this.miniTurboCharge >= 1.0) {
          this.miniTurboReady = true;
        }
      } else if (this.isDrifting) {
        if (this.miniTurboReady && !this.isSpinout) {
          this.triggerMiniTurbo();
        }
        this.isDrifting = false;
        this.driftDuration = 0;
        this.miniTurboCharge = 0;
        this.miniTurboReady = false;
      }

      if (this.isSpinout) {
        this.spinoutTimer -= dt;
        this.velocityLong *= Math.exp(-2.5 * dt);
        this.yawRate += (Math.random() - 0.5) * 8 * dt;
        if (this.spinoutTimer <= 0) {
          this.isSpinout = false;
        }
      }

      this.speedKmh = Math.max(0, this.velocityLong * 3.6);
      this.z += this.velocityLong * dt;
      const roadHalfWidth = 14.0;
      this.x += (this.velocityLat / roadHalfWidth) * dt * 2.8;
    }

    _triggerSpinout() {
      if (this.isSpinout) return;
      this.isSpinout = true;
      this.spinoutTimer = 1.4;
      this.miniTurboReady = false;
      this.miniTurboCharge = 0;

      if (typeof window !== 'undefined' && window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(12.0, 0.45);
      }
      this.triggerBackfire(1.0);
    }

    triggerMiniTurbo() {
      this.miniTurboActive = true;
      this.miniTurboTimer = this.miniTurboDuration;
      this.velocityLong += 6.5;
      this.triggerBackfire(1.0);

      if (typeof window !== 'undefined' && window.GameJuice) {
        if (typeof window.GameJuice.zoomPunch === 'function') {
          window.GameJuice.zoomPunch(0.12, 0.35);
        }
        if (typeof window.GameJuice.shake === 'function') {
          window.GameJuice.shake(6.0, 0.25);
        }
      }

      if (typeof window !== 'undefined') {
        const event = new CustomEvent('neon:miniturbo', {
          detail: { speedKmh: this.speedKmh, duration: this.miniTurboDuration }
        });
        window.dispatchEvent(event);
      }
    }

    _updateMiniTurbo(dt) {
      if (this.miniTurboActive) {
        this.miniTurboTimer -= dt;
        if (this.miniTurboTimer <= 0) {
          this.miniTurboActive = false;
        }
      }
    }

    _updateSuspensionDynamics(dt) {
      const susp = this.suspension;
      const targetRoll = -this.accelerationLat * susp.rollFactor;
      const rollSpringForce = -susp.springStiffnessRoll * (susp.rollAngle - targetRoll);
      const rollDampForce = -susp.dampingRoll * susp.rollVelocity;
      const rollAcc = rollSpringForce + rollDampForce;

      susp.rollVelocity += rollAcc * dt;
      susp.rollAngle += susp.rollVelocity * dt;

      const targetPitch = this.accelerationLong * (this.accelerationLong >= 0 ? susp.squatFactor : susp.diveFactor);
      const pitchSpringForce = -susp.springStiffnessPitch * (susp.pitchAngle - targetPitch);
      const pitchDampForce = -susp.dampingPitch * susp.pitchVelocity;
      const pitchAcc = pitchSpringForce + pitchDampForce;

      susp.pitchVelocity += pitchAcc * dt;
      susp.pitchAngle += susp.pitchVelocity * dt;

      susp.rollAngle = Math.max(-0.25, Math.min(0.25, susp.rollAngle));
      susp.pitchAngle = Math.max(-0.20, Math.min(0.20, susp.pitchAngle));
    }

    triggerBackfire(intensity = 0.8) {
      this.backfireTimer = 0.22;
      this.backfireIntensity = Math.min(1.0, intensity);
      this.backfireFlames = [
        { side: 'left', size: 1.0 + intensity * 0.8, life: 1.0 },
        { side: 'right', size: 1.0 + intensity * 0.8, life: 1.0 }
      ];
      this.particleManager.spawnBackfireSparks(this, intensity);
    }

    _updateBackfireAndParticles(dt, throttle, nitro) {
      if (this.backfireTimer > 0) {
        this.backfireTimer -= dt;
        for (let i = 0; i < this.backfireFlames.length; i++) {
          this.backfireFlames[i].life -= dt * 4.5;
        }
      }

      const absRearSlip = Math.abs(this.slipAngleRear);
      const isSlipping = absRearSlip > 0.15 || this.handbrakeActive || (this.speedKmh > 30 && this.accelerationLong < -5);

      if (isSlipping && this.speedKmh > 15) {
        const intensity = Math.min(1.0, (absRearSlip / 0.5) + (this.handbrakeActive ? 0.6 : 0.0));
        this.particleManager.spawnTireSmoke(this, intensity);
      }

      this.particleManager.update(dt);
    }

    _updateSkidMarks(dt) {
      const absRearSlip = Math.abs(this.slipAngleRear);
      const shouldMark = (absRearSlip > 0.16) || this.handbrakeActive;

      if (shouldMark && this.speedKmh > 12) {
        const opacity = Math.min(0.85, 0.25 + absRearSlip * 0.9 + (this.handbrakeActive ? 0.35 : 0.0));
        this.skidMarksManager.addMark(this, 'rl', opacity);
        this.skidMarksManager.addMark(this, 'rr', opacity);

        if (absRearSlip > 0.32) {
          const outerFront = this.driftDirection > 0 ? 'fl' : 'fr';
          this.skidMarksManager.addMark(this, outerFront, opacity * 0.6);
        }
      } else {
        this.skidMarksManager.breakMark();
      }

      this.skidMarksManager.update(dt);
    }

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
        handbrake: this.handbrakeActive,
        rollDeg: (this.suspension.rollAngle * (180 / Math.PI)).toFixed(1),
        pitchDeg: (this.suspension.pitchAngle * (180 / Math.PI)).toFixed(1),
        backfireActive: this.backfireTimer > 0,
        lateralG: (this.accelerationLat / 9.81).toFixed(2),
        longitudinalG: (this.accelerationLong / 9.81).toFixed(2)
      };
    }

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
      this.suspension.rollAngle = 0;
      this.suspension.pitchAngle = 0;
      this.suspension.rollVelocity = 0;
      this.suspension.pitchVelocity = 0;
      this.skidMarksManager.clear();
      this.particleManager.clear();
    }
  }

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

      const cosH = Math.cos(vehicle.headingAngle);
      const sinH = Math.sin(vehicle.headingAngle);
      const wx = vehicle.x + (offset.x * cosH - offset.z * sinH);
      const wz = vehicle.z + (offset.x * sinH + offset.z * cosH);

      const last = this.lastPoints[wheelKey];
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

  class VehicleParticleManager {
    constructor(poolSize = 350) {
      this.poolSize = poolSize;
      this.pool = new Array(poolSize);
      for (let i = 0; i < poolSize; i++) {
        this.pool[i] = {
          active: false,
          type: 'smoke',
          x: 0, y: 0, z: 0,
          vx: 0, vy: 0, vz: 0,
          size: 1,
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
      const p = this.pool[this.nextIdx];
      this.nextIdx = (this.nextIdx + 1) % this.poolSize;
      return p;
    }

    spawnTireSmoke(vehicle, intensity) {
      const count = Math.ceil(3 * intensity);
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
          p.maxSize = 2.4 + Math.random() * 2.2;
          p.life = 0;
          p.maxLife = 0.45 + Math.random() * 0.4;
          p.opacity = 0.65 * intensity;
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
          p.size = p.size + (p.maxSize - p.size) * (progress * 1.5);
          p.opacity = (1 - progress) * 0.7;
          p.vy *= 0.95;
        } else if (p.type === 'spark') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 9.81 * dt;
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

  const NeonVehiclePhysics = {
    Engine: VehiclePhysicsEngine,
    SkidMarkManager: SkidMarkManager,
    ParticleManager: VehicleParticleManager,
    Pacejka: PACEJKA,
    TransmissionSpecs: TRANSMISSION_SPECS,
    createVehicle: function (tunerModel = 'cyber_drifter') {
      let tuning = {};
      if (tunerModel === 'cyber_drifter') {
        tuning = {
          mass: 1180,
          driftGripDrop: 0.62,
          tireGripBase: 1.05,
          peakTorque: 690,
          baseTopSpeed: 330
        };
      } else if (tunerModel === 'phantom') {
        tuning = {
          mass: 1100,
          driftGripDrop: 0.48,
          tireGripBase: 1.25,
          peakTorque: 740,
          baseTopSpeed: 360
        };
      } else if (tunerModel === 'interceptor') {
        tuning = {
          mass: 1380,
          driftGripDrop: 0.50,
          tireGripBase: 1.20,
          peakTorque: 710,
          baseTopSpeed: 310
        };
      }
      return new VehiclePhysicsEngine(tuning);
    }
  };

  // Tək nüsxə nümunəsi yaradırıq (Singleton pattern)
  const gameJuiceInstance = new PhysicsJuiceEngine();
  gameJuiceInstance.VehiclePhysicsEngine = VehiclePhysicsEngine;
  gameJuiceInstance.NeonVehiclePhysics = NeonVehiclePhysics;

  // Qlobal brauzer mühitinə bağlayırıq
  if (typeof window !== 'undefined') {
    window.GameJuice = gameJuiceInstance;
    window.NeonVehiclePhysics = NeonVehiclePhysics;
  }

  // Node.js və ya ES mühiti üçün ixrac dəstəyi
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      GameJuice: gameJuiceInstance,
      NeonVehiclePhysics: NeonVehiclePhysics
    };
  }
})();
