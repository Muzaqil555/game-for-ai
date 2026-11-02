/**
 * ============================================================================
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V4.0 — Zero-Conflict Plugin Module)
 * Fayl: src/daily_trials.js
 * Qlobal Obyekt: window.GameDaily
 * Məsul Agent: 36-cı Agent — Onboarding və Gündəlik Retention Mütəxəssisi
 *
 * Əsas Sistemlər:
 * 1. Kontekstual Addım-Addım Təlimat (FTUE - First Time User Experience):
 *    - Yalnız ilk dəfə oynayanlar üçün (localStorage: aetheria_daily_tutorialDone).
 *    - Hərəkətə əsaslanan 6 kontekstual ipucu (WASD hərəkəti, Sol klik hücumu,
 *      Space yayınması, 1-4 silah dəyişimi, Qızıl Hədəf Oxu, R Ultimate gücü).
 *    - Ekranın aşağı-mərkəzində (hotbarın üstü, y ≈ h - 190) parlaq animasiyalı kart.
 *    - [H] düyməsi ilə istənilən an dərhal təlimatı keçmək imkanı.
 *    - Hər addım bitəndə ✓ animasiyası və SFX `click`.
 *
 * 2. Gündəlik Sınaqlar (Daily Trials):
 *    - Tarixdən (YYYY-MM-DD) seed alan deterministik random (Mulberry32) alqoritmi.
 *    - 15 zəngin şablondan hər gün 3 unikal sınaq təyin edilir.
 *    - Tərəqqi localStorage-da günə görə saxlanılır.
 *    - Hər sınaq tamamlananda qızıl + kristal mükafatı, "🌅 GÜNDƏLİK SINAQ TAMAMLANDI!"
 *      bildirişi və SFX `dailyComplete`.
 *    - 3 sınağın hamısı bitəndə böyük bonus: 1 Pulsuz Relikt Seçimi (api.openRelicDraft())
 *      və +500 Qızıl!
 *
 * 3. Giriş Seriyası (Login Streak):
 *    - 1-7 günlük zəncirvari giriş sistemi.
 *    - Gün buraxıldıqda sıfırlanır, ardıcıl günlərdə artır.
 *    - Günün ilk run-unda (onRunStart) "🔥 N günlük seriya!" elanı və artan mükafat.
 *
 * 4. [J] Gündəlik Sınaqlar Paneli:
 *    - [J] düyməsi ilə açılıb-bağlanan zərif HUD overlay kartı.
 *    - Oyunu bloklamır (isBlockingInput = false).
 *    - 3 sınaq kartı, tərəqqi barları, qazanılan mükafatlar və 7 günlük seriya pillələri.
 *
 * 5. Public API:
 *    - window.GameDaily.getSummary() — CEO və menyular üçün real-vaxt xülasəsi.
 * ============================================================================
 */

(function (root) {
  'use strict';

  // --- Təhlükəsiz LocalStorage Köməkçiləri ---
  const STORAGE_PREFIX = 'aetheria_daily_';

  function safeStorageGet(key, defaultVal) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(STORAGE_PREFIX + key);
        return val !== null ? val : defaultVal;
      }
    } catch (e) {
      // Brauzer təhlükəsizlik məhdudiyyəti və ya incognito
    }
    return defaultVal;
  }

  function safeStorageSet(key, val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_PREFIX + key, String(val));
      }
    } catch (e) {
      // LocalStorage xətası
    }
  }

  // --- Deterministik Gün Seed Alqoritmi (Mulberry32) ---
  function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function stringToSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    }
    return h;
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- 15 Zəngin Gündəlik Sınaq Şablonu ---
  const TRIAL_TEMPLATES = [
    {
      id: 'kills_50',
      title: 'Kölgə Təmizləyicisi',
      desc: 'Səltənətdə 50 düşmən məhv et',
      icon: '⚔️',
      type: 'kills',
      target: 50,
      rewardGold: 200,
      rewardCrystals: 5
    },
    {
      id: 'elite_3',
      title: 'Elita Ovçusu',
      desc: '3 elit düşməni aradan qaldır',
      icon: '👑',
      type: 'elite_kills',
      target: 3,
      rewardGold: 300,
      rewardCrystals: 10
    },
    {
      id: 'dagger_20',
      title: 'İldırım Sürətli Xəncər',
      desc: 'Xəncərlə 20 düşmən qətli gerçəkləşdir',
      icon: '🗡️',
      type: 'weapon_kills',
      weapon: 'dagger',
      target: 20,
      rewardGold: 220,
      rewardCrystals: 6
    },
    {
      id: 'sword_25',
      title: 'Aether Qılınc Ustalığı',
      desc: 'Qılıncla 25 düşməni kəsib-doğra',
      icon: '🤺',
      type: 'weapon_kills',
      weapon: 'sword',
      target: 25,
      rewardGold: 220,
      rewardCrystals: 6
    },
    {
      id: 'hammer_15',
      title: 'Dağıdıcı Çəkic Zərbəsi',
      desc: 'Ağır Çəkiclə 15 düşməni əz',
      icon: '🔨',
      type: 'weapon_kills',
      weapon: 'hammer',
      target: 15,
      rewardGold: 250,
      rewardCrystals: 8
    },
    {
      id: 'bow_20',
      title: 'Sərrast Oxatan',
      desc: 'Yay ilə uzaqdan 20 düşmən məhv et',
      icon: '🏹',
      type: 'weapon_kills',
      weapon: 'bow',
      target: 20,
      rewardGold: 220,
      rewardCrystals: 6
    },
    {
      id: 'boss_1',
      title: 'Titanların Düşüşü',
      desc: '1 Böyük Boss məğlub et',
      icon: '💀',
      type: 'boss_kills',
      target: 1,
      rewardGold: 400,
      rewardCrystals: 15
    },
    {
      id: 'gold_500',
      title: 'Qızıl Tamahkarı',
      desc: 'Döyüşlərdə 500 qızıl qazan',
      icon: '💰',
      type: 'gold_collected',
      target: 500,
      rewardGold: 250,
      rewardCrystals: 7
    },
    {
      id: 'no_damage_60',
      title: 'Toxunulmaz Kölgə',
      desc: 'Zərər almadan 60 saniyə sağ qal',
      icon: '🛡️',
      type: 'no_damage_time',
      target: 60,
      rewardGold: 350,
      rewardCrystals: 12
    },
    {
      id: 'crits_15',
      title: 'Dəqiq Ölümcül Zərbələr',
      desc: 'Düşmənlərə 15 kritik zərbə vur',
      icon: '⚡',
      type: 'crits',
      target: 15,
      rewardGold: 200,
      rewardCrystals: 5
    },
    {
      id: 'dashes_12',
      title: 'Külək Kimi Çevik',
      desc: 'Döyüşdə 12 dəfə yayınma (dash) icra et',
      icon: '💨',
      type: 'dashes',
      target: 12,
      rewardGold: 180,
      rewardCrystals: 4
    },
    {
      id: 'relics_2',
      title: 'Əntiq Reliktlər',
      desc: 'Döyüşlərdə 2 ədəd qədim Relikt qazan',
      icon: '🔮',
      type: 'relics',
      target: 2,
      rewardGold: 260,
      rewardCrystals: 8
    },
    {
      id: 'kills_run_80',
      title: 'Böyük Qətliam',
      desc: 'Bir döyüşdə 80 düşmən məhv et',
      icon: '🔥',
      type: 'kills_run',
      target: 80,
      rewardGold: 320,
      rewardCrystals: 10
    },
    {
      id: 'ultimates_3',
      title: 'Qiyamət Çağırışı',
      desc: '3 dəfə Qiyamət [R] gücündən istifadə et',
      icon: '☄️',
      type: 'ultimates',
      target: 3,
      rewardGold: 250,
      rewardCrystals: 8
    },
    {
      id: 'survival_120',
      title: 'Sarsılmaz İradə',
      desc: 'Döyüşdə cəmi 120 saniyə mübarizə apar',
      icon: '⏳',
      type: 'survival_time',
      target: 120,
      rewardGold: 280,
      rewardCrystals: 9
    }
  ];

  // --- 7 Günlük Seriya Mükafatları Cədvəli ---
  const STREAK_REWARDS = [
    { day: 1, gold: 100, crystals: 0 },
    { day: 2, gold: 150, crystals: 0 },
    { day: 3, gold: 200, crystals: 5 },
    { day: 4, gold: 250, crystals: 8 },
    { day: 5, gold: 300, crystals: 12 },
    { day: 6, gold: 400, crystals: 16 },
    { day: 7, gold: 600, crystals: 25 }
  ];

  // --- FTUE Kontekstual Tutorial Addımları ---
  const TUTORIAL_STEPS = [
    {
      id: 'move',
      title: 'WASD İLƏ HƏRƏKƏT ET',
      desc: 'Qəhrəmanını istiqamətləndir (150px addımla)',
      keyTag: 'WASD',
      targetDist: 150
    },
    {
      id: 'attack',
      title: 'SOL KLİK İLƏ HÜCUM ET',
      desc: 'Düşmənə yaxınlaş və ilk zərbəni endir',
      keyTag: 'SOL KLİK'
    },
    {
      id: 'dash',
      title: 'SPACE İLƏ YAYIN (DASH)',
      desc: 'Təhlükəli hücumlardan sıçrayışla qaç',
      keyTag: 'SPACE'
    },
    {
      id: 'weapon',
      title: '1-4 İLƏ SİLAH DƏYİŞ',
      desc: 'Qılınc, Xəncər, Çəkic və ya Yay seç',
      keyTag: '1-4'
    },
    {
      id: 'compass',
      title: 'QIZIL OXU İZLƏ',
      desc: 'O səni missiyaya və növbəti hədəfə aparır!',
      keyTag: 'HƏDƏF OXU',
      duration: 6.0
    },
    {
      id: 'ultimate',
      title: 'R — QƏZƏB DOLANDA ULTIMATE!',
      desc: 'Qəzəb sayğacı dolanda Qiyamət gücünü oyat!',
      keyTag: 'R GÜCÜ',
      duration: 6.0
    }
  ];

  // --- Daxili Vəziyyət (Internal State) ---
  const state = {
    // API Keşi
    api: null,

    // Tarix və Sınaqlar
    todayStr: '',
    trials: [],
    allTrialsCompleted: false,
    allBonusClaimed: false,

    // Giriş Seriyası
    streak: 1,
    lastDateStr: '',
    streakClaimedDate: '',

    // Kontekstual FTUE
    tutorialDone: false,
    tutorialStep: 0,
    tutorialDistWalked: 0,
    tutorialStepTimer: 0,
    tutorialAnimTimer: 0,
    tutorialShowCheckmark: false,
    playerLastX: null,
    playerLastY: null,

    // Canlı İzləmə Vəziyyətləri
    wasDashing: false,
    noDamageTimer: 0,
    runKills: 0,
    totalSurvivalTimer: 0,

    // Panel
    isPanelOpen: false,

    // Vizual Animasiyalar
    animTime: 0,
    notificationBanner: null
  };

  // --- Köməkçi Rəsm Funksiyaları ---
  function drawRoundRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    }
  }

  // --- Gündəlik Sınaqların Generasiyası ---
  function generateDailyTrials(todayStr) {
    const seed = stringToSeed(todayStr);
    const rng = mulberry32(seed);

    // 15 şablonun indekslərini qarışdır
    const indices = [];
    for (let i = 0; i < TRIAL_TEMPLATES.length; i++) indices.push(i);

    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    // İlk 3 unikal sınağı seç
    const selected = [];
    for (let k = 0; k < 3; k++) {
      const tmpl = TRIAL_TEMPLATES[indices[k]];
      selected.push({
        id: tmpl.id,
        title: tmpl.title,
        desc: tmpl.desc,
        icon: tmpl.icon,
        type: tmpl.type,
        weapon: tmpl.weapon || null,
        target: tmpl.target,
        rewardGold: tmpl.rewardGold,
        rewardCrystals: tmpl.rewardCrystals,
        progress: 0,
        completed: false
      });
    }

    return selected;
  }

  // --- Məlumatların Yüklənməsi və Sinxronlaşdırılması ---
  function loadDailyData() {
    const today = getTodayString();
    state.todayStr = today;

    // 1. FTUE Tutorial Vəziyyəti
    const tutDoneVal = safeStorageGet('tutorialDone', '0');
    state.tutorialDone = tutDoneVal === '1' || tutDoneVal === 'true';

    // 2. Giriş Seriyası Vəziyyəti
    const savedLastDate = safeStorageGet('lastDate', '');
    const savedStreak = parseInt(safeStorageGet('streak', '1'), 10) || 1;
    const streakClaimed = safeStorageGet('streakClaimedDate', '');

    state.lastDateStr = savedLastDate;
    state.streakClaimedDate = streakClaimed;

    if (!savedLastDate) {
      // İlk dəfə daxil olur
      state.streak = 1;
    } else if (savedLastDate === today) {
      // Bu gün artıq qeydə alınıb
      state.streak = Math.max(1, Math.min(7, savedStreak));
    } else {
      // Keçmiş tarixlə müqayisə
      const dNow = new Date(today);
      const dPast = new Date(savedLastDate);
      const diffTime = dNow.getTime() - dPast.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Ardıcıl gün! Seriyanı 1 pillə artır (maksimum 7)
        state.streak = Math.min(7, savedStreak + 1);
      } else {
        // Gün buraxılıb, seriya 1-dən yenidən başlayır
        state.streak = 1;
      }
    }

    // Tarixi yenilə
    safeStorageSet('lastDate', today);
    safeStorageSet('streak', state.streak);

    // 3. Gündəlik Sınaqların Tərəqqisi
    const savedTrialsDate = safeStorageGet('trialsDate', '');
    const savedTrialsRaw = safeStorageGet('trialsData', '');
    const allClaimedDate = safeStorageGet('allTrialsClaimedDate', '');

    if (savedTrialsDate === today && savedTrialsRaw) {
      try {
        state.trials = JSON.parse(savedTrialsRaw);
      } catch (e) {
        state.trials = generateDailyTrials(today);
      }
    } else {
      // Yeni günün sınaqları
      state.trials = generateDailyTrials(today);
      saveTrialsData();
    }

    state.allBonusClaimed = allClaimedDate === today;
    checkAllTrialsStatus(false);
  }

  function saveTrialsData() {
    safeStorageSet('trialsDate', state.todayStr);
    safeStorageSet('trialsData', JSON.stringify(state.trials));
  }

  // --- Sınaq Tamamlanma Yoxlanışı ---
  function checkAllTrialsStatus(notifyUser) {
    if (!state.trials || state.trials.length === 0) return;

    let allDone = true;
    for (let i = 0; i < state.trials.length; i++) {
      if (!state.trials[i].completed) {
        allDone = false;
        break;
      }
    }

    state.allTrialsCompleted = allDone;

    if (allDone && !state.allBonusClaimed && state.api) {
      state.allBonusClaimed = true;
      safeStorageSet('allTrialsClaimedDate', state.todayStr);

      // Böyük 3/3 Mükafatı: 1 Əntiq Relikt Seçimi + 500 Qızıl!
      state.api.addGold(500);
      state.api.addCrystals(25);

      if (typeof state.api.openRelicDraft === 'function') {
        state.api.openRelicDraft();
      }

      state.api.notify(
        '🌟 BÜTÜN SINAQLAR BİTDİ!',
        'Bonus: 1 Relikt Seçimi, +500 Qızıl və +25 Kristal!',
        'quest'
      );

      state.api.playSFX('dailyComplete');
      state.api.playSFX('relic');
    }
  }

  function updateTrialProgress(type, amount, filterWeapon) {
    if (!state.trials || state.trials.length === 0) return;

    let changed = false;

    for (let i = 0; i < state.trials.length; i++) {
      const tr = state.trials[i];
      if (tr.completed) continue;

      if (tr.type === type) {
        // Silah filtrini yoxla
        if (tr.weapon && filterWeapon && tr.weapon !== filterWeapon) {
          continue;
        }

        tr.progress = Math.min(tr.target, tr.progress + amount);
        changed = true;

        if (tr.progress >= tr.target) {
          tr.completed = true;

          // Mükafatı ver
          if (state.api) {
            state.api.addGold(tr.rewardGold);
            state.api.addCrystals(tr.rewardCrystals);

            state.api.notify(
              '🌅 GÜNDƏLİK SINAQ TAMAMLANDI!',
              `${tr.title}: +${tr.rewardGold} 🪙 +${tr.rewardCrystals} 💎`,
              'quest'
            );

            state.api.playSFX('dailyComplete');
            state.api.playSFX('coin');
          }

          checkAllTrialsStatus(true);
        }
      }
    }

    if (changed) {
      saveTrialsData();
    }
  }

  // --- Tutorial Addımlarının İdarə Edilməsi ---
  function advanceTutorialStep() {
    if (state.tutorialDone) return;

    if (state.api) {
      state.api.playSFX('click');
    }

    state.tutorialShowCheckmark = true;
    state.tutorialAnimTimer = 0.5; // Yarım saniyəlik qələbə animasiyası

    state.tutorialStep++;
    state.tutorialDistWalked = 0;
    state.tutorialStepTimer = 0;

    if (state.tutorialStep >= TUTORIAL_STEPS.length) {
      // Bütün tutorial bitdi!
      state.tutorialDone = true;
      safeStorageSet('tutorialDone', '1');

      if (state.api) {
        state.api.notify(
          '🎉 TƏLİMAT TAMAMLANDI!',
          'Səltənəti xilas etməyə hazırsan, Qəhrəman!',
          'quest'
        );
        state.api.playSFX('levelUp');
      }
    }
  }

  function skipTutorial() {
    if (state.tutorialDone) return;
    state.tutorialDone = true;
    safeStorageSet('tutorialDone', '1');

    if (state.api) {
      state.api.notify(
        'Təlimat Ötürüldü',
        'Sərbəst döyüş rejimi aktivdir. [J] ilə sınaqlara bax!',
        'warning'
      );
      state.api.playSFX('click');
    }
  }

  // --- Plugin Modulunun Əsas Tərifi ---
  const GameDaily = {
    id: 'daily_trials',
    name: 'Gündəlik Sınaqlar, Seriya və FTUE Onboarding',

    // 1. Səhifə açılarkən 1 dəfə
    init: function (api) {
      state.api = api;
      loadDailyData();
    },

    // 2. Yeni oyun və ya Arena başladıqda
    onRunStart: function (mode, api) {
      state.api = api || state.api;
      state.runKills = 0;
      state.noDamageTimer = 0;
      state.totalSurvivalTimer = 0;
      state.wasDashing = false;
      state.playerLastX = null;
      state.playerLastY = null;

      // Günlük Giriş Seriyası Mükafatı (günün ilk run-u)
      const today = getTodayString();
      if (state.streakClaimedDate !== today) {
        state.streakClaimedDate = today;
        safeStorageSet('streakClaimedDate', today);

        const rewardIndex = Math.max(0, Math.min(6, state.streak - 1));
        const reward = STREAK_REWARDS[rewardIndex];

        if (api && reward) {
          api.addGold(reward.gold);
          if (reward.crystals > 0) {
            api.addCrystals(reward.crystals);
          }

          api.notify(
            `🔥 ${state.streak} GÜNLÜK SERİYA!`,
            `Günün ilk döyüşü: +${reward.gold} 🪙${
              reward.crystals > 0 ? ` +${reward.crystals} 💎` : ''
            }`,
            'bonus'
          );

          api.playSFX('dailyComplete');
          api.playSFX('coin');
        }
      }
    },

    // 3. Bölgə yüklənəndə
    onRegionLoaded: function (regionIndex, worldState, api) {
      state.api = api || state.api;
    },

    // 4. Hər kadr yenilənməsi
    update: function (dt, player, worldState, api) {
      state.api = api || state.api;
      state.animTime += dt;

      if (!player) return;

      // A) FTUE Addım 0: Hərəkət (WASD - 150px)
      if (!state.tutorialDone && state.tutorialStep === 0) {
        if (state.playerLastX !== null && state.playerLastY !== null) {
          const dx = player.x - state.playerLastX;
          const dy = player.y - state.playerLastY;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0.05 && d < 400) {
            state.tutorialDistWalked += d;
            if (state.tutorialDistWalked >= 150) {
              advanceTutorialStep();
            }
          }
        }
        state.playerLastX = player.x;
        state.playerLastY = player.y;
      }

      // B) FTUE Addım 2: Space Dash Aşkarlanması
      if (!state.tutorialDone && state.tutorialStep === 2) {
        if (player.dashTimer && player.dashTimer > 0) {
          advanceTutorialStep();
        }
      }

      // C) FTUE Addım 4 və 5: Vaxta əsaslanan təlimatlar (6 saniyə)
      if (
        !state.tutorialDone &&
        (state.tutorialStep === 4 || state.tutorialStep === 5)
      ) {
        state.tutorialStepTimer += dt;
        if (state.tutorialStepTimer >= 6.0) {
          advanceTutorialStep();
        }
      }

      // Animasiya taymeri
      if (state.tutorialAnimTimer > 0) {
        state.tutorialAnimTimer -= dt;
        if (state.tutorialAnimTimer <= 0) {
          state.tutorialShowCheckmark = false;
        }
      }

      // D) Gündəlik Sınaq: Yayınma (Dash) Sayğacı
      const isCurrentlyDashing = !!(player.dashTimer && player.dashTimer > 0);
      if (isCurrentlyDashing && !state.wasDashing) {
        state.wasDashing = true;
        updateTrialProgress('dashes', 1);
      } else if (!isCurrentlyDashing) {
        state.wasDashing = false;
      }

      // E) Gündəlik Sınaq: Zərərsiz Sağ Qalma (no_damage_time)
      state.noDamageTimer += dt;
      if (state.noDamageTimer >= 1.0) {
        const secs = Math.floor(state.noDamageTimer);
        state.noDamageTimer -= secs;
        updateTrialProgress('no_damage_time', secs);
      }

      // F) Gündəlik Sınaq: Ümumi Döyüş Müddəti (survival_time)
      state.totalSurvivalTimer += dt;
      if (state.totalSurvivalTimer >= 1.0) {
        const sSecs = Math.floor(state.totalSurvivalTimer);
        state.totalSurvivalTimer -= sSecs;
        updateTrialProgress('survival_time', sSecs);
      }
    },

    // 5. Zərər vurulduqda
    onEnemyHit: function (enemy, damage, isCrit, player, api) {
      state.api = api || state.api;

      // FTUE Addım 1: İlk Hücum
      if (!state.tutorialDone && state.tutorialStep === 1) {
        advanceTutorialStep();
      }

      // Gündəlik Sınaq: Kritik Zərbələr
      if (isCrit) {
        updateTrialProgress('crits', 1);
      }
    },

    // 6. Düşmən öldürüldükdə
    onEnemyKilled: function (enemy, player, worldState, api) {
      state.api = api || state.api;
      if (!enemy) return;

      state.runKills++;

      // Ümumi və Run Kills
      updateTrialProgress('kills', 1);
      updateTrialProgress('kills_run', 1);

      // Elita Düşmən
      if (enemy.isElite) {
        updateTrialProgress('elite_kills', 1);
      }

      // Boss Düşmən
      if (enemy.isBoss) {
        updateTrialProgress('boss_kills', 1);
      }

      // Qızıl Toplanması (qətl başına goldValue)
      const g = enemy.goldValue || 14;
      updateTrialProgress('gold_collected', g);

      // Silahla Qətl Sınaqları
      let activeWep = 'sword';
      if (state.api && typeof state.api.getActiveWeaponId === 'function') {
        activeWep = state.api.getActiveWeaponId() || 'sword';
      } else if (player && player.weaponType) {
        activeWep = player.weaponType;
      }
      updateTrialProgress('weapon_kills', 1, activeWep);
    },

    // 7. Oyunçu zərər aldıqda
    onPlayerDamaged: function (amount, player, api) {
      state.api = api || state.api;
      // Zərər aldıqda fasiləsiz zərərsiz sağ qalma sayğacı sıfırlanır
      state.noDamageTimer = 0;
    },

    // 8. Boss məğlub edildikdə
    onBossDefeated: function (boss, worldState, api) {
      state.api = api || state.api;
      updateTrialProgress('boss_kills', 1);
    },

    // 9. Relikt seçildikdə
    onRelicPicked: function (relicId, api) {
      state.api = api || state.api;
      updateTrialProgress('relics', 1);
    },

    // 10. Silah dəyişdirildikdə
    onWeaponSwitched: function (weaponId, api) {
      state.api = api || state.api;

      // FTUE Addım 3: Silah Dəyişdirildi
      if (!state.tutorialDone && state.tutorialStep === 3) {
        advanceTutorialStep();
      }
    },

    // 11. Klaviatura düymələri
    handleKey: function (code, api) {
      state.api = api || state.api;

      // [H] Təlimatı Keç
      if (code === 'KeyH' && !state.tutorialDone) {
        skipTutorial();
        return true;
      }

      // [J] Gündəlik Sınaqlar Panelini Aç/Bağla
      if (code === 'KeyJ') {
        state.isPanelOpen = !state.isPanelOpen;
        if (state.api) {
          state.api.playSFX('click');
        }
        return true;
      }

      // [R] Ultimate İstifadəsi (Sınaq üçün)
      if (code === 'KeyR') {
        const p = state.api && state.api.player;
        if (p && p.rage >= (p.maxRage || 100)) {
          updateTrialProgress('ultimates', 1);
        }
      }

      return false;
    },

    // 12. Input bloklanması (Gündəlik panel açıq olanda oyunu dayandırmır)
    isBlockingInput: function () {
      return false;
    },

    // 13. HUD Render
    renderHUD: function (ctx, w, h, worldState) {
      if (!ctx) return;
      ctx.save();

      // ====================================================================
      // 1. FTUE KONTEKSTUAL TUTORIAL KARTI (Əgər tamamlanmayıbsa)
      // ====================================================================
      if (!state.tutorialDone && state.tutorialStep < TUTORIAL_STEPS.length) {
        const curStep = TUTORIAL_STEPS[state.tutorialStep];
        const cardW = Math.min(460, w - 24);
        const cardH = 72;
        const cardX = Math.round((w - cardW) / 2);
        const cardY = Math.round(h - 232);

        // Nəbz parıltısı
        const pulse = Math.sin(state.animTime * 4) * 0.15 + 0.85;

        // Kartın Fonu (Glassmorphism)
        drawRoundRect(ctx, cardX, cardY, cardW, cardH, 14);
        ctx.fillStyle = 'rgba(12, 16, 28, 0.93)';
        ctx.fill();

        // Kartın Haşiyəsi və Kölgəsi
        ctx.strokeStyle = state.tutorialShowCheckmark
          ? `rgba(74, 222, 128, ${pulse})`
          : `rgba(212, 175, 55, ${pulse * 0.85})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = state.tutorialShowCheckmark
          ? 'rgba(74, 222, 128, 0.6)'
          : 'rgba(212, 175, 55, 0.5)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0; // Sıfırla

        // Sol İkon / Pillə Dairəsi
        const circleX = cardX + 38;
        const circleY = cardY + cardH / 2;
        ctx.beginPath();
        ctx.arc(circleX, circleY, 20, 0, Math.PI * 2);
        ctx.fillStyle = state.tutorialShowCheckmark
          ? 'rgba(34, 197, 94, 0.35)'
          : 'rgba(212, 175, 55, 0.25)';
        ctx.fill();
        ctx.strokeStyle = state.tutorialShowCheckmark ? '#4ade80' : '#d4af37';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = state.tutorialShowCheckmark ? '#4ade80' : '#fef08a';
        ctx.fillText(
          state.tutorialShowCheckmark ? '✓' : `${state.tutorialStep + 1}/6`,
          circleX,
          circleY
        );

        // Mərkəz Mətnləri
        const textStartX = cardX + 70;
        ctx.textAlign = 'left';

        // Başlıq
        ctx.textBaseline = 'top';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = state.tutorialShowCheckmark ? '#86efac' : '#ffffff';
        ctx.fillText(
          state.tutorialShowCheckmark ? 'ƏLA ZƏRBƏ! ✓' : curStep.title,
          textStartX,
          cardY + 14
        );

        // Təsvir / Tərəqqi
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        let descText = curStep.desc;
        if (state.tutorialStep === 0) {
          const walked = Math.min(150, Math.floor(state.tutorialDistWalked));
          descText = `Addımla: ${walked} / 150 px`;
        } else if (state.tutorialStep === 4 || state.tutorialStep === 5) {
          const rem = Math.max(
            0,
            Math.ceil(6.0 - (state.tutorialStepTimer || 0))
          );
          descText = `${curStep.desc} (${rem}s)`;
        }
        ctx.fillText(descText, textStartX, cardY + 38);

        // Sağ Tərəf: [H] Keç Düyməsi
        const skipBtnW = 74;
        const skipBtnH = 26;
        const skipBtnX = cardX + cardW - skipBtnW - 14;
        const skipBtnY = cardY + Math.round((cardH - skipBtnH) / 2);

        drawRoundRect(ctx, skipBtnX, skipBtnY, skipBtnW, skipBtnH, 8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('[H] Keç', skipBtnX + skipBtnW / 2, skipBtnY + skipBtnH / 2);
      }

      // ====================================================================
      // 2. GÜNDƏLİK SINAQLAR PANELİ (Əgər [J] ilə açılıbsa)
      // ====================================================================
      if (state.isPanelOpen) {
        const pW = 430;
        const pH = 510;
        const pX = Math.max(20, Math.min(w - pW - 24, w - pW - 30));
        const pY = Math.max(20, Math.round((h - pH) / 2));

        // Panel Fonu
        drawRoundRect(ctx, pX, pY, pW, pH, 16);
        ctx.fillStyle = 'rgba(10, 13, 24, 0.96)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.35)';
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Panel Başlığı
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.fillText('🌅 GÜNDƏLİK SINAQLAR', pX + 20, pY + 18);

        // Tarix Nişanı
        ctx.textAlign = 'right';
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
        ctx.fillText(`📅 ${state.todayStr}`, pX + pW - 20, pY + 22);

        // --- 7 Günlük Seriya Zolağı ---
        const streakY = pY + 54;
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`🔥 Giriş Seriyası: ${state.streak} Gün`, pX + 20, streakY);

        const boxW = 50;
        const boxH = 46;
        const boxGap = 7;
        const boxesStartX = pX + 20;

        for (let i = 0; i < 7; i++) {
          const bx = boxesStartX + i * (boxW + boxGap);
          const by = streakY + 22;
          const isCurrent = i + 1 === state.streak;
          const isPast = i + 1 < state.streak;

          drawRoundRect(ctx, bx, by, boxW, boxH, 8);

          if (isCurrent) {
            ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
            ctx.fill();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1.8;
            ctx.stroke();
          } else if (isPast) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = isCurrent ? '#fed7aa' : isPast ? '#86efac' : '#94a3b8';
          ctx.fillText(`Gün ${i + 1}`, bx + boxW / 2, by + 14);

          // Mükafat İkonu
          ctx.font = '10px sans-serif';
          const rwd = STREAK_REWARDS[i];
          const rwdText = rwd.crystals > 0 ? `💎+${rwd.crystals}` : `🪙+${rwd.gold}`;
          ctx.fillStyle = isCurrent ? '#fef08a' : '#cbd5e1';
          ctx.fillText(rwdText, bx + boxW / 2, by + 32);
        }

        // --- 3 Gündəlik Sınaq Kartı ---
        const trialsStartY = streakY + 84;
        const trialCardH = 88;
        const trialCardGap = 10;

        for (let i = 0; i < state.trials.length; i++) {
          const tr = state.trials[i];
          const ty = trialsStartY + i * (trialCardH + trialCardGap);

          drawRoundRect(ctx, pX + 20, ty, pW - 40, trialCardH, 12);
          ctx.fillStyle = tr.completed
            ? 'rgba(34, 197, 94, 0.12)'
            : 'rgba(255, 255, 255, 0.04)';
          ctx.fill();
          ctx.strokeStyle = tr.completed
            ? 'rgba(74, 222, 128, 0.5)'
            : 'rgba(212, 175, 55, 0.3)';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // İkon
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = '22px sans-serif';
          ctx.fillText(tr.icon || '⚔️', pX + 32, ty + 14);

          // Sınaq Başlığı
          ctx.font = 'bold 14px sans-serif';
          ctx.fillStyle = tr.completed ? '#86efac' : '#ffffff';
          ctx.fillText(tr.title, pX + 68, ty + 12);

          // Sağ Tərəf: Mükafat
          ctx.textAlign = 'right';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(
            `+${tr.rewardGold} 🪙  +${tr.rewardCrystals} 💎`,
            pX + pW - 32,
            ty + 14
          );

          // Təsvir
          ctx.textAlign = 'left';
          ctx.font = '12px sans-serif';
          ctx.fillStyle = 'rgba(203, 213, 225, 0.8)';
          ctx.fillText(tr.desc, pX + 68, ty + 32);

          // Tərəqqi Zolağı
          const barX = pX + 68;
          const barY = ty + 56;
          const barW = pW - 120;
          const barH = 16;
          const pct = Math.max(0, Math.min(1, tr.progress / tr.target));

          drawRoundRect(ctx, barX, barY, barW, barH, 6);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fill();

          if (pct > 0) {
            drawRoundRect(ctx, barX, barY, barW * pct, barH, 6);
            ctx.fillStyle = tr.completed ? '#22c55e' : '#eab308';
            ctx.fill();
          }

          // Tərəqqi Mətni
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#ffffff';
          const pText = tr.completed
            ? 'TAMAMLANDI ✓'
            : `${tr.progress} / ${tr.target} (${Math.round(pct * 100)}%)`;
          ctx.fillText(pText, barX + barW / 2, barY + barH / 2);
        }

        // --- 3/3 Tamamlanma Xüsusi Bonusu ---
        const bonusY = trialsStartY + 3 * (trialCardH + trialCardGap) + 4;
        drawRoundRect(ctx, pX + 20, bonusY, pW - 40, 42, 10);
        ctx.fillStyle = state.allTrialsCompleted
          ? 'rgba(212, 175, 55, 0.22)'
          : 'rgba(255, 255, 255, 0.03)';
        ctx.fill();
        ctx.strokeStyle = state.allTrialsCompleted
          ? '#d4af37'
          : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = state.allTrialsCompleted ? '#fef08a' : '#94a3b8';
        ctx.fillText(
          state.allTrialsCompleted
            ? '🌟 3/3 BİTDİ: Relikt Seçimi və +500 Qızıl Alındı!'
            : '🌟 3/3 Bonus: +1 Relikt Seçimi və +500 Qızıl',
          pX + pW / 2,
          bonusY + 21
        );

        // Panel Alt Qeyd
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
        ctx.fillText('[J] Paneli Bağla  •  [H] Təlimatı Keç', pX + pW / 2, pY + pH - 16);
      } else {
        // ====================================================================
        // 3. KOMPAKT SAĞ GÜNDƏLİK WIDGET (Panel Bağlı olanda kiçik xatırlatma)
        // ====================================================================
        let doneCount = 0;
        for (let i = 0; i < state.trials.length; i++) {
          if (state.trials[i].completed) doneCount++;
        }

        const miniW = 150;
        const miniH = 30;
        const miniX = w - miniW - 20;
        const miniY = 82;

        drawRoundRect(ctx, miniX, miniY, miniW, miniH, 8);
        ctx.fillStyle = 'rgba(12, 16, 28, 0.78)';
        ctx.fill();
        ctx.strokeStyle = doneCount === 3 ? '#4ade80' : 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = doneCount === 3 ? '#86efac' : '#fef08a';
        ctx.fillText(
          `[J] Gündəlik: ${doneCount}/3 ✓`,
          miniX + miniW / 2,
          miniY + miniH / 2
        );
      }

      ctx.restore();
    },

    // ========================================================================
    // PUBLIC API METODLARI
    // ========================================================================

    /**
     * CEO və Ana Menyu üçün Real-Vaxt Gündəlik İcmal
     */
    getSummary: function () {
      const trialsList = [];
      for (let i = 0; i < state.trials.length; i++) {
        const t = state.trials[i];
        trialsList.push({
          id: t.id,
          title: t.title,
          desc: t.desc,
          icon: t.icon,
          progress: t.progress,
          target: t.target,
          done: t.completed,
          rewardGold: t.rewardGold,
          rewardCrystals: t.rewardCrystals
        });
      }

      return {
        date: state.todayStr,
        streak: state.streak,
        streakClaimedToday: state.streakClaimedDate === state.todayStr,
        trials: trialsList,
        allTrialsCompleted: state.allTrialsCompleted,
        allBonusClaimed: state.allBonusClaimed,
        tutorialDone: state.tutorialDone,
        currentTutorialStep: state.tutorialStep,
        isPanelOpen: state.isPanelOpen
      };
    },

    /**
     * Paneli proqramlaşdırılmış şəkildə aç/bağla
     */
    togglePanel: function () {
      state.isPanelOpen = !state.isPanelOpen;
      return state.isPanelOpen;
    },

    /**
     * Təlimatı dərhal keç
     */
    skipTutorial: function () {
      skipTutorial();
    },

    /**
     * Gündəlik seed məlumatını qaytar
     */
    getDailySeed: function () {
      return stringToSeed(state.todayStr || getTodayString());
    },

    /**
     * Test məqsədilə vəziyyəti sıfırlama
     */
    resetData: function () {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(STORAGE_PREFIX + 'tutorialDone');
          window.localStorage.removeItem(STORAGE_PREFIX + 'streak');
          window.localStorage.removeItem(STORAGE_PREFIX + 'lastDate');
          window.localStorage.removeItem(STORAGE_PREFIX + 'streakClaimedDate');
          window.localStorage.removeItem(STORAGE_PREFIX + 'trialsDate');
          window.localStorage.removeItem(STORAGE_PREFIX + 'trialsData');
          window.localStorage.removeItem(STORAGE_PREFIX + 'allTrialsClaimedDate');
        }
      } catch (e) {}
      loadDailyData();
    }
  };

  // --- Plugin Qeydiyyatı (SKILL.md Müqaviləsinə Uyğun) ---
  if (typeof window !== 'undefined') {
    window.GameDaily = GameDaily;
    (window.GamePlugins = window.GamePlugins || []).push(GameDaily);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameDaily;
  }
})(typeof window !== 'undefined' ? window : this);
