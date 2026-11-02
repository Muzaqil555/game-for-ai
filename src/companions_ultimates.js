/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V2.0)
 * Döyüşçü Yoldaşlar və Ultimate Güc Mütəxəssisi (companion_mount_specialist)
 *
 * Fayl: src/companions_ultimates.js
 * Qlobal Obyekt: window.GameCompanions
 *
 * Məsuliyyətlər:
 * 1. 3 Sadiq Döyüşçü Yoldaş (Companions/Pets):
 *    - 'phoenix' (Alov Simurqu): Oyunçunun ətrafında süzülür, hər 1.0s yaxın düşmənə alov mərmisi atır, hər 4.0s +8 Can bərpa edir.
 *    - 'dragon'  (Astral Bala Əjdaha): Hər 0.85s deşici astral plazma atır, 280px radiusdakı qənimətləri (qızıl, kristal, can) maqnit kimi çəkir.
 *    - 'wolf'    (Kölgə Ruh Qurdu): Yaxınlıqdakı düşmənlərə sürətlə şığıyıb (bite) zərər vurur və 2 saniyəlik yavaşladır (slow).
 * 2. Ultimate Super Güc: [R] "Aether Qiyaməti" (Meteor & Arcane Cataclysm):
 *    - rage: 0–100 (başlanğıcda 50).
 *    - triggerUltimate: rage = 0 edir, 3 saniyə ərzində 14 nəhəng Qızılı-Astral Meteor yağdırır!
 */

(function () {
  'use strict';

  // --- Köməkçi Riyazi Utilitlər ---
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distSq(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  // Təhlükəsiz SFX səsləndirmə utiliti
  function playSound(type) {
    try {
      if (typeof window !== 'undefined' && window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX(type);
      }
    } catch (_) {}
  }

  // Təhlükəsiz UI Bildirişi
  function notifyUI(msg, color) {
    try {
      if (typeof window !== 'undefined' && window.GameUI && typeof window.GameUI.showNotification === 'function') {
        window.GameUI.showNotification(msg, color);
      }
    } catch (_) {}
  }

  // Təhlükəsiz Ekran Titrəməsi
  function shakeScreen(amount, duration, callbacks) {
    try {
      if (typeof window !== 'undefined' && window.GameJuice && typeof window.GameJuice.shakeScreen === 'function') {
        window.GameJuice.shakeScreen(amount, duration);
        return;
      }
    } catch (_) {}
    if (callbacks && typeof callbacks.onScreenShake === 'function') {
      callbacks.onScreenShake(amount, duration);
    }
  }

  // Təhlükəsiz VFX Meteor Zərbəsi
  function spawnVfxMeteor(x, y) {
    try {
      if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnMeteorStrike === 'function') {
        window.GameVFX.spawnMeteorStrike(x, y);
      }
    } catch (_) {}
  }

  // --- ƏSAS GAME COMPANIONS SİSTEMİ ---
  var GameCompanions = {
    // 1. Vəziyyət (State)
    initialized: false,
    rage: 50, // Başlanğıcda 50 — oyunçu dərhal yoxlaya bilsin!
    maxRage: 100,
    activeType: 'phoenix',
    types: ['phoenix', 'dragon', 'wolf'],

    // Yoldaşların Ətraflı Konfiqurasiyası
    companions: {
      phoenix: {
        id: 'phoenix',
        name: 'Alov Simurqu',
        title: 'Müqəddəs Külün Dirilişi',
        icon: '🦅',
        color: '#ff6b35',
        glowColor: 'rgba(255, 107, 53, 0.55)',
        secondaryColor: '#ffd166',
        description: 'Hər 1.0s yaxın düşmənə alov mərmisi atır və hər 4s oyunçuya +8 Can bərpa edir.',
        // Dinamik Mövqe
        x: 0,
        y: 0,
        targetOffsetX: -58,
        targetOffsetY: -62,
        bobTimer: 0,
        facingLeft: false,
        // Döyüş Parametrləri
        shootCooldown: 1.0,
        shootTimer: 0.5,
        healCooldown: 4.0,
        healTimer: 2.0,
        healAmount: 8,
        damage: 32,
        range: 480,
        // Qanad qaxma animasiyası
        wingFlap: 0
      },
      dragon: {
        id: 'dragon',
        name: 'Astral Bala Əjdaha',
        title: 'Kosmik Cazibə və Plazma Hakimi',
        icon: '🐉',
        color: '#00e5ff',
        glowColor: 'rgba(0, 229, 255, 0.55)',
        secondaryColor: '#8a2be2',
        description: 'Hər 0.85s deşici astral plazma atır və 280px radiusdakı bütün qənimətləri maqnit kimi çəkir.',
        // Dinamik Mövqe
        x: 0,
        y: 0,
        targetOffsetX: 58,
        targetOffsetY: -62,
        bobTimer: 1.5,
        facingLeft: false,
        // Döyüş və Maqnit Parametrləri
        shootCooldown: 0.85,
        shootTimer: 0.35,
        damage: 38,
        pierceCount: 3,
        range: 520,
        magnetRadius: 280,
        magnetSpeed: 580,
        wingFlap: 0
      },
      wolf: {
        id: 'wolf',
        name: 'Kölgə Ruh Qurdu',
        title: 'Qaranlıq Pəncə və Şikarçı',
        icon: '🐺',
        color: '#a29bfe',
        glowColor: 'rgba(162, 155, 254, 0.55)',
        secondaryColor: '#2d3436',
        description: 'Yaxınlıqdakı düşmənlərə sürətlə şığıyıb (bite) zərər verir və onları 2s 35% yavaşladır.',
        // Dinamik Mövqe
        x: 0,
        y: 0,
        targetOffsetX: -48,
        targetOffsetY: 32,
        bobTimer: 2.8,
        facingLeft: false,
        // Döyüş və Şığıma Parametrləri
        state: 'following', // 'following' | 'rushing' | 'returning'
        biteCooldown: 1.2,
        biteTimer: 0.6,
        damage: 46,
        range: 240,
        slowDuration: 2.0,
        slowMultiplier: 0.65,
        rushTarget: null,
        rushStartX: 0,
        rushStartY: 0,
        rushProgress: 0,
        biteEffectTimer: 0
      }
    },

    // 2. Ultimate Super Güc: [R] Aether Qiyaməti
    ultimate: {
      isActive: false,
      timer: 0,
      duration: 3.0,
      meteorsTotal: 14, // Dəqiq 14 nəhəng Qızılı-Astral Meteor!
      meteorsSpawned: 0,
      meteorSchedule: [], // Vaxt intervalları ilə spawn siyahısı
      activeMeteors: [],  // Göydən düşən aktiv meteorlar
      craters: [],        // Zərbə kraterləri və parıltılar
      screenFlashTimer: 0
    },

    // Daxili Vizual Hissəciklər (Aura, alov izləri, qənimət maqnit xətləri)
    particles: [],

    // Son daxil olan istinadlar (Klaviatura ilə atəş açmaq üçün)
    _lastPlayer: null,
    _lastEnemies: null,
    _lastCallbacks: null,

    /**
     * Modulu ilkinləşdirir və hadisə dinləyicilərini qoşur.
     */
    init: function () {
      // Klaviatura ([C], [R]) GameEngine tərəfindən idarə olunur: burada dinləyici yoxdur
      this.resetRun();
      this.initialized = true;
    },

    /**
     * Hər yeni qaçış üçün qəzəb, yoldaş və ultimate vəziyyətini sıfırlayır.
     */
    resetRun: function () {
      this.rage = 50; // Başlanğıcda 50
      this.activeType = 'phoenix';
      this.ultimate.isActive = false;
      this.ultimate.timer = 0;
      this.ultimate.meteorsSpawned = 0;
      this.ultimate.screenFlashTimer = 0;
      this.ultimate.activeMeteors = [];
      this.ultimate.meteorSchedule = [];
      this.ultimate.craters = [];
      this.particles = [];
    },

    /**
     * Aktiv yoldaşı təyin edir ('phoenix' | 'dragon' | 'wolf')
     */
    setActiveCompanion: function (type) {
      if (!this.companions[type]) return;
      this.activeType = type;

      var comp = this.companions[type];
      // Keçid effekti (Partlayış hissəcikləri)
      this._spawnSpawnParticles(comp.x, comp.y, comp.color, 16);
      playSound('spell');

      // UI bildirişi
      notifyUI(comp.icon + ' ' + comp.name + ' çağırıldı!', comp.color);
    },

    /**
     * Hazırkı aktiv yoldaş obyektini qaytarır
     */
    getActiveCompanion: function () {
      return this.companions[this.activeType] || this.companions.phoenix;
    },

    /**
     * Növbəti yoldaşı seçir (Dövriyyə)
     */
    cycleCompanion: function () {
      var currentIndex = this.types.indexOf(this.activeType);
      var nextIndex = (currentIndex + 1) % this.types.length;
      var nextType = this.types[nextIndex];
      this.setActiveCompanion(nextType);
      return this.getActiveCompanion();
    },

    /**
     * Bütün 3 yoldaşın siyahısını qaytarır
     */
    getAllCompanions: function () {
      var self = this;
      return this.types.map(function (t) {
        return self.companions[t];
      });
    },

    /**
     * Qəzəb (Rage) əlavə edir (0–100)
     */
    addRage: function (amount) {
      var amt = Number(amount) || 0;
      if (amt <= 0) return;

      var oldRage = this.rage;
      this.rage = clamp(this.rage + amt, 0, this.maxRage);

      // Əgər 100-ə çatdısa səs və bildiriş ver
      if (oldRage < 100 && this.rage >= 100) {
        playSound('quest');
        notifyUI('🔥 [R] AETHER QİYAMƏTİ HAZIRDIR!', '#ffd700');
      }
    },

    getRage: function () {
      return this.rage;
    },

    getMaxRage: function () {
      return this.maxRage;
    },

    /**
     * Ultimate atmaq mümkündürmü? (rage >= 100 və hazırda aktiv deyilsə)
     */
    canCastUltimate: function () {
      return this.rage >= this.maxRage && !this.ultimate.isActive;
    },

    isUltimateActive: function () {
      return this.ultimate.isActive;
    },

    /**
     * Ultimate Super Gücü Aktivləşdirir: "Aether Qiyaməti"
     * 3 saniyə ərzində 14 nəhəng Qızılı-Astral Meteor yağdırır!
     */
    triggerUltimate: function (player, enemies, callbacks) {
      if (this.ultimate.isActive) return false;
      if (this.rage < this.maxRage) return false;

      // Qəzəbi sıfırla
      this.rage = 0;

      // Vəziyyəti qur
      var ult = this.ultimate;
      ult.isActive = true;
      ult.timer = 0;
      ult.duration = 3.0;
      ult.meteorsTotal = 14;
      ult.meteorsSpawned = 0;
      ult.meteorSchedule = [];
      ult.activeMeteors = [];
      ult.screenFlashTimer = 0.4;

      // 14 meteor üçün cədvəl qur (3.0 saniyə üzrə paylanmış zamanlar)
      for (var i = 0; i < 14; i++) {
        // 0.05s-dən başlayaraq 2.80s-ə qədər bərabər aralıqlı və bir az jitterli zamanlar
        var baseTime = 0.06 + (i * (2.75 / 13));
        var jitter = (Math.random() - 0.5) * 0.05;
        ult.meteorSchedule.push({
          time: Math.max(0.04, baseTime + jitter),
          triggered: false,
          index: i
        });
      }

      // Başlanğıc Səsi və Titrəmə
      playSound('bossRoar');
      playSound('levelUp');

      shakeScreen(15, 0.45, callbacks);
      notifyUI('⚡ [R] AETHER QİYAMƏTİ BAŞLADI!', '#ff0055');

      return true;
    },

    /**
     * Əsas Yeniləmə Dövrü (Hər kadr mühərrik tərəfindən çağırılır)
     */
    update: function (dt, player, enemies, pickups, projectiles, callbacks) {
      if (!this.initialized) this.init();

      var delta = clamp(dt || 0.016, 0.001, 0.1);
      callbacks = callbacks || {};

      // İstinadları yadda saxla
      this._lastPlayer = player;
      this._lastEnemies = enemies;
      this._lastCallbacks = callbacks;

      // 1. Aktiv Yoldaşı yenilə
      if (player) {
        this._updateCompanion(delta, player, enemies, pickups, projectiles, callbacks);
      }

      // 2. Ultimate Meteor Yağışını yenilə
      this._updateUltimate(delta, player, enemies, callbacks);

      // 3. Vizual Hissəcikləri yenilə
      this._updateParticles(delta);
    },

    /**
     * Aktiv Yoldaşın Mövqe, Davranış və Qabiliyyətlərini Yeniləyir
     */
    _updateCompanion: function (dt, player, enemies, pickups, projectiles, callbacks) {
      var comp = this.getActiveCompanion();
      comp.bobTimer = (comp.bobTimer || 0) + dt * 3.5;
      comp.wingFlap = Math.sin(comp.bobTimer * 2.2);

      // İlkin mövqe ver
      if (!comp.x && !comp.y) {
        comp.x = player.x + comp.targetOffsetX;
        comp.y = player.y + comp.targetOffsetY;
      }

      // === NÖVƏ XÜSUSİ DAVRANIŞLAR ===

      // A) Alov Simurqu (Phoenix)
      if (comp.id === 'phoenix') {
        var pTargetX = player.x + comp.targetOffsetX;
        var pTargetY = player.y + comp.targetOffsetY + Math.sin(comp.bobTimer) * 9;

        // Hamar izləmə (Lerp)
        comp.x = lerp(comp.x, pTargetX, dt * 7.5);
        comp.y = lerp(comp.y, pTargetY, dt * 7.5);
        comp.facingLeft = comp.x > player.x;

        // Simurq Alov İzi hissəcikləri
        if (Math.random() < 0.35) {
          this._spawnParticle(
            comp.x + (Math.random() - 0.5) * 12,
            comp.y + 4 + (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 20,
            15 + Math.random() * 25,
            comp.color,
            0.4,
            4
          );
        }

        // Qabiliyyət 1: Hər 1.0s yaxın düşmənə alov mərmisi atır
        comp.shootTimer = (comp.shootTimer || 0) - dt;
        if (comp.shootTimer <= 0) {
          var targetEnemy = this._findNearestEnemy(comp.x, comp.y, enemies, comp.range);
          if (targetEnemy) {
            this._firePhoenixFlame(comp, targetEnemy, projectiles, callbacks);
            comp.shootTimer = comp.shootCooldown;
          } else {
            comp.shootTimer = 0.2; // Düşmən yoxdursa tez-tez yoxla
          }
        }

        // Qabiliyyət 2: Hər 4.0s oyunçuya +8 Can bərpa edir
        comp.healTimer = (comp.healTimer || 0) - dt;
        if (comp.healTimer <= 0) {
          comp.healTimer = comp.healCooldown;
          this._healPlayer(player, comp.healAmount, comp, callbacks);
        }
      }

      // B) Astral Bala Əjdaha (Dragon)
      else if (comp.id === 'dragon') {
        var dTargetX = player.x + comp.targetOffsetX;
        var dTargetY = player.y + comp.targetOffsetY + Math.sin(comp.bobTimer) * 8;

        comp.x = lerp(comp.x, dTargetX, dt * 8.0);
        comp.y = lerp(comp.y, dTargetY, dt * 8.0);
        comp.facingLeft = comp.x > player.x;

        // Astral quyruq parıltısı
        if (Math.random() < 0.35) {
          this._spawnParticle(
            comp.x + (Math.random() - 0.5) * 10,
            comp.y + (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 15,
            -15 - Math.random() * 20,
            comp.color,
            0.45,
            3.5
          );
        }

        // Qabiliyyət 1: Hər 0.85s deşici astral plazma atır
        comp.shootTimer = (comp.shootTimer || 0) - dt;
        if (comp.shootTimer <= 0) {
          var targetEnemyD = this._findNearestEnemy(comp.x, comp.y, enemies, comp.range);
          if (targetEnemyD) {
            this._fireDragonPlasma(comp, targetEnemyD, projectiles, callbacks);
            comp.shootTimer = comp.shootCooldown;
          } else {
            comp.shootTimer = 0.2;
          }
        }

        // Qabiliyyət 2: 280px radiusdakı bütün qənimətləri (qızıl, kristal, can) maqnit kimi çəkir!
        this._applyLootMagnet(comp, player, pickups, dt);
      }

      // C) Kölgə Ruh Qurdu (Wolf)
      else if (comp.id === 'wolf') {
        comp.biteEffectTimer = Math.max(0, (comp.biteEffectTimer || 0) - dt);

        if (comp.state === 'following') {
          var wTargetX = player.x + comp.targetOffsetX;
          var wTargetY = player.y + comp.targetOffsetY + Math.sin(comp.bobTimer) * 4;

          comp.x = lerp(comp.x, wTargetX, dt * 9.0);
          comp.y = lerp(comp.y, wTargetY, dt * 9.0);
          comp.facingLeft = comp.x > player.x;

          // Kölgə dumanı
          if (Math.random() < 0.3) {
            this._spawnParticle(
              comp.x + (Math.random() - 0.5) * 14,
              comp.y + 6 + (Math.random() - 0.5) * 6,
              (Math.random() - 0.5) * 10,
              -5 - Math.random() * 10,
              '#6c5ce7',
              0.5,
              4.5
            );
          }

          // Hücum və şığıma axtarışı
          comp.biteTimer = (comp.biteTimer || 0) - dt;
          if (comp.biteTimer <= 0) {
            var nearEnemy = this._findNearestEnemy(player.x, player.y, enemies, comp.range);
            if (nearEnemy) {
              comp.state = 'rushing';
              comp.rushTarget = nearEnemy;
              comp.rushStartX = comp.x;
              comp.rushStartY = comp.y;
              comp.rushProgress = 0;
              playSound('dash');
            } else {
              comp.biteTimer = 0.25;
            }
          }
        } else if (comp.state === 'rushing') {
          // Düşmənə doğru ildırım sürəti ilə şığıyır
          comp.rushProgress += dt * 5.5; // ~0.18 saniyəyə çatır
          var enemy = comp.rushTarget;

          var eX = enemy && enemy.hp > 0 ? enemy.x : comp.rushStartX;
          var eY = enemy && enemy.hp > 0 ? enemy.y : comp.rushStartY;

          comp.x = lerp(comp.rushStartX, eX, Math.min(1, comp.rushProgress));
          comp.y = lerp(comp.rushStartY, eY, Math.min(1, comp.rushProgress));
          comp.facingLeft = comp.x > eX;

          // Şığıma kölgə zolağı
          this._spawnParticle(comp.x, comp.y, 0, 0, '#a29bfe', 0.25, 6);

          if (comp.rushProgress >= 1 || (enemy && distSq(comp.x, comp.y, enemy.x, enemy.y) < 32 * 32)) {
            // Şığıb dişlədi (Bite)
            if (enemy && enemy.hp > 0) {
              this._biteEnemy(comp, enemy, callbacks);
            }
            comp.state = 'returning';
            comp.rushProgress = 0;
            comp.rushStartX = comp.x;
            comp.rushStartY = comp.y;
          }
        } else if (comp.state === 'returning') {
          // Oyunçunun yanına sürətlə qayıdır
          var homeX = player.x + comp.targetOffsetX;
          var homeY = player.y + comp.targetOffsetY;
          comp.rushProgress += dt * 4.5;
          comp.x = lerp(comp.rushStartX, homeX, Math.min(1, comp.rushProgress));
          comp.y = lerp(comp.rushStartY, homeY, Math.min(1, comp.rushProgress));
          comp.facingLeft = comp.x > homeX;

          if (comp.rushProgress >= 1 || distSq(comp.x, comp.y, homeX, homeY) < 24 * 24) {
            comp.state = 'following';
            comp.biteTimer = comp.biteCooldown;
          }
        }
      }
    },

    /**
     * Simurq: Alov mərmisi atışı
     */
    _firePhoenixFlame: function (comp, enemy, projectiles, callbacks) {
      var dx = enemy.x - comp.x;
      var dy = enemy.y - comp.y;
      var dist = Math.hypot(dx, dy) || 1;
      var speed = 440;
      var vx = (dx / dist) * speed;
      var vy = (dy / dist) * speed;

      var projectile = {
        x: comp.x,
        y: comp.y,
        vx: vx,
        vy: vy,
        damage: comp.damage + Math.floor(Math.random() * 8),
        radius: 8,
        color: '#ff5722',
        glowColor: '#ff9800',
        life: 1.6,
        source: 'companion_phoenix',
        type: 'fireball',
        piercing: false,
        trail: 'fire'
      };

      if (projectiles && Array.isArray(projectiles)) {
        projectiles.push(projectile);
      }
      if (callbacks && typeof callbacks.onSpawnProjectile === 'function') {
        callbacks.onSpawnProjectile(projectile);
      }

      playSound('spell');

      // Ağızdan kiçik alov partlayışı
      this._spawnSpawnParticles(comp.x, comp.y, '#ff9800', 6);
    },

    /**
     * Simurq: Oyunçunun canını bərpa etmə (+8 HP)
     */
    _healPlayer: function (player, amount, comp, callbacks) {
      if (!player) return;
      var maxHp = player.maxHp || 100;
      var oldHp = player.hp || 0;
      player.hp = Math.min(maxHp, oldHp + amount);

      // Şəfa səs effekti
      playSound('levelUp');

      // Callback
      if (callbacks && typeof callbacks.onHeal === 'function') {
        callbacks.onHeal(amount);
      }

      // Yaşıl-qızılı parıltı effekti
      for (var i = 0; i < 12; i++) {
        var angle = Math.random() * Math.PI * 2;
        var spd = 25 + Math.random() * 45;
        this._spawnParticle(
          player.x,
          player.y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd - 30,
          '#2ecc71',
          0.6,
          4
        );
      }

      // Simurqdan oyunçuya şəfa şüası
      this._spawnSpawnParticles(comp.x, comp.y, '#ffd166', 8);
    },

    /**
     * Əjdaha: Deşici Astral Plazma atışı
     */
    _fireDragonPlasma: function (comp, enemy, projectiles, callbacks) {
      var dx = enemy.x - comp.x;
      var dy = enemy.y - comp.y;
      var dist = Math.hypot(dx, dy) || 1;
      var speed = 500;
      var vx = (dx / dist) * speed;
      var vy = (dy / dist) * speed;

      var projectile = {
        x: comp.x,
        y: comp.y,
        vx: vx,
        vy: vy,
        damage: comp.damage + Math.floor(Math.random() * 10),
        radius: 11,
        color: '#00e5ff',
        glowColor: '#8a2be2',
        life: 1.8,
        source: 'companion_dragon',
        type: 'astral_plasma',
        piercing: true,
        hitsLeft: comp.pierceCount || 3,
        hitEnemies: [],
        trail: 'astral'
      };

      if (projectiles && Array.isArray(projectiles)) {
        projectiles.push(projectile);
      }
      if (callbacks && typeof callbacks.onSpawnProjectile === 'function') {
        callbacks.onSpawnProjectile(projectile);
      }

      playSound('spell');
      this._spawnSpawnParticles(comp.x, comp.y, '#00e5ff', 8);
    },

    /**
     * Əjdaha: Qənimət Maqniti (280px radiusdakı qızıl, kristal, can kürələrini çəkir)
     */
    _applyLootMagnet: function (comp, player, pickups, dt) {
      if (!pickups || !Array.isArray(pickups) || pickups.length === 0) return;

      var radius = comp.magnetRadius || 280;
      var rSq = radius * radius;
      var pX = player.x;
      var pY = player.y;

      for (var i = 0; i < pickups.length; i++) {
        var p = pickups[i];
        if (!p || p.collected) continue;

        var dSq = distSq(p.x, p.y, pX, pY);
        // Həmçinin əjdahanın özünə yaxındırsa da çəksin
        var dSqComp = distSq(p.x, p.y, comp.x, comp.y);

        if (dSq <= rSq || dSqComp <= rSq) {
          var dx = pX - p.x;
          var dy = pY - p.y;
          var dist = Math.hypot(dx, dy) || 1;

          // Sürətlə oyunçuya doğru çəkilmə
          var pullFactor = Math.min(1, dt * 7.5);
          var minSpeed = 380;
          var step = Math.max(minSpeed * dt, dist * pullFactor);

          p.x += (dx / dist) * step;
          p.y += (dy / dist) * step;
          p.isMagnetized = true;

          // Mavi-astral çəkim xətti / zərrəcik
          if (Math.random() < 0.18) {
            this._spawnParticle(p.x, p.y, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, '#00e5ff', 0.25, 2.5);
          }
        }
      }
    },

    /**
     * Qurd: Düşməni dişləmə və 2 saniyəlik yavaşlatma
     */
    _biteEnemy: function (comp, enemy, callbacks) {
      var dmg = comp.damage + Math.floor(Math.random() * 12);

      // Zərər vur
      if (callbacks && typeof callbacks.onHitEnemy === 'function') {
        callbacks.onHitEnemy(enemy, dmg, 'wolf_bite');
      } else if (typeof enemy.takeDamage === 'function') {
        enemy.takeDamage(dmg);
      } else {
        enemy.hp = Math.max(0, (enemy.hp || 0) - dmg);
      }

      // Yavaşlatma effekti (2 saniyə, 35% slow)
      enemy.slowTimer = comp.slowDuration || 2.0;
      enemy.speedMult = comp.slowMultiplier || 0.65;
      enemy.isSlowed = true;

      comp.biteEffectTimer = 0.28;
      playSound('hit');

      // Kölgə caynaqları / dişləmə effekti
      this._spawnSpawnParticles(enemy.x, enemy.y, '#6c5ce7', 14);
    },

    /**
     * Ən yaxın canlı düşməni axtarır
     */
    _findNearestEnemy: function (x, y, enemies, maxDist) {
      if (!enemies || !Array.isArray(enemies) || enemies.length === 0) return null;

      var bestEnemy = null;
      var bestDistSq = (maxDist || 500) * (maxDist || 500);

      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e || e.hp <= 0 || e.dead) continue;

        var d2 = distSq(x, y, e.x, e.y);
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          bestEnemy = e;
        }
      }

      return bestEnemy;
    },

    /**
     * 2. Ultimate Super Güc — "Aether Qiyaməti" Yenilənməsi
     * 3 saniyə ərzində 14 nəhəng meteor ardıcıllıqla göydən düşür!
     */
    _updateUltimate: function (dt, player, enemies, callbacks) {
      var ult = this.ultimate;
      if (!ult.isActive) return;

      ult.timer += dt;
      ult.screenFlashTimer = Math.max(0, ult.screenFlashTimer - dt);

      // Cədvəldəki meteorları zamanı gəldikdə burax
      for (var i = 0; i < ult.meteorSchedule.length; i++) {
        var item = ult.meteorSchedule[i];
        if (!item.triggered && ult.timer >= item.time) {
          item.triggered = true;
          ult.meteorsSpawned++;
          this._spawnMeteor(player, enemies, ult.meteorsSpawned, callbacks);
        }
      }

      // Göydən düşən aktiv meteorların fizikasını yenilə
      for (var m = ult.activeMeteors.length - 1; m >= 0; m--) {
        var meteor = ult.activeMeteors[m];
        meteor.progress += dt / meteor.duration;

        // Meteor mövqeyi göydən hədəf nöqtəsinə doğru hərəkət edir
        var t = Math.min(1, meteor.progress);
        // Qeyri-xətti sürətlənmə
        var easeT = t * t;
        meteor.currentX = lerp(meteor.startX, meteor.targetX, easeT);
        meteor.currentY = lerp(meteor.startY, meteor.targetY, easeT);

        // Meteor quyruğu (alov və kosmik qığılcım)
        for (var p = 0; p < 2; p++) {
          this._spawnParticle(
            meteor.currentX + (Math.random() - 0.5) * 16,
            meteor.currentY + (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 35 - 30,
            -60 - Math.random() * 80,
            Math.random() < 0.6 ? '#ffd700' : '#ff3d00',
            0.4,
            meteor.radius * 0.4
          );
        }

        // Zərbə anı!
        if (meteor.progress >= 1) {
          this._detonateMeteor(meteor, enemies, callbacks);
          ult.activeMeteors.splice(m, 1);
        }
      }

      // Kraterlərin və yer parıltılarının sönməsi
      for (var c = ult.craters.length - 1; c >= 0; c--) {
        var crater = ult.craters[c];
        crater.life -= dt;
        if (crater.life <= 0) {
          ult.craters.splice(c, 1);
        }
      }

      // Ultimate müddəti bitdikdə və bütün meteorlar düşdükdə bitir
      if (ult.timer >= ult.duration && ult.activeMeteors.length === 0) {
        ult.isActive = false;
        ult.meteorSchedule = [];
      }
    },

    /**
     * Tək bir meteorun yaradılması (Göydən hədəfə)
     */
    _spawnMeteor: function (player, enemies, index, callbacks) {
      var ult = this.ultimate;
      var targetX = 0;
      var targetY = 0;

      // Hədəf seçimi: Canlı düşmən varsa ona və ya ətrafına, yoxsa oyunçunun ətrafına
      var candidateEnemies = [];
      if (enemies && Array.isArray(enemies)) {
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (e && e.hp > 0 && !e.dead) candidateEnemies.push(e);
        }
      }

      if (candidateEnemies.length > 0) {
        var chosen = candidateEnemies[Math.floor(Math.random() * candidateEnemies.length)];
        // Düşmənin yaxınlığına bir az dağınıqlıq
        targetX = chosen.x + (Math.random() - 0.5) * 60;
        targetY = chosen.y + (Math.random() - 0.5) * 60;
      } else if (player) {
        var angle = Math.random() * Math.PI * 2;
        var r = 60 + Math.random() * 260;
        targetX = player.x + Math.cos(angle) * r;
        targetY = player.y + Math.sin(angle) * r;
      }

      // Göydən şığıma koordinatı (Sol-yuxarıdan bucaqla düşür)
      var startX = targetX - 220;
      var startY = targetY - 480;

      var meteor = {
        index: index,
        startX: startX,
        startY: startY,
        currentX: startX,
        currentY: startY,
        targetX: targetX,
        targetY: targetY,
        progress: 0,
        duration: 0.38 + Math.random() * 0.12, // Düşmə vaxtı (~0.4s)
        radius: 26 + Math.random() * 8,
        impactRadius: 115, // Nəhəng partlayış radiusu
        damage: 125 + Math.floor(Math.random() * 35) // 125-160 nəhəng AOE zərər
      };

      ult.activeMeteors.push(meteor);

      // Göy xəbərdarlıq halqası (Indicator)
      ult.craters.push({
        x: targetX,
        y: targetY,
        radius: meteor.impactRadius,
        maxLife: meteor.duration + 0.9,
        life: meteor.duration + 0.9,
        color: '#ff3d00',
        isWarning: true
      });
    },

    /**
     * Meteorun yerə çırpılması və nəhəng partlayış!
     */
    _detonateMeteor: function (meteor, enemies, callbacks) {
      var tX = meteor.targetX;
      var tY = meteor.targetY;
      var rad = meteor.impactRadius;
      var dmg = meteor.damage;

      // 1. Zərbə Callback-i (Müqavilə tələbi)
      if (callbacks && typeof callbacks.onMeteorImpact === 'function') {
        callbacks.onMeteorImpact(tX, tY, rad, dmg);
      }

      // 2. GameVFX-dəki mövcud meteor effekti varsa çağır
      spawnVfxMeteor(tX, tY);

      // 3. Audio və Ekran Titrəməsi
      playSound('explosion');
      shakeScreen(11, 0.28, callbacks);

      // 4. AOE Radiusundakı bütün düşmənlərə zərər və itələmə
      if (enemies && Array.isArray(enemies)) {
        var rSq = rad * rad;
        for (var i = 0; i < enemies.length; i++) {
          var enemy = enemies[i];
          if (!enemy || enemy.hp <= 0 || enemy.dead) continue;

          var d2 = distSq(tX, tY, enemy.x, enemy.y);
          if (d2 <= rSq) {
            // Məsafəyə görə zərər düşməsi (Mərkəzdə 100%, kənarda 60%)
            var distFactor = 1 - (Math.sqrt(d2) / rad) * 0.4;
            var actualDmg = Math.round(dmg * distFactor);

            if (callbacks && typeof callbacks.onHitEnemy === 'function') {
              callbacks.onHitEnemy(enemy, actualDmg, 'meteor');
            } else if (typeof enemy.takeDamage === 'function') {
              enemy.takeDamage(actualDmg);
            } else {
              enemy.hp = Math.max(0, (enemy.hp || 0) - actualDmg);
            }

            // Knockback (Mərkəzdən bayıra itələmə)
            var angle = Math.atan2(enemy.y - tY, enemy.x - tX);
            var pushForce = 340;
            if (typeof enemy.vx === 'number') enemy.vx += Math.cos(angle) * pushForce;
            if (typeof enemy.vy === 'number') enemy.vy += Math.sin(angle) * pushForce;
          }
        }
      }

      // 5. Zərbə Krateri və Alov Dalğası
      this.ultimate.craters.push({
        x: tX,
        y: tY,
        radius: rad,
        maxLife: 0.9,
        life: 0.9,
        color: '#ffd700',
        isWarning: false
      });

      // 6. Nəhəng Qızılı-Astral Partlayış Hissəcikləri
      for (var p = 0; p < 24; p++) {
        var pAngle = Math.random() * Math.PI * 2;
        var pSpd = 120 + Math.random() * 260;
        var pColor = p % 2 === 0 ? '#ffd700' : (p % 3 === 0 ? '#00e5ff' : '#ff3d00');
        this._spawnParticle(
          tX,
          tY,
          Math.cos(pAngle) * pSpd,
          Math.sin(pAngle) * pSpd - 40,
          pColor,
          0.65,
          6 + Math.random() * 5
        );
      }
    },

    /**
     * Daxili Vizual Hissəciklərin Yaradılması
     */
    _spawnParticle: function (x, y, vx, vy, color, maxLife, size) {
      if (this.particles.length > 200) this.particles.shift();
      this.particles.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        color: color || '#ffffff',
        life: maxLife || 0.4,
        maxLife: maxLife || 0.4,
        size: size || 3
      });
    },

    _spawnSpawnParticles: function (x, y, color, count) {
      for (var i = 0; i < count; i++) {
        var angle = Math.random() * Math.PI * 2;
        var spd = 30 + Math.random() * 80;
        this._spawnParticle(
          x,
          y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          color,
          0.5,
          4
        );
      }
    },

    _updateParticles: function (dt) {
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 60 * dt; // Yüngül cazibə
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    },

    /**
     * Kətan üzərində çəkmə metodu (Draw Companion & Ultimates)
     * Oyun kamerası və kətan konteksti verildikdə çağırılır.
     */
    draw: function (ctx, camera) {
      if (!ctx) return;
      var camX = camera ? camera.x || 0 : 0;
      var camY = camera ? camera.y || 0 : 0;

      ctx.save();

      // 1. Meteor Kraterləri və Zərbə Halqaları
      var craters = this.ultimate.craters;
      for (var c = 0; c < craters.length; c++) {
        var cr = craters[c];
        var scrX = cr.x - camX;
        var scrY = cr.y - camY;
        var alpha = Math.max(0, cr.life / cr.maxLife);

        ctx.save();
        ctx.beginPath();
        ctx.arc(scrX, scrY, cr.radius * (cr.isWarning ? 1 : (1 + (1 - alpha) * 0.3)), 0, Math.PI * 2);
        if (cr.isWarning) {
          ctx.strokeStyle = 'rgba(255, 61, 0, ' + (alpha * 0.7) + ')';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 61, 0, ' + (alpha * 0.15) + ')';
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(255, 215, 0, ' + (alpha * 0.9) + ')';
          ctx.lineWidth = 5 * alpha;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 120, 0, ' + (alpha * 0.35) + ')';
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Daxili Hissəciklər
      for (var p = 0; p < this.particles.length; p++) {
        var part = this.particles[p];
        var pAlpha = Math.max(0, part.life / part.maxLife);
        ctx.save();
        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x - camX, part.y - camY, part.size * pAlpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Göydən Düşən Nəhəng Meteorlar
      var meteors = this.ultimate.activeMeteors;
      for (var m = 0; m < meteors.length; m++) {
        var met = meteors[m];
        var mX = met.currentX - camX;
        var mY = met.currentY - camY;

        ctx.save();
        // Alov parıltısı
        var grad = ctx.createRadialGradient(mX, mY, met.radius * 0.2, mX, mY, met.radius * 1.8);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, '#ffd700');
        grad.addColorStop(0.7, '#ff3d00');
        grad.addColorStop(1, 'rgba(138, 43, 226, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mX, mY, met.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Nüvə
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mX, mY, met.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Aktiv Yoldaşı Çək (Aura, Flüid forma, İkon və Qanadlar)
      this._drawCompanionEntity(ctx, camX, camY);

      ctx.restore();
    },

    /**
     * Aktiv Yoldaşın Vizual Görünüşü (Canvas 2D procedurally drawn)
     */
    _drawCompanionEntity: function (ctx, camX, camY) {
      var comp = this.getActiveCompanion();
      if (!comp || !comp.x) return;

      var drawX = comp.x - camX;
      var drawY = comp.y - camY;

      ctx.save();
      ctx.translate(drawX, drawY);

      // İstiqamət çevrilməsi (Flip)
      if (comp.facingLeft) {
        ctx.scale(-1, 1);
      }

      // A) Döyüşçü Yoldaşın İşıq Aurası
      var auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
      auraGrad.addColorStop(0, comp.color);
      auraGrad.addColorStop(0.5, comp.glowColor || 'rgba(255,255,255,0.4)');
      auraGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();

      // B) Növə uyğun Xüsusi Vizual
      if (comp.id === 'phoenix') {
        // Alov Simurqu Qanadları
        var flap = comp.wingFlap || 0;
        ctx.fillStyle = comp.color;
        // Sol qanad
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(-14, -18 + flap * 6, -22, -6 + flap * 4);
        ctx.quadraticCurveTo(-10, 2, 0, 2);
        ctx.fill();
        // Sağ qanad
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(14, -18 + flap * 6, 22, -6 + flap * 4);
        ctx.quadraticCurveTo(10, 2, 0, 2);
        ctx.fill();

        // Parlaq Kəllə / Göz
        ctx.fillStyle = comp.secondaryColor || '#ffd166';
        ctx.beginPath();
        ctx.arc(2, -8, 5, 0, Math.PI * 2);
        ctx.fill();

        // Alov quyruğu
        ctx.strokeStyle = comp.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(-4, 16, 0, 22 + Math.sin(comp.bobTimer * 3) * 4);
        ctx.stroke();
      } else if (comp.id === 'dragon') {
        // Astral Bala Əjdaha
        var flapD = comp.wingFlap || 0;
        ctx.fillStyle = comp.color;
        // Əjdaha qanadları (Astral bənövşəyi / firuzəyi)
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-20, -16 + flapD * 7);
        ctx.lineTo(-12, -2);
        ctx.lineTo(-22, 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = comp.secondaryColor;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(20, -16 + flapD * 7);
        ctx.lineTo(12, -2);
        ctx.lineTo(22, 6);
        ctx.closePath();
        ctx.fill();

        // Gövdə və buynuzlar
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (comp.id === 'wolf') {
        // Kölgə Ruh Qurdu
        ctx.fillStyle = comp.color;
        // Qurd qulaqları və kəllə
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Qulaqlar
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(-10, -16);
        ctx.lineTo(-2, -8);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.lineTo(10, -16);
        ctx.lineTo(2, -8);
        ctx.fill();

        // Qırmızı qaniçən gözlər
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(1, -3, 3, 2);

        // Əgər dişləyirsə caynaq effekti
        if (comp.biteEffectTimer > 0) {
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-12, -12);
          ctx.lineTo(12, 12);
          ctx.moveTo(12, -12);
          ctx.lineTo(-12, 12);
          ctx.stroke();
        }
      }

      ctx.restore();
    },

    /**
     * UI HUD Render (Ekranın alt mərkəzində [R] Rage Bar və Yoldaş İkonu)
     * UI sistemi tərəfindən və ya birbaşa mühərrik kətanında çağırıla bilər.
     */
    drawHUD: function (ctx, screenWidth, screenHeight) {
      if (!ctx || !screenWidth || !screenHeight) return;

      var barW = 220;
      var barH = 16;
      var barX = (screenWidth - barW) / 2;
      var barY = screenHeight - 48;

      ctx.save();

      // 1. Arxa Fon (Glassmorphism kartı)
      ctx.fillStyle = 'rgba(15, 15, 25, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(barX - 44, barY - 10, barW + 54, barH + 20, 8);
      ctx.fill();
      ctx.stroke();

      // 2. Yoldaş İkonu
      var comp = this.getActiveCompanion();
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comp.icon || '🦅', barX - 22, barY + barH / 2);

      // 3. Rage Bar Çərçivəsi
      ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
      ctx.fillRect(barX, barY, barW, barH);

      // 4. Rage Bar Doldurulması
      var fillRatio = clamp(this.rage / this.maxRage, 0, 1);
      var isReady = fillRatio >= 1.0;

      if (fillRatio > 0) {
        var grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        if (isReady) {
          grad.addColorStop(0, '#ff0055');
          grad.addColorStop(0.5, '#ffd700');
          grad.addColorStop(1, '#ff3d00');
        } else {
          grad.addColorStop(0, '#8a2be2');
          grad.addColorStop(1, '#00e5ff');
        }

        ctx.fillStyle = grad;
        ctx.fillRect(barX, barY, barW * fillRatio, barH);
      }

      // Parıltılı çərçivə
      ctx.strokeStyle = isReady ? '#ffd700' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = isReady ? 2 : 1;
      ctx.strokeRect(barX, barY, barW, barH);

      // 5. Mətn Göstəricisi
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var labelText = isReady
        ? '🔥 [R] AETHER QİYAMƏTİ HAZIRDIR! (100%)'
        : 'QƏZƏB (RAGE): ' + Math.floor(this.rage) + '%  |  [C] ' + comp.name;

      ctx.fillText(labelText, barX + barW / 2, barY + barH / 2);

      ctx.restore();
    }
  };

  // Qlobal interfeysə təyin et
  if (typeof window !== 'undefined') {
    window.GameCompanions = GameCompanions;
  }

  // Node.js mühitində sintaksis və test üçün export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameCompanions;
  }
})();
