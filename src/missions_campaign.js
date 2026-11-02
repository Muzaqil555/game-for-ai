/**
 * ============================================================================
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V2.0 — AAA Mega-Edition)
 * Fayl: src/missions_campaign.js
 * Qlobal Obyekt: window.GameMissions
 * Məsul Agent: 27-ci Agent — Missiya, Hekayə Kampaniyası və "Bounty" Müqavilələri Mütəxəssisi (mission_campaign_specialist)
 *
 * Əsas 6 Sistem:
 * 1. 12 Mərhələli Zəncirvari Hekayə Kampaniyası (Hər Bölgədə 4 Ardıcıl Əsas Missiya: NPC/Kəşfiyyat -> Müdafiə Dairəsi -> 3 Obelisk -> Boss/Portal)
 * 2. Dinamik Vaxtlı Ovçu Müqavilələri ([M] düyməsi ilə yenilənən/seçilən 5 növ asılılıq yaradan yan tapşırıq)
 * 3. Xəritədə Tale Qurbangahları ([F] ilə Mystery Risk/Reward: Qan Qurbangahı, Qızıl Bəxt, İldırım Qəzəbi)
 * 4. Kill-Streak (Ardıcıl Qətl) Dopamin Sistemi (2x, 3x, 4x, 5x, 7x Aether Tanrısı elanları və mükafatları)
 * 5. Ovçu Rütbəsi (Hunter Prestige Rank — localStorage yaddaşlı 6 pilləli fəxri dərəcə)
 * 6. Canlı GPS Hədəf Oxu (Objective Compass Arrow) və Canvas 2D World/HUD Render
 * ============================================================================
 */

(function (root) {
  'use strict';

  // --- Köməkçi Riyazi və Faydalı Funksiyalar ---
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const distSq = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const dist = (x1, y1, x2, y2) => Math.sqrt(distSq(x1, y1, x2, y2));
  const drawRoundRect = (ctx, x, y, width, height, radius) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
  };

  // --- Ovçu Rütbələri (Hunter Prestige Ranks) Konfiqurasiyası ---
  const HUNTER_RANKS = [
    {
      id: 1,
      name: 'Bürünc İzləyici',
      badge: '🥉',
      minXP: 0,
      nextXP: 150,
      damageBonus: 0.0,
      goldBonus: 0.0,
      color: '#cd7f32',
      glow: 'rgba(205, 127, 50, 0.45)'
    },
    {
      id: 2,
      name: 'Gümüş Kölgə Ovçusu',
      badge: '🥈',
      minXP: 150,
      nextXP: 400,
      damageBonus: 0.08,
      goldBonus: 0.08,
      color: '#c0c0c0',
      glow: 'rgba(192, 192, 192, 0.55)'
    },
    {
      id: 3,
      name: 'Qızıl Cəngavər',
      badge: '🥇',
      minXP: 400,
      nextXP: 800,
      damageBonus: 0.16,
      goldBonus: 0.16,
      color: '#ffd700',
      glow: 'rgba(255, 215, 0, 0.65)'
    },
    {
      id: 4,
      name: 'Almaz Sərkərdə',
      badge: '💎',
      minXP: 800,
      nextXP: 1400,
      damageBonus: 0.25,
      goldBonus: 0.25,
      color: '#00e5ff',
      glow: 'rgba(0, 229, 255, 0.75)'
    },
    {
      id: 5,
      name: 'Astral Hökmdar',
      badge: '🌌',
      minXP: 1400,
      nextXP: 2200,
      damageBonus: 0.35,
      goldBonus: 0.35,
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.85)'
    },
    {
      id: 6,
      name: 'Əbədi Aether Tanrısı',
      badge: '👑',
      minXP: 2200,
      nextXP: Infinity,
      damageBonus: 0.50,
      goldBonus: 0.50,
      color: '#ff007f',
      glow: 'rgba(255, 0, 127, 0.95)'
    }
  ];

  // --- Bölgə Adları ---
  const REGION_NAMES = [
    'Zümrüd Meşəsi (Emerald Grove)',
    'Kristal Dərəsi (Crystal Hollows)',
    'Obsidian Qalası (Shadow Citadel)'
  ];

  // --- Vaxtlı Ovçu Müqaviləsi Şablonları (Timed Bounty Templates) ---
  const BOUNTY_TEMPLATES = [
    {
      type: 'kill_timer',
      title: '⚡ İldırım Ovu',
      description: '35 saniyə ərzində 5 düşmən məhv et!',
      icon: '⚡',
      duration: 35.0,
      targetValue: 5,
      gold: 120,
      crystals: 0,
      rage: 0,
      hunterXP: 50
    },
    {
      type: 'combo_reach',
      title: '🔥 Stil Ustası',
      description: '8x və ya daha yüksək Stil Kombosuna çat!',
      icon: '🔥',
      duration: 45.0,
      targetValue: 8,
      gold: 100,
      crystals: 8,
      rage: 0,
      hunterXP: 50
    },
    {
      type: 'no_damage',
      title: '🛡 Toxunulmaz Kölgə',
      description: '18 saniyə heç zədə almadan sağ qal!',
      icon: '🛡',
      duration: 18.0,
      targetValue: 18.0,
      gold: 130,
      crystals: 0,
      rage: 35,
      hunterXP: 60
    },
    {
      type: 'weapon_master',
      title: '🗡 Arsenal Ustası',
      description: '[1-4] ilə silah dəyiş və 4 düşməni məhv et!',
      icon: '🗡',
      duration: 50.0,
      targetValue: 4,
      gold: 110,
      crystals: 10,
      rage: 0,
      hunterXP: 55
    },
    {
      type: 'shrine_hunter',
      title: '⛩ Tale Axtarışı',
      description: 'Xəritədəki Tale Qurbangahını tap və [F] ilə aktivləşdir!',
      icon: '⛩',
      duration: 60.0,
      targetValue: 1,
      gold: 150,
      crystals: 0,
      rage: 0,
      hunterXP: 70
    }
  ];

  /**
   * Əsas GameMissions İdarəetmə Obyekti
   */
  const GameMissions = {
    version: '2.0.0',

    // ========================================================================
    // 1. ZƏNCİRVARİ HEKAYƏ KAMPANİYASI VƏZİYYƏTİ (Campaign State)
    // ========================================================================
    campaign: {
      currentRegionIndex: 0,
      currentStageIndex: 0, // 0: npc_or_scout, 1: defense_circle, 2: obelisks, 3: boss
      isCompleted: false,
      stageProgress: 0,
      stageTarget: 1,
      npcTalked: false,
      scoutKills: 0,
      obelisksActivated: 0,
      bossDefeated: false,
      portalEntered: false,

      // 🛡 Müdafiə Rün Dairəsi (Stage 2)
      defenseZone: {
        active: false,
        x: 0,
        y: 0,
        radius: 110,
        progress: 0.0, // 0 -> 10.0 saniyə
        duration: 10.0,
        isPlayerInside: false,
        spawnTimer: 0.0,
        spawnInterval: 3.0,
        completed: false,
        pulseAngle: 0.0
      }
    },

    // ========================================================================
    // 2. DİNAMİK VAXTLI OVÇU MÜQAVİLƏLƏRİ VƏZİYYƏTİ (Bounty Contracts)
    // ========================================================================
    bounty: {
      active: null,
      cooldownTimer: 0.0, // Müqavilə bitəndə 8 saniyəlik avto-başlama taymeri
      nextAutoStartDelay: 8.0,
      totalCompleted: 0,
      history: []
    },

    // ========================================================================
    // 3. TALE QURBANGAHLARI VƏZİYYƏTİ (Mystery Shrines)
    // ========================================================================
    shrines: [], // Cari bölgədəki 2 Tale Qurbangahı
    buffs: {
      bloodDamageTimer: 0.0,   // Qan Qurbangahı: 25s +40% Zərər
      bloodDamageMult: 1.40,
      frenzyTimer: 0.0,        // İldırım Qəzəbi: 18s +35% Sürət və 100% Kritik
      frenzySpeedMult: 1.35,
      frenzyCritBonus: 1.00
    },

    // ========================================================================
    // 4. KILL-STREAK (ARDICIL QƏTL) DOPAMİN SİSTEMİ
    // ========================================================================
    killStreak: {
      count: 0,
      timer: 0.0,
      maxTimer: 4.5, // 4.5 saniyəlik pəncərə
      highestRunStreak: 0,
      totalStreaksAwarded: 0
    },

    // ========================================================================
    // 5. OVÇU RÜTBƏSİ (HUNTER PRESTIGE RANK)
    // ========================================================================
    prestige: {
      hunterXP: 0,
      currentRankId: 1,
      storageKey: 'aetheria_hunter_prestige_xp',
      rankUpPending: false
    },

    // ========================================================================
    // 6. ANİMASİYA VƏ BANNER VƏZİYYƏTLƏRİ (UI Dopamine Feedback)
    // ========================================================================
    uiBanners: {
      // Kill Streak Banner
      streak: {
        text: '',
        subtext: '',
        color: '#fbbf24',
        scale: 1.0,
        alpha: 0.0,
        timer: 0.0,
        maxTimer: 2.2
      },
      // Mission / Bounty / Rank Up Celebration Banner
      celebration: {
        title: '',
        subtitle: '',
        rewardText: '',
        color: '#4ade80',
        badge: '🏆',
        timer: 0.0,
        maxTimer: 3.5,
        scale: 1.0
      }
    },

    // Daxili Dinamik İzləyicilər
    _isInitialized: false,
    _worldStateRef: null,
    _cachedCompassAngle: 0,
    _pulseTimer: 0,

    // ========================================================================
    // ƏSAS İNİTİALİZASİYA (init)
    // ========================================================================
    init: function () {
      if (this._isInitialized) return;

      // 1. Ovçu Rütbəsi XP-ni localStorage-dən oxu
      this._loadPrestigeXP();

      // 2. [M] Bounty və [F] Qurbangah düymələri GameEngine tərəfindən idarə olunur (tək giriş yolu)

      // 3. İlkin Ovçu Müqaviləsini işə sal
      this._startRandomBounty();

      this._isInitialized = true;
      console.log('⚔️ [GameMissions] Missiya, Hekayə Kampaniyası və Ovçu Müqavilələri Modulu hazırdır!');
    },

    // ========================================================================
    // BÖLGƏ YÜKLƏNDİKDƏ (onRegionLoaded)
    // ========================================================================
    onRegionLoaded: function (regionIndex, worldState) {
      this.init();
      this._worldStateRef = worldState;

      const rIdx = Math.max(0, Math.min(2, regionIndex || 0));
      this.campaign.currentRegionIndex = rIdx;
      this.campaign.currentStageIndex = 0; // Hər yeni bölgədə 1-ci mərhələdən başlayır
      this.campaign.npcTalked = false;
      this.campaign.scoutKills = 0;
      this.campaign.obelisksActivated = 0;
      this.campaign.bossDefeated = false;
      this.campaign.portalEntered = false;
      this.campaign.isCompleted = false;

      // Müdafiə Dairəsini sıfırla
      this.campaign.defenseZone.active = false;
      this.campaign.defenseZone.progress = 0;
      this.campaign.defenseZone.completed = false;
      this.campaign.defenseZone.spawnTimer = 0;

      // 2 Tale Qurbangahını xəritəyə yerləşdir
      this._spawnRegionalShrines(rIdx, worldState);

      // Bildiriş göstər
      const stageInfo = this._getCurrentStageInfo();
      this._triggerCelebrationBanner(
        `📜 YENİ HEKAYƏ BÖLGƏSİ!`,
        `${REGION_NAMES[rIdx]} — Mərhələ 1/4: ${stageInfo.title}`,
        '+80 Qızıl, +40 Hunter XP',
        '🗺️',
        '#38bdf8'
      );
    },

    // ========================================================================
    // HƏR KADR YENİLƏNMƏSİ (update)
    // ========================================================================
    update: function (dt, player, worldState, callbacks) {
      this._worldStateRef = worldState;
      if (!dt || dt <= 0) return;

      this._pulseTimer += dt;

      // 1. Buff Taymerlərini Yenilə
      if (this.buffs.bloodDamageTimer > 0) {
        this.buffs.bloodDamageTimer = Math.max(0, this.buffs.bloodDamageTimer - dt);
      }
      if (this.buffs.frenzyTimer > 0) {
        this.buffs.frenzyTimer = Math.max(0, this.buffs.frenzyTimer - dt);
      }

      // 2. Kill-Streak Taymerini Yenilə
      if (this.killStreak.timer > 0) {
        this.killStreak.timer -= dt;
        if (this.killStreak.timer <= 0) {
          this.killStreak.count = 0;
        }
      }

      // 3. UI Banner Taymerlərini Yenilə
      this._updateUIBanners(dt);

      // 4. Əsas Kampaniya Mərhələlərini Yenilə
      this._updateCampaignLogic(dt, player, worldState, callbacks);

      // 5. Aktiv Ovçu Müqaviləsini Yenilə
      this._updateBountyLogic(dt, player, worldState, callbacks);
    },

    // ========================================================================
    // DÜŞMƏN MƏHV EDİLDİKDƏ (onEnemyKilled)
    // ========================================================================
    onEnemyKilled: function (enemy, player, worldState, callbacks) {
      this._worldStateRef = worldState;

      // 1. Kill-Streak Hesablanması
      this._registerKillStreakKill(enemy, player, callbacks);

      // 2. Kampaniya Mərhələ 1 (Kəşfiyyatçı düşmən qətli)
      if (this.campaign.currentStageIndex === 0) {
        this.campaign.scoutKills++;
        if (this.campaign.scoutKills >= 3) {
          this._advanceCampaignStage(player, callbacks);
        }
      }

      // 3. Ovçu Müqaviləsi Yoxlanışı
      if (this.bounty.active && !this.bounty.active.completed && !this.bounty.active.failed) {
        const b = this.bounty.active;
        if (b.type === 'kill_timer') {
          b.progress++;
          if (b.progress >= b.targetValue) {
            this._completeActiveBounty(player, callbacks);
          }
        } else if (b.type === 'weapon_master') {
          // Əgər silah dəyişilibsə qətli qeydə al
          if (b.weaponSwitched) {
            b.progress++;
            if (b.progress >= b.targetValue) {
              this._completeActiveBounty(player, callbacks);
            }
          }
        }
      }
    },

    // ========================================================================
    // OYUNÇU ZƏDƏ ALDIQDA (onPlayerDamaged)
    // ========================================================================
    onPlayerDamaged: function (amount) {
      // "Toxunulmaz Kölgə" müqaviləsini sıfırla
      if (this.bounty.active && this.bounty.active.type === 'no_damage' && !this.bounty.active.completed) {
        this.bounty.active.progress = 0.0;
        this._showFloatingText(
          this._worldStateRef && this._worldStateRef.player ? this._worldStateRef.player.x : 0,
          this._worldStateRef && this._worldStateRef.player ? this._worldStateRef.player.y - 30 : 0,
          '🛡 Toxunulmazlıq pozuldu!',
          '#ef4444'
        );
      }
    },

    // ========================================================================
    // RÜN OBELİSKİ AKTİVLƏŞDİKDƏ (onObeliskActivated)
    // ========================================================================
    onObeliskActivated: function (obelisk, worldState, callbacks) {
      this._worldStateRef = worldState;

      // Mərhələ 3: 3 Qədim Rün Obeliskini Aktivləşdir
      if (this.campaign.currentStageIndex === 2) {
        this.campaign.obelisksActivated++;
        const totalReq = 3;
        this._showFloatingText(
          obelisk.x,
          obelisk.y - 40,
          `🏛️ Rün Aktivləşdi! (${this.campaign.obelisksActivated}/${totalReq})`,
          '#38bdf8'
        );

        if (this.campaign.obelisksActivated >= totalReq) {
          this._advanceCampaignStage(worldState && worldState.player, callbacks);
        }
      }
    },

    // ========================================================================
    // BÖLGƏ BƏLƏDÇİSİ NPC İLƏ DANIŞILDIQDA (onNpcTalked)
    // ========================================================================
    onNpcTalked: function (npc, worldState, callbacks) {
      this._worldStateRef = worldState;

      // Mərhələ 1: Bələdçi ilə danışıq
      if (this.campaign.currentStageIndex === 0 && !this.campaign.npcTalked) {
        this.campaign.npcTalked = true;
        this._advanceCampaignStage(worldState && worldState.player, callbacks);
      }
    },

    // ========================================================================
    // SİLAH DƏYİŞDİRİLDİKDƏ (onWeaponSwitched)
    // ========================================================================
    onWeaponSwitched: function (weaponId) {
      if (this.bounty.active && this.bounty.active.type === 'weapon_master') {
        this.bounty.active.weaponSwitched = true;
      }
    },

    // ========================================================================
    // BOSS MƏĞLUB EDİLDİKDƏ (onBossDefeated)
    // ========================================================================
    onBossDefeated: function (boss, worldState, callbacks) {
      this._worldStateRef = worldState;

      if (this.campaign.currentStageIndex === 3) {
        this.campaign.bossDefeated = true;
        // Boss devrildi, indi növbəti mərhələ portaldan keçməkdir!
        this._triggerCelebrationBanner(
          '👑 BÖLGƏ HAKİMİ DEVİRLDİ!',
          'Astral Portal aktivləşdi! Zəfərə doğru addımlayın.',
          '+400 Qızıl, +30 Kristal, +150 Hunter XP',
          '🌀',
          '#ec4899'
        );
      }
    },

    // ========================================================================
    // QARŞILIQLI ƏLAQƏ CƏHDİ (tryInteract — [F] ilə Tale Qurbangahı)
    // ========================================================================
    tryInteract: function (player, worldState, callbacks) {
      if (!player) return false;

      // Ən yaxın istifadə edilməmiş Qurbangahı tap
      for (let i = 0; i < this.shrines.length; i++) {
        const shrine = this.shrines[i];
        if (!shrine.used) {
          const d = dist(player.x, player.y, shrine.x, shrine.y);
          if (d <= 90) {
            this._activateShrine(shrine, player, worldState, callbacks);
            return true;
          }
        }
      }

      return false;
    },

    // ========================================================================
    // OVÇU MÜQAVİLƏSİNİ DƏYİŞ VƏ YA BAŞLAT ([M] düyməsi)
    // ========================================================================
    cycleOrStartBounty: function (worldState) {
      this._startRandomBounty(true);

      // Səs effekti
      this._playSFX('quest');

      // Bildiriş ver
      if (this.bounty.active) {
        const b = this.bounty.active;
        this._triggerCelebrationBanner(
          `📜 YENİ OVÇU MÜQAVİLƏSİ [M]`,
          `${b.icon} ${b.title}: ${b.description}`,
          `Mükafat: +${b.gold} 🪙 ${b.crystals ? '+ ' + b.crystals + ' 💎' : ''} +${b.hunterXP} XP`,
          b.icon,
          '#f59e0b'
        );
      }
    },

    // ========================================================================
    // ƏN YAXIN QARŞILIQLI ƏLAQƏ OBYEKTİNİ AL (getNearestInteractable)
    // ========================================================================
    getNearestInteractable: function (player) {
      if (!player) return null;

      for (let i = 0; i < this.shrines.length; i++) {
        const shrine = this.shrines[i];
        if (!shrine.used) {
          const d = dist(player.x, player.y, shrine.x, shrine.y);
          if (d <= 90) {
            return {
              text: `[F] — ${shrine.name} (${shrine.bonusShort})`,
              key: 'F',
              type: 'shrine',
              data: shrine
            };
          }
        }
      }

      return null;
    },

    // ========================================================================
    // MİSSİYA VƏZİYYƏTİNİ AL (getMissionState)
    // ========================================================================
    getMissionState: function () {
      const stageInfo = this._getCurrentStageInfo();
      const hunterRank = this.getCurrentHunterRank();
      const target = this._getObjectiveTarget(
        this._worldStateRef && this._worldStateRef.player,
        this._worldStateRef
      );

      return {
        mainMission: {
          regionIndex: this.campaign.currentRegionIndex,
          regionName: REGION_NAMES[this.campaign.currentRegionIndex] || 'Naməlum Bölgə',
          stageIndex: this.campaign.currentStageIndex,
          stageTitle: stageInfo.title,
          stageDesc: stageInfo.description,
          progress: stageInfo.progress,
          target: stageInfo.target,
          rewardText: stageInfo.rewardText,
          isCompleted: this.campaign.isCompleted
        },
        activeBounty: this.bounty.active,
        hunterRank: hunterRank,
        buffState: {
          bloodActive: this.buffs.bloodDamageTimer > 0,
          bloodTimer: this.buffs.bloodDamageTimer,
          frenzyActive: this.buffs.frenzyTimer > 0,
          frenzyTimer: this.buffs.frenzyTimer
        },
        objectiveTarget: target,
        defenseZone: this.campaign.defenseZone
      };
    },

    // ========================================================================
    // STATİSTİKA ÇARPANLARINI AL (getStatMultipliers)
    // ========================================================================
    getStatMultipliers: function () {
      const rank = this.getCurrentHunterRank();
      let damageMult = 1.0 + (rank.damageBonus || 0);
      let goldMult = 1.0 + (rank.goldBonus || 0);
      let speedMult = 1.0;
      let critBonus = 0.0;

      // Qan Qurbangahı Buff-u (+40% Zərər)
      if (this.buffs.bloodDamageTimer > 0) {
        damageMult *= this.buffs.bloodDamageMult;
      }

      // İldırım Qəzəbi Buff-u (+35% Sürət, 100% Kritik)
      if (this.buffs.frenzyTimer > 0) {
        speedMult *= this.buffs.frenzySpeedMult;
        critBonus += this.buffs.frenzyCritBonus;
      }

      return {
        damageMult: damageMult,
        speedMult: speedMult,
        critBonus: critBonus,
        goldMult: goldMult
      };
    },

    // ========================================================================
    // OVÇU RÜTBƏSİ İDARƏETMƏSİ (Hunter Prestige Rank Methods)
    // ========================================================================
    getCurrentHunterRank: function () {
      const xp = this.prestige.hunterXP;
      let current = HUNTER_RANKS[0];

      for (let i = 0; i < HUNTER_RANKS.length; i++) {
        if (xp >= HUNTER_RANKS[i].minXP) {
          current = HUNTER_RANKS[i];
        }
      }

      const nextXP = current.nextXP;
      const progressPercent = nextXP === Infinity
        ? 1.0
        : clamp((xp - current.minXP) / (nextXP - current.minXP), 0, 1);

      return {
        id: current.id,
        name: current.name,
        badge: current.badge,
        currentXP: xp,
        minXP: current.minXP,
        nextXP: nextXP,
        progressPercent: progressPercent,
        damageBonus: current.damageBonus,
        goldBonus: current.goldBonus,
        color: current.color,
        glow: current.glow
      };
    },

    addHunterXP: function (amount, callbacks) {
      if (!amount || amount <= 0) return;

      const oldRank = this.getCurrentHunterRank();
      this.prestige.hunterXP += Math.round(amount);
      this._savePrestigeXP();

      const newRank = this.getCurrentHunterRank();

      // Rütbə artımı baş verdisə böyük şou başlat!
      if (newRank.id > oldRank.id) {
        this._playSFX('levelUp');
        this._triggerCelebrationBanner(
          `🎖️ OVÇU RÜTBƏSİ YÜKSƏLDİ!`,
          `${newRank.badge} ${newRank.name} rütbəsinə ucaldınız!`,
          `Bonus: +${Math.round(newRank.damageBonus * 100)}% Zərər və Qızıl!`,
          newRank.badge,
          newRank.color
        );
      }
    },

    _loadPrestigeXP: function () {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const val = localStorage.getItem(this.prestige.storageKey);
          if (val !== null) {
            this.prestige.hunterXP = parseInt(val, 10) || 0;
          }
        }
      } catch (_) {}
    },

    _savePrestigeXP: function () {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(this.prestige.storageKey, this.prestige.hunterXP.toString());
        }
      } catch (_) {}
    },

    // ========================================================================
    // KAMPANİYA MƏRHƏLƏ MƏNTİQİ (Campaign Logic & Progress)
    // ========================================================================
    _getCurrentStageInfo: function () {
      const sIdx = this.campaign.currentStageIndex;
      const rIdx = this.campaign.currentRegionIndex;

      switch (sIdx) {
        case 0:
          return {
            title: '1. Bələdçi ilə Görüş və ya Kəşfiyyat',
            description: 'Bölgə bələdçisi NPC ilə danış ([F]) VƏ YA ilk 3 kəşfiyyatçı düşməni məhv et!',
            progress: this.campaign.npcTalked ? 3 : this.campaign.scoutKills,
            target: 3,
            rewardText: '+80 🪙 | +40 XP'
          };
        case 1:
          return {
            title: '2. Qədim Ruh Dairəsini Qoru!',
            description: '🛡 Müdafiə Rün Dairəsinə daxil ol və 10 saniyə mövqeni qoru!',
            progress: Math.min(10, Math.floor(this.campaign.defenseZone.progress)),
            target: 10,
            rewardText: '+150 🪙 | +10 💎 | +60 XP | 🎴 Relikt'
          };
        case 2:
          return {
            title: '3. 3 Qədim Rün Obeliskini Aktivləşdir',
            description: 'Bölgədəki 3 Obeliski tap və [F] ilə aktivləşdir.',
            progress: this.campaign.obelisksActivated,
            target: 3,
            rewardText: '+200 🪙 | +15 💎 | +80 XP'
          };
        case 3:
          return {
            title: this.campaign.bossDefeated ? '4. Astral Portaldan Keç' : '4. Bölgə Hakimi Boss-u Məhv Et',
            description: this.campaign.bossDefeated
              ? 'Açılan Astral Portala daxil ol və zəfəri tamamla!'
              : 'Dəhşətli Boss-u məğlub edərək səltənəti qurtar!',
            progress: this.campaign.bossDefeated ? 1 : 0,
            target: 1,
            rewardText: '+400 🪙 | +30 💎 | +150 XP'
          };
        default:
          return {
            title: 'Hekayə Kampaniyası Tamamlandı!',
            description: 'Bütün bölgələr qaranlıqdan azad edildi.',
            progress: 1,
            target: 1,
            rewardText: '👑 Əbədi Zəfər'
          };
      }
    },

    _advanceCampaignStage: function (player, callbacks) {
      const curStage = this.campaign.currentStageIndex;

      // Mükafatları ver
      if (curStage === 0) {
        this._grantRewards(80, 0, 40, callbacks);
        this._playSFX('quest');
        this._triggerCelebrationBanner('🏆 MƏRHƏLƏ TAMAMLANDI!', 'Kəşfiyyat uğurla başa çatdı!', '+80 Qızıl, +40 Hunter XP', '✅', '#4ade80');
        this.campaign.currentStageIndex = 1;
        // Müdafiə Dairəsini aktivləşdir
        this._startDefenseZone(player);
      } else if (curStage === 1) {
        this._grantRewards(150, 10, 60, callbacks);
        this._playSFX('levelUp');
        // Relikt seçimi ver
        if (callbacks && typeof callbacks.onGrantRelicDraft === 'function') {
          callbacks.onGrantRelicDraft();
        } else if (typeof window !== 'undefined' && window.GameUI && typeof window.GameUI.showRelicDraftModal === 'function') {
          window.GameUI.showRelicDraftModal();
        }
        this._triggerCelebrationBanner('🛡️ MÜDAFİƏ UĞURLA BAŞA ÇATDI!', 'Qədim Ruh Dairəsi qorundu! Relikt seçimi qazandınız!', '+150 Qızıl, +10 Kristal, +60 Hunter XP', '🛡️', '#38bdf8');
        this.campaign.currentStageIndex = 2;
      } else if (curStage === 2) {
        this._grantRewards(200, 15, 80, callbacks);
        this._playSFX('quest');
        this._triggerCelebrationBanner('🏛️ 3 RÜN OBELİSKİ AKTİVLƏŞDİ!', 'Möhürlər sındırıldı! Boss arenaya qədəm qoyur!', '+200 Qızıl, +15 Kristal, +80 Hunter XP', '⚡', '#fbbf24');
        this.campaign.currentStageIndex = 3;
      } else if (curStage === 3) {
        this._grantRewards(400, 30, 150, callbacks);
        this._playSFX('portal');
        this._triggerCelebrationBanner('👑 BÖLGƏ TAMAMİLƏ FƏTH EDİLDİ!', `${REGION_NAMES[this.campaign.currentRegionIndex]} azad olundu!`, '+400 Qızıl, +30 Kristal, +150 Hunter XP', '🌟', '#ec4899');
        this.campaign.isCompleted = true;
      }
    },

    _startDefenseZone: function (player) {
      const pX = player ? player.x : 1000;
      const pY = player ? player.y : 1000;

      // Oyunçudan təxminən 320px aralıda təhlükəsiz koordinat tap
      const angle = Math.random() * Math.PI * 2;
      const targetDist = 320;
      let targetX = pX + Math.cos(angle) * targetDist;
      let targetY = pY + Math.sin(angle) * targetDist;

      // Xəritə sərhədlərində saxla
      targetX = clamp(targetX, 250, 2150);
      targetY = clamp(targetY, 250, 2150);

      this.campaign.defenseZone = {
        active: true,
        x: targetX,
        y: targetY,
        radius: 110,
        progress: 0.0,
        duration: 10.0,
        isPlayerInside: false,
        spawnTimer: 0.0,
        spawnInterval: 3.0,
        completed: false,
        pulseAngle: 0.0
      };

      this._triggerCelebrationBanner(
        '🛡️ MÜDAFİƏ RÜN DAİRƏSİ PEYDA OLDU!',
        'Xəritədəki işıqlı dairəyə daxil ol və mövqeni 10 saniyə qoru!',
        '+150 🪙 | +10 💎 | Relikt Seçimi',
        '🛡️',
        '#00e5ff'
      );
    },

    _updateCampaignLogic: function (dt, player, worldState, callbacks) {
      if (!player) return;

      // Mərhələ 2: Müdafiə Dairəsi Məntiqi
      if (this.campaign.currentStageIndex === 1 && this.campaign.defenseZone.active) {
        const zone = this.campaign.defenseZone;
        zone.pulseAngle += dt * 2.5;

        const d = dist(player.x, player.y, zone.x, zone.y);
        zone.isPlayerInside = (d <= zone.radius);

        if (zone.isPlayerInside) {
          zone.progress += dt;
          zone.spawnTimer += dt;

          // Hər 3 saniyədən bir 2 hücumçu düşmən spawn et
          if (zone.spawnTimer >= zone.spawnInterval) {
            zone.spawnTimer = 0.0;
            this._spawnDefenseAttackers(zone.x, zone.y, worldState, callbacks);
          }

          // 10 saniyə tamamlandı!
          if (zone.progress >= zone.duration) {
            zone.completed = true;
            zone.active = false;

            // Dairə partlayışı effekti
            this._spawnCircleBlast(zone.x, zone.y, zone.radius, worldState);

            // Mərhələni bitir
            this._advanceCampaignStage(player, callbacks);
          }
        }
      }
    },

    _spawnDefenseAttackers: function (centerX, centerY, worldState, callbacks) {
      const types = ['goblin', 'wolf', 'skeleton'];
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 200 + Math.random() * 80;
        const sx = centerX + Math.cos(angle) * spawnDist;
        const sy = centerY + Math.sin(angle) * spawnDist;
        const enemyType = types[Math.floor(Math.random() * types.length)];

        if (callbacks && typeof callbacks.onSpawnEnemy === 'function') {
          callbacks.onSpawnEnemy(enemyType, sx, sy);
        } else if (typeof window !== 'undefined' && window.GameLevels && typeof window.GameLevels.createEnemy === 'function' && worldState && worldState.enemies) {
          const rIdx = this.campaign.currentRegionIndex;
          const e = window.GameLevels.createEnemy(enemyType, sx, sy, rIdx);
          if (e) worldState.enemies.push(e);
        }
      }

      this._playSFX('dash');
    },

    _spawnCircleBlast: function (x, y, radius, worldState) {
      this._playSFX('explosion');

      if (typeof window !== 'undefined' && window.GameVFX) {
        if (typeof window.GameVFX.spawnExplosion === 'function') {
          window.GameVFX.spawnExplosion(x, y, '#00e5ff', 35, radius * 1.3);
        }
        if (typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(x, y - 40, '⚡ RÜN MÜDAFİƏSİ TAMAMLANDI!', '#00e5ff', 24);
        }
      }

      // Ətrafdakı düşmənləri itələ və zədələ
      if (worldState && worldState.enemies) {
        for (let i = 0; i < worldState.enemies.length; i++) {
          const e = worldState.enemies[i];
          if (e && e.hp > 0) {
            const d = dist(x, y, e.x, e.y);
            if (d <= radius * 1.6) {
              e.hp -= 60;
              const angle = Math.atan2(e.y - y, e.x - x);
              e.vx = Math.cos(angle) * 350;
              e.vy = Math.sin(angle) * 350;
            }
          }
        }
      }
    },

    // ========================================================================
    // TALE QURBANGAHLARI MƏNTİQİ (Mystery Shrines Logic)
    // ========================================================================
    _spawnRegionalShrines: function (regionIndex, worldState) {
      this.shrines = [];

      // Hər bölgə üçün 2 fərqli xüsusi Tale Qurbangahı
      const shrineConfigs = [
        // Region 0: Forest
        [
          { type: 'blood', x: 800, y: 1550, name: 'Qan və Qüdrət Qurbangahı', bonusShort: '-15% Can ➔ +40% Zərər (25s) & Relikt' },
          { type: 'fortune', x: 1750, y: 850, name: 'Qızıl Bəxt Qurbangahı', bonusShort: '+180 🪙 +15 💎 +50 Rage' }
        ],
        // Region 1: Cavern
        [
          { type: 'frenzy', x: 750, y: 920, name: 'İldırım Qəzəbi Qurbangahı', bonusShort: '18s +35% Sürət & 100% Kritik' },
          { type: 'blood', x: 1880, y: 1650, name: 'Qan və Qüdrət Qurbangahı', bonusShort: '-15% Can ➔ +40% Zərər (25s) & Relikt' }
        ],
        // Region 2: Citadel
        [
          { type: 'fortune', x: 880, y: 1980, name: 'Qızıl Bəxt Qurbangahı', bonusShort: '+180 🪙 +15 💎 +50 Rage' },
          { type: 'frenzy', x: 1850, y: 1250, name: 'İldırım Qəzəbi Qurbangahı', bonusShort: '18s +35% Sürət & 100% Kritik' }
        ]
      ];

      const list = shrineConfigs[regionIndex] || shrineConfigs[0];
      for (let i = 0; i < list.length; i++) {
        const cfg = list[i];
        this.shrines.push({
          id: `shrine_${regionIndex}_${i}`,
          type: cfg.type,
          name: cfg.name,
          bonusShort: cfg.bonusShort,
          x: cfg.x,
          y: cfg.y,
          radius: 36,
          used: false,
          color: cfg.type === 'blood' ? '#ef4444' : (cfg.type === 'fortune' ? '#fbbf24' : '#06b6d4'),
          auraColor: cfg.type === 'blood' ? 'rgba(239, 68, 68, 0.4)' : (cfg.type === 'fortune' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(6, 182, 212, 0.4)')
        });
      }
    },

    _activateShrine: function (shrine, player, worldState, callbacks) {
      shrine.used = true;

      // 1. Qan və Qüdrət Qurbangahı
      if (shrine.type === 'blood') {
        const hpLoss = Math.max(1, Math.floor(player.hp * 0.15));
        player.hp = Math.max(1, player.hp - hpLoss); // Ölümcül olmur
        this.buffs.bloodDamageTimer = 25.0; // 25 saniyəlik +40% Zərər

        this._playSFX('spell');
        this._showFloatingText(player.x, player.y - 30, `🩸 -${hpLoss} Can ➔ +40% ZƏRƏR (25s)!`, '#ef4444');

        // Pulsuz Relikt Seçimi
        if (callbacks && typeof callbacks.onGrantRelicDraft === 'function') {
          callbacks.onGrantRelicDraft();
        } else if (typeof window !== 'undefined' && window.GameUI && typeof window.GameUI.showRelicDraftModal === 'function') {
          window.GameUI.showRelicDraftModal();
        }

        this._triggerCelebrationBanner(
          '🩸 QAN VƏ QÜDRƏT QURBANGAHI!',
          'Qanın gücü ilə silahların alovlandı! +40% Zərər & Pulsuz Relikt!',
          '+40% Zərər (25s) | 🎴 Relikt Seçimi',
          '🩸',
          '#ef4444'
        );
      }
      // 2. Qızıl Bəxt Qurbangahı
      else if (shrine.type === 'fortune') {
        this._grantRewards(180, 15, 0, callbacks);
        this._addPlayerRage(50);
        this._playSFX('coin');

        this._showFloatingText(player.x, player.y - 30, '+180 Qızıl, +15 Kristal, +50 Rage!', '#fbbf24');

        this._triggerCelebrationBanner(
          '⛩️ QIZIL BƏXT QURBANGAHI!',
          'Qədim sərvət sandığı açıldı! Zənginlik və qəzəb axını!',
          '+180 🪙 | +15 💎 | +50 Ultimate Rage',
          '💰',
          '#fbbf24'
        );
      }
      // 3. İldırım Qəzəbi Qurbangahı
      else if (shrine.type === 'frenzy') {
        this.buffs.frenzyTimer = 18.0; // 18s +35% Sürət və 100% Kritik
        this._playSFX('lightningChain');

        this._showFloatingText(player.x, player.y - 30, '⚡ İldırım Sürəti & 100% Kritik (18s)!', '#06b6d4');

        this._triggerCelebrationBanner(
          '⚡ İLDIRIM QƏZƏBİ QURBANGAHI!',
          'İldırımın fırtınası bədəninə axdı! 18 saniyə fövqəltəbii güc!',
          '+35% Sürət | 100% Kritik Zərbə',
          '⚡',
          '#06b6d4'
        );
      }

      // Xəritədə partlayış effekti
      if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnExplosion === 'function') {
        window.GameVFX.spawnExplosion(shrine.x, shrine.y, shrine.color, 25, 75);
      }

      // "Tale Axtarışı" Müqaviləsini yoxla
      if (this.bounty.active && this.bounty.active.type === 'shrine_hunter' && !this.bounty.active.completed) {
        this.bounty.active.progress++;
        if (this.bounty.active.progress >= this.bounty.active.targetValue) {
          this._completeActiveBounty(player, callbacks);
        }
      }
    },

    // ========================================================================
    // DİNAMİK VAXTLI OVÇU MÜQAVİLƏSİ MƏNTİQİ (Bounty Contracts Logic)
    // ========================================================================
    _startRandomBounty: function (forceNext) {
      // Mövcuddan fərqli təsadüfi şablon seç
      let curType = this.bounty.active ? this.bounty.active.type : '';
      let available = BOUNTY_TEMPLATES.filter(t => t.type !== curType);
      if (available.length === 0) available = BOUNTY_TEMPLATES;

      const template = available[Math.floor(Math.random() * available.length)];

      this.bounty.active = {
        type: template.type,
        title: template.title,
        description: template.description,
        icon: template.icon,
        duration: template.duration,
        timer: template.duration,
        progress: 0,
        targetValue: template.targetValue,
        gold: template.gold,
        crystals: template.crystals,
        rage: template.rage,
        hunterXP: template.hunterXP,
        completed: false,
        failed: false,
        weaponSwitched: false
      };

      this.bounty.cooldownTimer = 0;
    },

    _updateBountyLogic: function (dt, player, worldState, callbacks) {
      // Aktiv müqavilə yoxdursa avto-başlatma taymerini say
      if (!this.bounty.active) {
        this.bounty.cooldownTimer += dt;
        if (this.bounty.cooldownTimer >= this.bounty.nextAutoStartDelay) {
          this._startRandomBounty();
        }
        return;
      }

      const b = this.bounty.active;
      if (b.completed || b.failed) {
        this.bounty.cooldownTimer += dt;
        if (this.bounty.cooldownTimer >= this.bounty.nextAutoStartDelay) {
          this._startRandomBounty();
        }
        return;
      }

      // Vaxtı azalt
      b.timer -= dt;

      // "Toxunulmaz Kölgə" müqaviləsi: sağ qaldıqca tərəqqi artır
      if (b.type === 'no_damage') {
        b.progress += dt;
        if (b.progress >= b.targetValue) {
          this._completeActiveBounty(player, callbacks);
          return;
        }
      }

      // "Stil Ustası" müqaviləsi: Kombo dərəcəsini yoxla
      if (b.type === 'combo_reach') {
        if (typeof window !== 'undefined' && window.GameEvents && window.GameEvents.combo) {
          const comboHits = window.GameEvents.combo.count || 0;
          if (comboHits > b.progress) b.progress = comboHits;
          if (comboHits >= b.targetValue) {
            this._completeActiveBounty(player, callbacks);
            return;
          }
        }
      }

      // Vaxt bitibsə
      if (b.timer <= 0) {
        b.failed = true;
        b.timer = 0;
        this.bounty.cooldownTimer = 0;
        this._showFloatingText(
          player ? player.x : 0,
          player ? player.y - 30 : 0,
          '⏳ Ovçu Müqaviləsinin vaxtı bitdi!',
          '#94a3b8'
        );
      }
    },

    _completeActiveBounty: function (player, callbacks) {
      const b = this.bounty.active;
      if (!b || b.completed) return;

      b.completed = true;
      this.bounty.totalCompleted++;
      this.bounty.cooldownTimer = 0; // 8 saniyə sonra yeni müqavilə gələcək

      // Mükafatları payla
      this._grantRewards(b.gold, b.crystals, b.hunterXP, callbacks);
      if (b.rage > 0) this._addPlayerRage(b.rage);

      this._playSFX('quest');

      // Dopamin Elanı
      this._triggerCelebrationBanner(
        `🎯 OVÇU MÜQAVİLƏSİ TAMAMLANDI!`,
        `${b.icon} ${b.title} uğurla başa çatdı!`,
        `+${b.gold} 🪙 ${b.crystals ? '+ ' + b.crystals + ' 💎' : ''} +${b.hunterXP} XP`,
        '🎯',
        '#f59e0b'
      );
    },

    // ========================================================================
    // SƏSLİ VƏ VİZUAL "KILL-STREAK" DOPAMİN SİSTEMİ
    // ========================================================================
    _registerKillStreakKill: function (enemy, player, callbacks) {
      if (this.killStreak.timer > 0) {
        this.killStreak.count++;
      } else {
        this.killStreak.count = 1;
      }
      this.killStreak.timer = this.killStreak.maxTimer;

      const streak = this.killStreak.count;
      if (streak > this.killStreak.highestRunStreak) {
        this.killStreak.highestRunStreak = streak;
      }

      // Milestonlar
      if (streak === 2) {
        this._grantRewards(15, 0, 10, callbacks);
        this._playSFX('hit');
        this._triggerKillStreakBanner('🔥 İKİLİ QƏTL!', '+15 Qızıl & +10 XP', '#fbbf24', 1.15);
      } else if (streak === 3) {
        this._grantRewards(30, 0, 15, callbacks);
        this._playSFX('comboSSS');
        this._triggerKillStreakBanner('⚡ ÜÇLÜ QƏTL!', '+30 Qızıl & +15 XP', '#f97316', 1.25);
      } else if (streak === 4) {
        this._grantRewards(45, 0, 20, callbacks);
        this._playSFX('comboSSS');
        this._triggerKillStreakBanner('💥 DÖRDLÜ QIRĞIN!', '+45 Qızıl & +20 XP', '#ef4444', 1.35);
      } else if (streak === 5) {
        this._grantRewards(70, 0, 30, callbacks);
        this._addPlayerRage(20);
        this._playSFX('comboSSS');
        this._triggerKillStreakBanner('💀 QANLI QASIRĞA!', '+70 Qızıl, +20 Rage & +30 XP', '#dc2626', 1.45);
      } else if (streak >= 7 && streak % 2 === 1) {
        this._grantRewards(150, 5, 50, callbacks);
        this._addPlayerRage(40);
        this._playSFX('levelUp');
        // Relikt seçimi ver
        if (callbacks && typeof callbacks.onGrantRelicDraft === 'function') {
          callbacks.onGrantRelicDraft();
        } else if (typeof window !== 'undefined' && window.GameUI && typeof window.GameUI.showRelicDraftModal === 'function') {
          window.GameUI.showRelicDraftModal();
        }
        this._triggerKillStreakBanner('👑 AETHER TANRISI!', `🔥 ${streak} QƏTL! +150 Qızıl, Relikt & +50 XP!`, '#ff007f', 1.6);
      }
    },

    // ========================================================================
    // KÖMƏKÇİ PAYLAMA VƏ SƏS METODLARI
    // ========================================================================
    _grantRewards: function (gold, crystals, hunterXP, callbacks) {
      const mults = this.getStatMultipliers();
      const actualGold = Math.round((gold || 0) * (mults.goldMult || 1.0));
      const actualCrystals = crystals || 0;
      const actualXP = hunterXP || 0;

      // Qızıl və Kristal
      if (typeof window !== 'undefined' && window.GameProgression) {
        if (actualGold > 0 && typeof window.GameProgression.addGold === 'function') {
          window.GameProgression.addGold(actualGold);
        }
        if (actualCrystals > 0 && typeof window.GameProgression.addCrystals === 'function') {
          window.GameProgression.addCrystals(actualCrystals);
        }
      }

      // Ovçu Rütbəsi XP-si
      if (actualXP > 0) {
        this.addHunterXP(actualXP, callbacks);
      }
    },

    _addPlayerRage: function (amount) {
      if (typeof window !== 'undefined' && window.GameCompanions && typeof window.GameCompanions.addRage === 'function') {
        window.GameCompanions.addRage(amount);
      }
    },

    _playSFX: function (type) {
      if (typeof window !== 'undefined' && window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX(type);
      }
    },

    _showFloatingText: function (x, y, text, color) {
      if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
        window.GameVFX.spawnFloatingText(x, y, text, color || '#fbbf24', 18);
      }
    },

    _triggerKillStreakBanner: function (text, subtext, color, scale) {
      const b = this.uiBanners.streak;
      b.text = text;
      b.subtext = subtext;
      b.color = color || '#fbbf24';
      b.scale = scale || 1.2;
      b.alpha = 1.0;
      b.timer = b.maxTimer;
    },

    _triggerCelebrationBanner: function (title, subtitle, rewardText, badge, color) {
      const b = this.uiBanners.celebration;
      b.title = title;
      b.subtitle = subtitle;
      b.rewardText = rewardText;
      b.badge = badge || '🏆';
      b.color = color || '#4ade80';
      b.timer = b.maxTimer;
      b.scale = 1.25;
    },

    _updateUIBanners: function (dt) {
      // Streak Banner
      const s = this.uiBanners.streak;
      if (s.timer > 0) {
        s.timer -= dt;
        const progress = s.timer / s.maxTimer;
        s.alpha = clamp(progress * 1.5, 0, 1);
        s.scale = 1.0 + Math.sin(progress * Math.PI) * 0.2;
      }

      // Celebration Banner
      const c = this.uiBanners.celebration;
      if (c.timer > 0) {
        c.timer -= dt;
        const p = c.timer / c.maxTimer;
        c.scale = 1.0 + Math.sin(p * Math.PI) * 0.15;
      }
    },

    // ========================================================================
    // 6. CANLI GPS HƏDƏF OXU (Objective Target Finder)
    // ========================================================================
    _getObjectiveTarget: function (player, worldState) {
      if (!player) return null;

      const sIdx = this.campaign.currentStageIndex;

      // Mərhələ 0: Bələdçi NPC və ya ən yaxın düşmən
      if (sIdx === 0) {
        if (!this.campaign.npcTalked && worldState && worldState.region && worldState.region.npcs && worldState.region.npcs.length > 0) {
          const npc = worldState.region.npcs[0];
          return { x: npc.x, y: npc.y, name: `${npc.name} (Bələdçi)`, type: 'npc' };
        }
        // Yoxsa ən yaxın düşmən
        return this._getNearestEnemy(player, worldState);
      }

      // Mərhələ 1: Müdafiə Rün Dairəsi
      if (sIdx === 1 && this.campaign.defenseZone.active) {
        return {
          x: this.campaign.defenseZone.x,
          y: this.campaign.defenseZone.y,
          name: '🛡 Müdafiə Dairəsi',
          type: 'defense'
        };
      }

      // Mərhələ 2: Ən yaxın aktivləşməmiş Obelisk
      if (sIdx === 2 && worldState && worldState.region && worldState.region.obelisks) {
        let nearestOb = null;
        let minDist = Infinity;
        for (let i = 0; i < worldState.region.obelisks.length; i++) {
          const ob = worldState.region.obelisks[i];
          if (!ob.activated) {
            const d = dist(player.x, player.y, ob.x, ob.y);
            if (d < minDist) {
              minDist = d;
              nearestOb = ob;
            }
          }
        }
        if (nearestOb) {
          return { x: nearestOb.x, y: nearestOb.y, name: `🏛️ ${nearestOb.name}`, type: 'obelisk' };
        }
      }

      // Mərhələ 3: Boss və ya Portal
      if (sIdx === 3) {
        if (!this.campaign.bossDefeated && worldState && worldState.boss && worldState.boss.hp > 0) {
          return { x: worldState.boss.x, y: worldState.boss.y, name: `👑 ${worldState.boss.name || 'Boss'}`, type: 'boss' };
        }
        if (worldState && worldState.region && worldState.region.portal) {
          const portal = worldState.region.portal;
          return { x: portal.x, y: portal.y, name: '🌀 Astral Portal', type: 'portal' };
        }
      }

      return null;
    },

    _getNearestEnemy: function (player, worldState) {
      if (!worldState || !worldState.enemies || worldState.enemies.length === 0) return null;

      let nearest = null;
      let minDist = Infinity;
      for (let i = 0; i < worldState.enemies.length; i++) {
        const e = worldState.enemies[i];
        if (e && e.hp > 0) {
          const d = dist(player.x, player.y, e.x, e.y);
          if (d < minDist) {
            minDist = d;
            nearest = e;
          }
        }
      }
      if (nearest) {
        return { x: nearest.x, y: nearest.y, name: `⚔️ ${nearest.name || 'Düşmən'}`, type: 'enemy' };
      }
      return null;
    },

    // ========================================================================
    // 7. CANVAS 2D RENDER — DÜNYA OBYEKTLƏRİ (renderWorldObjects)
    // QEYD: engine.js daxilində kamera transformu aktiv ikən çağırılır.
    // Əgər camera = {x: 0, y: 0} ötürülərsə birbaşa dünya koordinatlarında çəkilir.
    // ========================================================================
    renderWorldObjects: function (ctx, camera, time) {
      if (!ctx) return;

      const t = time || (this._pulseTimer || 0);
      const cx = (camera && typeof camera.x === 'number') ? camera.x : 0;
      const cy = (camera && typeof camera.y === 'number') ? camera.y : 0;

      // 1. 🛡 Müdafiə Rün Dairəsi (Stage 2)
      if (this.campaign.currentStageIndex === 1 && this.campaign.defenseZone.active) {
        this._renderDefenseZone(ctx, cx, cy, t);
      }

      // 2. ⛩ Tale Qurbangahları
      for (let i = 0; i < this.shrines.length; i++) {
        this._renderShrine(ctx, this.shrines[i], cx, cy, t);
      }

      // 3. 🎯 Canlı GPS Hədəf Oxu
      if (this._worldStateRef && this._worldStateRef.player) {
        this._renderCompassArrow(ctx, this._worldStateRef.player, cx, cy, t);
      }
    },

    _renderDefenseZone: function (ctx, cx, cy, time) {
      const zone = this.campaign.defenseZone;
      const x = zone.x - cx;
      const y = zone.y - cy;
      const r = zone.radius;
      const pct = clamp(zone.progress / zone.duration, 0, 1);

      ctx.save();

      // Qoruyucu xarici zəmin aurası
      const grad = ctx.createRadialGradient(x, y, 10, x, y, r);
      if (zone.isPlayerInside) {
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
        grad.addColorStop(0.7, 'rgba(0, 229, 255, 0.12)');
        grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
      } else {
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
        grad.addColorStop(0.7, 'rgba(239, 68, 68, 0.08)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Fırlanan rün xarici halqası
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(zone.pulseAngle);
      ctx.strokeStyle = zone.isPlayerInside ? 'rgba(0, 229, 255, 0.65)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8, 4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Dolma faizi dairəsi (Progress Arc)
      ctx.strokeStyle = zone.isPlayerInside ? '#00e5ff' : '#f59e0b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();

      // Mərkəzi parlayan rün simvolu
      ctx.fillStyle = zone.isPlayerInside ? '#00e5ff' : '#ef4444';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', x, y);

      // Üst mətni
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      const text = zone.isPlayerInside
        ? `🛡️ MÖVQENİ QORU! (${Math.round(pct * 100)}%)`
        : '⚠️ MÜDAFİƏ DAİRƏSİNƏ GİR!';
      ctx.fillText(text, x, y - r - 16);

      ctx.restore();
    },

    _renderShrine: function (ctx, shrine, cx, cy, time) {
      const x = shrine.x - cx;
      const y = shrine.y - cy;
      const r = shrine.radius;

      ctx.save();

      // Qurbangah sütununun kölgəsi
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x, y + 14, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Əgər istifadə edilibsə sönmüş görünüş
      if (shrine.used) {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛩️', x, y);

        ctx.font = '10px sans-serif';
        ctx.fillText('(Tükəndi)', x, y + r + 10);
        ctx.restore();
        return;
      }

      // Aktiv parıltı aurası
      const pulse = Math.sin(time * 3 + x) * 4;
      const auraGrad = ctx.createRadialGradient(x, y, 4, x, y, r + 18 + pulse);
      auraGrad.addColorStop(0, shrine.auraColor);
      auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(x, y, r + 18 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Daş sütun (Hexagonal plinth)
      ctx.strokeStyle = shrine.color;
      ctx.lineWidth = 3;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + time * 0.4;
        const px = x + Math.cos(a) * (r * 0.7);
        const py = y + Math.sin(a) * (r * 0.7);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Üzən parlayan kristal (Floating Crystal)
      const floatY = y - 10 + Math.sin(time * 3.5) * 6;
      ctx.fillStyle = shrine.color;
      ctx.shadowColor = shrine.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(x, floatY - 14);
      ctx.lineTo(x + 10, floatY);
      ctx.lineTo(x, floatY + 14);
      ctx.lineTo(x - 10, floatY);
      ctx.closePath();
      ctx.fill();

      // Ad və İkona
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#000000';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shrine.name, x, y - r - 18);

      // Yaxınlaşdıqda qarşılıqlı əlaqə promptu
      if (this._worldStateRef && this._worldStateRef.player) {
        const d = dist(this._worldStateRef.player.x, this._worldStateRef.player.y, shrine.x, shrine.y);
        if (d <= 95) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`[F] ⛩️ İSTİFADƏ ET (${shrine.bonusShort})`, x, y + r + 16);
        }
      }

      ctx.restore();
    },

    _renderCompassArrow: function (ctx, player, cx, cy, time) {
      const target = this._getObjectiveTarget(player, this._worldStateRef);
      if (!target) return;

      const px = player.x - cx;
      const py = player.y - cy;
      const d = dist(player.x, player.y, target.x, target.y);

      // Oyunçu hədəfə çox yaxındırsa ox çəkməyə ehtiyac yoxdur
      if (d <= 55) return;

      const angle = Math.atan2(target.y - player.y, target.x - player.x);
      const orbitR = 58; // Oyunçunun ətrafında 58px radiuslu orbit halqası
      const ax = px + Math.cos(angle) * orbitR;
      const ay = py + Math.sin(angle) * orbitR;

      ctx.save();

      // Orbit fırlanan rün halqası
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(px, py, orbitR, 0, Math.PI * 2);
      ctx.stroke();

      // Hədəf oxu (Chevron Golden-Emerald Arrow)
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);

      const pulse = Math.sin(time * 6) * 2;
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(10 + pulse, 0);
      ctx.lineTo(-6, -8);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-6, 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Məsafə və hədəf mətni (oxun yanında şık etiket)
      const meters = Math.round(d / 10);
      const labelText = `${meters}m • ${target.name}`;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 5;

      const textDist = orbitR + 24;
      const tx = px + Math.cos(angle) * textDist;
      const ty = py + Math.sin(angle) * textDist;
      ctx.fillText(labelText, tx, ty);

      ctx.restore();
    },

    // ========================================================================
    // 8. CANVAS 2D RENDER — MISSION & BOUNTY HUD (renderMissionHUD)
    // Ekran koordinatlarında (Screen Space) çəkilir.
    // ========================================================================
    renderMissionHUD: function (ctx, canvasWidth, canvasHeight) {
      if (!ctx) return;

      const w = canvasWidth || 1280;
      const h = canvasHeight || 720;

      ctx.save();

      // 1. Ekranın Yuxarı-Mərkəzi: Kill-Streak Dopamin Banneri
      this._renderStreakBannerHUD(ctx, w, h);

      // 2. Ekranın Yuxarı-Mərkəzi: Təntənəli Missiya/Rank Qələbə Banneri
      this._renderCelebrationBannerHUD(ctx, w, h);

      // 3. Sağ-Yuxarı: Kompakt və Şık "📜 ƏSAS MİSSİYA & OVÇU MÜQAVİLƏSİ [M]" Paneli
      this._renderTopRightMissionCard(ctx, w, h);

      ctx.restore();
    },

    _renderStreakBannerHUD: function (ctx, w, h) {
      const s = this.uiBanners.streak;
      if (s.timer <= 0 || s.alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.translate(w / 2, 85);
      ctx.scale(s.scale, s.scale);

      // Qaranlıq şüşə zəmin
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16;

      ctx.beginPath();
      drawRoundRect(ctx, -160, -32, 320, 64, 12);
      ctx.fill();
      ctx.stroke();

      // Başlıq mətni
      ctx.fillStyle = s.color;
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.text, 0, -4);

      // Alt başlıq
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(s.subtext, 0, 18);

      ctx.restore();
    },

    _renderCelebrationBannerHUD: function (ctx, w, h) {
      const c = this.uiBanners.celebration;
      if (c.timer <= 0) return;

      const alpha = clamp(c.timer / 0.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, 140);
      ctx.scale(c.scale, c.scale);

      // Premium Parlaq Zəmin
      const grad = ctx.createLinearGradient(-210, 0, 210, 0);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.0)');
      grad.addColorStop(0.15, 'rgba(15, 23, 42, 0.95)');
      grad.addColorStop(0.85, 'rgba(15, 23, 42, 0.95)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      drawRoundRect(ctx, -210, -36, 420, 72, 8);
      ctx.fill();

      // Haşiyə xətti
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-180, 36);
      ctx.lineTo(180, 36);
      ctx.stroke();

      // Başlıq
      ctx.fillStyle = c.color;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${c.badge} ${c.title}`, 0, -12);

      // Alt Başlıq
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(c.subtitle, 0, 8);

      // Mükafat etiketi
      if (c.rewardText) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Mükafat: ${c.rewardText}`, 0, 26);
      }

      ctx.restore();
    },

    _renderTopRightMissionCard: function (ctx, w, h) {
      const cardW = 285;
      const cardX = 18;
      const cardY = Math.max(300, h - 330);

      ctx.save();

      // 1. Kart Zəmini (Frosted Glass)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      drawRoundRect(ctx, cardX, cardY, cardW, 168, 10);
      ctx.fill();
      ctx.stroke();

      // --- A. ƏSAS HEKAYƏ MİSSİYASI ---
      const stageInfo = this._getCurrentStageInfo();
      const sIdx = this.campaign.currentStageIndex;

      // Mərhələ Başlığı
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`📜 BÖLGƏ ${this.campaign.currentRegionIndex + 1} • MƏRHƏLƏ ${sIdx + 1}/4`, cardX + 12, cardY + 20);

      // Missiya Adı
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(stageInfo.title, cardX + 12, cardY + 38);

      // Tərəqqi Barı
      const barX = cardX + 12;
      const barY = cardY + 46;
      const barW = cardW - 24;
      const barH = 6;
      const pct = clamp(stageInfo.progress / stageInfo.target, 0, 1);

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      drawRoundRect(ctx, barX, barY, barW, barH, 3);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      drawRoundRect(ctx, barX, barY, barW * pct, barH, 3);
      ctx.fill();

      // Mükafat və Tərəqqi Mətni
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText(`Tərəqqi: ${stageInfo.progress}/${stageInfo.target}`, cardX + 12, cardY + 65);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(stageInfo.rewardText, cardX + cardW - 12, cardY + 65);

      // Ayırıcı Xətt
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cardX + 12, cardY + 73);
      ctx.lineTo(cardX + cardW - 12, cardY + 73);
      ctx.stroke();

      // --- B. VAXTLI OVÇU MÜQAVİLƏSİ [M] ---
      ctx.textAlign = 'left';
      if (this.bounty.active) {
        const b = this.bounty.active;
        const isFinished = b.completed || b.failed;

        ctx.fillStyle = isFinished ? '#94a3b8' : '#f59e0b';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`🎯 OVÇU MÜQAVİLƏSİ [M]`, cardX + 12, cardY + 90);

        // Kvadrat İkona + Ad
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${b.icon} ${b.title}`, cardX + 12, cardY + 107);

        // Taymer və ya Nəticə
        ctx.textAlign = 'right';
        if (b.completed) {
          ctx.fillStyle = '#4ade80';
          ctx.fillText('✅ TAMAMLANDI', cardX + cardW - 12, cardY + 90);
        } else if (b.failed) {
          ctx.fillStyle = '#ef4444';
          ctx.fillText('⏳ BİTDİ', cardX + cardW - 12, cardY + 90);
        } else {
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`⏱️ ${Math.ceil(b.timer)}s`, cardX + cardW - 12, cardY + 90);
        }

        // Bounty Tərəqqi Barı
        ctx.textAlign = 'left';
        const bPct = clamp(b.progress / b.targetValue, 0, 1);
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        drawRoundRect(ctx, barX, cardY + 114, barW, barH, 3);
        ctx.fill();

        ctx.fillStyle = b.completed ? '#4ade80' : '#f59e0b';
        ctx.beginPath();
        drawRoundRect(ctx, barX, cardY + 114, barW * bPct, barH, 3);
        ctx.fill();
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 11px sans-serif';
        ctx.fillText('🎯 Növbəti müqavilə hazırlanır... [M]', cardX + 12, cardY + 98);
      }

      // Ayırıcı Xətt 2
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cardX + 12, cardY + 128);
      ctx.lineTo(cardX + cardW - 12, cardY + 128);
      ctx.stroke();

      // --- C. OVÇU RÜTBƏSİ (Hunter Prestige Rank) ---
      const rank = this.getCurrentHunterRank();
      ctx.textAlign = 'left';
      ctx.fillStyle = rank.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${rank.badge} ${rank.name}`, cardX + 12, cardY + 144);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#a855f7';
      ctx.font = '10px sans-serif';
      const bonusPct = Math.round(rank.damageBonus * 100);
      ctx.fillText(`+${bonusPct}% Zərər/Qızıl`, cardX + cardW - 12, cardY + 144);

      // Mini XP Bar
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      drawRoundRect(ctx, barX, cardY + 151, barW, 4, 2);
      ctx.fill();

      ctx.fillStyle = rank.color;
      ctx.beginPath();
      drawRoundRect(ctx, barX, cardY + 151, barW * rank.progressPercent, 4, 2);
      ctx.fill();

      // Cari XP
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      const xpText = rank.nextXP === Infinity ? `${rank.currentXP} XP (MAX)` : `${rank.currentXP} / ${rank.nextXP} XP`;
      ctx.fillText(xpText, barX, cardY + 163);

      ctx.restore();
    }
  };

  // Qlobal Obyekt Kimi İxrac Et
  if (typeof window !== 'undefined') {
    window.GameMissions = GameMissions;
  }

  // Node mühiti üçün ixracat (Sintaksis və Unit Test üçün)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameMissions;
  }

})(typeof window !== 'undefined' ? window : globalThis);
