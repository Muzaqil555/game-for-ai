/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V2.0 — AAA Mega-Edition)
 * src/weapons_relics.js — Silah Arsenalı və Roguelike Relikt Mütəxəssisi
 * Qlobal Obyekt: window.GameRelics
 * 
 * Bu modul oyunçunun 4 dəyişdirilən əfsanəvi silahını ([1] Aether Qılıncı,
 * [2] Əkiz Kölgə Xəncərləri, [3] Astral Döyüş Çəkici, [4] Simurq Alov Yayı)
 * və Level-Up / Sandıqlardan qazanılan 12 güclü Roguelike Relikt / Boon kartını idarə edir.
 */

(function (global) {
  'use strict';

  // --- Köməkçi Riyazi Utilitlər ---
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  // =========================================================================
  // 1. ƏFSANƏVİ SİLAHLAR ARSENALI (4 DƏYİŞDİRİLƏN SİLAH)
  // =========================================================================
  const WEAPONS_CATALOG = {
    sword: {
      id: 'sword',
      slot: 1,
      key: '1',
      name: 'Aether Qılıncı',
      icon: '⚔️',
      type: 'melee',
      damageMult: 1.0,
      comboDamageMults: [1.0, 1.25, 1.85], // 3-lü kombo gücü
      cooldown: 0.22,
      finisherCooldown: 0.32,
      range: 110,
      finisherRange: 135,
      spread: Math.PI * 0.55, // ~100°
      finisherSpread: (330 * Math.PI) / 180, // 330° Whirlwind finişer!
      color: '#38bdf8',
      finisherColor: '#f59e0b',
      sound: 'slash1',
      finisherSound: 'slash3',
      isRanged: false,
      manaCost: 0,
      critBonus: 0,
      description: 'Balanslı 3-lü zərbə kombinasiyası və 330° qasırğa finişeri.'
    },

    daggers: {
      id: 'daggers',
      slot: 2,
      key: '2',
      name: 'Əkiz Kölgə Xəncərləri',
      icon: '🗡️',
      type: 'dual_melee',
      damageMult: 0.76,
      cooldown: 0.14, // İldırım sürətli vuruş (0.14s)
      range: 85,
      spread: Math.PI * 0.42,
      color: '#c084fc',
      critBonus: 0.25, // +25% Krit şansı
      bleedTimer: 3.0, // 3 saniyə qanaxma
      bleedDps: 18, // Hər saniyə 18 zəhər/qanaxma zərəri
      sound: 'dagger',
      isRanged: false,
      manaCost: 0,
      description: 'İldırım sürətli cüt zərbələr (0.14s), +25% Krit şansı və hər vuruşda düşmənə kölgə qanaxması/zəhəri.'
    },

    hammer: {
      id: 'hammer',
      slot: 3,
      key: '3',
      name: 'Astral Döyüş Çəkici',
      icon: '🔨',
      type: 'heavy_melee',
      damageMult: 1.85, // Ağır sarsıdıcı zərbə (1.85x)
      cooldown: 0.52,
      range: 140,
      spread: Math.PI * 1.4,
      shockwaveRadius: 140, // 140px dairəvi şok dalğası
      knockbackForce: 460, // Güclü knockback
      stunDuration: 0.8, // 0.8s dondurma / Stun
      color: '#60a5fa',
      shockwaveColor: '#93c5fd',
      sound: 'hammer',
      isRanged: false,
      manaCost: 0,
      description: 'Ağır sarsıdıcı zərbə (1.85x), 140px dairəvi şok dalğası, güclü knockback və düşmənləri 0.8s dondurma.'
    },

    bow: {
      id: 'bow',
      slot: 4,
      key: '4',
      name: 'Simurq Alov Yayı',
      icon: '🏹',
      type: 'ranged',
      damageMult: 0.88,
      cooldown: 0.32,
      range: 560,
      projectileCount: 3, // Eyni anda 3 alov oxu
      spreadAngle: (15 * Math.PI) / 180, // 15° bucaq fərqi ilə yayılan oxlar (-15°, 0°, +15°)
      projectileSpeed: 720,
      projectileRadius: 6,
      pierce: 2, // Deşici oxlar (2 düşməndən keçir)
      color: '#f97316',
      arrowColor: '#fb923c',
      sound: 'bow',
      isRanged: true,
      manaCost: 0, // Sıfır mana sərfiyyatı!
      description: 'Uzaq məsafəyə eyni anda 15° bucaq fərqi ilə yayılan 3 deşici Simurq alov oxu atır. Sıfır mana!'
    }
  };

  // =========================================================================
  // 2. 12 ROGUELIKE RELİKT / BOON KARTLARI KATALOQU
  // =========================================================================
  const RELICS_CATALOG = {
    vampire_fang: {
      id: 'vampire_fang',
      name: 'Vampir Dişi',
      icon: '🧛',
      rarity: 'uncommon',
      color: '#ef4444',
      description: 'Hər uğurlu zərbədə can bərpası (+3 HP / səviyyə).',
      level: 0,
      maxLevel: 5,
      healPerHit: 3
    },

    chain_lightning: {
      id: 'chain_lightning',
      name: 'Fırtına Zənciri',
      icon: '⚡',
      rarity: 'rare',
      color: '#00e5ff',
      description: 'Vuruşlar yaxınlıqdakı 3 düşmənə zəncirvari elektrik sıçradır.',
      level: 0,
      maxLevel: 5,
      chainTargets: 3,
      chainRange: 190,
      chainDamageMult: 0.55
    },

    fire_orbitals: {
      id: 'fire_orbitals',
      name: 'Alov Halqası',
      icon: '🔥',
      rarity: 'epic',
      color: '#f97316',
      description: 'Oyunçunun ətrafında fırlanan və toxunan düşmənləri yandıran alov kürələri.',
      level: 0,
      maxLevel: 5,
      baseOrbs: 2, // Səviyyə 1-də 2 kürə, hər səviyyə +1 kürə
      orbRadius: 75,
      orbSpeed: 3.4,
      orbDamage: 18,
      burnDps: 12
    },

    frost_touch: {
      id: 'frost_touch',
      name: 'Buzlu Toxunuş',
      icon: '❄️',
      rarity: 'common',
      color: '#38bdf8',
      description: 'Zərbələr düşmənləri 2.0 saniyə ərzində 40% yavaşladır.',
      level: 0,
      maxLevel: 5,
      slowDuration: 2.0,
      slowFactor: 0.60 // Sürəti 40% azaldır (0.60x)
    },

    shadow_clone: {
      id: 'shadow_clone',
      name: 'Kölgə Klonu',
      icon: '👤',
      rarity: 'rare',
      color: '#a855f7',
      description: 'Dash etdikdə geridə partlayan kölgə tələsi qoyur.',
      level: 0,
      maxLevel: 5,
      trapFuse: 0.85,
      trapRadius: 115,
      trapDamage: 55
    },

    executioner: {
      id: 'executioner',
      name: 'Cəlladın Hökmü',
      icon: '🪓',
      rarity: 'epic',
      color: '#dc2626',
      description: 'Canı 30%-dən az olan düşmənlərə 2x zərər vurur.',
      level: 0,
      maxLevel: 3,
      hpThreshold: 0.30,
      damageMultiplier: 2.0
    },

    astral_flow: {
      id: 'astral_flow',
      name: 'Astral Axın',
      icon: '🔮',
      rarity: 'rare',
      color: '#8b5cf6',
      description: '+50% Mana bərpası və sehrlərin gözləmə müddətini 25% azaldır.',
      level: 0,
      maxLevel: 3,
      manaRegenBonus: 0.50,
      spellCooldownReduction: 0.25
    },

    giant_heart: {
      id: 'giant_heart',
      name: 'Nəhəngin Ürəyi',
      icon: '💖',
      rarity: 'uncommon',
      color: '#ec4899',
      description: '+60 Maksimum Can və +3 HP/san daimi təbii bərpa.',
      level: 0,
      maxLevel: 5,
      maxHpBonus: 60,
      hpRegenPerSec: 3.0
    },

    greed_hoard: {
      id: 'greed_hoard',
      name: 'Qızıl Hərisliyi',
      icon: '💰',
      rarity: 'common',
      color: '#f59e0b',
      description: 'Düşmənlərdən və sandıqlardan +40% daha çox qızıl düşür.',
      level: 0,
      maxLevel: 5,
      goldBonusMult: 0.40
    },

    critical_fury: {
      id: 'critical_fury',
      name: 'Kritik Qəzəb',
      icon: '⚔️',
      rarity: 'epic',
      color: '#fbbf24',
      description: '+18% Kritik şans və +50% Kritik zərər bəxş edir.',
      level: 0,
      maxLevel: 5,
      critChanceBonus: 0.18,
      critDamageBonus: 0.50
    },

    wind_boots: {
      id: 'wind_boots',
      name: 'Külək Ayaqqabıları',
      icon: '👟',
      rarity: 'uncommon',
      color: '#10b981',
      description: '+22% Qaçış sürəti və -25% Dash gözləmə müddəti.',
      level: 0,
      maxLevel: 5,
      speedBonusMult: 0.22,
      dashCooldownReduction: 0.25
    },

    doom_rune: {
      id: 'doom_rune',
      name: 'Qiyamət Rünü',
      icon: '🔱',
      rarity: 'legendary',
      color: '#f43f5e',
      description: 'Ultimate Qəzəb (Rage) barı 40% daha sürətli dolur.',
      level: 0,
      maxLevel: 3,
      rageGainBonusMult: 0.40
    }
  };

  // =========================================================================
  // 3. ƏSAS GameRelics OBYEKTİ VƏ METODLARI
  // =========================================================================
  const GameRelics = {
    // Cari aktiv silah ID-si
    currentWeaponId: 'sword',

    // Aktiv reliktlər xəritəsi: relicId -> relicObject
    relics: {},

    // Fırlanan alov kürələri vəziyyəti
    orbitals: [],
    orbitalAngle: 0,

    // Dash kölgə klonu tələləri
    shadowTraps: [],

    // İnitsializasiya bayrağı
    isInitialized: false,

    /**
     * Sistemi ilkin vəziyyətə gətirir
     */
    init: function () {
      this.currentWeaponId = 'sword';
      this.relics = {};
      this.orbitals = [];
      this.orbitalAngle = 0;
      this.shadowTraps = [];

      // Kataloqdakı reliktlərin səviyyələrini sıfırla
      for (const key in RELICS_CATALOG) {
        if (Object.prototype.hasOwnProperty.call(RELICS_CATALOG, key)) {
          this.relics[key] = Object.assign({}, RELICS_CATALOG[key], { level: 0 });
        }
      }

      // 1-4 düymələri GameEngine tərəfindən idarə olunur (tək giriş yolu)

      this.isInitialized = true;
      console.log('⚔️ [GameRelics] Silah Arsenalı və 12 Roguelike Relikt sistemi aktivləşdirildi.');
      return this;
    },

    /**
     * Cari aktiv silah obyektini qaytarır
     */
    getActiveWeapon: function () {
      const weapon = WEAPONS_CATALOG[this.currentWeaponId] || WEAPONS_CATALOG.sword;
      return Object.assign({}, weapon);
    },

    /**
     * Bütün 4 silahın siyahısını massiv kimi qaytarır
     */
    getAllWeapons: function () {
      return Object.values(WEAPONS_CATALOG).map((w) => Object.assign({}, w));
    },

    /**
     * Slot nömrəsi (1..4) və ya ID ('sword'|'daggers'|'hammer'|'bow') ilə silahı dəyişir
     */
    switchWeapon: function (slotOrId) {
      let targetId = null;

      if (typeof slotOrId === 'number' || !isNaN(parseInt(slotOrId, 10))) {
        const slot = parseInt(slotOrId, 10);
        for (const id in WEAPONS_CATALOG) {
          if (WEAPONS_CATALOG[id].slot === slot) {
            targetId = id;
            break;
          }
        }
      } else if (typeof slotOrId === 'string') {
        const lower = slotOrId.toLowerCase().trim();
        if (WEAPONS_CATALOG[lower]) {
          targetId = lower;
        } else {
          // Əgər rəqəm stringi göndərilibsə ('1', '2' və s.)
          const slot = parseInt(lower, 10);
          for (const id in WEAPONS_CATALOG) {
            if (WEAPONS_CATALOG[id].slot === slot) {
              targetId = id;
              break;
            }
          }
        }
      }

      if (!targetId || !WEAPONS_CATALOG[targetId]) {
        console.warn('[GameRelics] Naməlum silah slotu və ya ID-si:', slotOrId);
        return this.getActiveWeapon();
      }

      if (this.currentWeaponId === targetId) {
        return this.getActiveWeapon();
      }

      this.currentWeaponId = targetId;
      const weapon = WEAPONS_CATALOG[targetId];

      // Səs effekti
      this._playSafeSFX(weapon.sound || 'click');

      // Oyunçuya vizual bildiriş (əgər GameVFX mövcuddursa)
      if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
        const player = (window.GameEngine && window.GameEngine.player) ? window.GameEngine.player : null;
        if (player) {
          window.GameVFX.spawnFloatingText(player.x, player.y - 32, `${weapon.icon} ${weapon.name}`, weapon.color, 16);
        }
      }

      // Xüsusi DOM hadisəsi yay (UI barı və digər agentlər üçün)
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('weaponChanged', { detail: Object.assign({}, weapon) }));
        } catch (_) {}
      }

      console.log(`🗡️ [GameRelics] Silah dəyişdirildi: [${weapon.slot}] ${weapon.name}`);
      return this.getActiveWeapon();
    },

    /**
     * Level-Up zamanı oyunçuya təqdim etmək üçün təsadüfi `count` sayda relikt kartı qaytarır
     */
    getRelicChoices: function (count = 3) {
      const available = [];

      for (const id in this.relics) {
        const relic = this.relics[id];
        if (relic.level < relic.maxLevel) {
          available.push(relic);
        }
      }

      // Əgər mövcud relikt azdırsa hamısını qaytar
      if (available.length <= count) {
        return available.map((r) => this._formatRelicCard(r));
      }

      // Fisher-Yates alqoritmi ilə unikal təsadüfi seçim
      const pool = available.slice();
      const choices = [];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
      }

      return choices.map((r) => this._formatRelicCard(r));
    },

    /**
     * UI üçün kart məlumat formatı
     */
    _formatRelicCard: function (relic) {
      const nextLevel = (relic.level || 0) + 1;
      return {
        id: relic.id,
        name: relic.name,
        icon: relic.icon,
        rarity: relic.rarity,
        color: relic.color,
        description: relic.description,
        level: nextLevel,
        currentLevel: relic.level,
        maxLevel: relic.maxLevel,
        isNew: relic.level === 0
      };
    },

    /**
     * Seçilmiş relikti aktivləşdirir və ya onun səviyyəsini artırır
     */
    selectRelic: function (relicId) {
      if (!this.relics[relicId]) {
        console.warn('[GameRelics] Naməlum relikt ID:', relicId);
        return null;
      }

      const relic = this.relics[relicId];
      if (relic.level >= relic.maxLevel) {
        console.warn(`[GameRelics] ${relic.name} artıq maksimum səviyyədədir (${relic.maxLevel})!`);
        return relic;
      }

      relic.level += 1;

      // Xüsusi reliktlərin anlıq təsirləri
      if (relic.id === 'fire_orbitals') {
        this._rebuildOrbitals();
      } else if (relic.id === 'giant_heart') {
        // Maksimum canı artır və dərhal həmin miqdar qədər sağalt
        if (typeof window !== 'undefined' && window.GameEngine && window.GameEngine.player) {
          const p = window.GameEngine.player;
          p.maxHp = (p.maxHp || 100) + relic.maxHpBonus;
          p.hp = Math.min(p.maxHp, (p.hp || 100) + relic.maxHpBonus);
        }
      }

      // Səs effekti
      this._playSafeSFX('levelUp');

      // VFX Bildirişi
      if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
        const player = (window.GameEngine && window.GameEngine.player) ? window.GameEngine.player : null;
        if (player) {
          window.GameVFX.spawnFloatingText(
            player.x,
            player.y - 36,
            `${relic.icon} ${relic.name} Lv.${relic.level}`,
            relic.color,
            17
          );
        }
      }

      // Qlobal hadisə
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('relicSelected', { detail: Object.assign({}, relic) }));
        } catch (_) {}
      }

      console.log(`✨ [GameRelics] Relikt seçildi: ${relic.name} (Səviyyə: ${relic.level}/${relic.maxLevel})`);
      return Object.assign({}, relic);
    },

    /**
     * Oyunçunun topladığı bütün aktiv reliktləri qaytarır (level > 0)
     */
    getActiveRelics: function () {
      const active = [];
      for (const id in this.relics) {
        if (this.relics[id].level > 0) {
          active.push(Object.assign({}, this.relics[id]));
        }
      }
      return active;
    },

    /**
     * Alov Halqası kürələrini səviyyəyə uyğun yenidən qurur
     */
    _rebuildOrbitals: function () {
      const relic = this.relics.fire_orbitals;
      if (!relic || relic.level <= 0) {
        this.orbitals = [];
        return;
      }

      // Səviyyə 1 -> 2 kürə, hər yeni səviyyədə +1 əlavə kürə (maksimum 6 kürə)
      const count = relic.baseOrbs + (relic.level - 1);
      this.orbitals = [];

      for (let i = 0; i < count; i++) {
        this.orbitals.push({
          index: i,
          x: 0,
          y: 0,
          radius: 9,
          baseDistance: relic.orbRadius || 75,
          color: '#f97316',
          innerColor: '#ffedd5',
          damage: relic.orbDamage + (relic.level * 4),
          burnDps: relic.burnDps + (relic.level * 3)
        });
      }
    },

    /**
     * Fırlanan Alov Kürələrini (Orbitals) yeniləyir və toxunan düşmənlərə zərər vurur
     */
    updateOrbitals: function (dt, player, enemies, callbacks) {
      if (!player) return;

      const relic = this.relics.fire_orbitals;
      if (!relic || relic.level <= 0) {
        this.orbitals = [];
        return;
      }

      if (this.orbitals.length === 0) {
        this._rebuildOrbitals();
      }

      const totalOrbs = this.orbitals.length;
      if (totalOrbs === 0) return;

      // Fırlanma bucağını artır
      const speed = (relic.orbSpeed || 3.4) + (relic.level * 0.15);
      this.orbitalAngle += dt * speed;
      if (this.orbitalAngle > Math.PI * 2) {
        this.orbitalAngle -= Math.PI * 2;
      }

      const step = (Math.PI * 2) / totalOrbs;
      const enemyList = Array.isArray(enemies) ? enemies : [];

      for (let i = 0; i < totalOrbs; i++) {
        const orb = this.orbitals[i];
        const angle = this.orbitalAngle + (i * step);
        const dist = orb.baseDistance || 75;

        orb.x = player.x + Math.cos(angle) * dist;
        orb.y = player.y + Math.sin(angle) * dist;
        orb.angle = angle;

        // Yaxınlıqdakı düşmənlərlə toqquşma yoxlanışı
        for (let j = 0; j < enemyList.length; j++) {
          const enemy = enemyList[j];
          if (!enemy || enemy.hp <= 0) continue;

          // Hər düşmənin orbital zərbə cooldown-u (saniyədə 2-3 dəfədən çox vurmasın)
          if ((enemy.orbitalHitCooldown || 0) > 0) continue;

          const eRadius = enemy.radius || 20;
          const hitDist = distance(orb.x, orb.y, enemy.x, enemy.y);

          if (hitDist <= eRadius + orb.radius + 6) {
            enemy.orbitalHitCooldown = 0.36; // 0.36s toxunma pəncərəsi
            const dmg = Math.round(orb.damage);

            // Zərərin tətbiqi
            if (callbacks && typeof callbacks.onHitEnemy === 'function') {
              callbacks.onHitEnemy(enemy, dmg, 'orbital');
            } else {
              enemy.hp -= dmg;
            }

            // Düşmənə Alov Yandırma (Burn DOT) tətbiq et
            enemy.burnTimer = 2.4;
            enemy.burnDps = Math.max(enemy.burnDps || 0, orb.burnDps);
            enemy.burnColor = '#f97316';

            // Vizual qığılcımlar
            if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
              window.GameVFX.spawnHitSparks(orb.x, orb.y, '#f97316', 7);
            }
          }
        }
      }
    },

    /**
     * Vuruş (On-Hit) anında silah və relikt effektlərini tətbiq edir
     */
    applyOnHitEffects: function (player, targetEnemy, enemies, baseDamage, callbacks) {
      if (!targetEnemy || targetEnemy.hp <= 0) return { bonusDamage: 0 };

      const curWeapon = this.getActiveWeapon();
      const enemyList = Array.isArray(enemies) ? enemies : [];
      let bonusDamage = 0;
      let isExecutioner = false;

      // -------------------------------------------------------------
      // A. SİLAH EFFEKTLƏRİ
      // -------------------------------------------------------------
      // 1. Əkiz Kölgə Xəncərləri: Kölgə qanaxması/zəhəri (DOT)
      if (curWeapon.id === 'daggers') {
        targetEnemy.bleedTimer = curWeapon.bleedTimer || 3.0;
        targetEnemy.bleedDps = curWeapon.bleedDps || 18;
        targetEnemy.bleedColor = '#c084fc';

        if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
          window.GameVFX.spawnHitSparks(targetEnemy.x, targetEnemy.y, '#c084fc', 8);
        }
      }

      // 2. Astral Döyüş Çəkici: 140px dairəvi şok dalğası, Stun və güclü knockback
      if (curWeapon.id === 'hammer') {
        targetEnemy.stunTimer = Math.max(targetEnemy.stunTimer || 0, curWeapon.stunDuration || 0.8);

        // Güclü knockback
        if (player) {
          const kbAng = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);
          const force = curWeapon.knockbackForce || 460;
          targetEnemy.vx = (targetEnemy.vx || 0) + Math.cos(kbAng) * force;
          targetEnemy.vy = (targetEnemy.vy || 0) + Math.sin(kbAng) * force;
        }

        // 140px dairəvi şok dalğası (AOE) ilə ətrafdakı düşmənlərə zərər
        const shockRadius = curWeapon.shockwaveRadius || 140;
        for (let i = 0; i < enemyList.length; i++) {
          const other = enemyList[i];
          if (!other || other === targetEnemy || other.hp <= 0) continue;

          const d = distance(targetEnemy.x, targetEnemy.y, other.x, other.y);
          if (d <= shockRadius) {
            const aoeDmg = Math.round(baseDamage * 0.65);
            other.hp -= aoeDmg;
            other.stunTimer = Math.max(other.stunTimer || 0, 0.45);

            const aoeAng = Math.atan2(other.y - targetEnemy.y, other.x - targetEnemy.x);
            other.vx = (other.vx || 0) + Math.cos(aoeAng) * 280;
            other.vy = (other.vy || 0) + Math.sin(aoeAng) * 280;

            if (callbacks && typeof callbacks.onHitEnemy === 'function') {
              callbacks.onHitEnemy(other, aoeDmg, 'hammer_shockwave');
            }
          }
        }

        // Şok dalğası vizual partlayışı
        if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnExplosion === 'function') {
          window.GameVFX.spawnExplosion(targetEnemy.x, targetEnemy.y, '#60a5fa', 14, shockRadius * 0.7);
        }
      }

      // -------------------------------------------------------------
      // B. 12 RELİKT EFFEKTLƏRİ
      // -------------------------------------------------------------
      // 1. Vampir Dişi (Can bərpası)
      const vampRelic = this.relics.vampire_fang;
      if (vampRelic && vampRelic.level > 0 && player) {
        const heal = vampRelic.healPerHit * vampRelic.level;
        const oldHp = player.hp || 0;
        player.hp = Math.min(player.maxHp || 100, oldHp + heal);

        if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(player.x, player.y - 24, `+${heal} HP`, '#22c55e', 14);
        }
      }

      // 2. Buzlu Toxunuş (40% yavaşlatma)
      const frostRelic = this.relics.frost_touch;
      if (frostRelic && frostRelic.level > 0) {
        targetEnemy.slowTimer = frostRelic.slowDuration + (frostRelic.level * 0.25);
        targetEnemy.slowFactor = frostRelic.slowFactor || 0.60;
        targetEnemy.frostColor = '#38bdf8';

        if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
          window.GameVFX.spawnHitSparks(targetEnemy.x, targetEnemy.y, '#38bdf8', 6);
        }
      }

      // 3. Cəlladın Hökmü (Canı 30%-dən az olan düşmənlərə 2x zərər)
      const execRelic = this.relics.executioner;
      if (execRelic && execRelic.level > 0) {
        const maxHp = targetEnemy.maxHp || 100;
        if (targetEnemy.hp / maxHp < execRelic.hpThreshold) {
          isExecutioner = true;
          bonusDamage += baseDamage * (execRelic.damageMultiplier - 1.0); // +100% zərər (cəmi 2x)

          if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
            window.GameVFX.spawnFloatingText(targetEnemy.x, targetEnemy.y - 28, 'CƏLLAD! (2x)', '#ef4444', 16);
          }
        }
      }

      // 4. Fırtına Zənciri (Yaxınlıqdakı 3 düşmənə ildırım sıçradır)
      const chainRelic = this.relics.chain_lightning;
      if (chainRelic && chainRelic.level > 0 && enemyList.length > 1) {
        const targets = [];
        const maxTargets = chainRelic.chainTargets + Math.floor(chainRelic.level / 2);
        const chainRange = chainRelic.chainRange || 190;

        for (let i = 0; i < enemyList.length; i++) {
          const candidate = enemyList[i];
          if (!candidate || candidate === targetEnemy || candidate.hp <= 0) continue;

          const dist = distance(targetEnemy.x, targetEnemy.y, candidate.x, candidate.y);
          if (dist <= chainRange) {
            targets.push({ enemy: candidate, dist });
          }
        }

        // Ən yaxın hədəfləri seç
        targets.sort((a, b) => a.dist - b.dist);
        const selected = targets.slice(0, maxTargets);

        let prevX = targetEnemy.x;
        let prevY = targetEnemy.y;
        const chainDmg = Math.round(baseDamage * (chainRelic.chainDamageMult + (chainRelic.level * 0.08)));

        for (let i = 0; i < selected.length; i++) {
          const nextTarget = selected[i].enemy;
          nextTarget.hp -= chainDmg;

          // Callback və ya GameVFX vasitəsilə zəncirvari şimşək effekti
          if (callbacks && typeof callbacks.onChainLightning === 'function') {
            callbacks.onChainLightning({ x: prevX, y: prevY }, nextTarget, chainDmg);
          } else if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnChainLightning === 'function') {
            window.GameVFX.spawnChainLightning(prevX, prevY, nextTarget.x, nextTarget.y, '#00e5ff');
          }

          if (callbacks && typeof callbacks.onHitEnemy === 'function') {
            callbacks.onHitEnemy(nextTarget, chainDmg, 'chain_lightning');
          }

          prevX = nextTarget.x;
          prevY = nextTarget.y;
        }

        if (selected.length > 0) {
          this._playSafeSFX('spell');
        }
      }

      // 5. Qızıl Hərisliyi (Düşmən ölərsə qızıl çarpanı)
      const greedRelic = this.relics.greed_hoard;
      if (greedRelic && greedRelic.level > 0) {
        targetEnemy.goldMultiplier = (targetEnemy.goldMultiplier || 1.0) * (1.0 + (greedRelic.goldBonusMult * greedRelic.level));
      }

      // 6. Qiyamət Rünü (Ultimate Qəzəb enerjisi qazancı)
      const doomRelic = this.relics.doom_rune;
      if (doomRelic && doomRelic.level > 0) {
        if (typeof window !== 'undefined' && window.GameCompanions && typeof window.GameCompanions.addRage === 'function') {
          const baseRage = 3;
          const bonusRage = baseRage * (1.0 + (doomRelic.rageGainBonusMult * doomRelic.level));
          window.GameCompanions.addRage(bonusRage);
        }
      }

      return {
        bonusDamage,
        isExecutioner,
        totalAppliedDamage: baseDamage + bonusDamage
      };
    },

    /**
     * Dash zamanı çağırılır: Kölgə Klonu tələsi və dash relikt effektləri
     */
    applyOnDashEffects: function (player, enemies, callbacks) {
      if (!player) return;

      const shadowRelic = this.relics.shadow_clone;
      if (shadowRelic && shadowRelic.level > 0) {
        // Dash başladığı mövqedə partlayan kölgə klonu qoy
        const trap = {
          id: 'shadow_trap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          x: player.x,
          y: player.y,
          timer: shadowRelic.trapFuse || 0.85,
          maxTimer: shadowRelic.trapFuse || 0.85,
          radius: shadowRelic.trapRadius + (shadowRelic.level * 15),
          damage: Math.round(shadowRelic.trapDamage * (1.0 + (shadowRelic.level - 1) * 0.45)),
          color: '#a855f7',
          exploded: false
        };

        this.shadowTraps.push(trap);

        // Vizual kölgə izi
        if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnDashTrail === 'function') {
          window.GameVFX.spawnDashTrail(player.x, player.y, player.angle || 0, '#a855f7');
        }

        if (callbacks && typeof callbacks.onSpawnTrap === 'function') {
          callbacks.onSpawnTrap(trap);
        }

        this._playSafeSFX('spell');
      }
    },

    /**
     * Kölgə klonlarının və qanaxmaların hər frame yenilənməsi
     */
    updateTrapsAndDOTs: function (dt, enemies, callbacks) {
      const enemyList = Array.isArray(enemies) ? enemies : [];

      // 1. Kölgə Klonu Tələlərinin Yenilənməsi
      for (let i = this.shadowTraps.length - 1; i >= 0; i--) {
        const trap = this.shadowTraps[i];
        trap.timer -= dt;

        if (trap.timer <= 0 && !trap.exploded) {
          trap.exploded = true;

          // Radiusdakı bütün düşmənlərə partlayış zərəri
          for (let j = 0; j < enemyList.length; j++) {
            const enemy = enemyList[j];
            if (!enemy || enemy.hp <= 0) continue;

            const d = distance(trap.x, trap.y, enemy.x, enemy.y);
            if (d <= trap.radius) {
              enemy.hp -= trap.damage;
              // Kölgə sarsıntısı
              enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.4);

              if (callbacks && typeof callbacks.onHitEnemy === 'function') {
                callbacks.onHitEnemy(enemy, trap.damage, 'shadow_clone_explosion');
              }
            }
          }

          // Partlayış VFX və SFX
          if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnExplosion === 'function') {
            window.GameVFX.spawnExplosion(trap.x, trap.y, trap.color, 16, trap.radius * 0.8);
          }
          this._playSafeSFX('explosion');

          this.shadowTraps.splice(i, 1);
        }
      }

      // 2. Qanaxma (Bleed) və Alov (Burn) DOT Statuslarının Düşmənlərdə Hesablanması
      for (let j = 0; j < enemyList.length; j++) {
        const enemy = enemyList[j];
        if (!enemy || enemy.hp <= 0) continue;

        // Qanaxma (Xəncər)
        if ((enemy.bleedTimer || 0) > 0) {
          enemy.bleedTimer -= dt;
          const dotDmg = (enemy.bleedDps || 18) * dt;
          enemy.hp -= dotDmg;

          // Qan qığılcımı
          if (Math.random() < 0.25 && typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
            window.GameVFX.spawnHitSparks(enemy.x, enemy.y, enemy.bleedColor || '#c084fc', 2);
          }
        }

        // Yandırma (Alov Halqası)
        if ((enemy.burnTimer || 0) > 0) {
          enemy.burnTimer -= dt;
          const burnDmg = (enemy.burnDps || 12) * dt;
          enemy.hp -= burnDmg;

          if (Math.random() < 0.25 && typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
            window.GameVFX.spawnHitSparks(enemy.x, enemy.y, enemy.burnColor || '#f97316', 3);
          }
        }

        // Yavaşlatma taymeri
        if ((enemy.slowTimer || 0) > 0) {
          enemy.slowTimer -= dt;
          if (enemy.slowTimer <= 0) {
            enemy.slowFactor = 1.0;
          }
        }

        // Stun taymeri
        if ((enemy.stunTimer || 0) > 0) {
          enemy.stunTimer -= dt;
        }

        // Orbital toxunma cooldown-u
        if ((enemy.orbitalHitCooldown || 0) > 0) {
          enemy.orbitalHitCooldown -= dt;
        }
      }
    },

    /**
     * Bütün aktiv reliktlərdən və cari silahdan asılı olaraq oyunçu modifikatorlarını hesablayır
     */
    getStatModifiers: function () {
      const curWeapon = this.getActiveWeapon();

      // Başlanğıc baza modifikatorları
      const mods = {
        damageMult: curWeapon.damageMult || 1.0,
        speedMult: 1.0,
        critBonus: curWeapon.critBonus || 0,
        critDmgBonus: 0,
        maxHpBonus: 0,
        hpRegenBonus: 0,
        manaRegenBonus: 0,
        spellCooldownMult: 1.0,
        dashCooldownMult: 1.0,
        goldMult: 1.0,
        rageGainMult: 1.0
      };

      // Reliktlərin təsiri:
      const r = this.relics;

      // 1. Astral Axın (+50% Mana bərpası, -25% Spell Cooldown)
      if (r.astral_flow && r.astral_flow.level > 0) {
        const lvl = r.astral_flow.level;
        mods.manaRegenBonus += r.astral_flow.manaRegenBonus * lvl;
        mods.spellCooldownMult = Math.max(0.4, mods.spellCooldownMult - (r.astral_flow.spellCooldownReduction * lvl));
      }

      // 2. Nəhəngin Ürəyi (+60 Max HP, +3 HP/san regen)
      if (r.giant_heart && r.giant_heart.level > 0) {
        const lvl = r.giant_heart.level;
        mods.maxHpBonus += r.giant_heart.maxHpBonus * lvl;
        mods.hpRegenBonus += r.giant_heart.hpRegenPerSec * lvl;
      }

      // 3. Qızıl Hərisliyi (+40% Qızıl)
      if (r.greed_hoard && r.greed_hoard.level > 0) {
        mods.goldMult += r.greed_hoard.goldBonusMult * r.greed_hoard.level;
      }

      // 4. Kritik Qəzəb (+18% Krit şans, +50% Krit zərər)
      if (r.critical_fury && r.critical_fury.level > 0) {
        const lvl = r.critical_fury.level;
        mods.critBonus += r.critical_fury.critChanceBonus * lvl;
        mods.critDmgBonus += r.critical_fury.critDamageBonus * lvl;
      }

      // 5. Külək Ayaqqabıları (+22% Hərəkət sürəti, -25% Dash Cooldown)
      if (r.wind_boots && r.wind_boots.level > 0) {
        const lvl = r.wind_boots.level;
        mods.speedMult += r.wind_boots.speedBonusMult * lvl;
        mods.dashCooldownMult = Math.max(0.4, mods.dashCooldownMult - (r.wind_boots.dashCooldownReduction * lvl));
      }

      // 6. Qiyamət Rünü (+40% Rage dolumu)
      if (r.doom_rune && r.doom_rune.level > 0) {
        mods.rageGainMult += r.doom_rune.rageGainBonusMult * r.doom_rune.level;
      }

      return mods;
    },

    /**
     * Hal-hazırda fırlanan kürələrin koordinatlarını və vizual parametrlərini qaytarır
     */
    getOrbitals: function () {
      const relic = this.relics.fire_orbitals;
      if (!relic || relic.level <= 0) return [];
      return this.orbitals.map((o) => Object.assign({}, o));
    },

    /**
     * Simurq Alov Yayı üçün 15° bucaq fərqi ilə 3 deşici ox yaradan utilit metodu
     */
    createBowProjectiles: function (player, targetAngle) {
      if (!player) return [];

      const curWeapon = this.getActiveWeapon();
      const count = curWeapon.projectileCount || 3;
      const spread = curWeapon.spreadAngle || (15 * Math.PI) / 180;
      const speed = curWeapon.projectileSpeed || 720;
      const dmg = Math.round((player.attackDamage || 38) * (curWeapon.damageMult || 0.88));

      const arrows = [];
      // 3 ox: -15°, 0°, +15° bucaq fərqi
      const halfSpread = ((count - 1) * spread) / 2;

      for (let i = 0; i < count; i++) {
        const angle = (targetAngle - halfSpread) + (i * spread);
        arrows.push({
          x: player.x + Math.cos(angle) * (player.radius || 20),
          y: player.y + Math.sin(angle) * (player.radius || 20),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          angle: angle,
          radius: curWeapon.projectileRadius || 6,
          damage: dmg,
          pierce: curWeapon.pierce || 2,
          pierceLeft: curWeapon.pierce || 2,
          hitEnemies: [],
          life: 0.9,
          maxLife: 0.9,
          color: curWeapon.color || '#f97316',
          arrowColor: curWeapon.arrowColor || '#fb923c',
          isBowArrow: true,
          isPlayer: true
        });
      }

      this._playSafeSFX(curWeapon.sound || 'bow');
      return arrows;
    },

    /**
     * Mühərrik və ya VFX tərəfindən çağırılan birbaşa fırlanan kürələrin render metodu
     */
    renderOrbitals: function (ctx, camera) {
      const orbs = this.getOrbitals();
      if (!ctx || orbs.length === 0) return;

      const camX = (camera && camera.x) || 0;
      const camY = (camera && camera.y) || 0;
      const zoom = (camera && camera.zoom) || 1.0;

      ctx.save();
      for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];
        const scrX = (orb.x - camX) * zoom;
        const scrY = (orb.y - camY) * zoom;
        const rad = orb.radius * zoom;

        // Xarici parlaqlıq (Glow)
        ctx.beginPath();
        ctx.arc(scrX, scrY, rad * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
        ctx.fill();

        // Əsas alov kürəsi
        ctx.beginPath();
        ctx.arc(scrX, scrY, rad, 0, Math.PI * 2);
        ctx.fillStyle = orb.color || '#f97316';
        ctx.fill();

        // İsti nüvə
        ctx.beginPath();
        ctx.arc(scrX, scrY, rad * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = orb.innerColor || '#ffedd5';
        ctx.fill();
      }
      ctx.restore();
    },

    /**
     * Kölgə klonlarını (Tələləri) render edən metod
     */
    renderTraps: function (ctx, camera) {
      if (!ctx || this.shadowTraps.length === 0) return;

      const camX = (camera && camera.x) || 0;
      const camY = (camera && camera.y) || 0;
      const zoom = (camera && camera.zoom) || 1.0;

      ctx.save();
      for (let i = 0; i < this.shadowTraps.length; i++) {
        const trap = this.shadowTraps[i];
        const scrX = (trap.x - camX) * zoom;
        const scrY = (trap.y - camY) * zoom;
        const pulse = 1.0 + Math.sin(trap.timer * 12) * 0.15;
        const rad = trap.radius * zoom * pulse;

        // Tələ xarici dairəsi
        ctx.beginPath();
        ctx.arc(scrX, scrY, rad, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
        ctx.fill();
        ctx.lineWidth = 2 * zoom;
        ctx.strokeStyle = '#c084fc';
        ctx.stroke();

        // Mərkəzi kölgə silueti
        ctx.beginPath();
        ctx.arc(scrX, scrY, 14 * zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#6b21a8';
        ctx.fill();
      }
      ctx.restore();
    },

    /**
     * Təhlükəsiz SFX səsləndirmə utiliti
     */
    _playSafeSFX: function (name) {
      if (typeof window !== 'undefined' && window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        try {
          window.GameAudio.playSFX(name);
        } catch (_) {}
      }
    }
  };

  // Qlobal obyektə qoş
  global.GameRelics = GameRelics;

  // Node mühiti üçün ixracat (Test və sintaksis yoxlanışı üçün)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameRelics;
  }

})(typeof window !== 'undefined' ? window : globalThis);
