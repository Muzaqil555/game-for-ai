/**
 * ============================================================================
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ
 * Fayl: src/events_arena.js
 * Qlobal Obyekt: window.GameEvents
 * Məsul Agent: 25-ci Agent — Dinamik Hadisələr, Kombo və Kolizey Mütəxəssisi (world_events_arena_specialist)
 *
 * Əsas Funksionallıq:
 * 1. Stil Kombo Sayğacı (D -> C -> B -> A -> S -> SSS ƏFSANƏ!) zərər və qızıl çarpanı ilə
 * 2. Mükəmməl Yayınma (Perfect Dodge / Witch Time): Slow-motion, Mana/Rage bərpası, 100% Kritik buff
 * 3. Dinamik Dünya Hadisələri: Qaçan Qızıl Xəzinə Qoblini & Qanlı Astral Meteor Sandığı
 * 4. Sonsuz Kolizey Rejimi (Endless Arena / Boss Rush): Getdikcə güclənən sonsuz dalğalar və Epik Boss-lar
 * ============================================================================
 */

(function (root) {
  'use strict';

  // --- Köməkçi Riyazi Funksiyalar ---
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const distSq = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const dist = (x1, y1, x2, y2) => Math.sqrt(distSq(x1, y1, x2, y2));

  // --- Kombo Dərəcələri Konfiqurasiyası (DMC / Bayonetta Stilləri) ---
  const COMBO_RANKS = [
    { minHits: 60, rank: 'SSS', color: '#ff0055', title: 'SSS - ƏFSANƏ!', multiplier: 2.5, shake: 6, glow: 'rgba(255, 0, 85, 0.8)' },
    { minHits: 35, rank: 'S',   color: '#f97316', title: 'S - SÜPER!',   multiplier: 2.0, shake: 4, glow: 'rgba(249, 115, 22, 0.7)' },
    { minHits: 20, rank: 'A',   color: '#fbbf24', title: 'A - AMANSIZ',  multiplier: 1.7, shake: 3, glow: 'rgba(251, 191, 36, 0.6)' },
    { minHits: 10, rank: 'B',   color: '#4ade80', title: 'B - BRUTAL',   multiplier: 1.4, shake: 2, glow: 'rgba(74, 222, 128, 0.5)' },
    { minHits: 5,  rank: 'C',   color: '#38bdf8', title: 'C - CƏLD',     multiplier: 1.2, shake: 1, glow: 'rgba(56, 189, 248, 0.4)' },
    { minHits: 1,  rank: 'D',   color: '#94a3b8', title: 'D - DƏMİR',    multiplier: 1.0, shake: 0, glow: 'rgba(148, 163, 184, 0.3)' }
  ];

  /**
   * Əsas GameEvents Obyekti
   */
  const GameEvents = {
    version: '2.0.0',

    // ========================================================================
    // 1. STİL KOMBO SAYĞACI VƏZİYYƏTİ
    // ========================================================================
    combo: {
      count: 0,
      rank: '',
      color: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.3)',
      title: '',
      timer: 0,
      maxTimer: 4.5, // Hər vuruşda 4.5 saniyə yenilənir
      multiplier: 1.0,
      highestCombo: 0,
      totalHitsThisRun: 0,
      rankUpScale: 1.0, // UI animasiya sıçrayışı
      rankUpTimer: 0
    },

    // ========================================================================
    // 2. MÜKƏMMƏL YAYINMA (PERFECT DODGE / WITCH TIME) VƏZİYYƏTİ
    // ========================================================================
    perfectDodge: {
      radius: 110,           // 110px yaxınlıqdakı təhlükələr üçün
      buffDuration: 3.5,     // 3.5s növbəti vuruşa 100% Kritik və 2x zərər
      cooldown: 0,           // Təkrar tetiklənmənin qarşısını almaq üçün
      slowMoScale: 0.22,     // Zamanın yavaşlama dərəcəsi
      slowMoDuration: 0.85,  // Slow-mo müddəti
      stats: {
        totalDodges: 0,
        lastDodgeTime: 0
      }
    },

    // ========================================================================
    // 3. DİNAMİK DÜNYA HADİSƏLƏRİ VƏZİYYƏTİ
    // ========================================================================
    worldEvents: {
      timer: 18.0,          // İlk hadisə tam 18-ci saniyədə peyda olur!
      interval: 35.0,       // Sonrakı hər hadisə 35 saniyədən bir
      activeEvent: null,    // Cari aktiv hadisə: 'treasure_goblin' | 'meteor_chest' | null
      activeGoblin: null,   // Qaçan qızıl qoblin obyekti
      activeMeteorChest: null, // Qanlı astral meteor sandığı obyekti
      banner: {
        text: '',
        subtext: '',
        color: '#ffd700',
        timer: 0,
        maxTimer: 4.0,
        opacity: 0
      }
    },

    // ========================================================================
    // 4. SONSUZ KOLİZEY REJİMİ (ENDLESS ARENA / BOSS RUSH) VƏZİYYƏTİ
    // ========================================================================
    isArenaMode: false,
    arenaWave: 1,
    arenaState: 'idle', // 'idle' | 'countdown' | 'fighting' | 'wave_cleared' | 'boss_incoming' | 'game_over'
    arena: {
      bestWave: 0,
      intermissionTimer: 0,
      maxIntermissionTimer: 3.5,
      enemiesRemaining: 0,
      totalWaveEnemies: 0,
      waveKillCount: 0,
      totalArenaKills: 0,
      isBossWave: false,
      bossName: '',
      rewardGranted: false,
      arenaBounds: {
        minX: 200,
        maxX: 1400,
        minY: 200,
        maxY: 1200,
        centerX: 800,
        centerY: 700
      }
    },

    /**
     * Modulu başladır və yaddaşdan rekordları bərpa edir
     */
    init() {
      try {
        if (typeof root !== 'undefined' && root.localStorage && typeof root.localStorage.getItem === 'function') {
          const savedRecord = root.localStorage.getItem('aetheria_arena_record_wave');
          if (savedRecord) {
            this.arena.bestWave = parseInt(savedRecord, 10) || 0;
          }
        }
      } catch (err) {
        // Brauzer təhlükəsizlik məhdudiyyətləri üçün səssiz rejim
      }

      this.resetCombo();
      this.worldEvents.timer = 18.0;
      this.worldEvents.activeEvent = null;
      this.worldEvents.activeGoblin = null;
      this.worldEvents.activeMeteorChest = null;
    },

    // ========================================================================
    // BÖLMƏ I: STİL KOMBO SİSTEMİ
    // ========================================================================

    /**
     * Düşmənə zərbə vurulduqda çağırılır.
     * Sayğacı artırır, taymeri (4.5s) yeniləyir, rütbə və çarpanı hesablayır.
     * @param {number} damage - Vurulan baza zərəri
     * @returns {Object} Yenilənmiş kombo vəziyyəti
     */
    registerHit(damage = 0) {
      const prevRank = this.combo.rank;

      this.combo.count++;
      this.combo.totalHitsThisRun++;
      this.combo.timer = this.combo.maxTimer;

      if (this.combo.count > this.combo.highestCombo) {
        this.combo.highestCombo = this.combo.count;
      }

      // Rütbə və çarpanı hesabla
      this._evaluateComboRank();

      // Əgər rütbə yüksəlibsə, vizual və səs effekti tetiklə
      if (this.combo.rank !== prevRank && this.combo.rank !== '') {
        this._onRankUp(this.combo.rank);
      }

      return this.getComboState();
    },

    /**
     * Kombo rütbəsini və çarpanı daxili cədvələ görə hesablayır
     */
    _evaluateComboRank() {
      const count = this.combo.count;
      let matched = null;

      for (let i = 0; i < COMBO_RANKS.length; i++) {
        if (count >= COMBO_RANKS[i].minHits) {
          matched = COMBO_RANKS[i];
          break;
        }
      }

      if (matched) {
        this.combo.rank = matched.rank;
        this.combo.color = matched.color;
        this.combo.glow = matched.glow;
        this.combo.title = matched.title;
        this.combo.multiplier = matched.multiplier;
      } else {
        this.combo.rank = '';
        this.combo.color = '#94a3b8';
        this.combo.glow = 'rgba(148, 163, 184, 0.3)';
        this.combo.title = '';
        this.combo.multiplier = 1.0;
      }
    },

    /**
     * Kombo rütbəsi qalxdıqda işə düşən şirəli vizual-audio effektlər
     */
    _onRankUp(newRank) {
      this.combo.rankUpScale = 1.5;
      this.combo.rankUpTimer = 0.35;

      const rankData = COMBO_RANKS.find(r => r.rank === newRank);
      if (rankData && rankData.shake > 0) {
        if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
          root.GameJuice.shake(rankData.shake, 0.22);
        }
      }

      // Audio effektlər
      if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
        if (newRank === 'SSS') {
          try {
            root.GameAudio.playSFX('comboSSS');
          } catch (_) {
            root.GameAudio.playSFX('levelUp');
          }
        } else if (newRank === 'S' || newRank === 'A') {
          try {
            root.GameAudio.playSFX('levelUp');
          } catch (_) {}
        }
      }
    },

    /**
     * Oyunçu zərbə aldıqda kombonu yarıya endirir
     */
    onPlayerDamaged() {
      if (this.combo.count > 0) {
        this.combo.count = Math.floor(this.combo.count / 2);
        if (this.combo.count <= 0) {
          this.resetCombo();
        } else {
          this._evaluateComboRank();
          // Taymeri cəza olaraq 2.5 saniyəyə endiririk
          this.combo.timer = Math.min(this.combo.timer, 2.5);
        }
      }
      return this.getComboState();
    },

    /**
     * Kombonu tam sıfırlayır
     */
    resetCombo() {
      this.combo.count = 0;
      this.combo.rank = '';
      this.combo.color = '#94a3b8';
      this.combo.glow = 'rgba(148, 163, 184, 0.3)';
      this.combo.title = '';
      this.combo.timer = 0;
      this.combo.multiplier = 1.0;
      this.combo.rankUpScale = 1.0;
      this.combo.rankUpTimer = 0;
    },

    /**
     * Kombo vəziyyətini obyekt olaraq qaytarır
     */
    getComboState() {
      return {
        count: this.combo.count,
        rank: this.combo.rank,
        color: this.combo.color,
        glow: this.combo.glow,
        title: this.combo.title,
        timer: Math.max(0, this.combo.timer),
        maxTimer: this.combo.maxTimer,
        multiplier: this.combo.multiplier,
        progress: this.combo.maxTimer > 0 ? clamp(this.combo.timer / this.combo.maxTimer, 0, 1) : 0,
        highestCombo: this.combo.highestCombo,
        rankUpScale: this.combo.rankUpScale
      };
    },

    /**
     * Hər frame-də kombo taymerini yeniləyir
     */
    updateCombo(dt) {
      if (this.combo.rankUpTimer > 0) {
        this.combo.rankUpTimer -= dt;
        this.combo.rankUpScale = Math.max(1.0, 1.0 + (this.combo.rankUpTimer / 0.35) * 0.5);
      }

      if (this.combo.count > 0) {
        this.combo.timer -= dt;
        if (this.combo.timer <= 0) {
          this.resetCombo();
        }
      }
    },

    // ========================================================================
    // BÖLMƏ II: MÜKƏMMƏL YAYINMA (PERFECT DODGE / WITCH TIME)
    // ========================================================================

    /**
     * Oyunçu Dash etdikdə çağırılır.
     * 110px radiusda yaxın hücum edən düşmən və ya düşmən mərmisi varsa:
     * - Slow-motion (Witch Time) tetikləyir
     * - Mana (+25) və Rage (+20) bərpası verir
     * - player.perfectDodgeBuff = 3.5 təyin edir (100% Kritik & 2x Zərər)
     * @param {Object} player - Oyunçu obyekti
     * @param {Array} enemies - Xəritədəki düşmənlər massivi
     * @param {Array} projectiles - Xəritədəki mərmilər massivi
     * @param {Object} callbacks - Əlavə callback-lər
     * @returns {boolean} Mükəmməl yayınmanın baş verib-verməməsi
     */
    checkPerfectDodge(player, enemies = [], projectiles = [], callbacks = {}) {
      if (!player) return false;

      // Cooldown yoxlanışı
      if (this.perfectDodge.cooldown > 0) return false;

      const px = player.x;
      const py = player.y;
      const radius = this.perfectDodge.radius; // 110px
      const radSq = radius * radius;

      let threatFound = false;
      let threatSource = null;

      // 1. Yaxınlıqdakı düşmənləri yoxla (Canlı və oyunçuya yaxın / hücum edən)
      if (Array.isArray(enemies)) {
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e || e.hp <= 0) continue;

          const d2 = distSq(px, py, e.x, e.y);
          if (d2 <= radSq) {
            // Düşmən oyunçuya çox yaxındır və ya indicə hücum edir
            threatFound = true;
            threatSource = e;
            break;
          }
        }
      }

      // 2. Yaxınlıqdakı düşmən mərmilərini yoxla
      if (!threatFound && Array.isArray(projectiles)) {
        for (let i = 0; i < projectiles.length; i++) {
          const p = projectiles[i];
          if (!p || !p.active) continue;
          if (p.isEnemy || p.enemy || p.type === 'enemy' || p.source === 'enemy') {
            const d2 = distSq(px, py, p.x, p.y);
            if (d2 <= radSq) {
              threatFound = true;
              threatSource = p;
              // Mərmini yayındır və ya oyunçudan kənara itələ
              p.vx = -p.vx * 0.5;
              p.vy = -p.vy * 0.5;
              break;
            }
          }
        }
      }

      if (threatFound) {
        // Cooldown tətbiq et (0.45s)
        this.perfectDodge.cooldown = 0.45;
        this.perfectDodge.stats.totalDodges++;
        this.perfectDodge.stats.lastDodgeTime = Date.now();

        // 1. Buff təyin et: Növbəti vuruşa 100% Kritik və 2x zərər (3.5 saniyə aktiv)
        player.perfectDodgeBuff = this.perfectDodge.buffDuration; // 3.5s
        player.perfectDodgeActive = true;
        player.critBonus = (player.critBonus || 0) + 1.0; // 100% Krit şansı

        // 2. Mana Bərpası (+25)
        const maxM = player.maxMana || 100;
        player.mana = Math.min(maxM, (player.mana || 0) + 25);

        // 3. Rage (Qəzəb) Bərpası (+20)
        player.rage = Math.min(100, (player.rage || 0) + 20);
        if (root.GameCompanions && typeof root.GameCompanions.addRage === 'function') {
          root.GameCompanions.addRage(20);
        }

        // 4. Slow-Motion (Witch Time) Effekti
        if (root.GameJuice && typeof root.GameJuice.triggerSlowMo === 'function') {
          root.GameJuice.triggerSlowMo(this.perfectDodge.slowMoScale, this.perfectDodge.slowMoDuration);
        }

        // 5. Ekran Titrəməsi
        if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
          root.GameJuice.shake(3.5, 0.25);
        }

        // 6. Audio Səsi
        if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
          try {
            root.GameAudio.playSFX('dash');
          } catch (_) {}
        }

        // 7. VFX Hissəcikləri və Üzən Mətn
        if (root.GameVFX) {
          if (typeof root.GameVFX.spawnFloatingText === 'function') {
            root.GameVFX.spawnFloatingText(px, py - 40, '⚡ MÜKƏMMƏL YAYINMA! (2x KRİTİK)', '#00e5ff', 17);
          }
          if (typeof root.GameVFX.spawnDashTrail === 'function') {
            root.GameVFX.spawnDashTrail(px, py, player.angle || 0, '#00e5ff');
          }
          if (typeof root.GameVFX.spawnExplosion === 'function') {
            root.GameVFX.spawnExplosion(px, py, '#00e5ff', 12, 45);
          }
        }

        // Callback dəstəyi
        if (callbacks && typeof callbacks.onPerfectDodge === 'function') {
          callbacks.onPerfectDodge(player, threatSource);
        }

        return true;
      }

      return false;
    },

    /**
     * Mükəmməl yayınma cooldown-nu və oyunçunun buff taymerini yeniləyir
     */
    updatePerfectDodge(dt, player) {
      if (this.perfectDodge.cooldown > 0) {
        this.perfectDodge.cooldown -= dt;
      }

      if (player && player.perfectDodgeBuff > 0) {
        player.perfectDodgeBuff -= dt;
        if (player.perfectDodgeBuff <= 0) {
          player.perfectDodgeBuff = 0;
          player.perfectDodgeActive = false;
        }
      }
    },

    // ========================================================================
    // BÖLMƏ III: DİNAMİK DÜNYA HADİSƏLƏRİ
    // ========================================================================

    /**
     * Dinamik Dünya Hadisələrini hər frame-də idarə edir.
     * Hər 35 saniyədən bir (ilk hadisə 18-ci saniyədə) hadisə yaradır.
     * @param {number} dt - Delta zamanı
     * @param {Object} worldState - Oyun dünyası vəziyyəti
     * @param {Object} callbacks - Callback funksiyaları
     */
    updateWorldEvents(dt, worldState, callbacks = {}) {
      if (!worldState) return;

      // Banner animasiyası
      this._updateBanner(dt);

      // Əgər aktiv Qaçan Qızıl Qoblin varsa, AI və hərəkətini yenilə
      if (this.worldEvents.activeGoblin) {
        this._updateTreasureGoblin(dt, worldState, callbacks);
      }

      // Əgər aktiv Meteor Sandığı varsa, vəziyyətini yenilə
      if (this.worldEvents.activeMeteorChest) {
        this._updateMeteorChest(dt, worldState, callbacks);
      }

      // Kolizey rejimində deyiliksə, dünya hadisələri taymerini işlət
      if (!this.isArenaMode) {
        this.worldEvents.timer -= dt;
        if (this.worldEvents.timer <= 0) {
          this.worldEvents.timer = this.worldEvents.interval; // 35 saniyə

          // Əgər artıq aktiv hadisə yoxdursa, yeni hadisə başlad
          if (!this.worldEvents.activeGoblin && !this.worldEvents.activeMeteorChest) {
            this._triggerRandomWorldEvent(worldState, callbacks);
          }
        }
      }
    },

    /**
     * Təsadüfi olaraq "Qızıl Qoblin" və ya "Meteor Sandığı" hadisəsini tetikləyir
     */
    _triggerRandomWorldEvent(worldState, callbacks) {
      const p = worldState.player;
      if (!p) return;

      const eventType = Math.random() < 0.5 ? 'treasure_goblin' : 'meteor_chest';

      if (eventType === 'treasure_goblin') {
        this.spawnTreasureGoblin(worldState, callbacks);
      } else {
        this.spawnMeteorChestEvent(worldState, callbacks);
      }
    },

    /**
     * Hadisə 1: "💰 Qızıl Xəzinə Qoblini Peyda Oldu!"
     */
    spawnTreasureGoblin(worldState, callbacks = {}) {
      const p = worldState.player;
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 280 + Math.random() * 120; // 280-400px aralıda
      const spawnX = p ? p.x + Math.cos(angle) * spawnDist : 500;
      const spawnY = p ? p.y + Math.sin(angle) * spawnDist : 500;

      const waveScale = (worldState.wave || worldState.currentWave || 1);
      const baseHp = 180 + waveScale * 35;

      const goblin = {
        id: 'treasure_goblin_' + Date.now(),
        type: 'treasure_goblin',
        name: '💰 Qızıl Xəzinə Qoblini',
        isTreasureGoblin: true,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        radius: 20,
        hp: baseHp,
        maxHp: baseHp,
        speed: 175, // Çox sürətlə qaçır
        damage: 0,  // Zərərsizdir, yalnız qaçır!
        color: '#ffd700',
        auraColor: 'rgba(255, 215, 0, 0.7)',
        glowColor: '#fff275',
        fleeTimer: 25.0, // 25 saniyə sonra portalla qaçır!
        maxFleeTimer: 25.0,
        goldReward: 200,
        crystalReward: 10,
        goldDropTimer: 0,
        pulsePhase: 0,
        isEscaping: false
      };

      // Düşmənlər siyahısına əlavə et
      if (Array.isArray(worldState.enemies)) {
        worldState.enemies.push(goblin);
      }

      this.worldEvents.activeGoblin = goblin;
      this.worldEvents.activeEvent = 'treasure_goblin';

      // Banner xəbərdarlığı
      this.showBanner(
        '💰 QIZIL XƏZİNƏ QOBLİNİ PEYDA OLDU!',
        'Onu portal ilə qaçmadan məhv et və böyük xəzinə qazan!',
        '#ffd700'
      );

      // Səs və VFX
      if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
        try { root.GameAudio.playSFX('bossRoar'); } catch (_) {}
      }
      if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
        root.GameJuice.shake(3.0, 0.3);
      }

      if (callbacks && typeof callbacks.onTreasureGoblinSpawn === 'function') {
        callbacks.onTreasureGoblinSpawn(goblin);
      }

      console.log('💰 [GameEvents] Qızıl Xəzinə Qoblini yaradıldı:', goblin);
      return goblin;
    },

    /**
     * Qaçan Qızıl Qoblinin qorxaq AI davranışı
     */
    _updateTreasureGoblin(dt, worldState, callbacks) {
      const goblin = this.worldEvents.activeGoblin;
      if (!goblin) return;

      // Əgər ölübsə:
      if (goblin.hp <= 0) {
        this._onTreasureGoblinDefeated(goblin, worldState, callbacks);
        this.worldEvents.activeGoblin = null;
        this.worldEvents.activeEvent = null;
        return;
      }

      // Qaçış taymeri
      goblin.fleeTimer -= dt;
      goblin.pulsePhase = (goblin.pulsePhase || 0) + dt * 6;

      // Əgər vaxt bitdisə: Sehrli portalla qaçır
      if (goblin.fleeTimer <= 0) {
        this.showBanner(
          '💨 QIZIL QOBLİN QAÇDI!',
          'Qızıl Xəzinə Qoblini portal açaraq yox oldu...',
          '#94a3b8'
        );
        if (root.GameVFX && typeof root.GameVFX.spawnExplosion === 'function') {
          root.GameVFX.spawnExplosion(goblin.x, goblin.y, '#ffd700', 25, 60);
        }
        // Düşmənlərdən sil
        if (Array.isArray(worldState.enemies)) {
          const idx = worldState.enemies.indexOf(goblin);
          if (idx !== -1) worldState.enemies.splice(idx, 1);
        }
        this.worldEvents.activeGoblin = null;
        this.worldEvents.activeEvent = null;
        return;
      }

      // Oyunçudan əks tərəfə qaçış hərəkəti
      const p = worldState.player;
      if (p) {
        const dx = goblin.x - p.x;
        const dy = goblin.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;

        // Əks istiqamət vektoru + bir qədər ziqzaq hərəkət
        const zigzag = Math.sin(goblin.pulsePhase * 0.8) * 0.35;
        const nx = (dx / d) + Math.cos(goblin.pulsePhase) * zigzag;
        const ny = (dy / d) + Math.sin(goblin.pulsePhase) * zigzag;
        const len = Math.sqrt(nx * nx + ny * ny) || 1;

        goblin.vx = (nx / len) * goblin.speed;
        goblin.vy = (ny / len) * goblin.speed;

        goblin.x += goblin.vx * dt;
        goblin.y += goblin.vy * dt;

        // Xəritə sərhədlərində saxlama
        goblin.x = clamp(goblin.x, 100, (worldState.width || 1800) - 100);
        goblin.y = clamp(goblin.y, 100, (worldState.height || 1400) - 100);
      }

      // Qaçarkən qızıl parıltıları buraxır
      if (Math.random() < 0.25 && root.GameVFX && typeof root.GameVFX.spawnFloatingText === 'function') {
        // Zəif qızıl parıltısı
      }
    },

    /**
     * Qızıl Qoblin məhv edildikdə: Böyük mükafat və Relikt seçimi!
     */
    _onTreasureGoblinDefeated(goblin, worldState, callbacks) {
      this.showBanner(
        '🌟 ƏFSANƏVİ QƏNİMƏT QAZANILDI!',
        '+200 Qızıl, +10 Kristal və Nadir Relikt Seçimi Verildi!',
        '#ffd700'
      );

      // 1. Oyunçuya qızıl və kristal əlavə et
      if (root.GameProgression) {
        if (typeof root.GameProgression.addGold === 'function') {
          root.GameProgression.addGold(goblin.goldReward || 200);
        }
        if (typeof root.GameProgression.addCrystals === 'function') {
          root.GameProgression.addCrystals(goblin.crystalReward || 10);
        }
      }

      // 2. Yerə bol qızıl və kristal damlaları tök (Pickups)
      if (Array.isArray(worldState.pickups)) {
        for (let i = 0; i < 15; i++) {
          const a = (i / 15) * Math.PI * 2;
          const r = 25 + Math.random() * 50;
          worldState.pickups.push({
            id: 'drop_gold_' + Math.random(),
            type: 'gold',
            x: goblin.x + Math.cos(a) * r,
            y: goblin.y + Math.sin(a) * r,
            radius: 9,
            value: 12,
            color: '#ffd700'
          });
        }
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.3;
          worldState.pickups.push({
            id: 'drop_crys_' + Math.random(),
            type: 'crystal',
            x: goblin.x + Math.cos(a) * 45,
            y: goblin.y + Math.sin(a) * 45,
            radius: 11,
            value: 2,
            color: '#00e5ff'
          });
        }
      }

      // 3. Audio & Juice
      if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
        try { root.GameAudio.playSFX('chest'); } catch (_) {}
      }
      if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
        root.GameJuice.shake(6, 0.4);
      }

      // 4. VFX Partlayışı
      if (root.GameVFX && typeof root.GameVFX.spawnExplosion === 'function') {
        root.GameVFX.spawnExplosion(goblin.x, goblin.y, '#ffd700', 40, 90);
      }

      // 5. Relikt Seçimi Modalı Təqdim Et!
      if (callbacks && typeof callbacks.onRelicChoice === 'function') {
        callbacks.onRelicChoice();
      } else if (root.GameUI && typeof root.GameUI.showRelicModal === 'function') {
        root.GameUI.showRelicModal();
      }
    },

    /**
     * Hadisə 2: "☄️ Qanlı Astral Meteor Sandığı!"
     */
    spawnMeteorChestEvent(worldState, callbacks = {}) {
      const p = worldState.player;
      const angle = Math.random() * Math.PI * 2;
      const dropDist = 260 + Math.random() * 100;
      const dropX = p ? p.x + Math.cos(angle) * dropDist : 600;
      const dropY = p ? p.y + Math.sin(angle) * dropDist : 600;

      // 1. Meteor Sandığı Obyekti
      const chest = {
        id: 'meteor_chest_' + Date.now(),
        type: 'meteor_chest',
        name: '☄️ Qanlı Astral Meteor Sandığı',
        isMeteorChest: true,
        x: dropX,
        y: dropY,
        radius: 26,
        color: '#ff0055',
        glowColor: '#ff4b4b',
        locked: true,
        guardsRemaining: 3,
        opened: false,
        pulse: 0
      };

      // 2. Sandığın ətrafında 3 Elit Gözətçi spawn et
      const guards = [];
      for (let i = 0; i < 3; i++) {
        const ga = (i / 3) * Math.PI * 2;
        const gx = dropX + Math.cos(ga) * 75;
        const gy = dropY + Math.sin(ga) * 75;

        let guard = null;
        if (root.GameLevels && typeof root.GameLevels.createEnemy === 'function') {
          guard = root.GameLevels.createEnemy('knight', gx, gy, worldState.regionIndex || 0);
        } else {
          guard = {
            id: 'elite_guard_' + Math.random(),
            type: 'knight',
            name: 'Elit Astral Qoruyucu',
            x: gx,
            y: gy,
            hp: 140,
            maxHp: 140,
            speed: 120,
            damage: 18,
            radius: 22,
            color: '#dc2626'
          };
        }

        // Elit xüsusiyyətlər
        guard.name = '☄️ Astral Meteor Gözətçisi';
        guard.isEliteGuard = true;
        guard.hp = Math.round(guard.hp * 1.5);
        guard.maxHp = guard.hp;
        guard.color = '#ff1744';
        guard.auraColor = 'rgba(255, 23, 68, 0.6)';
        guard.chestRef = chest;

        guards.push(guard);
        if (Array.isArray(worldState.enemies)) {
          worldState.enemies.push(guard);
        }
      }

      chest.guards = guards;
      this.worldEvents.activeMeteorChest = chest;
      this.worldEvents.activeEvent = 'meteor_chest';

      // Ekran silkələnməsi və partlayış
      if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
        root.GameJuice.shake(7, 0.45);
      }
      if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
        try { root.GameAudio.playSFX('explosion'); } catch (_) {}
      }
      if (root.GameVFX && typeof root.GameVFX.spawnExplosion === 'function') {
        root.GameVFX.spawnExplosion(dropX, dropY, '#ff0055', 35, 80);
      }

      // Bildiriş Banneri
      this.showBanner(
        '☄️ QANLI ASTRAL METEOR SANDIĞI DÜŞDÜ!',
        '3 Elit Gözətçini məhv et və meteor sandığını aç!',
        '#ff3366'
      );

      if (callbacks && typeof callbacks.onMeteorChestSpawn === 'function') {
        callbacks.onMeteorChestSpawn(chest);
      }

      console.log('☄️ [GameEvents] Qanlı Meteor Sandığı yaradıldı:', chest);
      return chest;
    },

    /**
     * Meteor Sandığı və Gözətçilərinin vəziyyətini yeniləyir
     */
    _updateMeteorChest(dt, worldState, callbacks) {
      const chest = this.worldEvents.activeMeteorChest;
      if (!chest || chest.opened) return;

      chest.pulse = (chest.pulse || 0) + dt * 4;

      // Canlı gözətçilərin sayını yoxla
      if (chest.locked && Array.isArray(chest.guards)) {
        const aliveGuards = chest.guards.filter(g => g && g.hp > 0).length;
        chest.guardsRemaining = aliveGuards;

        if (aliveGuards === 0) {
          // Bütün gözətçilər məğlub oldu! Sandıq kiliddən çıxır!
          chest.locked = false;
          this.showBanner(
            '🔓 METEOR SANDIĞININ KİLİDİ AÇILDI!',
            'Sandığa yaxınlaşaraq zəngin relikt və qızılı götür!',
            '#00f5a0'
          );
          if (root.GameVFX && typeof root.GameVFX.spawnExplosion === 'function') {
            root.GameVFX.spawnExplosion(chest.x, chest.y, '#00f5a0', 20, 50);
          }
        }
      }

      // Əgər kilid açılıbsa və oyunçu yaxınlaşırsa:
      if (!chest.locked && !chest.opened) {
        const p = worldState.player;
        if (p) {
          const d2 = distSq(p.x, p.y, chest.x, chest.y);
          if (d2 <= (chest.radius + p.radius + 20) * (chest.radius + p.radius + 20)) {
            this._openMeteorChest(chest, worldState, callbacks);
          }
        }
      }
    },

    /**
     * Meteor Sandığını açır və mükafatları verir
     */
    _openMeteorChest(chest, worldState, callbacks) {
      chest.opened = true;

      // Mükafatlar
      const goldReward = 220;
      const crystalReward = 12;

      if (root.GameProgression) {
        if (typeof root.GameProgression.addGold === 'function') {
          root.GameProgression.addGold(goldReward);
        }
        if (typeof root.GameProgression.addCrystals === 'function') {
          root.GameProgression.addCrystals(crystalReward);
        }
      }

      // Audio & Juice
      if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
        try { root.GameAudio.playSFX('chest'); } catch (_) {}
      }
      if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
        root.GameJuice.shake(5, 0.35);
      }
      if (root.GameVFX && typeof root.GameVFX.spawnExplosion === 'function') {
        root.GameVFX.spawnExplosion(chest.x, chest.y, '#ff0055', 35, 75);
      }

      this.showBanner(
        '🏆 METEOR XƏZİNƏSİ AÇILDI!',
        `+${goldReward} Qızıl, +${crystalReward} Kristal və Relikt Seçimi!`,
        '#00f5a0'
      );

      // Relikt modalı
      if (callbacks && typeof callbacks.onRelicChoice === 'function') {
        callbacks.onRelicChoice();
      } else if (root.GameUI && typeof root.GameUI.showRelicModal === 'function') {
        root.GameUI.showRelicModal();
      }

      // Təmizləmə
      this.worldEvents.activeMeteorChest = null;
      this.worldEvents.activeEvent = null;
    },

    /**
     * Ekranda dinamik bildiriş banneri göstərir
     */
    showBanner(text, subtext = '', color = '#ffd700') {
      const b = this.worldEvents.banner;
      b.text = text;
      b.subtext = subtext;
      b.color = color;
      b.timer = b.maxTimer;
      b.opacity = 1.0;
    },

    /**
     * Banner animasiyasını yeniləyir
     */
    _updateBanner(dt) {
      const b = this.worldEvents.banner;
      if (b.timer > 0) {
        b.timer -= dt;
        if (b.timer < 0.6) {
          b.opacity = Math.max(0, b.timer / 0.6);
        } else {
          b.opacity = 1.0;
        }
      }
    },

    // ========================================================================
    // BÖLMƏ IV: SONSUZ KOLİZEY REJİMİ (ENDLESS ARENA / BOSS RUSH)
    // ========================================================================

    /**
     * Sonsuz Kolizey Rejimini başladır
     * @param {Object} worldState - Oyun dünyası vəziyyəti
     * @param {Object} callbacks - Callback funksiyaları
     */
    startArenaMode(worldState, callbacks = {}) {
      this.isArenaMode = true;
      this.arenaWave = 1;
      this.arenaState = 'countdown';
      this.arena.intermissionTimer = 2.5;
      this.arena.waveKillCount = 0;
      this.arena.totalArenaKills = 0;
      this.arena.rewardGranted = false;

      // Xəritədəki əvvəlki düşmənləri və mərmiləri təmizlə
      if (worldState) {
        worldState.enemies = [];
        worldState.projectiles = [];
        worldState.boss = null;
        worldState.bossSpawned = false;

        // Oyunçunu mərkəzə yerləşdir
        if (worldState.player) {
          worldState.player.x = this.arena.arenaBounds.centerX;
          worldState.player.y = this.arena.arenaBounds.centerY;
        }
      }

      // Audio: Arena musiqisini başlad
      if (root.GameAudio && typeof root.GameAudio.playBGM === 'function') {
        try { root.GameAudio.playBGM('arena'); } catch (_) {}
      }

      this.showBanner(
        '🔥 SONSUZ KOLİZEY REJİMİ BAŞLADI!',
        'Sonsuz düşmən dalğalarına və Epik Boss-lara qarşı sağ qal!',
        '#f5c542'
      );

      console.log('⚔️ [GameEvents] Sonsuz Kolizey Rejimi Aktivləşdirildi. Dalğa:', this.arenaWave);
      if (callbacks && typeof callbacks.onArenaStart === 'function') {
        callbacks.onArenaStart(this.arenaWave);
      }
    },

    /**
     * Sonsuz Kolizey dalğalarını hər frame-də idarə edən dövrə
     */
    updateArena(dt, worldState, callbacks = {}) {
      if (!this.isArenaMode || !worldState) return;

      switch (this.arenaState) {
        case 'countdown': {
          this.arena.intermissionTimer -= dt;
          if (this.arena.intermissionTimer <= 0) {
            this._spawnArenaWave(worldState, callbacks);
          }
          break;
        }

        case 'fighting': {
          // Canlı düşmənləri say
          let aliveCount = 0;
          if (Array.isArray(worldState.enemies)) {
            aliveCount = worldState.enemies.filter(e => e && e.hp > 0).length;
          }
          if (worldState.boss && worldState.boss.hp > 0) {
            aliveCount++;
          }

          this.arena.enemiesRemaining = aliveCount;

          // Əgər dalğadakı bütün düşmənlər öldüsə:
          if (aliveCount === 0 && !this.arena.rewardGranted) {
            this._onArenaWaveCleared(worldState, callbacks);
          }
          break;
        }

        case 'wave_cleared': {
          this.arena.intermissionTimer -= dt;
          if (this.arena.intermissionTimer <= 0) {
            this.arenaWave++;
            this.arenaState = 'countdown';
            this.arena.intermissionTimer = 3.0;

            const isNextBoss = (this.arenaWave % 3 === 0);
            this.showBanner(
              isNextBoss ? `⚠️ EPİK BOSS DALĞASI YAXINLAŞIR!` : `⚔️ DALĞA ${this.arenaWave} HAZIRLANIR...`,
              'Bir neçə saniyəyə döyüş arenası yenidən alovlanacaq!',
              isNextBoss ? '#ff0055' : '#f5c542'
            );
          }
          break;
        }

        case 'game_over':
          // Oyun bitdi
          break;
      }
    },

    /**
     * Kolizey Dalğasını yaradır (Hər 3-cü dalğada Epik Boss!)
     */
    _spawnArenaWave(worldState, callbacks) {
      const wave = this.arenaWave;
      const isBossWave = (wave % 3 === 0);
      this.arena.isBossWave = isBossWave;
      this.arena.rewardGranted = false;

      // Scaling düsturu
      const hpScale = 1.0 + (wave - 1) * 0.22;
      const dmgScale = 1.0 + (wave - 1) * 0.16;

      const enemies = [];
      const bounds = this.arena.arenaBounds;

      if (isBossWave) {
        // --- 1. EPİK BOSS DALĞASI ---
        let bossRegionIdx = 0;
        let bossTitle = 'Sylvanos - Qədim Meşə Hamisi';

        if (wave === 3) {
          bossRegionIdx = 0;
          bossTitle = 'Sylvanos - Meşə Hamisi (Wave 3)';
        } else if (wave === 6) {
          bossRegionIdx = 1;
          bossTitle = 'Kryos - Donmuş Kristall Qolem (Wave 6)';
        } else if (wave === 9) {
          bossRegionIdx = 2;
          bossTitle = 'Malakor - Obsidian Hökmdarı (Wave 9)';
        } else {
          bossRegionIdx = (Math.floor(wave / 3) - 1) % 3;
          bossTitle = `Astral Qiyamət Titanı (Dalğa ${wave})`;
        }

        this.arena.bossName = bossTitle;

        // Boss yarat
        let boss = null;
        if (root.GameLevels && typeof root.GameLevels.createBoss === 'function') {
          boss = root.GameLevels.createBoss(bossRegionIdx, bounds.centerX, bounds.centerY - 160);
        } else {
          boss = {
            id: 'arena_boss_' + wave,
            name: bossTitle,
            isBoss: true,
            x: bounds.centerX,
            y: bounds.centerY - 160,
            hp: Math.round(900 * hpScale),
            maxHp: Math.round(900 * hpScale),
            speed: 105,
            damage: Math.round(26 * dmgScale),
            radius: 48,
            color: '#dc2626',
            phase: 1
          };
        }

        boss.name = bossTitle;
        boss.isBoss = true;
        boss.hp = Math.round(boss.hp * hpScale);
        boss.maxHp = boss.hp;
        boss.damage = Math.round(boss.damage * dmgScale);

        worldState.boss = boss;
        worldState.bossSpawned = true;

        // Boss-un yanında 3-4 güclü minion
        const minionCount = 3 + Math.floor(wave / 3);
        for (let m = 0; m < minionCount; m++) {
          const ma = (m / minionCount) * Math.PI * 2;
          const mx = bounds.centerX + Math.cos(ma) * 260;
          const my = bounds.centerY + Math.sin(ma) * 200;
          const mType = m % 2 === 0 ? 'knight' : 'archer';

          let minion = null;
          if (root.GameLevels && typeof root.GameLevels.createEnemy === 'function') {
            minion = root.GameLevels.createEnemy(mType, mx, my, bossRegionIdx);
          } else {
            minion = {
              id: 'arena_m_' + m,
              type: mType,
              x: mx,
              y: my,
              hp: Math.round(80 * hpScale),
              maxHp: Math.round(80 * hpScale),
              speed: 125,
              damage: Math.round(14 * dmgScale),
              radius: 20,
              color: '#f97316'
            };
          }
          minion.hp = Math.round(minion.hp * hpScale);
          minion.maxHp = minion.hp;
          enemies.push(minion);
        }

        this.showBanner(
          `👑 EPİK KOLİZEY BOSS-U: ${bossTitle}!`,
          'Bütün qüdrətini səfərbər et — Boss və gözətçilər hücum edir!',
          '#ff0055'
        );

        if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
          try { root.GameAudio.playSFX('bossRoar'); } catch (_) {}
        }
        if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
          root.GameJuice.shake(7, 0.5);
        }

      } else {
        // --- 2. NORMAL DALĞA (QARIŞIQ SÜRÜ) ---
        worldState.boss = null;
        worldState.bossSpawned = false;

        const count = 5 + wave * 2;
        const enemyTypes = ['goblin', 'archer', 'knight', 'golem', 'wraith'];

        for (let i = 0; i < count; i++) {
          const type = enemyTypes[i % enemyTypes.length];
          const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4);
          const r = 260 + Math.random() * 240;
          const ex = clamp(bounds.centerX + Math.cos(angle) * r, bounds.minX, bounds.maxX);
          const ey = clamp(bounds.centerY + Math.sin(angle) * r, bounds.minY, bounds.maxY);

          let e = null;
          const regIdx = Math.min(2, Math.floor(wave / 4));
          if (root.GameLevels && typeof root.GameLevels.createEnemy === 'function') {
            e = root.GameLevels.createEnemy(type, ex, ey, regIdx);
          } else {
            e = {
              id: 'enemy_wave_' + wave + '_' + i,
              type: type,
              x: ex,
              y: ey,
              hp: Math.round(60 * hpScale),
              maxHp: Math.round(60 * hpScale),
              speed: 130,
              damage: Math.round(12 * dmgScale),
              radius: 19,
              color: '#38bdf8'
            };
          }

          e.hp = Math.round(e.hp * hpScale);
          e.maxHp = e.hp;
          e.damage = Math.round(e.damage * dmgScale);
          enemies.push(e);
        }

        this.showBanner(
          `⚔️ KOLİZEY: DALĞA ${wave} BAŞLADI!`,
          `${enemies.length} Düşmən yaxınlaşır! Hamısını məhv et!`,
          '#38bdf8'
        );

        if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
          try { root.GameAudio.playSFX('slash3'); } catch (_) {}
        }
        if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
          root.GameJuice.shake(3, 0.25);
        }
      }

      worldState.enemies = enemies;
      this.arena.totalWaveEnemies = enemies.length + (worldState.boss ? 1 : 0);
      this.arena.enemiesRemaining = this.arena.totalWaveEnemies;
      this.arenaState = 'fighting';

      if (callbacks && typeof callbacks.onWaveStart === 'function') {
        callbacks.onWaveStart(wave, this.arena.totalWaveEnemies);
      }
    },

    /**
     * Kolizey Dalğası tamamlandıqda mükafat və Relikt modalı verir
     */
    _onArenaWaveCleared(worldState, callbacks) {
      this.arena.rewardGranted = true;
      this.arenaState = 'wave_cleared';
      this.arena.intermissionTimer = 4.2;

      // Rekord Dalğa Yoxlanışı və Yadda Saxlanması
      if (this.arenaWave > this.arena.bestWave) {
        this.arena.bestWave = this.arenaWave;
        try {
          if (typeof root !== 'undefined' && root.localStorage && typeof root.localStorage.setItem === 'function') {
            root.localStorage.setItem('aetheria_arena_record_wave', String(this.arenaWave));
          }
        } catch (_) {}
      }

      // Mükafatların Hesablanması
      const goldReward = 50 + this.arenaWave * 25;
      const crystalReward = 3 + Math.floor(this.arenaWave / 2);

      if (root.GameProgression) {
        if (typeof root.GameProgression.addGold === 'function') {
          root.GameProgression.addGold(goldReward);
        }
        if (typeof root.GameProgression.addCrystals === 'function') {
          root.GameProgression.addCrystals(crystalReward);
        }
      }

      // Audio & Juice
      if (root.GameAudio && typeof root.GameAudio.playSFX === 'function') {
        try { root.GameAudio.playSFX('levelUp'); } catch (_) {}
      }
      if (root.GameJuice && typeof root.GameJuice.shake === 'function') {
        root.GameJuice.shake(5, 0.35);
      }

      this.showBanner(
        `🏆 DALĞA ${this.arenaWave} FƏTH EDİLDİ!`,
        `+${goldReward} Qızıl, +${crystalReward} Kristal və Relikt Seçimi Təqdim Edildi!`,
        '#00f5a0'
      );

      // Relikt Seçimi Təqdim Et!
      if (callbacks && typeof callbacks.onRelicChoice === 'function') {
        callbacks.onRelicChoice();
      } else if (root.GameUI && typeof root.GameUI.showRelicModal === 'function') {
        root.GameUI.showRelicModal();
      }

      if (callbacks && typeof callbacks.onWaveCleared === 'function') {
        callbacks.onWaveCleared(this.arenaWave, { gold: goldReward, crystals: crystalReward });
      }
    },

    /**
     * Kolizey Rejimini dayandırır
     */
    endArenaMode(worldState, callbacks = {}) {
      this.isArenaMode = false;
      this.arenaState = 'idle';

      if (callbacks && typeof callbacks.onArenaEnd === 'function') {
        callbacks.onArenaEnd({
          wavesSurvived: this.arenaWave,
          bestWave: this.arena.bestWave
        });
      }
    },

    /**
     * Hər yeni qaçış və ya menyuya qayıdış üçün arena bayrağını və kombo rekordunu sıfırlayır.
     */
    resetRun(worldState) {
      this.endArenaMode(worldState);
      this.arenaWave = 1;
      this.arena.waveKillCount = 0;
      this.arena.totalArenaKills = 0;
      this.arena.rewardGranted = false;
      this.resetCombo();
      this.combo.highestCombo = 0;
    },

    /**
     * Bu qaçışdakı ən yüksək kombo dərəcəsi ('' əgər kombo olmayıbsa)
     */
    getBestComboRank() {
      const best = this.combo.highestCombo || 0;
      for (let i = 0; i < COMBO_RANKS.length; i++) {
        if (best >= COMBO_RANKS[i].minHits) return COMBO_RANKS[i].rank;
      }
      return '';
    },

    // ========================================================================
    // BÖLMƏ V: CANVAS HUD VƏ OVERLAY ÇƏKMƏ (STİL KOMBO + ARENA + BANNER)
    // ========================================================================

    /**
     * Ekrandakı bütün Hadisə və Kombo interfeyslərini çəkir
     * @param {CanvasRenderingContext2D} ctx - Kətan konteksti
     * @param {number} viewWidth - Ekran eni
     * @param {number} viewHeight - Ekran hündürlüyü
     */
    renderHUD(ctx, viewWidth = 1280, viewHeight = 720) {
      if (!ctx) return;

      // 1. Stil Kombo Sayğacı (Sağ yuxarıda)
      if (this.combo.count > 0) {
        this._renderComboHUD(ctx, viewWidth, viewHeight);
      }

      // 2. Kolizey Dalğa Göstəricisi (Yuxarı mərkəzdə)
      if (this.isArenaMode) {
        this._renderArenaHUD(ctx, viewWidth, viewHeight);
      }

      // 3. Bildiriş Banneri (Ekranın yuxarı-orta zolağında)
      if (this.worldEvents.banner.timer > 0) {
        this._renderBannerHUD(ctx, viewWidth, viewHeight);
      }
    },

    /**
     * Devil May Cry üslublu parıldayan Stil Kombo Sayğacı
     */
    _renderComboHUD(ctx, viewWidth, viewHeight) {
      const c = this.combo;
      const x = viewWidth - 160;
      const y = 140;

      ctx.save();

      // Kombo Rütbə animasiyası (Rank Up sıçrayışı)
      const scale = c.rankUpScale || 1.0;
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // 1. Arxa Parıltı (Glow)
      ctx.shadowColor = c.glow || c.color;
      ctx.shadowBlur = 18;

      // 2. Nəhəng Rütbə Hərfi (SSS, S, A, B, C, D)
      ctx.font = '900 48px "Cinzel", "Georgia", serif';
      ctx.fillStyle = c.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.rank, 0, 0);

      // 3. Rütbə Başlığı (məs. "SSS - ƏFSANƏ!")
      ctx.shadowBlur = 6;
      ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(c.title, 0, 32);

      // 4. Vuruş Sayı (Hits Counter)
      ctx.font = '800 20px "Cinzel", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`${c.count} HITS`, 0, -32);

      // 5. Çarpan (Multiplier)
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#00f5a0';
      ctx.fillText(`${c.multiplier.toFixed(1)}x ZƏRƏR & QIZIL`, 0, 48);

      // 6. Taymer Barı (Geri Sayım Zolağı)
      const barW = 90;
      const barH = 5;
      const barX = -barW / 2;
      const barY = 62;
      const progress = clamp(c.timer / c.maxTimer, 0, 1);

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, barY, barW, barH);

      ctx.fillStyle = c.color;
      ctx.fillRect(barX, barY, barW * progress, barH);

      ctx.restore();
    },

    /**
     * Sonsuz Kolizey Rejiminin qızılı Dalğa Kartı
     */
    _renderArenaHUD(ctx, viewWidth, viewHeight) {
      const x = viewWidth / 2;
      const y = 35;
      const w = 320;
      const h = 50;

      ctx.save();
      ctx.translate(x, y);

      // Panel Şüşə Fonu
      ctx.fillStyle = 'rgba(14, 11, 24, 0.85)';
      ctx.strokeStyle = this.arena.isBossWave ? '#ff0055' : 'rgba(245, 197, 66, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 8);
      ctx.fill();
      ctx.stroke();

      // Qızılı İşıq
      ctx.shadowColor = this.arena.isBossWave ? '#ff0055' : '#f5c542';
      ctx.shadowBlur = 10;

      // Dalğa Mətni
      ctx.font = '800 16px "Cinzel", serif';
      ctx.fillStyle = this.arena.isBossWave ? '#ff0055' : '#ffd700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const title = this.arena.isBossWave
        ? `👑 KOLİZEY BOSS DALĞASI: ${this.arenaWave}`
        : `🔥 KOLİZEY DALĞASI: ${this.arenaWave}`;
      ctx.fillText(title, 0, -8);

      // Qalan Düşmənlər və Rekord
      ctx.shadowBlur = 0;
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#94a3b8';

      const statusText = this.arenaState === 'wave_cleared'
        ? '🏆 DALĞA FƏTH EDİLDİ!'
        : (this.arenaState === 'countdown' ? 'GÖZLƏNİLİR...' : `Qalan Düşmənlər: ${this.arena.enemiesRemaining}`);
      ctx.fillText(`${statusText}  |  Rekord: ${this.arena.bestWave}`, 0, 12);

      ctx.restore();
    },

    /**
     * Bildiriş Banneri Renderi
     */
    _renderBannerHUD(ctx, viewWidth, viewHeight) {
      const b = this.worldEvents.banner;
      const cx = viewWidth / 2;
      // Narrow screens: sit below the hero card instead of on top of it.
      const cy = viewWidth <= 600 ? Math.round(viewHeight * 0.3) : 115;
      const w = Math.min(480, viewWidth - 24);
      const h = 60;

      ctx.save();
      ctx.globalAlpha = b.opacity;

      // Arxa fon
      ctx.fillStyle = 'rgba(10, 8, 18, 0.9)';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 10);
      ctx.fill();
      ctx.stroke();

      // Başlıq mətni
      ctx.font = '800 15px "Cinzel", serif';
      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, cx, cy - 10);

      // Alt mətn
      ctx.shadowBlur = 0;
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(b.subtext, cx, cy + 12);

      ctx.restore();
    },

    /**
     * Xəritədəki Dünya Hadisələrini (Qızıl Qoblin aurası, Meteor Sandığı şüası) çəkir
     * @param {CanvasRenderingContext2D} ctx - Kətan konteksti
     * @param {Object} camera - Cari kamera mövqeyi
     */
    renderWorldEvents(ctx, camera = { x: 0, y: 0 }) {
      if (!ctx) return;

      // 1. Qızıl Xəzinə Qoblininin Parıltılı Aurası
      const goblin = this.worldEvents.activeGoblin;
      if (goblin && goblin.hp > 0) {
        const sx = goblin.x - camera.x;
        const sy = goblin.y - camera.y;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, goblin.radius + 12 + Math.sin(goblin.pulsePhase || 0) * 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.fill();

        // Üzərində qızıl sikkə ikonu
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💰', sx, sy - goblin.radius - 8);
        ctx.restore();
      }

      // 2. Qanlı Meteor Sandığının Astral İşığı
      const chest = this.worldEvents.activeMeteorChest;
      if (chest && !chest.opened) {
        const sx = chest.x - camera.x;
        const sy = chest.y - camera.y;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, chest.radius + 10 + Math.sin(chest.pulse || 0) * 3, 0, Math.PI * 2);
        ctx.fillStyle = chest.locked ? 'rgba(255, 0, 85, 0.25)' : 'rgba(0, 245, 160, 0.35)';
        ctx.shadowColor = chest.locked ? '#ff0055' : '#00f5a0';
        ctx.shadowBlur = 20;
        ctx.fill();

        // Sandıq ikonu və qalan qoruyucular
        ctx.font = 'bold 12px "Cinzel", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        if (chest.locked) {
          ctx.fillText(`🔒 Gözətçi: ${chest.guardsRemaining}`, sx, sy - chest.radius - 10);
        } else {
          ctx.fillStyle = '#00f5a0';
          ctx.fillText(`✨ AÇ!`, sx, sy - chest.radius - 10);
        }
        ctx.restore();
      }
    }
  };

  // Qlobal qeydiyyat (Browser və Node.js dəstəyi)
  if (typeof window !== 'undefined') {
    window.GameEvents = GameEvents;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEvents;
  }

})(typeof window !== 'undefined' ? window : globalThis);
