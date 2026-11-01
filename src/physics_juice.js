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

  // Tək nüsxə nümunəsi yaradırıq (Singleton pattern)
  const gameJuiceInstance = new PhysicsJuiceEngine();

  // Qlobal brauzer mühitinə bağlayırıq
  if (typeof window !== 'undefined') {
    window.GameJuice = gameJuiceInstance;
  }

  // Node.js və ya ES mühiti üçün ixrac dəstəyi
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = gameJuiceInstance;
  }
})();
