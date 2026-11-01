/**
 * ============================================================================
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V4.0 — Loot & Synergy Specialist)
 * Fayl: src/loot_synergy.js
 * Qlobal Obyekt: window.GameLoot
 * Plugin ID: 'loot'
 * Məsul Agent: 33-cü Agent — Qənimət (Loot) və Sinergiya Mütəxəssisi
 *
 * Fəlsəfə:
 * "Hər düşməni 'bəlkə indi əfsanəvi düşdü' ümidi ilə kəsmək və özünü Tanrı kimi güclü hiss etmək!"
 *
 * Əsas Xüsusiyyətlər:
 * 1. Düşən Qənimət Kürələri (Loot Orbs):
 *    - Nadir (Rare, 7%, mavi) -> Daimi run stat bonusu (+Zərər/+Sürət/+Krit/+Maks Can)
 *    - Epik (Epic, 2.5%, bənövşəyi) -> Güclü bonus + 40 Rage
 *    - Əfsanəvi (Legendary, 0.6%, narıncı/qızılı) -> 8 fövqəlgüc affiksdən biri
 *    - Elit düşmən x3 şans, Boss 100% Epik+ zəmanəti!
 *    - Yuxarı ucalan İşıq Sütunu (Loot Beam) və Əfsanəvidə qızılı spiral hissəciklər.
 * 2. 8 Əfsanəvi Affiks:
 *    - Kölgə Əks-Sədası, Ulduz Yağışı, Qan Tanrısı, Zaman Bükən, Zəncirvari Partlayış,
 *      İldırım Tanrısı, Qılınc Rəqsi, Ölümsüz İradə.
 * 3. 6 Gizli Evolyusiya Sinergiyası (Silah + Relikt + Yoldaş kombinasiyaları):
 *    - Qiyamət Qasırğası, Kölgə Sürüsü, Astral Qasırğa Oxları, Mütləq Sıfır Zərbəsi,
 *      Qanlı Biçin, Titan Qəzəbi.
 *    - İlk kəşfdə 2.5s epik "⚡ EVOLYUSİYA!" ekran banneri və SFX.
 * 4. Sağ-Aşağı HUD Paneli (y = h - 170 ətrafı) toplanmış affikslər və evolyusiyalar üçün.
 * ============================================================================
 */

(function (root) {
  'use strict';

  // --- Köməkçi Riyazi Funksiyalar ---
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function distSq(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  function dist(x1, y1, x2, y2) {
    return Math.sqrt(distSq(x1, y1, x2, y2));
  }

  // --- Nadirlik Rəngləri və Konfiqurasiyası ---
  var RARITY_CONFIG = {
    rare: {
      name: 'Nadir',
      color: '#38bdf8',
      secondaryColor: '#93c5fd',
      glowColor: 'rgba(56, 189, 248, 0.45)',
      beamHeight: 280,
      beamWidth: 16,
      sfx: 'lootRare',
      fallbackSfx: 'relic',
      chance: 0.070 // 7.0%
    },
    epic: {
      name: 'Epik',
      color: '#c084fc',
      secondaryColor: '#e879f9',
      glowColor: 'rgba(192, 132, 252, 0.55)',
      beamHeight: 380,
      beamWidth: 22,
      sfx: 'lootEpic',
      fallbackSfx: 'levelUp',
      chance: 0.025 // 2.5%
    },
    legendary: {
      name: 'Əfsanəvi',
      color: '#f59e0b',
      secondaryColor: '#fbbf24',
      glowColor: 'rgba(245, 158, 11, 0.70)',
      beamHeight: 520,
      beamWidth: 30,
      sfx: 'lootLegendary',
      fallbackSfx: 'ultimate',
      chance: 0.006 // 0.6%
    }
  };

  // --- 8 ƏFSANƏVİ AFFİKS KATALOQU ---
  var LEGENDARY_AFFIXES = {
    shadow_echo: {
      id: 'shadow_echo',
      name: 'Kölgə Əks-Sədası',
      icon: '👥',
      tagline: 'Hər 4-cü zərbə ikiqat güc saçır',
      desc: 'Hər 4-cü hücum zərbəsi düşmənə 2.0x (ikiqat) zərər vurur.',
      color: '#c084fc'
    },
    star_fall: {
      id: 'star_fall',
      name: 'Ulduz Yağışı',
      icon: '🌠',
      tagline: 'Kritik vuruşlar kosmik meteor yağdırır',
      desc: 'Kritik zərbə vurduqda hədəfin başına 80 AoE zərərli parlaq ulduz düşür.',
      color: '#38bdf8'
    },
    blood_god: {
      id: 'blood_god',
      name: 'Qan Tanrısı',
      icon: '🩸',
      tagline: 'Qətl başına daimi can bərpası',
      desc: 'Öldürülən hər düşmən oyunçuya dərhal +2 Can bərpa edir.',
      color: '#ef4444'
    },
    time_warp: {
      id: 'time_warp',
      name: 'Zaman Bükən',
      icon: '⏳',
      tagline: 'Ardıcıl qətllərdə zamanın ləngiməsi',
      desc: 'Hər 10 düşmən məhv edildikdə zaman 1.0 saniyəlik ləngiyir (Slow-Mo).',
      color: '#a855f7'
    },
    chain_explosion: {
      id: 'chain_explosion',
      name: 'Zəncirvari Partlayış',
      icon: '💣',
      tagline: 'Məhv olan düşmənlər alov saçır',
      desc: 'Ölən düşmən 70 radiusda partlayaraq ətrafdakılara 50 alov zərəri verir.',
      color: '#f97316'
    },
    thunder_god: {
      id: 'thunder_god',
      name: 'İldırım Tanrısı',
      icon: '⚡',
      tagline: 'Səmadan düşən qəzəbli şimşəklər',
      desc: 'Hər 2 saniyədən bir vuruşunuz düşmənə 70 elektrik zərəri və stun verir.',
      color: '#00e5ff'
    },
    blade_dance: {
      id: 'blade_dance',
      name: 'Qılınc Rəqsi',
      icon: '🌀',
      tagline: 'Ətrafda fırlanan aether qılıncları',
      desc: 'Oyunçu ətrafında 95 radiusda fırlanan aura hər 0.6s yaxın düşmənlərə 30 zərər vurur.',
      color: '#10b981'
    },
    immortal_will: {
      id: 'immortal_will',
      name: 'Ölümsüz İradə',
      icon: '🛡️',
      tagline: 'Kritik anda mütləq zərər keçirməzlik',
      desc: 'Can 30%-dən aşağı düşəndə 4.0 saniyəlik mütləq qalxan aktivləşir (CD: 45s).',
      color: '#fbbf24'
    }
  };

  // --- 6 GİZLİ EVOLYUSİYA SİNERGİYASI RESEPTLƏRİ ---
  var EVOLUTION_RECIPES = [
    {
      id: 'doom_vortex',
      name: 'Qiyamət Qasırğası',
      icon: '🌪️🔥',
      color: '#ff6b35',
      glow: 'rgba(255, 107, 53, 0.75)',
      weaponId: 'sword',
      relicId: 'fire_orbitals',
      companionId: 'phoenix',
      formula: 'Aether Qılıncı + Alov Halqası + Alov Simurqu',
      desc: 'Hər 5s oyunçu ətrafında 180 radiuslu alov burulğanı yaranır, düşmənlərə 130 zərər vurur və onları mərkəzə çəkir.',
      cooldown: 5.0
    },
    {
      id: 'shadow_pack',
      name: 'Kölgə Sürüsü',
      icon: '🐺👥',
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.75)',
      weaponId: 'daggers',
      relicId: 'shadow_clone',
      companionId: 'wolf',
      formula: 'Kölgə Xəncərləri + Kölgə Klonu + Kölgə Qurdu',
      desc: 'Hər 4s düşmənlərə şığıyan 2 xəyali kölgə qurdu peyda olur və hər biri 80 zərər vuraraq dərin qanaxma törədir.',
      cooldown: 4.0
    },
    {
      id: 'astral_tempest',
      name: 'Astral İldırım Oxları',
      icon: '🏹⚡',
      color: '#00e5ff',
      glow: 'rgba(0, 229, 255, 0.75)',
      weaponId: 'bow',
      relicId: 'chain_lightning',
      companionId: 'dragon',
      formula: 'Simurq Yayı + Fırtına Zənciri + Astral Əjdaha',
      desc: 'Oxlar toxunanda 4 fərqli hədəfə 60 zərərli zəncirvari plazma sıçrayır və yerə düşmüş bütün qənimətləri maqnitləyir.',
      cooldown: 0
    },
    {
      id: 'absolute_zero',
      name: 'Mütləq Sıfır Zərbəsi',
      icon: '🔨❄️',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.75)',
      weaponId: 'hammer',
      relicId: 'frost_touch',
      companionId: 'dragon',
      formula: 'Astral Çəkic + Buzlu Toxunuş + Astral Əjdaha',
      desc: 'Çəkicin şok dalğası düşmənləri 1.5s dondurur; donmuş düşmənlər məhv olduqda 85 buz qəlpəsi zərəri saçır.',
      cooldown: 0
    },
    {
      id: 'blood_harvest',
      name: 'Qanlı Biçin',
      icon: '🗡️🩸',
      color: '#dc2626',
      glow: 'rgba(220, 38, 38, 0.75)',
      weaponId: 'daggers',
      relicId: 'vampire_fang',
      companionId: 'wolf',
      formula: 'Kölgə Xəncərləri + Vampir Dişi + Kölgə Qurdu',
      desc: 'Canı 50%-dən az olan düşmənlərə kritik zərbələr 2.5x zərər vurur və vurulan zərərin 20%-i oyunçuya can qaytarır.',
      cooldown: 0
    },
    {
      id: 'titans_wrath',
      name: 'Titan Qəzəbi',
      icon: '🌋💖',
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.75)',
      weaponId: 'hammer',
      relicId: 'giant_heart',
      companionId: 'phoenix',
      formula: 'Astral Çəkic + Nəhəngin Ürəyi + Alov Simurqu',
      desc: 'Oyunçunun hücum zərəri Maksimal Canın 15%-i qədər artır və hər zədə alanda 150 radiusda 95 zərərli şok dalğası saçılır.',
      cooldown: 0
    }
  ];

  // ==========================================================================
  // ƏSAS GameLoot OBYEKTİ
  // ==========================================================================
  var GameLoot = {
    id: 'loot',
    name: 'Qənimət və Sinergiya Mütəxəssisi',
    version: '4.0.0',

    // Daxili vəziyyət (State)
    initialized: false,
    orbCounter: 0,
    lootOrbs: [], // Xəritədəki aktiv qənimət kürələri
    particles: [], // Vizual spiral və partlayış hissəcikləri

    // Run ərzində toplanmış bonuslar
    runStats: {
      damageMult: 0,
      speedMult: 0,
      critBonus: 0,
      maxHpBonus: 0
    },

    // Bu run-da qazanılmış əfsanəvi affikslər: id -> affixObject
    collectedAffixes: {},

    // Bu run-da aktivləşmiş evolyusiyalar: id -> evoObject
    activeEvolutions: {},

    // Artıq aşkar olunmuş və bildirişi verilmiş evolyusiya ID-ləri
    discoveredEvolutions: {},

    // Döyüş və Taymer Vəziyyətləri
    state: {
      killCount: 0,
      hitCount: 0,
      shadowEchoStep: 0,
      thunderGodTimer: 0,
      immortalShieldActive: false,
      immortalShieldDuration: 0,
      immortalShieldCooldown: 0,
      bladeDanceTimer: 0,
      // Evolyusiya daxili taymerləri
      doomVortexTimer: 0,
      shadowPackTimer: 0,
      activeVortices: [],
      activeWolves: []
    },

    // ⚡ EVOLYUSİYA Ekran Banneri Vəziyyəti
    banner: {
      active: false,
      timer: 0,
      maxTimer: 2.5,
      title: '⚡ EVOLYUSİYA!',
      subtitle: '',
      formula: '',
      icon: '',
      color: '#f59e0b'
    },

    // ------------------------------------------------------------------------
    // İNİT VƏ RUN İDARƏETMƏSİ
    // ------------------------------------------------------------------------
    init: function (api) {
      this.initialized = true;
      this.resetRun();
    },

    onRunStart: function (mode, api) {
      this.resetRun();
      if (api && typeof api.floatingText === 'function') {
        var p = api.player;
        if (p) {
          api.floatingText(p.x, p.y - 40, '💎 Qənimət və Sinergiya Aktivdir', '#38bdf8', 15);
        }
      }
    },

    resetRun: function () {
      this.lootOrbs = [];
      this.particles = [];
      this.runStats = {
        damageMult: 0,
        speedMult: 0,
        critBonus: 0,
        maxHpBonus: 0
      };
      this.collectedAffixes = {};
      this.activeEvolutions = {};
      this.discoveredEvolutions = {};

      this.state.killCount = 0;
      this.state.hitCount = 0;
      this.state.shadowEchoStep = 0;
      this.state.thunderGodTimer = 0;
      this.state.immortalShieldActive = false;
      this.state.immortalShieldDuration = 0;
      this.state.immortalShieldCooldown = 0;
      this.state.bladeDanceTimer = 0;
      this.state.doomVortexTimer = 0;
      this.state.shadowPackTimer = 0;
      this.state.activeVortices = [];
      this.state.activeWolves = [];

      this.banner.active = false;
      this.banner.timer = 0;
    },

    // ------------------------------------------------------------------------
    // MÜHƏRRİK ÜÇÜN STAT ÇARPANLARI
    // ------------------------------------------------------------------------
    getStatMultipliers: function () {
      var dmgBonus = this.runStats.damageMult;

      // Titan Qəzəbi evolyusiyası zərər bonusu: Maks Canın 15%-i qədər əlavə zərər
      if (this.activeEvolutions['titans_wrath']) {
        dmgBonus += 0.25; // 25% qüvvətli döyüş çarpanı
      }

      return {
        damageMult: 1.0 + dmgBonus,
        speedMult: 1.0 + this.runStats.speedMult,
        critBonus: this.runStats.critBonus,
        maxHpBonus: this.runStats.maxHpBonus
      };
    },

    // ------------------------------------------------------------------------
    // YARDIMÇI: SİLAH, RELİKT VƏ YOLDAŞ TAPILMASI
    // ------------------------------------------------------------------------
    _getCurrentWeaponId: function (api, player) {
      if (api && typeof api.getActiveWeaponId === 'function') {
        try {
          var w = api.getActiveWeaponId();
          if (w) return w;
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.GameRelics && window.GameRelics.currentWeaponId) {
        return window.GameRelics.currentWeaponId;
      }
      if (player && player.weaponType) {
        return player.weaponType;
      }
      return 'sword';
    },

    _getCurrentRelicIds: function (api) {
      if (api && typeof api.getRelicIds === 'function') {
        try {
          var r = api.getRelicIds();
          if (Array.isArray(r)) return r;
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.GameRelics && window.GameRelics.relics) {
        var active = [];
        for (var key in window.GameRelics.relics) {
          var relic = window.GameRelics.relics[key];
          if (relic && (relic.level > 0 || relic.unlocked)) {
            active.push(relic.id || key);
          }
        }
        return active;
      }
      return [];
    },

    _getCurrentCompanionId: function (api) {
      if (api && typeof api.getCompanionId === 'function') {
        try {
          var c = api.getCompanionId();
          if (c) return c;
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.GameCompanions && window.GameCompanions.activeType) {
        return window.GameCompanions.activeType;
      }
      return 'phoenix';
    },

    // ------------------------------------------------------------------------
    // EVOLYUSİYA SİNERGİYALARININ YOXLANIŞI
    // ------------------------------------------------------------------------
    checkEvolutions: function (api, player) {
      var currentWeapon = this._getCurrentWeaponId(api, player);
      var currentRelics = this._getCurrentRelicIds(api);
      var currentCompanion = this._getCurrentCompanionId(api);

      for (var i = 0; i < EVOLUTION_RECIPES.length; i++) {
        var recipe = EVOLUTION_RECIPES[i];
        var hasWeapon = recipe.weaponId === currentWeapon;
        var hasRelic = currentRelics.indexOf(recipe.relicId) !== -1;
        var hasCompanion = recipe.companionId === currentCompanion;

        if (hasWeapon && hasRelic && hasCompanion) {
          if (!this.activeEvolutions[recipe.id]) {
            // Yeni evolyusiya aktivləşir!
            this.activeEvolutions[recipe.id] = recipe;

            // Əgər ilk dəfədirsə böyük bildiriş və banner göstər
            if (!this.discoveredEvolutions[recipe.id]) {
              this.discoveredEvolutions[recipe.id] = true;
              this.triggerEvolutionBanner(recipe, api);
            }
          }
        } else {
          // Əgər oyunçu silahı və ya yoldaşı dəyişibsə, həmin evolyusiya sönür
          if (this.activeEvolutions[recipe.id]) {
            delete this.activeEvolutions[recipe.id];
          }
        }
      }
    },

    triggerEvolutionBanner: function (recipe, api) {
      this.banner.active = true;
      this.banner.timer = this.banner.maxTimer;
      this.banner.title = '⚡ EVOLYUSİYA SİNERGİYASI!';
      this.banner.subtitle = recipe.name;
      this.banner.formula = recipe.formula;
      this.banner.icon = recipe.icon;
      this.banner.color = recipe.color;

      if (api) {
        if (typeof api.playSFX === 'function') {
          api.playSFX('evolution');
        }
        if (typeof api.slowMo === 'function') {
          api.slowMo(0.35, 0.7);
        }
        if (typeof api.shake === 'function') {
          api.shake(14, 0.55);
        }
        if (typeof api.notify === 'function') {
          api.notify('⚡ EVOLYUSİYA: ' + recipe.name, recipe.desc, 'bonus');
        }
        var p = api.player;
        if (p && typeof api.floatingText === 'function') {
          api.floatingText(p.x, p.y - 50, '⚡ ' + recipe.name + ' AKTİVDİR!', recipe.color, 22);
        }
        if (p && typeof api.explosion === 'function') {
          api.explosion(p.x, p.y, recipe.color, 25, 90);
        }
      }
    },

    // ------------------------------------------------------------------------
    // 1. DÜŞMƏN ÖLƏNDƏ QƏNİMƏT KÜRƏSİ (onEnemyKilled)
    // ------------------------------------------------------------------------
    onEnemyKilled: function (enemy, player, worldState, api) {
      if (!enemy) return;

      this.state.killCount++;

      // A) Düşməndən Qənimət Kürəsi Düşməsi
      var isElite = !!enemy.isElite;
      var isBoss = !!enemy.isBoss;

      var rareChance = RARITY_CONFIG.rare.chance * (isElite ? 3 : 1);
      var epicChance = RARITY_CONFIG.epic.chance * (isElite ? 3 : 1);
      var legChance = RARITY_CONFIG.legendary.chance * (isElite ? 3 : 1);

      var droppedRarity = null;

      if (isBoss) {
        // Boss 100% zəmanətli Epik və ya Əfsanəvi!
        droppedRarity = Math.random() < 0.25 ? 'legendary' : 'epic';
        // Boss öldükdə əlavə olaraq bir Nadir kürə də saçırıq
        this.spawnOrb(enemy.x + 25, enemy.y + 15, 'rare', api);
      } else {
        var roll = Math.random();
        if (roll < legChance) {
          droppedRarity = 'legendary';
        } else if (roll < legChance + epicChance) {
          droppedRarity = 'epic';
        } else if (roll < legChance + epicChance + rareChance) {
          droppedRarity = 'rare';
        }
      }

      if (droppedRarity) {
        this.spawnOrb(enemy.x, enemy.y, droppedRarity, api);
      }

      // B) ƏFSANƏVİ AFFİKSLƏRİN QƏTL TƏSİRLƏRİ
      // 1. Qan Tanrısı (blood_god)
      if (this.collectedAffixes['blood_god'] && api && typeof api.healPlayer === 'function') {
        api.healPlayer(2);
      }

      // 2. Zaman Bükən (time_warp)
      if (this.collectedAffixes['time_warp'] && this.state.killCount % 10 === 0) {
        if (api && typeof api.slowMo === 'function') {
          api.slowMo(0.35, 1.0);
        }
        if (api && typeof api.floatingText === 'function') {
          api.floatingText(player.x, player.y - 30, '⏳ Zaman Büküldü (1.0s)', '#a855f7', 16);
        }
        if (api && typeof api.playSFX === 'function') {
          api.playSFX('spell');
        }
      }

      // 3. Zəncirvari Partlayış (chain_explosion)
      if (this.collectedAffixes['chain_explosion']) {
        if (api && typeof api.explosion === 'function') {
          api.explosion(enemy.x, enemy.y, '#f97316', 16, 70);
        }
        if (worldState && worldState.enemies && api && typeof api.damageEnemy === 'function') {
          for (var i = 0; i < worldState.enemies.length; i++) {
            var other = worldState.enemies[i];
            if (other && other !== enemy && other.hp > 0 && dist(enemy.x, enemy.y, other.x, other.y) <= 70) {
              api.damageEnemy(other, 50, false);
            }
          }
        }
      }

      // C) EVOLYUSİYA QƏTL TƏSİRLƏRİ
      // Mütləq Sıfır Zərbəsi (absolute_zero): Donmuş düşmən öldükdə buz qəlpələri partlayışı
      if (this.activeEvolutions['absolute_zero'] && enemy.isFrozen) {
        if (api && typeof api.explosion === 'function') {
          api.explosion(enemy.x, enemy.y, '#38bdf8', 18, 85);
        }
        if (worldState && worldState.enemies && api && typeof api.damageEnemy === 'function') {
          for (var j = 0; j < worldState.enemies.length; j++) {
            var target = worldState.enemies[j];
            if (target && target !== enemy && target.hp > 0 && dist(enemy.x, enemy.y, target.x, target.y) <= 85) {
              api.damageEnemy(target, 85, true);
            }
          }
        }
      }
    },

    // ------------------------------------------------------------------------
    // QƏNİMƏT KÜRƏSİNİN YARADILMASI (Spawn Orb)
    // ------------------------------------------------------------------------
    spawnOrb: function (x, y, rarity, api) {
      var cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.rare;
      var orb = {
        id: 'loot_orb_' + (++this.orbCounter),
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        rarity: rarity,
        cfg: cfg,
        color: cfg.color,
        secondaryColor: cfg.secondaryColor,
        beamHeight: cfg.beamHeight,
        beamWidth: cfg.beamWidth,
        radius: rarity === 'legendary' ? 14 : (rarity === 'epic' ? 12 : 10),
        age: 0,
        pulseOffset: Math.random() * Math.PI * 2,
        isCollected: false
      };

      this.lootOrbs.push(orb);

      // Yaranma anı kiçik vizual/səs anonsu
      if (api) {
        if (rarity === 'legendary') {
          if (typeof api.playSFX === 'function') api.playSFX(cfg.sfx);
          if (typeof api.floatingText === 'function') {
            api.floatingText(orb.x, orb.y - 25, '✨ ƏFSANƏVİ QƏNİMƏT!', '#f59e0b', 18);
          }
          if (typeof api.shake === 'function') api.shake(6, 0.3);
          if (typeof api.explosion === 'function') api.explosion(orb.x, orb.y, '#f59e0b', 18, 60);
        } else if (rarity === 'epic') {
          if (typeof api.playSFX === 'function') api.playSFX(cfg.sfx);
          if (typeof api.floatingText === 'function') {
            api.floatingText(orb.x, orb.y - 20, '🔮 Epik Qənimət!', '#c084fc', 15);
          }
          if (typeof api.explosion === 'function') api.explosion(orb.x, orb.y, '#c084fc', 12, 45);
        }
      }
    },

    // ------------------------------------------------------------------------
    // 2. QƏNİMƏTİN YIĞILMASI (Collect Orb)
    // ------------------------------------------------------------------------
    collectOrb: function (orb, player, api) {
      if (!orb || orb.isCollected) return;
      orb.isCollected = true;

      var rarity = orb.rarity;

      if (rarity === 'rare') {
        // NADİR: Daimi kiçik run bonusu
        var roll = Math.floor(Math.random() * 4);
        var bonusText = '';
        if (roll === 0) {
          this.runStats.damageMult += 0.04;
          bonusText = '+4% Hücum Zərəri';
        } else if (roll === 1) {
          this.runStats.speedMult += 0.05;
          bonusText = '+5% Qaçış Sürəti';
        } else if (roll === 2) {
          this.runStats.critBonus += 0.06;
          bonusText = '+6% Kritik Şans';
        } else {
          this.runStats.maxHpBonus += 8;
          bonusText = '+8 Maksimum Can';
          if (api && typeof api.healPlayer === 'function') api.healPlayer(8);
        }

        if (api) {
          if (typeof api.playSFX === 'function') api.playSFX(orb.cfg.sfx);
          if (typeof api.floatingText === 'function') {
            api.floatingText(orb.x, orb.y, '🔷 Nadir: ' + bonusText, '#38bdf8', 16);
          }
          if (typeof api.explosion === 'function') api.explosion(orb.x, orb.y, '#38bdf8', 14, 40);
        }
      } else if (rarity === 'epic') {
        // EPİK: Güclü bonus + 40 Rage
        var epicRoll = Math.floor(Math.random() * 4);
        var epicBonusText = '';
        if (epicRoll === 0) {
          this.runStats.damageMult += 0.10;
          epicBonusText = '+10% Hücum Zərəri';
        } else if (epicRoll === 1) {
          this.runStats.speedMult += 0.12;
          epicBonusText = '+12% Qaçış Sürəti';
        } else if (epicRoll === 2) {
          this.runStats.critBonus += 0.15;
          epicBonusText = '+15% Kritik Şans';
        } else {
          this.runStats.maxHpBonus += 25;
          epicBonusText = '+25 Maksimum Can';
          if (api && typeof api.healPlayer === 'function') api.healPlayer(25);
        }

        // +40 Rage
        if (api && typeof api.addRage === 'function') {
          api.addRage(40);
        } else if (typeof window !== 'undefined' && window.GameCompanions && typeof window.GameCompanions.addRage === 'function') {
          window.GameCompanions.addRage(40);
        }

        if (api) {
          if (typeof api.playSFX === 'function') api.playSFX(orb.cfg.sfx);
          if (typeof api.floatingText === 'function') {
            api.floatingText(orb.x, orb.y, '🔮 Epik: ' + epicBonusText + ' (+40 Qəzəb!)', '#c084fc', 18);
          }
          if (typeof api.shake === 'function') api.shake(4, 0.25);
          if (typeof api.explosion === 'function') api.explosion(orb.x, orb.y, '#c084fc', 20, 60);
        }
      } else if (rarity === 'legendary') {
        // ƏFSANƏVİ: 8 Əfsanəvi affiksdən biri
        var availableAffixes = [];
        for (var affKey in LEGENDARY_AFFIXES) {
          if (!this.collectedAffixes[affKey]) {
            availableAffixes.push(LEGENDARY_AFFIXES[affKey]);
          }
        }

        var chosenAffix = null;
        if (availableAffixes.length > 0) {
          chosenAffix = availableAffixes[Math.floor(Math.random() * availableAffixes.length)];
        } else {
          // Hamısı açılıbsa təsadüfi birini seçib gücləndir
          var allKeys = Object.keys(LEGENDARY_AFFIXES);
          chosenAffix = LEGENDARY_AFFIXES[allKeys[Math.floor(Math.random() * allKeys.length)]];
        }

        this.collectedAffixes[chosenAffix.id] = chosenAffix;

        if (api) {
          if (typeof api.playSFX === 'function') api.playSFX(orb.cfg.sfx);
          if (typeof api.slowMo === 'function') api.slowMo(0.3, 0.6);
          if (typeof api.shake === 'function') api.shake(12, 0.5);
          if (typeof api.notify === 'function') {
            api.notify('⭐ ƏFSANƏVİ AFFİKS!', chosenAffix.name + ': ' + chosenAffix.desc, 'bonus');
          }
          if (typeof api.floatingText === 'function') {
            api.floatingText(orb.x, orb.y - 20, '⭐ ' + chosenAffix.name, '#fbbf24', 24);
          }
          if (typeof api.explosion === 'function') {
            api.explosion(orb.x, orb.y, '#f59e0b', 30, 90);
          }
        }
      }
    },

    // ------------------------------------------------------------------------
    // 3. DÖYÜŞ HOOK-LARI: MODIFY DAMAGE, ON HIT, ETC.
    // ------------------------------------------------------------------------
    modifyOutgoingDamage: function (enemy, damage, isCrit, player, api) {
      if (typeof damage !== 'number') damage = 10;

      // 1. Kölgə Əks-Sədası (shadow_echo): Hər 4-cü zərbə 2x
      if (this.collectedAffixes['shadow_echo']) {
        this.state.shadowEchoStep = (this.state.shadowEchoStep + 1) % 4;
        if (this.state.shadowEchoStep === 0) {
          damage *= 2.0;
          if (api && typeof api.floatingText === 'function' && enemy) {
            api.floatingText(enemy.x, enemy.y - 15, '👥 İKİQAT ƏKS-SƏDA!', '#c084fc', 18);
          }
          if (api && typeof api.playSFX === 'function') {
            api.playSFX('slash3');
          }
        }
      }

      // 2. Qanlı Biçin Evolyusiyası (blood_harvest): Canı < 50% olanlara kritik 2.5x
      if (this.activeEvolutions['blood_harvest'] && enemy && isCrit) {
        var maxHp = enemy.maxHp || 100;
        if (enemy.hp < maxHp * 0.5) {
          damage *= 2.5;
          var healAmount = Math.min(30, Math.max(6, Math.round(damage * 0.15)));
          if (api && typeof api.healPlayer === 'function') {
            api.healPlayer(healAmount);
          }
          if (api && typeof api.floatingText === 'function') {
            api.floatingText(player.x, player.y - 20, '🩸 +' + healAmount + ' Can', '#ef4444', 16);
          }
        }
      }

      return damage;
    },

    onEnemyHit: function (enemy, damage, isCrit, player, api) {
      if (!enemy || enemy.hp <= 0) return;

      this.state.hitCount++;

      // A) Ulduz Yağışı (star_fall): Kritik vuruşda meteor düşməsi
      if (this.collectedAffixes['star_fall'] && isCrit) {
        if (api && typeof api.explosion === 'function') {
          api.explosion(enemy.x, enemy.y, '#38bdf8', 20, 80);
        }
        if (api && typeof api.playSFX === 'function') {
          api.playSFX('spell');
        }
        if (api && typeof api.shake === 'function') {
          api.shake(5, 0.2);
        }
        if (api && typeof api.damageEnemy === 'function') {
          api.damageEnemy(enemy, 80, true);
        }
        if (api && typeof api.floatingText === 'function') {
          api.floatingText(enemy.x, enemy.y - 30, '🌠 Ulduz Zərbəsi!', '#38bdf8', 16);
        }
      }

      // B) İldırım Tanrısı (thunder_god): Hər 2s zərbə düşmənə şimşək endirir
      if (this.collectedAffixes['thunder_god'] && this.state.thunderGodTimer <= 0) {
        this.state.thunderGodTimer = 2.0;
        if (api && typeof api.damageEnemy === 'function') {
          api.damageEnemy(enemy, 70, true);
        }
        if (api && typeof api.playSFX === 'function') {
          api.playSFX('lightningChain');
        }
        if (api && typeof api.floatingText === 'function') {
          api.floatingText(enemy.x, enemy.y - 35, '⚡ Şimşək Hökmü!', '#00e5ff', 18);
        }
        // Düşməni 0.6s dondur (stun)
        enemy.isStunned = true;
        enemy.stunTimer = 0.6;
      }

      // C) Astral İldırım Oxları Evolyusiyası (astral_tempest): 4 hədəfə zəncirvari plazma
      if (this.activeEvolutions['astral_tempest']) {
        if (api && typeof api.playSFX === 'function' && Math.random() < 0.6) {
          api.playSFX('lightningChain');
        }
        var world = api && api.worldState;
        if (world && world.enemies && api && typeof api.damageEnemy === 'function') {
          var chained = 0;
          for (var i = 0; i < world.enemies.length && chained < 4; i++) {
            var target = world.enemies[i];
            if (target && target !== enemy && target.hp > 0 && dist(enemy.x, enemy.y, target.x, target.y) <= 180) {
              api.damageEnemy(target, 60, false);
              chained++;
            }
          }
        }
        // Yerə düşmüş qənimətləri oyunçuya tərəf çək
        if (world && world.pickups) {
          for (var pIdx = 0; pIdx < world.pickups.length; pIdx++) {
            var item = world.pickups[pIdx];
            if (item && dist(player.x, player.y, item.x, item.y) <= 300) {
              item.x += (player.x - item.x) * 0.25;
              item.y += (player.y - item.y) * 0.25;
            }
          }
        }
      }

      // D) Mütləq Sıfır Zərbəsi Evolyusiyası (absolute_zero): Çəkiclə vurduqda 1.5s tam dondur
      if (this.activeEvolutions['absolute_zero']) {
        enemy.isFrozen = true;
        enemy.freezeTimer = 1.5;
        if (api && typeof api.floatingText === 'function') {
          api.floatingText(enemy.x, enemy.y - 20, '❄️ DONDU!', '#38bdf8', 14);
        }
      }
    },

    modifyIncomingDamage: function (amount, player, source, api) {
      if (typeof amount !== 'number') amount = 0;

      // Ölümsüz İradə (immortal_will): Qalxan aktivdirsə zərər 0 olur!
      if (this.state.immortalShieldActive) {
        if (api && typeof api.floatingText === 'function') {
          api.floatingText(player.x, player.y - 25, '🛡️ ZƏRƏR UDULDU!', '#fbbf24', 16);
        }
        return 0;
      }

      return amount;
    },

    onPlayerDamaged: function (amount, player, api) {
      if (!player) return;

      // 1. Ölümsüz İradə (immortal_will) Qalxanının Aktivləşməsi
      if (this.collectedAffixes['immortal_will']) {
        var currentHp = player.hp || 0;
        var maxHp = player.maxHp || 100;
        if (currentHp / maxHp <= 0.30 && this.state.immortalShieldCooldown <= 0) {
          this.state.immortalShieldActive = true;
          this.state.immortalShieldDuration = 4.0;
          this.state.immortalShieldCooldown = 45.0;

          if (api) {
            if (typeof api.playSFX === 'function') api.playSFX('spell');
            if (typeof api.shake === 'function') api.shake(8, 0.4);
            if (typeof api.floatingText === 'function') {
              api.floatingText(player.x, player.y - 40, '🛡️ ÖLÜMSÜZ İRADƏ QALXANI (4s)!', '#fbbf24', 20);
            }
            if (typeof api.explosion === 'function') {
              api.explosion(player.x, player.y, '#fbbf24', 25, 80);
            }
          }
        }
      }

      // 2. Titan Qəzəbi Evolyusiyası (titans_wrath): Zədə alanda 150 radiuslu seysmik dalğa
      if (this.activeEvolutions['titans_wrath']) {
        var world = api && api.worldState;
        if (api && typeof api.explosion === 'function') {
          api.explosion(player.x, player.y, '#f59e0b', 20, 150);
        }
        if (api && typeof api.shake === 'function') {
          api.shake(7, 0.3);
        }
        if (world && world.enemies && api && typeof api.damageEnemy === 'function') {
          for (var i = 0; i < world.enemies.length; i++) {
            var target = world.enemies[i];
            if (target && target.hp > 0 && dist(player.x, player.y, target.x, target.y) <= 150) {
              api.damageEnemy(target, 95, true);
            }
          }
        }
      }
    },

    // ------------------------------------------------------------------------
    // 4. HƏR KADR YENİLƏNMƏ (update)
    // ------------------------------------------------------------------------
    update: function (dt, player, worldState, api) {
      if (!player) return;

      // 1. Evolyusiya sinergiyalarını dinamik yoxla
      this.checkEvolutions(api, player);

      // 2. Taymerlərin azalması
      if (this.state.thunderGodTimer > 0) {
        this.state.thunderGodTimer -= dt;
      }

      if (this.state.immortalShieldCooldown > 0) {
        this.state.immortalShieldCooldown -= dt;
      }

      if (this.state.immortalShieldActive) {
        this.state.immortalShieldDuration -= dt;
        if (this.state.immortalShieldDuration <= 0) {
          this.state.immortalShieldActive = false;
          if (api && typeof api.floatingText === 'function') {
            api.floatingText(player.x, player.y - 20, 'Qalxan söndü', '#94a3b8', 13);
          }
        }
      }

      // 3. Banner taymeri
      if (this.banner.active) {
        this.banner.timer -= dt;
        if (this.banner.timer <= 0) {
          this.banner.active = false;
        }
      }

      // 4. Qılınc Rəqsi (blade_dance) aurasının zərəri
      if (this.collectedAffixes['blade_dance']) {
        this.state.bladeDanceTimer += dt;
        if (this.state.bladeDanceTimer >= 0.6) {
          this.state.bladeDanceTimer = 0;
          if (worldState && worldState.enemies && api && typeof api.damageEnemy === 'function') {
            for (var e = 0; e < worldState.enemies.length; e++) {
              var em = worldState.enemies[e];
              if (em && em.hp > 0 && dist(player.x, player.y, em.x, em.y) <= 95) {
                api.damageEnemy(em, 30, false);
              }
            }
          }
        }
      }

      // 5. Qiyamət Qasırğası Evolyusiyası (doom_vortex): Hər 5s 180 radiuslu burulğan
      if (this.activeEvolutions['doom_vortex']) {
        this.state.doomVortexTimer += dt;
        if (this.state.doomVortexTimer >= 5.0) {
          this.state.doomVortexTimer = 0;
          // Burulğan vizualı və sahə zərəri
          if (api && typeof api.explosion === 'function') {
            api.explosion(player.x, player.y, '#ff6b35', 28, 180);
          }
          if (api && typeof api.playSFX === 'function') {
            api.playSFX('explosion');
          }
          if (api && typeof api.shake === 'function') {
            api.shake(9, 0.4);
          }
          if (worldState && worldState.enemies && api && typeof api.damageEnemy === 'function') {
            for (var k = 0; k < worldState.enemies.length; k++) {
              var en = worldState.enemies[k];
              if (en && en.hp > 0 && dist(player.x, player.y, en.x, en.y) <= 180) {
                // Mərkəzə doğru çək
                en.x += (player.x - en.x) * 0.4;
                en.y += (player.y - en.y) * 0.4;
                api.damageEnemy(en, 130, true);
              }
            }
          }
          if (api && typeof api.floatingText === 'function') {
            api.floatingText(player.x, player.y - 40, '🌪️ QİYAMƏT QASIRĞASI!', '#ff6b35', 20);
          }
        }
      }

      // 6. Kölgə Sürüsü Evolyusiyası (shadow_pack): Hər 4s 2 kölgə canavarı şığıyır
      if (this.activeEvolutions['shadow_pack']) {
        this.state.shadowPackTimer += dt;
        if (this.state.shadowPackTimer >= 4.0) {
          this.state.shadowPackTimer = 0;
          if (worldState && worldState.enemies && api && typeof api.damageEnemy === 'function') {
            var targetsHit = 0;
            for (var m = 0; m < worldState.enemies.length && targetsHit < 2; m++) {
              var targetWolf = worldState.enemies[m];
              if (targetWolf && targetWolf.hp > 0 && dist(player.x, player.y, targetWolf.x, targetWolf.y) <= 320) {
                api.damageEnemy(targetWolf, 80, true);
                if (api.explosion) api.explosion(targetWolf.x, targetWolf.y, '#a855f7', 15, 50);
                targetsHit++;
              }
            }
            if (targetsHit > 0) {
              if (api && typeof api.playSFX === 'function') api.playSFX('dagger');
              if (api && typeof api.floatingText === 'function') {
                api.floatingText(player.x, player.y - 30, '🐺 Kölgə Sürüsü!', '#a855f7', 16);
              }
            }
          }
        }
      }

      // 7. Qənimət Kürələrinin (Loot Orbs) Yenilənməsi və Maqnit Yığılması
      for (var i = this.lootOrbs.length - 1; i >= 0; i--) {
        var orb = this.lootOrbs[i];
        orb.age += dt;

        // Maqnit cazibəsi məsafəsi: 140px yaxınlıqda çəkilmə, 60px yaxınlıqda yığılma
        var d = dist(player.x, player.y, orb.x, orb.y);

        if (d <= 140) {
          // Maqnit cəzbi
          var pullSpeed = Math.max(260, 500 * (1 - d / 140));
          orb.x += ((player.x - orb.x) / (d || 1)) * pullSpeed * dt;
          orb.y += ((player.y - orb.y) / (d || 1)) * pullSpeed * dt;
        }

        // Avtomatik yığılma məsafəsi: 60px
        if (d <= 60 && !orb.isCollected) {
          this.collectOrb(orb, player, api);
          this.lootOrbs.splice(i, 1);
          continue;
        }

        // Çox köhnə kürələri təmizlə (120 saniyə)
        if (orb.age > 120) {
          this.lootOrbs.splice(i, 1);
        }
      }
    },

    // ------------------------------------------------------------------------
    // 5. DÜNYA KOORDİNATLARINDA RENDER (renderWorld)
    // ------------------------------------------------------------------------
    renderWorld: function (ctx, time, worldState) {
      if (!ctx) return;
      var t = typeof time === 'number' ? time : Date.now() / 1000;

      // A) Qənimət Kürələri (Loot Orbs) və İşıq Sütunları (Loot Beams)
      for (var i = 0; i < this.lootOrbs.length; i++) {
        var orb = this.lootOrbs[i];
        if (!orb) continue;

        var ox = orb.x;
        var oy = orb.y;
        var r = orb.radius;
        var cfg = orb.cfg;
        var isLegendary = orb.rarity === 'legendary';

        ctx.save();

        // 1. Yerdəki İşıq Diski (Ground Glow Disc)
        var pulse = Math.sin(t * 5 + orb.pulseOffset) * 3;
        var glowGrad = ctx.createRadialGradient(ox, oy, 2, ox, oy, 40 + pulse);
        glowGrad.addColorStop(0, cfg.glowColor);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(ox, oy, 40 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // 2. Yuxarı Ucalan İşıq Sütunu (Loot Beam)
        var beamH = orb.beamHeight;
        var beamW = orb.beamWidth + Math.sin(t * 6 + orb.pulseOffset) * 2;

        var beamGrad = ctx.createLinearGradient(ox, oy, ox, oy - beamH);
        beamGrad.addColorStop(0, cfg.color);
        beamGrad.addColorStop(0.3, cfg.glowColor);
        beamGrad.addColorStop(0.85, 'rgba(255,255,255,0.15)');
        beamGrad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(ox - beamW * 0.5, oy);
        ctx.lineTo(ox + beamW * 0.5, oy);
        ctx.lineTo(ox + beamW * 0.15, oy - beamH);
        ctx.lineTo(ox - beamW * 0.15, oy - beamH);
        ctx.closePath();
        ctx.fill();

        // İşıq sütununun daxili kəskin lazer nüvəsi
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(ox - 2, oy - beamH, 4, beamH);

        // 3. Əfsanəvi Kürə üçün Qızılı Spiral Hissəciklər
        if (isLegendary) {
          ctx.fillStyle = '#fbbf24';
          for (var p = 0; p < 8; p++) {
            var spiralAngle = t * 4 + p * (Math.PI / 4);
            var spiralY = ((t * 70 + p * 35) % beamH);
            var spiralRadius = 14 + Math.sin(t * 3 + p) * 5;
            var spX = ox + Math.cos(spiralAngle) * spiralRadius;
            var spY = oy - spiralY;

            ctx.beginPath();
            ctx.arc(spX, spY, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 4. Mərkəzi Qənimət Kürəsi (Floating Orb)
        var floatOffset = Math.sin(t * 4 + orb.pulseOffset) * 5;
        var orbY = oy - 15 + floatOffset;

        var orbGrad = ctx.createRadialGradient(ox, orbY, 1, ox, orbY, r);
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.5, orb.secondaryColor);
        orbGrad.addColorStop(1, orb.color);

        ctx.fillStyle = orbGrad;
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(ox, orbY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Fırlanan kiçik peyklər (orbital dots)
        var dotAng = t * 3 + orb.pulseOffset;
        var dotDist = r + 7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox + Math.cos(dotAng) * dotDist, orbY + Math.sin(dotAng) * dotDist, 2, 0, Math.PI * 2);
        ctx.arc(ox - Math.cos(dotAng) * dotDist, orbY - Math.sin(dotAng) * dotDist, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // B) Oyunçu Ətrafındakı Aktiv Auralar
      var p = worldState && worldState.player;
      if (p) {
        // 1. Qılınc Rəqsi (blade_dance) aurası
        if (this.collectedAffixes['blade_dance']) {
          ctx.save();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 3;
          ctx.setLineDash([12, 8]);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 95, t * 3, t * 3 + Math.PI * 2);
          ctx.stroke();

          // Fırlanan 3 qılınc pəri
          for (var b = 0; b < 3; b++) {
            var bAng = t * 4 + b * ((Math.PI * 2) / 3);
            var bx = p.x + Math.cos(bAng) * 95;
            var by = p.y + Math.sin(bAng) * 95;

            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(bx, by, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // 2. Ölümsüz İradə (immortal_will) Qalxan Qübbəsi
        if (this.state.immortalShieldActive) {
          ctx.save();
          var shieldPulse = Math.sin(t * 8) * 3;
          var shieldGrad = ctx.createRadialGradient(p.x, p.y, 15, p.x, p.y, 45 + shieldPulse);
          shieldGrad.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
          shieldGrad.addColorStop(0.8, 'rgba(251, 191, 36, 0.55)');
          shieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.fillStyle = shieldGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 45 + shieldPulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    },

    // ------------------------------------------------------------------------
    // 6. EKRAN KOORDİNATLARINDA RENDER (renderHUD)
    // ------------------------------------------------------------------------
    renderHUD: function (ctx, w, h, worldState) {
      if (!ctx || !w || !h) return;

      var affixList = Object.keys(this.collectedAffixes).map(function (k) {
        return GameLoot.collectedAffixes[k];
      });
      var evoList = Object.keys(this.activeEvolutions).map(function (k) {
        return GameLoot.activeEvolutions[k];
      });

      // A) SAĞ-AŞAĞI QƏNİMƏT VƏ SİNERGİYA HUD PANİELİ (y = h - 170 ətrafı)
      var totalItems = affixList.length + evoList.length;
      var hasStatBonuses = this.runStats.damageMult > 0 || this.runStats.speedMult > 0 || this.runStats.critBonus > 0 || this.runStats.maxHpBonus > 0;

      if (totalItems > 0 || hasStatBonuses) {
        ctx.save();

        var boxW = Math.max(260, Math.min(380, 70 + totalItems * 38));
        var boxH = 48;
        var boxX = w - boxW - 20;
        var boxY = h - 175; // Alt hotbarın üstü

        // Panel fonu (Glassmorphism)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1.5;

        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 8);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.strokeRect(boxX, boxY, boxW, boxH);
        }

        // Panel Başlığı
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('💎 QƏNİMƏT & SİNERGİYA', boxX + 10, boxY + 14);

        // Əgər daimi stat bonusları varsa kiçik xülasə
        var statSummary = '';
        if (this.runStats.damageMult > 0) statSummary += ' +' + Math.round(this.runStats.damageMult * 100) + '% Zərər';
        if (this.runStats.speedMult > 0) statSummary += ' +' + Math.round(this.runStats.speedMult * 100) + '% Sürət';
        if (this.runStats.critBonus > 0) statSummary += ' +' + Math.round(this.runStats.critBonus * 100) + '% Krit';
        if (this.runStats.maxHpBonus > 0) statSummary += ' +' + this.runStats.maxHpBonus + ' Can';

        if (statSummary) {
          ctx.font = '9px "Segoe UI", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(statSummary.trim(), boxX + 125, boxY + 14);
        }

        // İkonlar Sırası
        var curX = boxX + 12;
        var iconY = boxY + 20;

        // 1. Aktiv Evolyusiyalar (Parıldayan bənövşəyi/qızılı çərçivələr)
        for (var e = 0; e < evoList.length; e++) {
          var evo = evoList[e];
          ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.5;

          ctx.fillRect(curX, iconY, 24, 22);
          ctx.strokeRect(curX, iconY, 24, 22);

          ctx.font = '13px "Segoe UI", sans-serif';
          ctx.fillText(evo.icon || '⚡', curX + 2, iconY + 16);

          curX += 30;
        }

        // 2. Əfsanəvi Affikslər (Qızılı çərçivələr)
        for (var a = 0; a < affixList.length; a++) {
          var aff = affixList[a];
          ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;

          ctx.fillRect(curX, iconY, 24, 22);
          ctx.strokeRect(curX, iconY, 24, 22);

          ctx.font = '13px "Segoe UI", sans-serif';
          ctx.fillText(aff.icon || '⭐', curX + 3, iconY + 16);

          curX += 30;
        }

        ctx.restore();
      }

      // B) ⚡ EVOLYUSİYA BANNERİ (İlk dəfə açılanda 2.5s)
      if (this.banner.active && this.banner.timer > 0) {
        ctx.save();

        var bProgress = this.banner.timer / this.banner.maxTimer; // 1 -> 0
        var alpha = Math.min(1.0, this.banner.timer * 2.0); // son 0.5s fade out

        var bannerW = Math.min(520, w * 0.85);
        var bannerH = 80;
        var bannerX = (w - bannerW) * 0.5;
        var bannerY = 110;

        ctx.globalAlpha = alpha;

        // Qaranlıq dərin fon
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = this.banner.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = this.banner.color;
        ctx.shadowBlur = 24;

        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 10);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
          ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
        }
        ctx.shadowBlur = 0;

        // Başlıq və İkon
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(this.banner.icon + ' ' + this.banner.title, w * 0.5, bannerY + 28);

        // Evolyusiyanın adı
        ctx.font = 'bold 15px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.banner.subtitle, w * 0.5, bannerY + 50);

        // Formul / Tələblər
        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('Resept: ' + this.banner.formula, w * 0.5, bannerY + 68);

        ctx.restore();
      }
    }
  };

  // Qlobal və Modul İxracı (SKILL.md Müqaviləsinə Uyğun)
  if (typeof window !== 'undefined') {
    window.GameLoot = GameLoot;
    window.GamePlugins = window.GamePlugins || [];
    window.GamePlugins.push(GameLoot);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLoot;
  }

})(typeof window !== 'undefined' ? window : globalThis);
