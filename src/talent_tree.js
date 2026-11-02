/**
 * ============================================================================
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V4.0 — Roguelike Meta-Progression)
 * Fayl: src/talent_tree.js
 * Qlobal Obyekt: window.GameTalents
 * Məsul Agent: 34-cü Agent — Meta-Tərəqqi (Metaprogression) Mütəxəssisi
 *
 * Məqsəd: "Ölüm son deyil" — Hades "Mirror of Night", Rogue Legacy və Dead Cells
 * fəlsəfəsi ilə ölümü cəzadan "növbəti cəhd üçün motivasiya"ya çevirən daimi
 * inkişaf və istedadlar sistemi.
 *
 * Əsas Xüsusiyyətlər:
 * 1. 💠 Ruh Daşları (Soul Stones) — Daimi meta-valyuta (localStorage).
 *    - Düşmənlərdən (20% adi, 100% elit (3), 100% boss (25), region keçidi (10)).
 *    - Floating text + SFX 'soulGain'.
 * 2. 🌲 Qədim İstedad Ağacı — 3 Budaq (⚔ Döyüş, 🛡 Dözüm, 💰 Sərvət),
 *    12 güclü istedad, artan qiymətlər, ön-şərtlər (prerequisites).
 *    - "Feniks Ruhu": Run başına 1 dəfə ölümdən 50% canla möhtəşəm dirilmə!
 *    - "Xəzinə Duyğusu", "Qılınc Ustalığı", "Başlanğıc Qəzəbi" və s.
 * 3. 🏛 Modal UI — [T] düyməsi və ya ana menyudan açılır. Dark-fantasy
 *    glassmorphism dizaynı, tablar, kart parıltısı, respec (sıfırlama).
 * 4. 🔄 Oyun İnteqrasiyası — GamePlugin müqaviləsi ilə sıfır toqquşma.
 * ============================================================================
 */

(function (root) {
  'use strict';

  // --- 1. SABİTLƏR VƏ YADDAŞ AÇARLARI ---
  const STORAGE_KEY_SOULS = 'aetheria_talents_souls';
  const STORAGE_KEY_ALLOCATED = 'aetheria_talents_allocated';
  const STORAGE_KEY_STATS = 'aetheria_talents_stats';

  // Köməkçi riyazi funksiyalar
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // --- 2. QƏDİM İSTEDADLAR AĞACI KATALOQU ---
  // 3 Budaq: combat (⚔ Döyüş), resilience (🛡 Dözüm), fortune (💰 Sərvət)
  const TALENT_BRANCHES = {
    combat: {
      id: 'combat',
      name: 'Döyüş Budağı',
      icon: '⚔️',
      color: '#ef4444',
      description: 'Zərbə gücü, kritik şans, başlanğıc qəzəbi və ölümcül hücumlar.'
    },
    resilience: {
      id: 'resilience',
      name: 'Dözüm Budağı',
      icon: '🛡️',
      color: '#38bdf8',
      description: 'Maksimum sağlamlıq, zərər azaldılması və Feniks dirilməsi.'
    },
    fortune: {
      id: 'fortune',
      name: 'Sərvət Budağı',
      icon: '💰',
      color: '#f5c542',
      description: 'Qızıl qazancı, sürətli təcrübə, nadir qənimətlər və Ruh Biçini.'
    }
  };

  const TALENTS = {
    // === ⚔ DÖYÜŞ BUDAĞI ===
    blade_mastery: {
      id: 'blade_mastery',
      branch: 'combat',
      name: 'Qılınc Ustalığı',
      icon: '⚔️',
      maxLevel: 5,
      costs: [15, 30, 60, 110, 180],
      requires: null,
      description: 'Hər səviyyədə bütün hücum zərbələrinin zərərini +5% artırır.',
      bonusLabel: '+5% Zərər / səviyyə',
      getStat: (lvl) => ({ damageMultBonus: lvl * 0.05 }),
      formatEffect: (lvl) => `+${lvl * 5}% Zərər`
    },
    deadly_precision: {
      id: 'deadly_precision',
      branch: 'combat',
      name: 'Ölümcül Dəqiqlik',
      icon: '🎯',
      maxLevel: 5,
      costs: [20, 45, 85, 140, 220],
      requires: { talentId: 'blade_mastery', minLevel: 1 },
      description: 'Hər səviyyədə kritik zərbə vurma ehtimalını +4% artırır.',
      bonusLabel: '+4% Kritik Şans / səviyyə',
      getStat: (lvl) => ({ critBonus: lvl * 0.04 }),
      formatEffect: (lvl) => `+${lvl * 4}% Kritik Şans`
    },
    fury_starter: {
      id: 'fury_starter',
      branch: 'combat',
      name: 'Döyüş Həyəcanı',
      icon: '⚡',
      maxLevel: 3,
      costs: [35, 75, 140],
      requires: { talentId: 'deadly_precision', minLevel: 1 },
      description: 'Yeni runa başlayarkən dərhal +25 Qəzəb (Rage) enerjisi bəxş edir.',
      bonusLabel: '+25 Başlanğıc Rage / səviyyə',
      getStat: (lvl) => ({ startRage: lvl * 25 }),
      formatEffect: (lvl) => `+${lvl * 25} Başlanğıc Rage`
    },
    executioner: {
      id: 'executioner',
      branch: 'combat',
      name: 'Cəlladın Hökmü',
      icon: '🪓',
      maxLevel: 4,
      costs: [50, 100, 180, 290],
      requires: { talentId: 'fury_starter', minLevel: 1 },
      description: 'Canı 35%-dən az olan zəifləmiş düşmənlərə qarşı +10% əlavə zərər vurur.',
      bonusLabel: '+10% İcra Zərəri / səviyyə',
      getStat: (lvl) => ({ executeBonus: lvl * 0.10 }),
      formatEffect: (lvl) => `+${lvl * 10}% Zəif Düşmənə Zərər`
    },

    // === 🛡 DÖZÜM BUDAĞI ===
    iron_skin: {
      id: 'iron_skin',
      branch: 'resilience',
      name: 'Dəmir Dəri',
      icon: '🛡️',
      maxLevel: 5,
      costs: [15, 30, 60, 110, 180],
      requires: null,
      description: 'Hər səviyyədə oyunçunun Maksimum Canını (Max HP) +15 vahid artırır.',
      bonusLabel: '+15 Maks Can / səviyyə',
      getStat: (lvl) => ({ maxHpBonus: lvl * 15 }),
      formatEffect: (lvl) => `+${lvl * 15} Maksimum Can`
    },
    aegis_ward: {
      id: 'aegis_ward',
      branch: 'resilience',
      name: 'Qoruyucu Zireh',
      icon: '🧱',
      maxLevel: 4,
      costs: [25, 55, 110, 200],
      requires: { talentId: 'iron_skin', minLevel: 1 },
      description: 'Alınan bütün düşmən zərərlərini hər səviyyədə 6% azaldır.',
      bonusLabel: '-6% Alınan Zərər / səviyyə',
      getStat: (lvl) => ({ damageReduction: lvl * 0.06 }),
      formatEffect: (lvl) => `-${lvl * 6}% Alınan Zərər`
    },
    vitality_surge: {
      id: 'vitality_surge',
      branch: 'resilience',
      name: 'Həyati Müqavimət',
      icon: '💚',
      maxLevel: 3,
      costs: [40, 85, 160],
      requires: { talentId: 'aegis_ward', minLevel: 1 },
      description: 'Can 30%-dən aşağı düşəndə kritik vəziyyətdə alınan zərəri əlavə 15% azaldır.',
      bonusLabel: '+15% Böhran Müdafiəsi / səviyyə',
      getStat: (lvl) => ({ lowHpShieldBonus: lvl * 0.15 }),
      formatEffect: (lvl) => `Böhranda -${lvl * 15}% Zərər`
    },
    phoenix_soul: {
      id: 'phoenix_soul',
      branch: 'resilience',
      name: 'Feniks Ruhu',
      icon: '🔥',
      maxLevel: 1,
      costs: [150],
      requires: { talentId: 'vitality_surge', minLevel: 1 },
      description: 'Run başına 1 dəfə ölümdən 50% canla dirilmə! Şərəfli ikinci şans.',
      bonusLabel: '1x Möhtəşəm Dirilmə (50% Can)',
      getStat: (lvl) => ({ hasPhoenix: lvl >= 1 }),
      formatEffect: (lvl) => lvl >= 1 ? '1x Dirilmə Aktivdir' : 'Aktiv deyil'
    },

    // === 💰 SƏRVƏT BUDAĞI ===
    midas_touch: {
      id: 'midas_touch',
      branch: 'fortune',
      name: 'Midas Toxunuşu',
      icon: '🪙',
      maxLevel: 5,
      costs: [15, 30, 60, 110, 180],
      requires: null,
      description: 'Düşmənlərdən və sandıqlardan qazanılan qızıl miqdarını hər səviyyədə +8% artırır.',
      bonusLabel: '+8% Qızıl Qazancı / səviyyə',
      getStat: (lvl) => ({ goldMultBonus: lvl * 0.08 }),
      formatEffect: (lvl) => `+${lvl * 8}% Qızıl`
    },
    wisdom_seeker: {
      id: 'wisdom_seeker',
      branch: 'fortune',
      name: 'Hikmət Axtarışı',
      icon: '📜',
      maxLevel: 5,
      costs: [20, 45, 90, 150, 240],
      requires: { talentId: 'midas_touch', minLevel: 1 },
      description: 'Döyüşlərdə qazanılan təcrübə (XP) miqdarını hər səviyyədə +10% artırır.',
      bonusLabel: '+10% XP Qazancı / səviyyə',
      getStat: (lvl) => ({ xpMultBonus: lvl * 0.10 }),
      formatEffect: (lvl) => `+${lvl * 10}% XP`
    },
    treasure_sense: {
      id: 'treasure_sense',
      branch: 'fortune',
      name: 'Xəzinə Duyğusu',
      icon: '💎',
      maxLevel: 3,
      costs: [35, 80, 160],
      requires: { talentId: 'wisdom_seeker', minLevel: 1 },
      description: 'Can və mana kürələri kimi faydalı dropların düşmə ehtimalını +15% artırır.',
      bonusLabel: '+15% Nadir Drop Şansı / səviyyə',
      getStat: (lvl) => ({ dropChanceBonus: lvl * 0.15 }),
      formatEffect: (lvl) => `+${lvl * 15}% Nadir Drop`
    },
    soul_harvester: {
      id: 'soul_harvester',
      branch: 'fortune',
      name: 'Ruh Biçini',
      icon: '💠',
      maxLevel: 3,
      costs: [50, 110, 220],
      requires: { talentId: 'treasure_sense', minLevel: 1 },
      description: 'Adi düşmənlərdən Ruh Daşı düşmə şansını artırır (Baza 20% + hər səviyyə +10%).',
      bonusLabel: '+10% Ruh Düşmə Şansı / səviyyə',
      getStat: (lvl) => ({ soulDropChanceBonus: lvl * 0.10 }),
      formatEffect: (lvl) => `+${lvl * 10}% Ruh Şansı`
    }
  };

  // --- 3. DAXİLİ VƏZİYYƏT (STATE) ---
  const state = {
    // Daimi saxlananlar (localStorage)
    soulStones: 0,
    allocatedTalents: {}, // { [talentId]: level }
    stats: {
      totalSoulsCollected: 0,
      totalSoulsSpent: 0,
      phoenixRevivesTriggered: 0
    },

    // Cari Run üzrə müvəqqəti vəziyyət
    runEarnedSouls: 0,
    phoenixReviveUsed: false,
    deathNoticeTimer: 0,
    hudGlowTimer: 0,

    // UI vəziyyəti
    isModalOpen: false,
    currentTab: 'combat',
    lastEngineApi: null
  };

  // --- 4. YADDAŞ İDARƏETMƏSİ (LOCALSTORAGE) ---
  function loadSavedData() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const savedSouls = localStorage.getItem(STORAGE_KEY_SOULS);
      if (savedSouls !== null) {
        state.soulStones = Math.max(0, parseInt(savedSouls, 10) || 0);
      }

      const savedTalents = localStorage.getItem(STORAGE_KEY_ALLOCATED);
      if (savedTalents) {
        const parsed = JSON.parse(savedTalents);
        if (parsed && typeof parsed === 'object') {
          // Doğrulama
          for (const [id, lvl] of Object.entries(parsed)) {
            if (TALENTS[id]) {
              state.allocatedTalents[id] = clamp(parseInt(lvl, 10) || 0, 0, TALENTS[id].maxLevel);
            }
          }
        }
      }

      const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        if (parsedStats && typeof parsedStats === 'object') {
          Object.assign(state.stats, parsedStats);
        }
      }
    } catch (err) {
      console.warn('[GameTalents] Yaddaşdan oxuma xətası:', err);
    }
  }

  function saveAllData() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY_SOULS, String(state.soulStones));
      localStorage.setItem(STORAGE_KEY_ALLOCATED, JSON.stringify(state.allocatedTalents));
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(state.stats));
    } catch (err) {
      console.warn('[GameTalents] Yaddaşa yazma xətası:', err);
    }
  }

  // --- 5. HESABLAMA VƏ STATUS FUNKSİYALARI ---
  function getTalentLevel(talentId) {
    return state.allocatedTalents[talentId] || 0;
  }

  function getTalentCost(talentId, currentLevel) {
    const t = TALENTS[talentId];
    if (!t) return Infinity;
    if (currentLevel >= t.maxLevel) return Infinity;
    return t.costs[currentLevel] || 999;
  }

  function isTalentUnlocked(talentId) {
    const t = TALENTS[talentId];
    if (!t) return false;
    if (!t.requires) return true;
    const reqLvl = getTalentLevel(t.requires.talentId);
    return reqLvl >= t.requires.minLevel;
  }

  function getRequiredTalentText(talentId) {
    const t = TALENTS[talentId];
    if (!t || !t.requires) return '';
    const req = TALENTS[t.requires.talentId];
    if (!req) return '';
    return `${req.name} (Lv. ${t.requires.minLevel})`;
  }

  function calculateAllMultipliers() {
    let damageMultBonus = 0;
    let critBonus = 0;
    let maxHpBonus = 0;
    let damageReduction = 0;
    let goldMultBonus = 0;
    let xpMultBonus = 0;
    let dropChanceBonus = 0;

    for (const [id, lvl] of Object.entries(state.allocatedTalents)) {
      if (lvl <= 0 || !TALENTS[id]) continue;
      const t = TALENTS[id];
      const stats = t.getStat(lvl);
      if (stats.damageMultBonus) damageMultBonus += stats.damageMultBonus;
      if (stats.critBonus) critBonus += stats.critBonus;
      if (stats.maxHpBonus) maxHpBonus += stats.maxHpBonus;
      if (stats.damageReduction) damageReduction += stats.damageReduction;
      if (stats.goldMultBonus) goldMultBonus += stats.goldMultBonus;
      if (stats.xpMultBonus) xpMultBonus += stats.xpMultBonus;
      if (stats.dropChanceBonus) dropChanceBonus += stats.dropChanceBonus;
    }

    return {
      damageMult: 1.0 + damageMultBonus,
      critBonus: critBonus,
      maxHpBonus: maxHpBonus,
      damageTakenMult: Math.max(0.4, 1.0 - damageReduction),
      goldMult: 1.0 + goldMultBonus,
      xpMult: 1.0 + xpMultBonus,
      dropChanceMult: 1.0 + dropChanceBonus
    };
  }

  // --- 6. VALYUTA VƏ GÜCLƏNDİRMƏ ƏMƏLİYYATLARI ---
  function addSoulStones(amount, reason, api, sourceCoords) {
    const qty = Math.max(0, Math.floor(amount));
    if (qty <= 0) return;

    state.soulStones += qty;
    state.runEarnedSouls += qty;
    state.stats.totalSoulsCollected += qty;
    state.hudGlowTimer = 2.0;
    saveAllData();

    // Səs effekti
    playSFXSafe('soulGain', api);

    // Floating text vizualı
    if (sourceCoords && typeof sourceCoords.x === 'number' && typeof sourceCoords.y === 'number') {
      spawnFloatingTextSafe(sourceCoords.x, sourceCoords.y - 20, `+${qty} 💠`, '#00e5ff', 20, api);
    } else if (api && api.player) {
      spawnFloatingTextSafe(api.player.x, api.player.y - 25, `+${qty} 💠`, '#00e5ff', 20, api);
    }

    // Modal açıqdırsa başlığı yenilə
    updateModalHeader();
  }

  function upgradeTalent(talentId, api) {
    const t = TALENTS[talentId];
    if (!t) return { success: false, reason: 'İstedad tapılmadı.' };

    const currentLvl = getTalentLevel(talentId);
    if (currentLvl >= t.maxLevel) {
      return { success: false, reason: 'Bu istedad artıq maksimum səviyyədədir!' };
    }

    if (!isTalentUnlocked(talentId)) {
      return {
        success: false,
        reason: `Kilidlidir: Əvvəlcə ${getRequiredTalentText(talentId)} tələb olunur!`
      };
    }

    const cost = getTalentCost(talentId, currentLvl);
    if (state.soulStones < cost) {
      return {
        success: false,
        reason: `Kifayət qədər Ruh Daşı yoxdur! (Tələb: ${cost} 💠, Mövcud: ${state.soulStones} 💠)`
      };
    }

    // Alış əməliyyatı
    state.soulStones -= cost;
    state.stats.totalSoulsSpent += cost;
    const nextLvl = currentLvl + 1;
    state.allocatedTalents[talentId] = nextLvl;
    saveAllData();

    // Səs və vizual
    playSFXSafe('talentUnlock', api);

    // Əgər Dəmir Dəri yüksəldildisə və oyunçu canlıdırsa, maxHp artımını sinxronlaşdır
    if (talentId === 'iron_skin' && api && api.player) {
      const oldHpBonus = currentLvl * 15;
      const newHpBonus = nextLvl * 15;
      const diff = newHpBonus - oldHpBonus;
      api.player.maxHp = (api.player.maxHp || 100) + diff;
      api.player.hp = Math.min(api.player.maxHp, (api.player.hp || 100) + diff);
    }

    updateModalDOM(talentId);
    return { success: true, newLevel: nextLvl };
  }

  function resetAllTalents(api) {
    let refundAmount = 0;
    for (const [id, lvl] of Object.entries(state.allocatedTalents)) {
      const t = TALENTS[id];
      if (!t || lvl <= 0) continue;
      for (let i = 0; i < lvl; i++) {
        refundAmount += t.costs[i] || 0;
      }
    }

    if (refundAmount <= 0) {
      return { success: false, reason: 'Sıfırlanacaq aktiv istedad yoxdur.' };
    }

    state.soulStones += refundAmount;
    state.stats.totalSoulsSpent = Math.max(0, state.stats.totalSoulsSpent - refundAmount);
    state.allocatedTalents = {};
    saveAllData();

    playSFXSafe('click', api);
    updateModalDOM();
    return { success: true, refunded: refundAmount };
  }

  // --- 7. TƏHLÜKƏSİZ KÖMƏKÇİ METODLAR (SFX, VFX, NOTIFY) ---
  function playSFXSafe(name, api) {
    if (api && typeof api.playSFX === 'function') {
      try { api.playSFX(name); return; } catch (e) { /* ignore */ }
    }
    if (typeof window !== 'undefined' && window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
      try { window.GameAudio.playSFX(name); } catch (e) { /* ignore */ }
    }
  }

  function spawnFloatingTextSafe(x, y, text, color, size, api) {
    if (api && typeof api.floatingText === 'function') {
      try { api.floatingText(x, y, text, color, size); return; } catch (e) { /* ignore */ }
    }
    if (typeof window !== 'undefined' && window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
      try { window.GameVFX.spawnFloatingText(x, y, text, color, size); } catch (e) { /* ignore */ }
    }
  }

  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (m) {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return m;
      }
    });
  }

  // --- 8. DOM MODAL VƏ CSS İNYEKSİYASI ---
  const STYLE_ID = 'talent-tree-plugin-styles';
  const MODAL_ID = 'talent-tree-modal';

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;

    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      /* === TALENT TREE DARK FANTASY GLASSMORPHISM SYSTEM === */
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, rgba(10, 6, 22, 0.94) 0%, rgba(4, 3, 8, 0.98) 85%);
        backdrop-filter: blur(14px) saturate(180%);
        -webkit-backdrop-filter: blur(14px) saturate(180%);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        color: #f1f5f9;
        user-select: none;
      }

      #${MODAL_ID}.active {
        opacity: 1;
        pointer-events: auto;
      }

      .talent-container {
        position: relative;
        width: 94%;
        max-width: 960px;
        max-height: 90vh;
        background: var(--bg-panel, rgba(14, 11, 24, 0.92));
        border: 1.5px solid var(--border-gold, rgba(245, 197, 66, 0.35));
        border-radius: 18px;
        box-shadow: 0 0 50px rgba(0, 229, 255, 0.15), 0 20px 60px rgba(0, 0, 0, 0.95);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: talentScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes talentScaleIn {
        from { transform: scale(0.94) translateY(12px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }

      .talent-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--astral-cyan, #00e5ff), var(--gold-primary, #f5c542), transparent);
        pointer-events: none;
      }

      /* Modal Header */
      .talent-header {
        padding: 20px 28px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(245, 197, 66, 0.2);
        background: rgba(20, 15, 34, 0.6);
      }

      .talent-title-box {
        display: flex;
        flex-direction: column;
      }

      .talent-main-title {
        font-family: var(--font-title, 'Cinzel', serif);
        font-size: 1.65rem;
        font-weight: 900;
        letter-spacing: 3px;
        background: var(--gold-gradient, linear-gradient(135deg, #fff2a3 0%, #f5c542 50%, #b8860b 100%));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 20px rgba(245, 197, 66, 0.4);
        margin: 0;
      }

      .talent-subtitle {
        font-size: 0.85rem;
        color: #94a3b8;
        letter-spacing: 1px;
        margin-top: 3px;
      }

      .talent-header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .talent-souls-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 18px;
        background: rgba(0, 229, 255, 0.1);
        border: 1px solid rgba(0, 229, 255, 0.4);
        border-radius: 30px;
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.25);
        font-family: var(--font-title, 'Cinzel', serif);
        font-weight: 800;
        font-size: 1.15rem;
        color: #00e5ff;
        text-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
      }

      .talent-souls-badge .soul-icon {
        font-size: 1.3rem;
        animation: pulseSoul 2s infinite ease-in-out;
      }

      @keyframes pulseSoul {
        0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px #00e5ff); }
        50% { transform: scale(1.18); filter: drop-shadow(0 0 12px #00e5ff); }
      }

      .talent-btn-respec {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: #fca5a5;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .talent-btn-respec:hover {
        background: rgba(239, 68, 68, 0.35);
        border-color: #ef4444;
        color: #fff;
        transform: translateY(-1px);
      }

      .talent-close-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(245, 197, 66, 0.3);
        color: #cbd5e1;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .talent-close-btn:hover {
        background: rgba(245, 197, 66, 0.25);
        border-color: #ffd700;
        color: #fff;
        transform: rotate(90deg);
      }

      /* Tab Bar */
      .talent-tabs {
        display: flex;
        gap: 12px;
        padding: 14px 28px 4px;
        background: rgba(10, 8, 18, 0.4);
      }

      .talent-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-family: var(--font-title, 'Cinzel', serif);
        font-size: 0.95rem;
        font-weight: 700;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .talent-tab:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f1f5f9;
      }

      .talent-tab.active {
        background: linear-gradient(135deg, rgba(245, 197, 66, 0.2) 0%, rgba(14, 11, 24, 0.6) 100%);
        border-color: var(--border-gold-bright, #ffd700);
        color: #ffd700;
        box-shadow: 0 0 15px rgba(245, 197, 66, 0.25);
      }

      /* Content Area / Grid */
      .talent-content {
        padding: 20px 28px 24px;
        overflow-y: auto;
        flex: 1;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }

      .talent-content::-webkit-scrollbar {
        width: 6px;
      }

      .talent-content::-webkit-scrollbar-thumb {
        background: rgba(245, 197, 66, 0.3);
        border-radius: 3px;
      }

      /* Talent Card */
      .talent-card {
        background: rgba(18, 14, 30, 0.85);
        border: 1px solid rgba(245, 197, 66, 0.25);
        border-radius: 14px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }

      .talent-card::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 14px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: all 0.3s ease;
      }

      .talent-card:hover:not(.locked) {
        transform: translateY(-3px);
        border-color: rgba(245, 197, 66, 0.6);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 197, 66, 0.2);
      }

      .talent-card.maxed {
        border-color: #ffd700;
        background: linear-gradient(145deg, rgba(30, 24, 45, 0.9) 0%, rgba(18, 14, 30, 0.95) 100%);
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.18);
      }

      .talent-card.locked {
        opacity: 0.55;
        filter: grayscale(40%);
        border-color: rgba(255, 255, 255, 0.1);
        cursor: not-allowed;
      }

      .talent-card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 10px;
      }

      .talent-icon-box {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(245, 197, 66, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .talent-card.maxed .talent-icon-box {
        border-color: #ffd700;
        background: rgba(255, 215, 0, 0.15);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
      }

      .talent-card-info {
        flex: 1;
      }

      .talent-card-name {
        font-family: var(--font-title, 'Cinzel', serif);
        font-size: 1.05rem;
        font-weight: 700;
        color: #f8fafc;
        margin: 0 0 4px 0;
      }

      .talent-card.maxed .talent-card-name {
        color: #ffd700;
      }

      /* Level Dots (Pips) */
      .talent-pips {
        display: flex;
        gap: 5px;
      }

      .talent-pip {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.25);
        transition: all 0.2s ease;
      }

      .talent-pip.filled {
        background: #ffd700;
        border-color: #ffd700;
        box-shadow: 0 0 6px #ffd700;
      }

      .talent-card-desc {
        font-size: 0.82rem;
        color: #cbd5e1;
        line-height: 1.45;
        margin-bottom: 12px;
        min-height: 38px;
      }

      .talent-effect-preview {
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 0.78rem;
        color: #94a3b8;
        margin-bottom: 14px;
        display: flex;
        justify-content: space-between;
      }

      .talent-effect-preview .stat-val {
        color: #38bdf8;
        font-weight: 700;
      }

      /* Card Footer / Upgrade Button */
      .talent-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .talent-cost-tag {
        display: flex;
        align-items: center;
        gap: 5px;
        font-family: var(--font-title, 'Cinzel', serif);
        font-weight: 700;
        font-size: 0.95rem;
        color: #00e5ff;
      }

      .talent-upgrade-btn {
        flex: 1;
        max-width: 140px;
        padding: 9px 12px;
        border-radius: 8px;
        border: 1px solid var(--border-gold-bright, #ffd700);
        background: linear-gradient(135deg, rgba(245, 197, 66, 0.25) 0%, rgba(184, 134, 11, 0.3) 100%);
        color: #fff;
        font-family: var(--font-title, 'Cinzel', serif);
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }

      .talent-upgrade-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #ffd700 0%, #f5c542 100%);
        color: #06050b;
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
        transform: translateY(-1px);
      }

      .talent-upgrade-btn:disabled {
        opacity: 0.45;
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.05);
        color: #94a3b8;
        cursor: not-allowed;
      }

      .talent-lock-warning {
        font-size: 0.72rem;
        color: #f87171;
        padding: 4px 6px;
        border-radius: 4px;
        background: rgba(239, 68, 68, 0.12);
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Modal Footer */
      .talent-footer {
        padding: 12px 28px;
        border-top: 1px solid rgba(245, 197, 66, 0.2);
        background: rgba(14, 11, 24, 0.8);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.82rem;
        color: #94a3b8;
      }

      .talent-footer kbd {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 2px 6px;
        color: #ffd700;
        font-family: monospace;
      }

      /* Parıltı Animasiyası (Upgrade ediləndə) */
      @keyframes talentFlash {
        0% { box-shadow: 0 0 0 rgba(255, 215, 0, 0); }
        50% { box-shadow: 0 0 35px rgba(255, 215, 0, 0.85); border-color: #fff; }
        100% { box-shadow: 0 0 0 rgba(255, 215, 0, 0); }
      }

      .talent-card.just-upgraded {
        animation: talentFlash 0.7s ease-out;
      }
    `;

    document.head.appendChild(styleEl);
  }

  function createModalDOM() {
    if (typeof document === 'undefined') return null;
    let modalEl = document.getElementById(MODAL_ID);
    if (modalEl) return modalEl;

    injectStyles();

    modalEl = document.createElement('div');
    modalEl.id = MODAL_ID;
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', 'Qədim İstedad Ağacı');

    modalEl.innerHTML = `
      <div class="talent-container glass-panel">
        <!-- Başlıq -->
        <div class="talent-header">
          <div class="talent-title-box">
            <h2 class="talent-main-title">QƏDİM İSTEDAD AĞACI</h2>
            <span class="talent-subtitle">Ölüm son deyil — Ruh Daşları ilə qədim gücləri oyat</span>
          </div>
          <div class="talent-header-actions">
            <div class="talent-souls-badge" title="Mövcud Ruh Daşları">
              <span class="soul-icon">💠</span>
              <span id="talent-souls-display">0</span>
            </div>
            <button class="talent-btn-respec" id="talent-respec-btn" title="Bütün Ruh Daşlarını geri al">
              ↺ Sıfırla
            </button>
            <button class="talent-close-btn" id="talent-close-btn" aria-label="Bağla">✕</button>
          </div>
        </div>

        <!-- Budaq Tabları -->
        <div class="talent-tabs">
          <button class="talent-tab active" data-tab="combat">⚔ Döyüş Budağı</button>
          <button class="talent-tab" data-tab="resilience">🛡 Dözüm Budağı</button>
          <button class="talent-tab" data-tab="fortune">💰 Sərvət Budağı</button>
        </div>

        <!-- İstedad Kartları Şəbəkəsi -->
        <div class="talent-content" id="talent-cards-grid">
          <!-- Dinamik doldurulur -->
        </div>

        <!-- Alt Məlumat -->
        <div class="talent-footer">
          <div><kbd>[T]</kbd> və ya <kbd>[Esc]</kbd> ilə aç/bağla</div>
          <div>Bütün qazanılan güclər növbəti cəhdlərdə daimi qalır.</div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // Hadisə dinləyiciləri
    const closeBtn = modalEl.querySelector('#talent-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal());
    }

    const respecBtn = modalEl.querySelector('#talent-respec-btn');
    if (respecBtn) {
      respecBtn.addEventListener('click', () => {
        if (confirm('Bütün istedadları sıfırlayıb xərclənmiş Ruh Daşlarını geri almaq istəyirsiniz?')) {
          const res = resetAllTalents(state.lastEngineApi);
          if (res.success) {
            playSFXSafe('talentUnlock', state.lastEngineApi);
          } else {
            alert(res.reason);
          }
        }
      });
    }

    const tabs = modalEl.querySelectorAll('.talent-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        if (targetTab && TALENT_BRANCHES[targetTab]) {
          state.currentTab = targetTab;
          tabs.forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          renderTalentCards();
        }
      });
    });

    // Modal kənarına kliklə bağla
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        closeModal();
      }
    });

    return modalEl;
  }

  function updateModalHeader() {
    if (typeof document === 'undefined') return;
    const soulsDisplay = document.getElementById('talent-souls-display');
    if (soulsDisplay) {
      soulsDisplay.textContent = String(state.soulStones);
    }
  }

  function renderTalentCards(highlightTalentId) {
    if (typeof document === 'undefined') return;
    const grid = document.getElementById('talent-cards-grid');
    if (!grid) return;

    updateModalHeader();
    grid.innerHTML = '';

    const branchTalents = Object.values(TALENTS).filter((t) => t.branch === state.currentTab);

    branchTalents.forEach((t) => {
      const currentLvl = getTalentLevel(t.id);
      const isMaxed = currentLvl >= t.maxLevel;
      const isUnlocked = isTalentUnlocked(t.id);
      const cost = isMaxed ? 0 : getTalentCost(t.id, currentLvl);
      const canAfford = !isMaxed && isUnlocked && state.soulStones >= cost;

      const card = document.createElement('div');
      card.className = `talent-card ${isMaxed ? 'maxed' : ''} ${!isUnlocked ? 'locked' : ''}`;
      if (highlightTalentId === t.id) {
        card.classList.add('just-upgraded');
      }

      // Pips (səviyyə nöqtələri)
      let pipsHTML = '<div class="talent-pips">';
      for (let i = 0; i < t.maxLevel; i++) {
        pipsHTML += `<span class="talent-pip ${i < currentLvl ? 'filled' : ''}"></span>`;
      }
      pipsHTML += '</div>';

      // Cari və növbəti effekt
      const currentEff = currentLvl > 0 ? t.formatEffect(currentLvl) : 'Yoxdur (Lv. 0)';
      const nextEff = !isMaxed ? t.formatEffect(currentLvl + 1) : 'Maksimum';

      // Footer
      let footerHTML = '';
      if (isMaxed) {
        footerHTML = `
          <div class="talent-cost-tag" style="color: #ffd700;">★ TAM</div>
          <button class="talent-upgrade-btn" disabled>MAKSİMUM</button>
        `;
      } else if (!isUnlocked) {
        footerHTML = `
          <div class="talent-lock-warning">🔒 ${escapeHTML(getRequiredTalentText(t.id))}</div>
          <button class="talent-upgrade-btn" disabled>KİLİDLİ</button>
        `;
      } else {
        footerHTML = `
          <div class="talent-cost-tag">
            <span>💠</span>
            <span>${cost}</span>
          </div>
          <button class="talent-upgrade-btn" ${!canAfford ? 'disabled' : ''} data-talent-id="${t.id}">
            Öyrən
          </button>
        `;
      }

      card.innerHTML = `
        <div>
          <div class="talent-card-header">
            <div class="talent-icon-box">${t.icon}</div>
            <div class="talent-card-info">
              <h3 class="talent-card-name">${escapeHTML(t.name)}</h3>
              ${pipsHTML}
            </div>
          </div>
          <div class="talent-card-desc">${escapeHTML(t.description)}</div>
          <div class="talent-effect-preview">
            <span>Cari: <span class="stat-val">${escapeHTML(currentEff)}</span></span>
            ${!isMaxed ? `<span>Növbəti: <span class="stat-val" style="color:#ffd700;">${escapeHTML(nextEff)}</span></span>` : ''}
          </div>
        </div>
        <div class="talent-card-footer">
          ${footerHTML}
        </div>
      `;

      // Düymə klik hadisəsi
      const btn = card.querySelector('.talent-upgrade-btn');
      if (btn && !btn.disabled && btn.getAttribute('data-talent-id')) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = btn.getAttribute('data-talent-id');
          const res = upgradeTalent(targetId, state.lastEngineApi);
          if (res.success) {
            renderTalentCards(targetId);
          }
        });
      }

      grid.appendChild(card);
    });
  }

  function updateModalDOM(highlightTalentId) {
    if (state.isModalOpen) {
      renderTalentCards(highlightTalentId);
    }
  }

  function openModal(api) {
    if (api) state.lastEngineApi = api;
    const modal = createModalDOM();
    if (!modal) return;

    state.isModalOpen = true;
    renderTalentCards();
    modal.classList.add('active');

    playSFXSafe('click', state.lastEngineApi);
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.remove('active');
    }
    state.isModalOpen = false;
    playSFXSafe('click', state.lastEngineApi);
  }

  function toggleModal(api) {
    if (state.isModalOpen) {
      closeModal();
    } else {
      openModal(api);
    }
  }

  // Capture fazasında Escape hadisəsini idarə edən qlobal dinləyici
  if (typeof window !== 'undefined') {
    window.addEventListener(
      'keydown',
      function (e) {
        if (e.code === 'Escape' && state.isModalOpen) {
          e.stopPropagation();
          e.preventDefault();
          closeModal();
        }
      },
      true // Capture phase: hadisə digər elementlərə çatmamış tutulur!
    );
  }

  // --- 9. OYUN PLUGİN HOOK-LARI VƏ İNTEQRASİYA ---
  const GameTalents = {
    id: 'talents',
    name: 'Qədim İstedad Ağacı',
    version: '4.0.0',

    // Səhifə açılarkən 1 dəfə
    init: function (api) {
      state.lastEngineApi = api || null;
      loadSavedData();
      if (typeof document !== 'undefined') {
        createModalDOM();
      }
    },

    // Yeni run/oyun başlayanda
    onRunStart: function (mode, api) {
      state.lastEngineApi = api || null;
      state.runEarnedSouls = 0;
      state.phoenixReviveUsed = false;
      state.deathNoticeTimer = 0;

      // Başlanğıc Qəzəb (Rage) talantı: fury_starter
      const furyLvl = getTalentLevel('fury_starter');
      if (furyLvl > 0) {
        const bonusRage = furyLvl * 25;
        if (api && typeof api.addRage === 'function') {
          api.addRage(bonusRage);
        } else if (typeof window !== 'undefined' && window.GameCompanions && typeof window.GameCompanions.addRage === 'function') {
          window.GameCompanions.addRage(bonusRage);
        }
      }

      // Maksimum can sinxronizasiyası (iron_skin)
      const ironLvl = getTalentLevel('iron_skin');
      if (ironLvl > 0 && api && api.player) {
        const bonusHp = ironLvl * 15;
        api.player.maxHp = Math.max(100, (api.player.baseMaxHp || 100) + bonusHp);
        api.player.hp = api.player.maxHp;
      }
    },

    // Bölgə / Region keçidi zamanı mükafat
    onRegionLoaded: function (regionIndex, worldState, api) {
      state.lastEngineApi = api || null;
      if (regionIndex > 0) {
        // Bölgə keçidi mükafatı: +10 Ruh Daşı
        addSoulStones(10, 'Bölgə Fəthi Mükafatı', api);
        if (api && typeof api.notify === 'function') {
          api.notify('BÖLGƏ FƏTH EDİLDİ!', '+10 💠 Ruh Daşı Qazandın!', 'bonus');
        }
      }
    },

    // Düşmən qətli zamanı Ruh Daşı düşməsi
    onEnemyKilled: function (enemy, player, worldState, api) {
      if (!enemy) return;
      state.lastEngineApi = api || null;

      const coords = { x: enemy.x, y: enemy.y };

      // 1. Boss qətli: 25 Ruh Daşı (100% şans)
      if (enemy.isBoss) {
        addSoulStones(25, 'Boss Məğlub Edildi!', api, coords);
        return;
      }

      // 2. Elit düşmən qətli: 3 Ruh Daşı (100% şans)
      if (enemy.isElite || enemy.elite) {
        addSoulStones(3, 'Elit Düşmən Məğlub Edildi!', api, coords);
        return;
      }

      // 3. Adi düşmən: 20% baza şans + Ruh Biçini (soul_harvester) bonusu (+10% / lvl)
      const harvesterLvl = getTalentLevel('soul_harvester');
      const dropChance = 0.20 + (harvesterLvl * 0.10);

      if (Math.random() < dropChance) {
        addSoulStones(1, 'Düşmən Qətli', api, coords);
      }
    },

    // Boss məğlubiyyəti
    onBossDefeated: function (boss, worldState, api) {
      // (Əgər onEnemyKilled artıq emal edibsə təkrar verməsin deyə bayraq qoyuruq)
      if (boss && !boss._talentsSoulRewarded) {
        boss._talentsSoulRewarded = true;
        addSoulStones(25, 'Boss Mükafatı', api, { x: boss.x, y: boss.y });
      }
    },

    // Çıxan zərərin modifikasiyası (Qılınc Ustalığı & Cəlladın Hökmü)
    modifyOutgoingDamage: function (enemy, damage, isCrit, player, api) {
      let finalDamage = damage;

      // blade_mastery: +5% / lvl
      const bladeLvl = getTalentLevel('blade_mastery');
      if (bladeLvl > 0) {
        finalDamage *= (1.0 + bladeLvl * 0.05);
      }

      // executioner: Zəifləmiş (<35% HP) düşmənlərə +10% / lvl
      const execLvl = getTalentLevel('executioner');
      if (execLvl > 0 && enemy && enemy.maxHp && (enemy.hp / enemy.maxHp) <= 0.35) {
        finalDamage *= (1.0 + execLvl * 0.10);
      }

      return finalDamage;
    },

    // Daxil olan zərərin modifikasiyası (Qoruyucu Zireh & Həyati Müqavimət)
    modifyIncomingDamage: function (amount, player, source, api) {
      let finalAmount = amount;

      // aegis_ward: -6% / lvl
      const aegisLvl = getTalentLevel('aegis_ward');
      if (aegisLvl > 0) {
        finalAmount *= Math.max(0.4, 1.0 - (aegisLvl * 0.06));
      }

      // vitality_surge: Can < 30% olanda əlavə -15% / lvl
      const surgeLvl = getTalentLevel('vitality_surge');
      if (surgeLvl > 0 && player && player.maxHp && (player.hp / player.maxHp) <= 0.30) {
        finalAmount *= Math.max(0.3, 1.0 - (surgeLvl * 0.15));
      }

      return Math.max(1, finalAmount);
    },

    // Oyunçu öləndə: FENİKS RUHU və ya RUN XÜLASƏSİ
    onPlayerDeath: function (player, stats, api) {
      state.lastEngineApi = api || null;

      // 1. Feniks Ruhu yoxlanışı
      const hasPhoenixTalent = getTalentLevel('phoenix_soul') >= 1;
      if (hasPhoenixTalent && !state.phoenixReviveUsed) {
        state.phoenixReviveUsed = true;
        state.stats.phoenixRevivesTriggered++;
        saveAllData();

        // Dirilmə parametrləri (50% can)
        if (player) {
          player.hp = Math.max(1, Math.round((player.maxHp || 100) * 0.5));
          player.invulnTimer = 2.5;
        }

        // Möhtəşəm vizual və audio reaksiyalar
        if (api) {
          if (typeof api.slowMo === 'function') api.slowMo(0.25, 1.2);
          if (typeof api.shake === 'function') api.shake(15, 0.65);
          if (typeof api.hitStop === 'function') api.hitStop(0.08);
          if (player && typeof api.explosion === 'function') {
            api.explosion(player.x, player.y, '#f59e0b', 32, 90);
          }
          if (player && typeof api.floatingText === 'function') {
            api.floatingText(player.x, player.y - 40, '🔥 FENİKS RUHU: DİRİLDİN!', '#ffd700', 26);
          }
          if (typeof api.notify === 'function') {
            api.notify('🔥 FENİKS RUHU OYANDI!', 'Ölümdən 50% canla qayıtdın! Döyüşə davam!', 'bonus');
          }
        }

        playSFXSafe('ultimate', api);
        playSFXSafe('evolution', api);

        // TRUE QAYTARARAQ ÖLÜMÜ LƏĞV EDİR!
        return true;
      }

      // 2. Feniks yoxdursa və ya istifadə olunubsa: Ölüm bildirişi və Run Xülasəsi
      state.deathNoticeTimer = 5.0;

      if (api && typeof api.notify === 'function') {
        api.notify(
          'ÖLÜM SON DEYİL!',
          `Bu cəhddə: +${state.runEarnedSouls} 💠 Ruh Daşı! [T] ilə İstedad Ağacını aç.`,
          'warning'
        );
      }

      // FALSE qaytararaq ölümün davam etməsinə icazə verir
      return false;
    },

    // Hər kadr çağırılan çarpanlar
    getStatMultipliers: function () {
      return calculateAllMultipliers();
    },

    // Klaviatura hadisəsi ([T] düyməsi)
    handleKey: function (code, api) {
      state.lastEngineApi = api || null;

      if (code === 'KeyT') {
        toggleModal(api);
        return true; // Hadisəni udduq
      }

      if (code === 'Escape' && state.isModalOpen) {
        closeModal();
        return true;
      }

      return false;
    },

    // Hər kadr yenilənməsi
    update: function (dt, player, worldState, api) {
      state.lastEngineApi = api || null;

      if (state.deathNoticeTimer > 0) {
        state.deathNoticeTimer -= dt;
      }
      if (state.hudGlowTimer > 0) {
        state.hudGlowTimer -= dt;
      }
    },

    // HUD Render (Sol yuxarı panel altında: x=18, y=200)
    renderHUD: function (ctx, w, h, worldState) {
      if (!ctx) return;

      ctx.save();

      // Sol panel altı etiket
      const hudX = 18;
      const hudY = 195;
      const hudW = 142;
      const hudH = 28;

      // Arxa fon (Glassmorphism)
      ctx.fillStyle = state.hudGlowTimer > 0 ? 'rgba(0, 229, 255, 0.22)' : 'rgba(14, 11, 24, 0.75)';
      ctx.strokeStyle = state.hudGlowTimer > 0 ? '#00e5ff' : 'rgba(245, 197, 66, 0.35)';
      ctx.lineWidth = 1;

      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudW, hudH, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(hudX, hudY, hudW, hudH);
        ctx.strokeRect(hudX, hudY, hudW, hudH);
      }

      // Ruh İkonu və Balans
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#00e5ff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('💠', hudX + 8, hudY + 14);

      ctx.font = 'bold 12px "Cinzel", serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(state.soulStones), hudX + 28, hudY + 14);

      // [T] İstedadlar Düymə Göstəricisi
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#f5c542';
      ctx.textAlign = 'right';
      ctx.fillText('[T] İstedadlar', hudX + hudW - 8, hudY + 14);

      // Feniks simvolu (əgər mövcuddursa)
      if (getTalentLevel('phoenix_soul') >= 1) {
        ctx.font = '11px sans-serif';
        const flameColor = state.phoenixReviveUsed ? 'rgba(255, 255, 255, 0.3)' : '#f59e0b';
        ctx.fillStyle = flameColor;
        ctx.fillText(state.phoenixReviveUsed ? '🔥 (İstifadə edildi)' : '🔥 1/1', hudX + hudW + 10, hudY + 14);
      }

      // Əgər ölüm baş veribsə və bildiriş vaxtı aktivdirsə
      if (state.deathNoticeTimer > 0) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px "Cinzel", serif';
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillText(
          `💠 Bu cəhddə: +${state.runEarnedSouls} Ruh Daşı — [T] İstedad Ağacını aç!`,
          w / 2,
          h * 0.78
        );
      }

      ctx.restore();
    },

    // Modal açıq olanda oyun idarəetməsini dondur
    isBlockingInput: function () {
      return state.isModalOpen;
    },

    // --- 10. PUBLIC API (CEO VƏ DİGƏR SİSTEMLƏR ÜÇÜN) ---
    openModal: function () {
      openModal(state.lastEngineApi);
    },
    closeModal: function () {
      closeModal();
    },
    toggleModal: function () {
      toggleModal(state.lastEngineApi);
    },
    getSouls: function () {
      return state.soulStones;
    },
    addSouls: function (amount, reason) {
      addSoulStones(amount, reason, state.lastEngineApi);
    },
    getTalentLevel: function (talentId) {
      return getTalentLevel(talentId);
    },
    upgradeTalent: function (talentId) {
      return upgradeTalent(talentId, state.lastEngineApi);
    },
    resetTalents: function () {
      return resetAllTalents(state.lastEngineApi);
    },
    hasPhoenix: function () {
      return getTalentLevel('phoenix_soul') >= 1;
    },
    isPhoenixAvailable: function () {
      return getTalentLevel('phoenix_soul') >= 1 && !state.phoenixReviveUsed;
    },
    getRunEarnedSouls: function () {
      return state.runEarnedSouls;
    }
  };

  // --- 11. QEYDİYYAT VƏ İXRACAT (MÜQAVİLƏYƏ UYĞUN) ---
  if (typeof window !== 'undefined') {
    window.GameTalents = GameTalents;
    window.GamePlugins = window.GamePlugins || [];
    window.GamePlugins.push(GameTalents);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameTalents;
  }

})(typeof window !== 'undefined' ? window : globalThis);
