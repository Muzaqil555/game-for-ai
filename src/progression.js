/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ
 * Progression, Economy & Growth System (src/progression.js)
 *
 * Məsul Agent: 19 - Monetization & Growth Expert
 * Rol: İqtisadiyyat, Gücləndirmələr (Upgrades), Skinlər, Nailiyyətlər,
 *      Gündəlik Bonuslar (Retention) və Təhlükəsiz Yaddaş (localStorage).
 */

(function () {
  'use strict';

  const SAVE_KEY = 'aetheria_save_v1';
  const MAX_SAFE_CURRENCY = 999999999;
  const MAX_LEVEL = 100;

  function toSafeInt(val, fallback, min, max) {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return fallback;
    }
    const floored = Math.floor(val);
    return Math.max(min, Math.min(max, floored));
  }

  // 1. Zireh və Qılınc Skinləri Kataloqu (Azərbaycan dilində 4 Möhtəşəm Dizayn)
  const SKINS_CATALOG = {
    default: {
      id: 'default',
      name: 'Gümüş Cəngavər',
      title: 'Kral Qvardiyaçısı',
      description: 'Aetheria Krallığının ənənəvi gümüş polad zirehi və etibarlı döyüş qılıncı.',
      costGold: 0,
      costCrystals: 0,
      skinColor: '#cbd5e1', // Gümüşü polad
      swordColor: '#38bdf8', // Səma mavisi enerji
      capeColor: '#2563eb',  // Kraliyyət mavisi
      bonus: {
        critChance: 0.05,
        attackBonus: 0,
        spellBonus: 0,
        hpBonus: 0,
        speedBonus: 0
      }
    },
    crimson_flame: {
      id: 'crimson_flame',
      name: 'Alov Hökmranı',
      title: 'Qəzəbli Vulkan',
      description: 'Dərin vulkanik qorlardan döyülmüş, düşmənə alov püskürən qırmızı qüdrət zirehi.',
      costGold: 600,
      costCrystals: 25,
      skinColor: '#ef4444', // Qırmızı maqma
      swordColor: '#f97316', // Alovlu narıncı
      capeColor: '#991b1b',  // Tünd yaqut qırmızı
      bonus: {
        critChance: 0.10,
        attackBonus: 12,
        spellBonus: 6,
        hpBonus: 25,
        speedBonus: 8
      }
    },
    astral_void: {
      id: 'astral_void',
      name: 'Astral Kölgə',
      title: 'Boşluq Hakimi',
      description: 'Qaranlıq kosmik enerjilərlə toxunmuş, fövqəladə sürət və sirli sehr aurası verən libas.',
      costGold: 1400,
      costCrystals: 60,
      skinColor: '#a855f7', // Astral bənövşəyi
      swordColor: '#c084fc', // Neon bənövşəyi plazma
      capeColor: '#581c87',  // Dərin boşluq rəngi
      bonus: {
        critChance: 0.08,
        attackBonus: 6,
        spellBonus: 22,
        hpBonus: 20,
        speedBonus: 25
      }
    },
    golden_paladin: {
      id: 'golden_paladin',
      name: 'Qızıl İmperator',
      title: 'İşıq Sərkərdəsi',
      description: 'Qədim günəş ilahlarının xeyir-duasını daşıyan saf qızıl zireh və əbədi zəfər qılıncı.',
      costGold: 3000,
      costCrystals: 150,
      skinColor: '#fbbf24', // Saf kəhrəba qızılı
      swordColor: '#fef08a', // Parlaq günəş şöləsi
      capeColor: '#b45309',  // Zəngin qızılı ipək
      bonus: {
        critChance: 0.16,
        attackBonus: 22,
        spellBonus: 18,
        hpBonus: 70,
        speedBonus: 18
      }
    }
  };

  // 2. Gücləndirmə (Upgrade) Parametrləri
  const UPGRADE_CONFIG = {
    damage: {
      key: 'damage',
      name: 'Qılınc İtiyi',
      description: 'Baza yaxın döyüş zərbələrinin ziyanını artırır (+8 ziyan).',
      baseCost: 100,
      costMultiplier: 1.5,
      maxLevel: 15,
      valuePerLevel: 8
    },
    spellPower: {
      key: 'spellPower',
      name: 'Astral Qüvvət',
      description: 'Sehrli mərmi və Nova fırtınasının dağıdıcı gücünü artırır (+10 sehr gücü).',
      baseCost: 120,
      costMultiplier: 1.5,
      maxLevel: 15,
      valuePerLevel: 10
    },
    maxHp: {
      key: 'maxHp',
      name: 'Titan Canı',
      description: 'Qəhrəmanın maksimal həyat enerjisini (HP) artırır (+30 Can).',
      baseCost: 80,
      costMultiplier: 1.45,
      maxLevel: 15,
      valuePerLevel: 30
    },
    speed: {
      key: 'speed',
      name: 'Külək Addımı',
      description: 'Qaçış və manevr sürətini əhəmiyyətli dərəcədə artırır (+14 sürət).',
      baseCost: 150,
      costMultiplier: 1.55,
      maxLevel: 10,
      valuePerLevel: 14
    }
  };

  // 3. Nailiyyətlər (Achievements) Kataloqu
  const ACHIEVEMENTS_CATALOG = [
    {
      id: 'first_blood',
      title: 'İlk Qan',
      description: 'Aetheria torpaqlarında ilk düşmənini məhv et.',
      icon: '⚔️',
      rewardGold: 50,
      rewardCrystals: 5,
      condition: (stats, state) => (stats.kills || 0) >= 1
    },
    {
      id: 'rune_awakener',
      title: 'Rün Oyadıcısı',
      description: 'Qədim rün obeliskini oyadaraq əbədi enerjini sərbəst burax.',
      icon: '🔮',
      rewardGold: 120,
      rewardCrystals: 10,
      condition: (stats, state) => (stats.obelisksActivated || 0) >= 1
    },
    {
      id: 'treasure_hunter',
      title: 'Xəzinə Ovçusu',
      description: 'Aetheria dünyasında ən azı 3 gizli xəzinə sandığını tapıb aç.',
      icon: '🗝️',
      rewardGold: 180,
      rewardCrystals: 15,
      condition: (stats, state) => (stats.chestsOpened || 0) >= 3
    },
    {
      id: 'boss_slayer',
      title: 'Boss Qatili',
      description: 'Bölgənin qorxunc və qüdrətli Bossunu darmadağın et.',
      icon: '👑',
      rewardGold: 450,
      rewardCrystals: 35,
      condition: (stats, state) => (stats.bossesDefeated || 0) >= 1
    },
    {
      id: 'aetheria_legend',
      title: 'Aetheria Əfsanəsi',
      description: 'Bütün 3 bölgənin bossunu məğlub et və ən azı 5-ci səviyyəyə çat.',
      icon: '🌟',
      rewardGold: 1200,
      rewardCrystals: 100,
      condition: (stats, state) => (stats.bossesDefeated || 0) >= 3 && (state.level || 1) >= 5
    },
    {
      id: 'monster_hunter',
      title: 'Bədheybət Ovçusu',
      description: 'Cəmi 30 düşməni məğlub edərək torpaqları təmizlə.',
      icon: '🏹',
      rewardGold: 250,
      rewardCrystals: 20,
      condition: (stats, state) => (stats.kills || 0) >= 30
    },
    {
      id: 'gold_magnate',
      title: 'Qızıl Maqnatı',
      description: 'Ümumilikdə 1500 qızıl toplayaraq döyüş xəzinəsi yarat.',
      icon: '💰',
      rewardGold: 350,
      rewardCrystals: 30,
      condition: (stats, state) => (stats.totalGoldEarned || state.gold || 0) >= 1500
    }
  ];

  function createInitialState() {
    return {
      gold: 50,
      crystals: 5,
      level: 1,
      xp: 0,
      xpToNext: 100,
      currentRegion: 0,
      unlockedSkins: ['default'],
      activeSkin: 'default',
      upgrades: {
        damage: 0,
        spellPower: 0,
        maxHp: 0,
        speed: 0
      },
      stats: {
        kills: 0,
        bossesDefeated: 0,
        chestsOpened: 0,
        obelisksActivated: 0,
        totalGoldEarned: 50,
        dailyStreak: 0
      },
      achievements: {},
      lastDailyClaim: 0
    };
  }

  const GameProgression = {
    state: createInitialState(),

    /**
     * Səviyyə artımı üçün tələb olunan XP hesablama düsturu
     */
    calculateXpForLevel(level) {
      const base = 100;
      const growth = 1.35;
      const safeLevel = toSafeInt(level, 1, 1, MAX_LEVEL);
      return Math.max(100, Math.floor(base * Math.pow(growth, Math.max(0, safeLevel - 1))));
    },

    /**
     * Yaddaşdan oxuma və şema yoxlanışı
     */
    init() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const defaults = createInitialState();
            const safeLevel = toSafeInt(parsed.level, defaults.level, 1, MAX_LEVEL);
            const expectedXpToNext = this.calculateXpForLevel(safeLevel);

            // Unlocked skins siyahısını yalnız etibarlı kataloq açarları ilə filtrdən keçir
            const validSkins = ['default'];
            if (Array.isArray(parsed.unlockedSkins)) {
              for (let i = 0; i < parsed.unlockedSkins.length; i++) {
                const sId = parsed.unlockedSkins[i];
                if (typeof sId === 'string' && Object.prototype.hasOwnProperty.call(SKINS_CATALOG, sId) && !validSkins.includes(sId)) {
                  validSkins.push(sId);
                }
              }
            }

            // Aktiv skin həm kataloqda olmalı, həm də açılmış (unlocked) olmalıdır
            const safeActiveSkin = (typeof parsed.activeSkin === 'string' &&
              Object.prototype.hasOwnProperty.call(SKINS_CATALOG, parsed.activeSkin) &&
              validSkins.includes(parsed.activeSkin))
              ? parsed.activeSkin
              : 'default';

            // Nailiyyətləri prototip çirklənməsindən və saxta açarlardan qoru
            const safeAchievements = {};
            if (parsed.achievements && typeof parsed.achievements === 'object' && !Array.isArray(parsed.achievements)) {
              for (let i = 0; i < ACHIEVEMENTS_CATALOG.length; i++) {
                const achId = ACHIEVEMENTS_CATALOG[i].id;
                if (Object.prototype.hasOwnProperty.call(parsed.achievements, achId)) {
                  const rawAch = parsed.achievements[achId];
                  if (rawAch === true || (rawAch && typeof rawAch === 'object' && rawAch.unlocked === true)) {
                    safeAchievements[achId] = {
                      unlocked: true,
                      unlockedAt: toSafeInt(rawAch.unlockedAt, Date.now(), 0, Date.now() + 86400000)
                    };
                  }
                }
              }
            }

            const now = Date.now();
            this.state = {
              gold: toSafeInt(parsed.gold, defaults.gold, 0, MAX_SAFE_CURRENCY),
              crystals: toSafeInt(parsed.crystals, defaults.crystals, 0, MAX_SAFE_CURRENCY),
              level: safeLevel,
              xp: toSafeInt(parsed.xp, defaults.xp, 0, expectedXpToNext * 20),
              xpToNext: expectedXpToNext,
              currentRegion: toSafeInt(parsed.currentRegion, defaults.currentRegion, 0, 2),
              unlockedSkins: validSkins,
              activeSkin: safeActiveSkin,
              upgrades: {
                damage: toSafeInt(parsed.upgrades?.damage, 0, 0, UPGRADE_CONFIG.damage.maxLevel),
                spellPower: toSafeInt(parsed.upgrades?.spellPower, 0, 0, UPGRADE_CONFIG.spellPower.maxLevel),
                maxHp: toSafeInt(parsed.upgrades?.maxHp, 0, 0, UPGRADE_CONFIG.maxHp.maxLevel),
                speed: toSafeInt(parsed.upgrades?.speed, 0, 0, UPGRADE_CONFIG.speed.maxLevel)
              },
              stats: {
                kills: toSafeInt(parsed.stats?.kills, 0, 0, MAX_SAFE_CURRENCY),
                bossesDefeated: toSafeInt(parsed.stats?.bossesDefeated, 0, 0, MAX_SAFE_CURRENCY),
                chestsOpened: toSafeInt(parsed.stats?.chestsOpened, 0, 0, MAX_SAFE_CURRENCY),
                obelisksActivated: toSafeInt(parsed.stats?.obelisksActivated, 0, 0, MAX_SAFE_CURRENCY),
                totalGoldEarned: toSafeInt(parsed.stats?.totalGoldEarned, defaults.stats.totalGoldEarned, 0, MAX_SAFE_CURRENCY),
                dailyStreak: toSafeInt(parsed.stats?.dailyStreak, 0, 0, 365)
              },
              achievements: safeAchievements,
              lastDailyClaim: toSafeInt(parsed.lastDailyClaim, 0, 0, now)
            };

            return this.state;
          }
        }
      } catch (err) {
        console.warn('[GameProgression] Yaddaş oxunarkən xəta baş verdi, ilkin vəziyyət bərpa edilir:', err);
      }

      this.state = createInitialState();
      this.save();
      return this.state;
    },

    /**
     * Yaddaşa yazma
     */
    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
        return true;
      } catch (err) {
        console.error('[GameProgression] Yaddaşa yazılarkən xəta baş verdi:', err);
        return false;
      }
    },

    /**
     * Yaddaşı tam sıfırlama
     */
    resetSave() {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (err) {
        console.warn('[GameProgression] LocalStorage təmizlənərkən xəta:', err);
      }
      this.state = createInitialState();
      this.save();
      return this.state;
    },

    /**
     * Qızıl əlavə et
     */
    addGold(amount) {
      const rawNum = Number(amount);
      if (!Number.isFinite(rawNum) || rawNum <= 0) {
        return this.state.gold;
      }
      const num = Math.floor(rawNum);
      this.state.gold = Math.min(MAX_SAFE_CURRENCY, (this.state.gold || 0) + num);
      this.state.stats.totalGoldEarned = Math.min(MAX_SAFE_CURRENCY, (this.state.stats.totalGoldEarned || 0) + num);
      this.checkAchievements('gold', this.state.stats.totalGoldEarned);
      this.save();
      return this.state.gold;
    },

    /**
     * Kristal əlavə et
     */
    addCrystals(amount) {
      const rawNum = Number(amount);
      if (!Number.isFinite(rawNum) || rawNum <= 0) {
        return this.state.crystals;
      }
      const num = Math.floor(rawNum);
      this.state.crystals = Math.min(MAX_SAFE_CURRENCY, (this.state.crystals || 0) + num);
      this.save();
      return this.state.crystals;
    },

    /**
     * Təcrübə (XP) əlavə et və səviyyə artımını hesabla
     * @returns {{ leveledUp: boolean, oldLevel: number, newLevel: number, rewards: { gold: number, crystals: number } }}
     */
    addXP(amount) {
      const rawNum = Number(amount);
      const oldLevel = this.state.level || 1;
      if (!Number.isFinite(rawNum) || rawNum <= 0) {
        return {
          leveledUp: false,
          oldLevel,
          newLevel: oldLevel,
          currentXp: this.state.xp,
          xpToNext: this.state.xpToNext,
          rewards: { gold: 0, crystals: 0 }
        };
      }

      const num = Math.floor(rawNum);
      this.state.xp = Math.min(MAX_SAFE_CURRENCY, (this.state.xp || 0) + num);
      this.state.xpToNext = Math.max(100, this.calculateXpForLevel(this.state.level));

      let leveledUp = false;
      let totalRewardGold = 0;
      let totalRewardCrystals = 0;
      let loopGuard = 0;

      while (this.state.xp >= this.state.xpToNext && this.state.level < MAX_LEVEL && loopGuard < MAX_LEVEL) {
        loopGuard += 1;
        this.state.xp -= this.state.xpToNext;
        this.state.level += 1;
        this.state.xpToNext = this.calculateXpForLevel(this.state.level);
        leveledUp = true;

        // Hər səviyyə üçün qızıl və kristal bonusu
        const bonusGold = this.state.level * 40;
        const bonusCrystals = 3 + Math.floor(this.state.level / 2);
        this.state.gold = Math.min(MAX_SAFE_CURRENCY, this.state.gold + bonusGold);
        this.state.crystals = Math.min(MAX_SAFE_CURRENCY, this.state.crystals + bonusCrystals);
        this.state.stats.totalGoldEarned = Math.min(MAX_SAFE_CURRENCY, (this.state.stats.totalGoldEarned || 0) + bonusGold);

        totalRewardGold += bonusGold;
        totalRewardCrystals += bonusCrystals;
      }

      if (this.state.level >= MAX_LEVEL) {
        this.state.xp = Math.min(this.state.xp, Math.max(0, this.state.xpToNext - 1));
      }

      if (leveledUp) {
        this.checkAchievements('level', this.state.level);
      }

      this.save();

      return {
        leveledUp,
        oldLevel,
        newLevel: this.state.level,
        currentXp: this.state.xp,
        xpToNext: this.state.xpToNext,
        rewards: {
          gold: totalRewardGold,
          crystals: totalRewardCrystals
        }
      };
    },

    /**
     * Gücləndirmə xərcini hesabla (number qaytarır)
     */
    getUpgradeCost(key) {
      const cfg = UPGRADE_CONFIG[key];
      if (!cfg) return Infinity;

      const currentLvl = this.state.upgrades[key] || 0;
      if (currentLvl >= cfg.maxLevel) {
        return Infinity;
      }

      return Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, currentLvl));
    },

    /**
     * Gücləndirmə haqqında ətraflı məlumat
     */
    getUpgradeInfo(key) {
      const cfg = UPGRADE_CONFIG[key];
      if (!cfg) return null;

      const currentLevel = this.state.upgrades[key] || 0;
      const isMax = currentLevel >= cfg.maxLevel;
      const cost = isMax ? null : this.getUpgradeCost(key);

      return {
        key,
        name: cfg.name,
        description: cfg.description,
        currentLevel,
        maxLevel: cfg.maxLevel,
        cost,
        isMax,
        canAfford: !isMax && this.state.gold >= cost
      };
    },

    /**
     * Gücləndirmə satın al
     */
    buyUpgrade(key) {
      const cfg = UPGRADE_CONFIG[key];
      if (!cfg) {
        return { success: false, reason: 'invalid_upgrade' };
      }

      const currentLvl = this.state.upgrades[key] || 0;
      if (currentLvl >= cfg.maxLevel) {
        return { success: false, reason: 'max_level' };
      }

      const cost = this.getUpgradeCost(key);
      if (this.state.gold < cost) {
        return { success: false, reason: 'insufficient_gold', required: cost, current: this.state.gold };
      }

      this.state.gold -= cost;
      this.state.upgrades[key] = currentLvl + 1;
      this.save();

      return {
        success: true,
        key,
        newLevel: this.state.upgrades[key],
        remainingGold: this.state.gold,
        cost
      };
    },

    /**
     * Bütün zireh/silah skinlərinin siyahısını qaytarır
     */
    getSkins() {
      return Object.values(SKINS_CATALOG).map(skin => {
        const isUnlocked = this.state.unlockedSkins.includes(skin.id);
        const isEquipped = this.state.activeSkin === skin.id;
        const canAfford = !isUnlocked && this.state.gold >= skin.costGold && this.state.crystals >= skin.costCrystals;

        return {
          id: skin.id,
          name: skin.name,
          title: skin.title,
          description: skin.description,
          desc: skin.description,
          costGold: skin.costGold,
          costCrystals: skin.costCrystals,
          cost: skin.costCrystals,
          color: skin.skinColor,
          isUnlocked,
          isEquipped,
          canAfford,
          colors: {
            skinColor: skin.skinColor,
            swordColor: skin.swordColor,
            capeColor: skin.capeColor
          },
          bonus: skin.bonus
        };
      });
    },

    /**
     * Skin al və ya təchiz et (equip)
     */
    buyOrEquipSkin(skinId) {
      const skin = SKINS_CATALOG[skinId];
      if (!skin) {
        return { success: false, reason: 'invalid_skin' };
      }

      // Əgər artıq açılıbsa, sadəcə təchiz et
      if (this.state.unlockedSkins.includes(skinId)) {
        this.state.activeSkin = skinId;
        this.save();
        return {
          success: true,
          action: 'equipped',
          skinId,
          skin
        };
      }

      // Əgər kilidlidirisə, almağa cəhd et
      if (this.state.gold < skin.costGold || this.state.crystals < skin.costCrystals) {
        return {
          success: false,
          reason: 'insufficient_funds',
          requiredGold: skin.costGold,
          requiredCrystals: skin.costCrystals,
          currentGold: this.state.gold,
          currentCrystals: this.state.crystals
        };
      }

      // Satın al və təchiz et
      this.state.gold -= skin.costGold;
      this.state.crystals -= skin.costCrystals;
      this.state.unlockedSkins.push(skinId);
      this.state.activeSkin = skinId;
      this.save();

      return {
        success: true,
        action: 'bought_and_equipped',
        skinId,
        skin,
        remainingGold: this.state.gold,
        remainingCrystals: this.state.crystals
      };
    },

    /**
     * Oyunçunun hesablanmış tam döyüş göstəriciləri
     * (Baza + Səviyyə + Upgrades + Aktiv Skin bonusları)
     */
    getComputedPlayerStats() {
      const lvl = this.state.level || 1;
      const up = this.state.upgrades || {};
      const activeSkinData = SKINS_CATALOG[this.state.activeSkin] || SKINS_CATALOG.default;
      const skinBonus = activeSkinData.bonus || {};

      // Baza göstəricilər
      const baseMaxHp = 100;
      const baseMaxMana = 100;
      const baseAttackDamage = 22;
      const baseSpellDamage = 35;
      const baseMoveSpeed = 220;
      const baseCritChance = 0.05;

      // Hesablanmış göstəricilər
      const maxHp = baseMaxHp + ((up.maxHp || 0) * UPGRADE_CONFIG.maxHp.valuePerLevel) + (lvl * 6) + (skinBonus.hpBonus || 0);
      const maxMana = baseMaxMana + (lvl * 8);
      const attackDamage = baseAttackDamage + ((up.damage || 0) * UPGRADE_CONFIG.damage.valuePerLevel) + (lvl * 2) + (skinBonus.attackBonus || 0);
      const spellDamage = baseSpellDamage + ((up.spellPower || 0) * UPGRADE_CONFIG.spellPower.valuePerLevel) + (lvl * 3) + (skinBonus.spellBonus || 0);
      const moveSpeed = baseMoveSpeed + ((up.speed || 0) * UPGRADE_CONFIG.speed.valuePerLevel) + (skinBonus.speedBonus || 0);
      const critChance = Math.min(0.75, baseCritChance + (lvl * 0.005) + (skinBonus.critChance || 0));

      return {
        level: lvl,
        maxHp: Math.round(maxHp),
        maxMana: Math.round(maxMana),
        attackDamage: Math.round(attackDamage),
        spellDamage: Math.round(spellDamage),
        moveSpeed: Math.round(moveSpeed),
        critChance: Number(critChance.toFixed(3)),
        skinColor: activeSkinData.skinColor,
        swordColor: activeSkinData.swordColor,
        capeColor: activeSkinData.capeColor,
        skinName: activeSkinData.name,
        skinId: activeSkinData.id
      };
    },

    /**
     * Nailiyyətlərin yoxlanması və mükafatlandırılması
     * @returns {Object|null} Yeni açılan nailiyyət (və ya null)
     */
    checkAchievements(eventType, value) {
      if (!this.state.stats || typeof this.state.stats !== 'object') {
        this.state.stats = createInitialState().stats;
      }

      // Engine və digər modullardan gələn statistikanı sinxronlaşdır
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        const safeVal = Math.min(MAX_SAFE_CURRENCY, Math.floor(value));
        if (eventType === 'kills' || eventType === 'kill') {
          this.state.stats.kills = Math.max(this.state.stats.kills || 0, safeVal);
        } else if (eventType === 'chests' || eventType === 'chest' || eventType === 'chestsOpened') {
          this.state.stats.chestsOpened = Math.max(this.state.stats.chestsOpened || 0, safeVal);
        } else if (eventType === 'boss' || eventType === 'bosses' || eventType === 'bossesDefeated') {
          this.state.stats.bossesDefeated = Math.max(this.state.stats.bossesDefeated || 0, safeVal);
        } else if (eventType === 'obelisks' || eventType === 'obelisk' || eventType === 'obelisksActivated') {
          this.state.stats.obelisksActivated = Math.max(this.state.stats.obelisksActivated || 0, safeVal);
        } else if (eventType === 'gold' || eventType === 'totalGoldEarned') {
          this.state.stats.totalGoldEarned = Math.max(this.state.stats.totalGoldEarned || 0, safeVal);
        }
      }

      let newlyUnlocked = null;

      for (const ach of ACHIEVEMENTS_CATALOG) {
        const existing = this.state.achievements[ach.id];
        if (!existing || !existing.unlocked) {
          const isSatisfied = ach.condition(this.state.stats, this.state);
          if (isSatisfied) {
            this.state.achievements[ach.id] = {
              unlocked: true,
              unlockedAt: Date.now()
            };

            // Mükafatı balansa əlavə et
            this.state.gold = Math.min(MAX_SAFE_CURRENCY, (this.state.gold || 0) + ach.rewardGold);
            this.state.crystals = Math.min(MAX_SAFE_CURRENCY, (this.state.crystals || 0) + ach.rewardCrystals);
            this.state.stats.totalGoldEarned = Math.min(MAX_SAFE_CURRENCY, (this.state.stats.totalGoldEarned || 0) + ach.rewardGold);

            newlyUnlocked = {
              id: ach.id,
              title: ach.title,
              description: ach.description,
              icon: ach.icon,
              rewardGold: ach.rewardGold,
              rewardCrystals: ach.rewardCrystals
            };

            this.save();
            break; // Tək zəngdə bir nailiyyət bildirişi qayıtması üçün
          }
        }
      }

      return newlyUnlocked;
    },

    /**
     * Bütün nailiyyətlərin tam siyahısı
     */
    getAchievementsList() {
      return ACHIEVEMENTS_CATALOG.map(ach => {
        const userAch = this.state.achievements[ach.id];
        const isUnlocked = Boolean(userAch && userAch.unlocked);

        return {
          id: ach.id,
          title: ach.title,
          description: ach.description,
          icon: ach.icon,
          rewardGold: ach.rewardGold,
          rewardCrystals: ach.rewardCrystals,
          unlocked: isUnlocked,
          unlockedAt: isUnlocked ? userAch.unlockedAt : null
        };
      });
    },

    /**
     * Gündəlik mükafatın alına bilmə vəziyyəti
     */
    canClaimDailyBonus() {
      const now = Date.now();
      const rawClaim = this.state.lastDailyClaim || 0;
      const lastClaim = (typeof rawClaim === 'number' && Number.isFinite(rawClaim) && rawClaim <= now) ? Math.max(0, rawClaim) : 0;
      const cooldownMs = 24 * 60 * 60 * 1000;
      return lastClaim === 0 || (now - lastClaim) >= cooldownMs;
    },

    /**
     * Gündəlik mükafat üçün qalan vaxt (ms)
     */
    getTimeUntilNextDailyBonus() {
      const now = Date.now();
      const rawClaim = this.state.lastDailyClaim || 0;
      const lastClaim = (typeof rawClaim === 'number' && Number.isFinite(rawClaim) && rawClaim <= now) ? Math.max(0, rawClaim) : 0;
      if (lastClaim === 0) return 0;
      const cooldownMs = 24 * 60 * 60 * 1000;
      const diff = (lastClaim + cooldownMs) - now;
      return Math.max(0, diff);
    },

    /**
     * Gündəlik qızıl və kristal bonusunu tələb et (Retention & Streak Mexanikası)
     */
    claimDailyBonus() {
      const now = Date.now();
      const rawClaim = this.state.lastDailyClaim || 0;
      const lastClaim = (typeof rawClaim === 'number' && Number.isFinite(rawClaim) && rawClaim <= now) ? Math.max(0, rawClaim) : 0;
      const cooldownMs = 24 * 60 * 60 * 1000;
      const streakBreakMs = 48 * 60 * 60 * 1000; // 48 saatdan çox fasilə olarsa streak qırılır

      if (lastClaim > 0 && (now - lastClaim) < cooldownMs) {
        const remainingMs = cooldownMs - (now - lastClaim);
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return {
          success: false,
          reason: 'cooldown_active',
          remainingMs,
          formattedTime: `${hours} saat ${minutes} dəqiqə`,
          streak: this.state.stats.dailyStreak || 0
        };
      }

      // Streak hesabla (1-dən 7-yə qədər artan dövr)
      let currentStreak = toSafeInt(this.state.stats.dailyStreak, 0, 0, 365);
      if (lastClaim === 0 || (now - lastClaim) <= streakBreakMs) {
        currentStreak = (currentStreak % 7) + 1;
      } else {
        currentStreak = 1; // Fasilə çox olub, sıfırlanır
      }

      this.state.stats.dailyStreak = currentStreak;

      // Mükafat hesabı: streak artdıqca bonus böyüyür
      const baseGold = 150;
      const baseCrystals = 8;
      const streakBonusGold = currentStreak * 45;
      const streakBonusCrystals = currentStreak * 3;

      const totalRewardGold = baseGold + streakBonusGold;
      const totalRewardCrystals = baseCrystals + streakBonusCrystals;

      this.state.gold = Math.min(MAX_SAFE_CURRENCY, (this.state.gold || 0) + totalRewardGold);
      this.state.crystals = Math.min(MAX_SAFE_CURRENCY, (this.state.crystals || 0) + totalRewardCrystals);
      this.state.stats.totalGoldEarned = Math.min(MAX_SAFE_CURRENCY, (this.state.stats.totalGoldEarned || 0) + totalRewardGold);
      this.state.lastDailyClaim = now;

      // Nailiyyət yoxlanışı
      this.checkAchievements('daily', currentStreak);
      this.save();

      return {
        success: true,
        streak: currentStreak,
        rewardGold: totalRewardGold,
        rewardCrystals: totalRewardCrystals,
        gold: this.state.gold,
        crystals: this.state.crystals,
        message: `${currentStreak}-ci Gün Mükafatı: +${totalRewardGold} Qızıl və +${totalRewardCrystals} Kristal əldə etdiniz!`
      };
    },

    /**
     * Döyüş və oyun hadisələrini qeydə almaq üçün köməkçi metod
     */
    recordStat(statKey, delta = 1) {
      const allowedKeys = ['kills', 'bossesDefeated', 'chestsOpened', 'obelisksActivated', 'totalGoldEarned', 'dailyStreak'];
      if (typeof statKey !== 'string' || !allowedKeys.includes(statKey)) {
        return { currentValue: 0, unlockedAchievement: null };
      }
      const safeDelta = toSafeInt(Number(delta), 0, 0, MAX_SAFE_CURRENCY);
      if (safeDelta <= 0) {
        return { currentValue: this.state.stats[statKey] || 0, unlockedAchievement: null };
      }
      if (typeof this.state.stats[statKey] !== 'number' || !Number.isFinite(this.state.stats[statKey])) {
        this.state.stats[statKey] = 0;
      }
      this.state.stats[statKey] = Math.min(MAX_SAFE_CURRENCY, this.state.stats[statKey] + safeDelta);
      const unlocked = this.checkAchievements(statKey, this.state.stats[statKey]);
      this.save();
      return {
        currentValue: this.state.stats[statKey],
        unlockedAchievement: unlocked
      };
    }
  };

  // Qlobal obyektə bağla
  window.GameProgression = GameProgression;

  // Səhifə yüklənəndə avtomatik ilkinləşdir
  if (typeof window !== 'undefined') {
    GameProgression.init();
  }
})();
