/**
 * ============================================================================
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V4.0)
 * Modul: window.GameElites
 * Fayl: src/elite_affixes.js
 * Məsul Agent: 35-ci Agent — Elit Düşmən və Döyüş Müxtəlifliyi Mütəxəssisi
 * 
 * Bu modul hardcore oyunçuların "döyüş monotondur, hər düşmən eynidir"
 * şikayətini birdəfəlik aradan qaldırır:
 * 1. 8 Ədəd Taktiki Elit Affiks (🔥 Alovlu, ❄️ Buzlu, 🩸 Vampir, 🛡️ Qalxanlı,
 *    🌀 Teleport, 💥 Partlayan, ⚡ Sürətli, 👥 Çağırıcı)
 * 2. Dinamik Çempion Dəstəsi Hadisəsi (~75s dövri 1 Lider + 3 Mühafizəçi)
 * 3. 3 Fərqli Bölgə Təhlükəsi (Hazards) — Həm Oyunçuya, həm də Düşmənlərə Təsir Edir!
 * 4. Diablo/PoE/Hades tərzi zəngin vizual auralar, başüstü nişanlar və unikal HP barları.
 * ============================================================================
 */

(function () {
  'use strict';

  // --- Köməkçi Riyazi və Təhlükəsiz Funksiyalar ---
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const distSq = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const dist = (x1, y1, x2, y2) => Math.sqrt(distSq(x1, y1, x2, y2));

  // --- 8 UNİKAL ELİT AFFİKS TƏRİFİ ---
  const AFFIXES = {
    fire: {
      id: 'fire',
      name: 'Alovlu',
      icon: '🔥',
      color: '#ff4500',
      auraColor: 'rgba(255, 69, 0, 0.45)',
      description: 'Arxasında 3s yandırıcı iz qoyur (8 dps)'
    },
    frost: {
      id: 'frost',
      name: 'Buzlu',
      icon: '❄️',
      color: '#00d2ff',
      auraColor: 'rgba(0, 210, 255, 0.45)',
      description: 'Zərbəsi oyunçunu 1.2s 40% yavaşladır'
    },
    vampiric: {
      id: 'vampiric',
      name: 'Vampir',
      icon: '🩸',
      color: '#e11d48',
      auraColor: 'rgba(225, 29, 72, 0.45)',
      description: 'Zərbə vuranda öz canını sağaldır'
    },
    shielded: {
      id: 'shielded',
      name: 'Qalxanlı',
      icon: '🛡️',
      color: '#f59e0b',
      auraColor: 'rgba(245, 158, 11, 0.45)',
      description: 'Hər 6s 2s ərzində zərərin 80%-ni udur'
    },
    teleport: {
      id: 'teleport',
      name: 'Teleport',
      icon: '🌀',
      color: '#a855f7',
      auraColor: 'rgba(168, 85, 247, 0.45)',
      description: 'Hər 4s oyunçunun yanına sıçrayır'
    },
    explosive: {
      id: 'explosive',
      name: 'Partlayan',
      icon: '💥',
      color: '#ef4444',
      auraColor: 'rgba(239, 68, 68, 0.45)',
      description: 'Öləndə 1s sonra partlayır (25 zərər)'
    },
    fast: {
      id: 'fast',
      name: 'Sürətli',
      icon: '⚡',
      color: '#eab308',
      auraColor: 'rgba(234, 179, 8, 0.45)',
      description: 'Sürət 1.6 qat yüksəkdir'
    },
    summoner: {
      id: 'summoner',
      name: 'Çağırıcı',
      icon: '👥',
      color: '#10b981',
      auraColor: 'rgba(16, 185, 129, 0.45)',
      description: 'Hər 7s 1 goblin çağırır'
    }
  };

  const AFFIX_KEYS = Object.keys(AFFIXES);

  // --- Daxili Vəziyyət (Internal State) ---
  let _api = null;
  let _regionIndex = 0;
  let _championPackTimer = 35; // İlk çempion dəstəsi üçün başlanğıc taymeri, sonra ~75s
  let _hazards = []; // Mövcud bölgənin təhlükə obyektləri (5-7 ədəd)
  let _flameTrails = []; // Alovlu elitlərin arxasında buraxdığı yanar izlər
  let _deathBombs = []; // Partlayan elitlərin 1s gecikməli partlayış obyektləri
  let _particles = []; // Zərif və optimallaşdırılmış vizual hissəciklər (max 150)
  let _playerFrostSlowTimer = 0; // Buzlu affiksdən yavaşlama taymeri (1.2s)
  let _playerPoisonSlowTimer = 0; // Meşə zəhərli göbələklərindən yavaşlama taymeri
  let _flameDamageAccumulator = 0; // Dps zərərlərini fasiləsiz yığıb dövrlə tətbiq etmək üçün
  let _poisonDamageAccumulator = 0;
  let _pillarDamageAccumulator = 0;

  /**
   * Təsadüfi n sayda unikal affiks seçir
   */
  function getRandomAffixes(count) {
    const shuffled = AFFIX_KEYS.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(1, count));
  }

  /**
   * Düşməni Elit modifikatorları və affikslərlə təchiz edir
   */
  function applyEliteModifiers(enemy, forcedAffixKeys) {
    if (!enemy || enemy._eliteInitialized) return;
    enemy._eliteInitialized = true;
    enemy.isElite = true;

    // 1. Can, Ölçü, Mükafat və Zərər artımı
    enemy.hp = Math.round((enemy.hp || 70) * 2.2);
    enemy.maxHp = enemy.hp;
    enemy.radius = Math.round((enemy.radius || 18) * 1.25);
    enemy.goldValue = Math.round((enemy.goldValue || 8) * 3);
    enemy.expValue = Math.round((enemy.expValue || 20) * 3);
    enemy.damage = Math.round((enemy.damage || 14) * 1.3);

    // 2. Affikslərin təyini (Bölgə 2 və yuxarıda 2 affiks, digərlərində 1 affiks)
    const neededCount = (_regionIndex >= 2) ? 2 : 1;
    const chosenKeys = (Array.isArray(forcedAffixKeys) && forcedAffixKeys.length > 0)
      ? forcedAffixKeys
      : getRandomAffixes(neededCount);

    enemy.affixes = chosenKeys;
    enemy.affixObjects = chosenKeys.map(k => AFFIXES[k]).filter(Boolean);

    // 3. Affikslərə görə daxili taymerlər və xüsusiyyətlər
    enemy._fireTrailTimer = 0.25;
    enemy._shieldTimer = 0;
    enemy._shieldActive = false;
    enemy._teleportTimer = 3.0 + Math.random() * 2.0;
    enemy._summonTimer = 3.5 + Math.random() * 3.5;
    enemy._summonedMinions = [];

    // 'fast' affiksi varsa sürəti dərhal 1.6 qat artır
    if (chosenKeys.indexOf('fast') !== -1) {
      enemy.speed = Math.round((enemy.speed || 110) * 1.6);
      enemy.baseSpeed = enemy.speed;
    }

    // 4. Adın zənginləşdirilməsi ("🔥 Alovlu Meşə Qoblini")
    const icons = enemy.affixObjects.map(a => a.icon).join('');
    const affixPrefixNames = enemy.affixObjects.map(a => a.name).join(' ');
    enemy.displayName = `${icons} ${affixPrefixNames} ${enemy.name || 'Düşmən'}`;
    enemy.name = enemy.displayName;
  }

  /**
   * Çempion Dəstəsi Hadisəsini (Champion Pack) başladır
   */
  function spawnChampionPack(player, worldState, api) {
    if (!player || !api || typeof api.spawnEnemy !== 'function') return;

    const mapW = (worldState && worldState.region && worldState.region.width) || 2600;
    const mapH = (worldState && worldState.region && worldState.region.height) || 2600;

    // Oyunçudan 450px aralıda təsadüfi bucaqda nöqtə
    const angle = Math.random() * Math.PI * 2;
    const packDist = 450;
    const lx = clamp(player.x + Math.cos(angle) * packDist, 160, mapW - 160);
    const ly = clamp(player.y + Math.sin(angle) * packDist, 160, mapH - 160);

    // Bölgəyə görə lider növü
    const leaderTypes = ['golem', 'wraith', 'knight'];
    const leaderType = leaderTypes[_regionIndex % leaderTypes.length] || 'knight';

    // 1. Elit Lider
    const leader = api.spawnEnemy(leaderType, lx, ly, { elite: true });
    if (leader) {
      leader.isChampionLeader = true;
      applyEliteModifiers(leader);
      leader.hp = Math.round(leader.hp * 1.25);
      leader.maxHp = leader.hp;
      leader.goldValue = (leader.goldValue || 35) + 120;
      leader.displayName = `👑 ⚠️ ÇEMPİON LİDER: ${leader.displayName || leader.name}`;
      leader.name = leader.displayName;
    }

    // 2. 3 Ədəd Adi Düşmən Mühafizəçilər (Escorts)
    const escortPool = ['goblin', 'archer', 'wraith'];
    const escortType = escortPool[_regionIndex % escortPool.length] || 'goblin';

    for (let i = 0; i < 3; i++) {
      const escortAngle = angle + (i - 1) * 0.75;
      const ex = clamp(lx + Math.cos(escortAngle) * 65, 120, mapW - 120);
      const ey = clamp(ly + Math.sin(escortAngle) * 65, 120, mapH - 120);
      const escort = api.spawnEnemy(escortType, ex, ey, { elite: false });
      if (escort) {
        escort._isChampionEscort = true;
        escort.isElite = false;
        escort._eliteInitialized = true; // Elitə çevrilməsin
      }
    }

    // Bildiriş, SFX və Kamera reaksiyası
    if (api.notify) {
      api.notify('⚠️ ÇEMPİON DƏSTƏSİ YAXINLAŞIR!', 'Ərazidə elit lider və mühafizəçiləri peyda oldu!', 'warning');
    }
    if (api.playSFX) api.playSFX('eliteSpawn');
    if (api.shake) api.shake(6, 0.4);
    if (api.floatingText) api.floatingText(lx, ly - 45, '⚠️ ÇEMPİON DƏSTƏSİ!', '#ef4444', 20);
  }

  /**
   * Bölgə üçün 5-7 ədəd tematik təhlükə (hazards) ocağı generasiya edir
   */
  function generateHazardsForRegion(regionIndex, worldState) {
    _hazards = [];
    const rIdx = Math.max(0, Math.min(2, regionIndex || 0));
    _regionIndex = rIdx;

    const width = (worldState && worldState.region && worldState.region.width) || 2600;
    const height = (worldState && worldState.region && worldState.region.height) || 2600;
    const pSpawn = (worldState && worldState.region && worldState.region.playerSpawn) || { x: 350, y: 1300 };

    const hazardCount = 5 + Math.floor(Math.random() * 3); // 5, 6 və ya 7 ədəd
    const safeDistFromSpawn = 360; // Oyunçu doğulma nöqtəsindən ≥ 350px uzaq

    for (let i = 0; i < hazardCount; i++) {
      let attempts = 0;
      let valid = false;
      let hx = 0;
      let hy = 0;

      while (!valid && attempts < 40) {
        attempts++;
        hx = 200 + Math.random() * (width - 400);
        hy = 200 + Math.random() * (height - 400);

        if (dist(hx, hy, pSpawn.x, pSpawn.y) >= safeDistFromSpawn) {
          // Digər təhlükələrlə toqquşmasın
          let tooClose = false;
          for (let j = 0; j < _hazards.length; j++) {
            if (dist(hx, hy, _hazards[j].x, _hazards[j].y) < 260) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) valid = true;
        }
      }

      if (!valid) {
        hx = 600 + (i * 300) % (width - 800);
        hy = 600 + (i * 260) % (height - 800);
      }

      if (rIdx === 0) {
        // --- Region 0: Meşə — Zəhərli göbələk sahəsi ---
        _hazards.push({
          id: 'spore_' + i,
          type: 'spore_field',
          x: hx,
          y: hy,
          radius: 85,
          name: 'Zəhərli Göbələk Sahəsi',
          sporeTimer: Math.random() * 2,
          spores: [
            { ox: -22, oy: -14, r: 12, color: '#10b981' },
            { ox: 18, oy: -10, r: 14, color: '#059669' },
            { ox: 4, oy: 20, r: 16, color: '#10b981' },
            { ox: -16, oy: 18, r: 11, color: '#34d399' }
          ]
        });
      } else if (rIdx === 1) {
        // --- Region 1: Mağara — Dövri düşən kristal sarğıları ---
        _hazards.push({
          id: 'stalactite_' + i,
          type: 'falling_crystals',
          x: hx,
          y: hy,
          radius: 75,
          name: 'Düşən Kristal Sarğısı',
          timer: 3.0 + Math.random() * 3.5, // Dövri zərbə
          cycleTime: 5.0,
          warningDuration: 1.0, // 1s xəbərdarlıq indikatoru
          warning: false,
          impactVisualTimer: 0
        });
      } else {
        // --- Region 2: Qala — Alov sütunları (3s açıq / 2s bağlı) ---
        _hazards.push({
          id: 'flame_pillar_' + i,
          type: 'flame_pillar',
          x: hx,
          y: hy,
          radius: 65,
          name: 'Obsidian Alov Sütunu',
          timer: Math.random() * 5.0, // 5s tam dövr (3s açıq + 2s bağlı)
          isActive: false
        });
      }
    }
  }

  // ==========================================================================
  // ƏSAS PLUGIN OBYEKTİ (window.GameElites)
  // ==========================================================================

  const GameElites = {
    id: 'elites',
    name: 'GameElites',
    version: '4.0.0',

    /**
     * Plugin səhifə açılanda bir dəfə inisializasiya olunur
     */
    init: function (api) {
      _api = api;
      _flameTrails = [];
      _deathBombs = [];
      _particles = [];
      _playerFrostSlowTimer = 0;
      _playerPoisonSlowTimer = 0;
      _championPackTimer = 35;
    },

    /**
     * Yeni oyun və ya qaçış başlayanda
     */
    onRunStart: function (mode, api) {
      _api = api || _api;
      _flameTrails = [];
      _deathBombs = [];
      _particles = [];
      _playerFrostSlowTimer = 0;
      _playerPoisonSlowTimer = 0;
      _championPackTimer = 35;
    },

    /**
     * Yeni bölgə yüklənəndə təhlükələri təyin edir
     */
    onRegionLoaded: function (regionIndex, worldState, api) {
      _api = api || _api;
      _regionIndex = regionIndex || 0;
      _flameTrails = [];
      _deathBombs = [];
      _particles = [];
      _playerFrostSlowTimer = 0;
      _playerPoisonSlowTimer = 0;
      _championPackTimer = 40;
      generateHazardsForRegion(_regionIndex, worldState);
    },

    /**
     * Yeni düşmən siyahıya düşəndə (patrul, dalğa, minion):
     * 12% (+4%/bölgə) şansla Elit statusu və affikslər qazanır.
     */
    onEnemySpawned: function (enemy, worldState, api) {
      if (!enemy || enemy.isBoss || enemy._eliteInitialized || enemy._isSummonedMinion) return;

      // Əgər enemy artıq sistem tərəfindən elit tələb olunubsa (məs. opts.elite)
      if (enemy.isElite) {
        applyEliteModifiers(enemy);
        return;
      }

      // Xəzinə qoblini və ya mühafizəçilər elit olmur
      if (enemy.isTreasureGoblin || enemy._isChampionEscort) return;

      // Bölgə indeksinə görə şans: 12% + 4% * regionIndex
      const rIdx = (worldState && worldState.region && typeof worldState.region.targetRegion === 'number')
        ? worldState.region.targetRegion
        : _regionIndex;
      const eliteChance = 0.12 + (rIdx * 0.04); // Region 0: 12%, Region 1: 16%, Region 2: 20%

      if (Math.random() < eliteChance) {
        applyEliteModifiers(enemy);
        if (api && api.playSFX) api.playSFX('eliteSpawn');
      }
    },

    /**
     * Oyunçu düşmənə zərər vurmazdan əvvəl çağırılır:
     * 🛡️ Qalxanlı elit aktiv qalxan vaxtında zərərin 80%-ni udur!
     */
    modifyOutgoingDamage: function (enemy, damage, isCrit, player, api) {
      if (!enemy || !enemy.isElite || !enemy._shieldActive) return damage;

      // Qalxan 80% udur -> 20% keçir
      const reducedDamage = Math.max(1, Math.round(damage * 0.2));

      if (api && api.floatingText) {
        api.floatingText(enemy.x, enemy.y - 20, '🛡️ BLOK! -80%', '#fbbf24', 15);
      }
      if (api && api.playSFX) {
        api.playSFX('hammer');
      }

      return reducedDamage;
    },

    /**
     * Düşmən öləndə:
     * - 💥 Partlayan elit 1s sonra partlayan təhlükə bombası buraxır
     * - Çempion lider öldürüldükdə bonus qızıl və +30 Qəzəb verilir
     */
    onEnemyKilled: function (enemy, player, worldState, api) {
      if (!enemy || !enemy.isElite) return;
      api = api || _api;

      // 1. Partlayan affiks yoxlanışı
      if (Array.isArray(enemy.affixes) && enemy.affixes.indexOf('explosive') !== -1) {
        _deathBombs.push({
          x: enemy.x,
          y: enemy.y,
          timer: 1.0,
          maxTimer: 1.0,
          radius: 115,
          damage: 25
        });
        if (api && api.floatingText) {
          api.floatingText(enemy.x, enemy.y - 24, '💥 QAÇ! PARTLAYIŞ!', '#ef4444', 18);
        }
        if (api && api.playSFX) api.playSFX('spell');
      }

      // 2. Çempion Lider öldürüldükdə epik mükafat
      if (enemy.isChampionLeader) {
        if (api && api.addGold) api.addGold(150);
        if (api && api.addRage) api.addRage(30);
        if (api && api.notify) {
          api.notify('👑 ÇEMPİON DƏSTƏSİ MƏHV EDİLDİ!', '+150 Qızıl və +30 Qəzəb əldə edildi!', 'bonus');
        }
        if (api && api.floatingText) {
          api.floatingText(enemy.x, enemy.y - 35, '👑 ÇEMPİON DƏF EDİLDİ! +150 💰 +30 🔥', '#ffd700', 18);
        }
        if (api && api.shake) api.shake(8, 0.35);
        if (api && api.playSFX) api.playSFX('lootEpic');
      }
    },

    /**
     * Oyunçu zərər aldıqda:
     * Əgər zərbə vuran düşmən yaxınlıqdadırsa, Buzlu/Vampir affikslərini işə salır.
     */
    onPlayerDamaged: function (amount, player, api) {
      // Düşmənlər update tsiklində məsafə və hücumla dəqiq yoxlanılır
    },

    /**
     * Oyunçunun stat çarpanlarını tənzimləyir:
     * ❄️ Buzlu affiksdən yavaşlama (1.2s 40% yavaşlama -> speedMult: 0.6)
     * 🍄 Meşə zəhərli göbələklərindən yavaşlama (speedMult: 0.75)
     */
    getStatMultipliers: function () {
      let speedMultiplier = 1.0;
      if (_playerFrostSlowTimer > 0) {
        speedMultiplier *= 0.6; // 40% yavaşlama
      } else if (_playerPoisonSlowTimer > 0) {
        speedMultiplier *= 0.75; // 25% meşə zəhər yavaşlaması
      }
      return { speedMult: speedMultiplier };
    },

    /**
     * Hər kadr məntiqi yenilənmə (Update Loop)
     */
    update: function (dt, player, worldState, api) {
      if (!player || player.hp <= 0) return;
      _api = api || _api;
      const safeDt = clamp(dt || 0.016, 0.001, 0.1);

      // Yavaşlama taymerləri
      _playerFrostSlowTimer = Math.max(0, _playerFrostSlowTimer - safeDt);
      _playerPoisonSlowTimer = Math.max(0, _playerPoisonSlowTimer - safeDt);

      const mapW = (worldState && worldState.region && worldState.region.width) || 2600;
      const mapH = (worldState && worldState.region && worldState.region.height) || 2600;
      const enemies = (worldState && worldState.enemies) || [];

      // ======================================================================
      // 1. ÇEMPİON DƏSTƏSİ HADİSƏSİ TAYMERİ (~75s dövri, arena rejimi xaric)
      // ======================================================================
      const isArena = !!(worldState && worldState.isArenaMode) ||
        !!(typeof window !== 'undefined' && window.GameEvents && window.GameEvents.isArenaMode);

      if (!isArena) {
        _championPackTimer -= safeDt;
        if (_championPackTimer <= 0) {
          _championPackTimer = 75; // Növbəti hadisə ~75s sonra
          spawnChampionPack(player, worldState, _api);
        }
      }

      // ======================================================================
      // 2. ELİT DÜŞMƏNLƏRİN AFFİKS DAVRANIŞLARI
      // ======================================================================
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (!en || en.hp <= 0 || !en.isElite) continue;

        const affixes = en.affixes || [];
        const dToPlayer = dist(en.x, en.y, player.x, player.y);
        const attackReach = (en.radius || 20) + (player.radius || 18) + 12;

        // 🔥 Alovlu: arxasında 3s yanar iz qoyur (oyunçuya 8 dps)
        if (affixes.indexOf('fire') !== -1) {
          en._fireTrailTimer = (en._fireTrailTimer || 0.25) - safeDt;
          if (en._fireTrailTimer <= 0) {
            en._fireTrailTimer = 0.28;
            if (_flameTrails.length < 60) {
              _flameTrails.push({
                x: en.x,
                y: en.y,
                life: 3.0,
                maxLife: 3.0,
                radius: 26
              });
            }
          }
        }

        // 🛡️ Qalxanlı: hər 6s 2s ərzində 80% zərər udan qalxan
        if (affixes.indexOf('shielded') !== -1) {
          en._shieldTimer = (en._shieldTimer || 0) + safeDt;
          const cycle = en._shieldTimer % 6.0;
          en._shieldActive = (cycle >= 4.0); // 4s-dən 6s-dək (2s) qalxan aktiv
        }

        // 🌀 Teleport: hər 4s oyunçunun yanına teleport (vizual iz)
        if (affixes.indexOf('teleport') !== -1) {
          en._teleportTimer = (en._teleportTimer || 4.0) - safeDt;
          if (en._teleportTimer <= 0) {
            en._teleportTimer = 4.0 + Math.random() * 0.6;
            // Teleport vizualı köhnə yerdə
            if (_api && _api.explosion) _api.explosion(en.x, en.y, '#a855f7', 10, 30);
            if (_api && _api.playSFX) _api.playSFX('portal');

            // Oyunçunun 90-130px ətrafına teleport
            const tAngle = Math.random() * Math.PI * 2;
            const tDist = 90 + Math.random() * 40;
            en.x = clamp(player.x + Math.cos(tAngle) * tDist, 100, mapW - 100);
            en.y = clamp(player.y + Math.sin(tAngle) * tDist, 100, mapH - 100);

            // Teleport vizualı yeni yerdə
            if (_api && _api.explosion) _api.explosion(en.x, en.y, '#c084fc', 12, 35);
          }
        }

        // 👥 Çağırıcı: hər 7s 1 goblin çağırır
        if (affixes.indexOf('summoner') !== -1) {
          en._summonTimer = (en._summonTimer || 7.0) - safeDt;
          if (en._summonTimer <= 0) {
            en._summonTimer = 7.0;
            en._summonedMinions = (en._summonedMinions || []).filter(m => m && m.hp > 0);
            if (en._summonedMinions.length < 2 && _api && typeof _api.spawnEnemy === 'function') {
              const sx = clamp(en.x + (Math.random() - 0.5) * 50, 100, mapW - 100);
              const sy = clamp(en.y + (Math.random() - 0.5) * 50, 100, mapH - 100);
              const minion = _api.spawnEnemy('goblin', sx, sy, { elite: false });
              if (minion) {
                minion._isSummonedMinion = true;
                minion.isElite = false;
                minion._eliteInitialized = true;
                en._summonedMinions.push(minion);
                if (_api.floatingText) _api.floatingText(en.x, en.y - 25, '👥 QOBLİN ÇAĞIRILDI!', '#10b981', 13);
                if (_api.playSFX) _api.playSFX('spell');
              }
            }
          }
        }

        // ❄️ Buzlu və 🩸 Vampir: Zərbə vurulduqda (yaxın təmasda hücum)
        if (dToPlayer <= attackReach) {
          // Buzlu: zərbəsi oyunçunu 1.2s 40% yavaşladır
          if (affixes.indexOf('frost') !== -1 && _playerFrostSlowTimer <= 0) {
            _playerFrostSlowTimer = 1.2;
            if (_api && _api.floatingText) _api.floatingText(player.x, player.y - 20, '❄️ DONMA! -40% SÜRƏT', '#00d2ff', 15);
            if (_api && _api.playSFX) _api.playSFX('spell');
          }

          // Vampir: zərbə vuranda özünü sağaldır
          if (affixes.indexOf('vampiric') !== -1) {
            en._vampCooldown = (en._vampCooldown || 0) - safeDt;
            if (en._vampCooldown <= 0) {
              en._vampCooldown = 1.4;
              const heal = Math.round(en.maxHp * 0.10);
              en.hp = Math.min(en.maxHp, en.hp + heal);
              if (_api && _api.floatingText) _api.floatingText(en.x, en.y - 28, `+${heal} HP 🩸`, '#22c55e', 14);
            }
          }
        }
      }

      // ======================================================================
      // 3. ALOV İZLƏRİ (FLAME TRAILS) YENİLƏNMƏSİ VƏ ZƏRƏRİ (8 DPS)
      // ======================================================================
      _flameDamageAccumulator += safeDt;
      const shouldApplyFlameTick = (_flameDamageAccumulator >= 0.35); // Hər 0.35s-də bir tick
      if (shouldApplyFlameTick) _flameDamageAccumulator = 0;

      for (let f = _flameTrails.length - 1; f >= 0; f--) {
        const tr = _flameTrails[f];
        tr.life -= safeDt;
        if (tr.life <= 0) {
          _flameTrails.splice(f, 1);
          continue;
        }

        // Oyunçu izə toxunanda 8 dps
        if (dist(player.x, player.y, tr.x, tr.y) <= tr.radius + (player.radius || 18)) {
          if (shouldApplyFlameTick && _api && _api.engine && typeof _api.engine.damagePlayer === 'function') {
            _api.engine.damagePlayer(Math.round(8 * 0.35), tr.x, tr.y); // i-frame-lərə hörmət edir
          }
        }

        // Düşmənlərə də təsir etsin (taktiki cəlb etmə)
        if (shouldApplyFlameTick) {
          for (let eI = 0; eI < enemies.length; eI++) {
            const enm = enemies[eI];
            if (!enm || enm.hp <= 0) continue;
            if (dist(enm.x, enm.y, tr.x, tr.y) <= tr.radius + (enm.radius || 18)) {
              if (_api && typeof _api.damageEnemy === 'function') {
                _api.damageEnemy(enm, Math.round(6 * 0.35), false);
              }
            }
          }
        }
      }

      // ======================================================================
      // 4. PARTLAYAN ELİT BOMBALARI (DEATH BOMBS — 1s gecikməli, 25 zərər)
      // ======================================================================
      for (let b = _deathBombs.length - 1; b >= 0; b--) {
        const bomb = _deathBombs[b];
        bomb.timer -= safeDt;
        if (bomb.timer <= 0) {
          // Partlayış anı!
          if (_api && _api.explosion) _api.explosion(bomb.x, bomb.y, '#ef4444', 35, bomb.radius);
          if (_api && _api.shake) _api.shake(9, 0.35);
          if (_api && _api.playSFX) _api.playSFX('explosion');

          // Oyunçuya 25 zərər
          if (dist(player.x, player.y, bomb.x, bomb.y) <= bomb.radius + (player.radius || 18)) {
            if (_api && _api.engine && typeof _api.engine.damagePlayer === 'function') {
              _api.engine.damagePlayer(bomb.damage || 25, bomb.x, bomb.y);
            }
          }

          // Düşmənlərə də 35 zərər (Zəncirvari partlayış həzzı)
          for (let eJ = 0; eJ < enemies.length; eJ++) {
            const enm = enemies[eJ];
            if (!enm || enm.hp <= 0) continue;
            if (dist(enm.x, enm.y, bomb.x, bomb.y) <= bomb.radius + (enm.radius || 18)) {
              if (_api && typeof _api.damageEnemy === 'function') {
                _api.damageEnemy(enm, 35, true);
              }
            }
          }

          _deathBombs.splice(b, 1);
        }
      }

      // ======================================================================
      // 5. BÖLGƏ TƏHLÜKƏLƏRİ (HAZARDS) YENİLƏNMƏSİ VƏ QARŞILIQLI TƏSİRİ
      // ======================================================================
      _poisonDamageAccumulator += safeDt;
      const shouldApplyPoisonTick = (_poisonDamageAccumulator >= 0.4);
      if (shouldApplyPoisonTick) _poisonDamageAccumulator = 0;

      _pillarDamageAccumulator += safeDt;
      const shouldApplyPillarTick = (_pillarDamageAccumulator >= 0.35);
      if (shouldApplyPillarTick) _pillarDamageAccumulator = 0;

      for (let h = 0; h < _hazards.length; h++) {
        const hz = _hazards[h];
        if (!hz) continue;

        // --- Meşə: Zəhərli göbələk sahəsi (Yavaşladır + DPS) ---
        if (hz.type === 'spore_field') {
          const inSpore = (dist(player.x, player.y, hz.x, hz.y) <= hz.radius);
          if (inSpore) {
            _playerPoisonSlowTimer = 0.5; // Yavaşladır
            if (shouldApplyPoisonTick && _api && _api.engine && typeof _api.engine.damagePlayer === 'function') {
              _api.engine.damagePlayer(3, hz.x, hz.y); // Zəhər DPS
            }
          }
          // Düşmənlərə də zəhər zərəri
          if (shouldApplyPoisonTick) {
            for (let eK = 0; eK < enemies.length; eK++) {
              const enm = enemies[eK];
              if (!enm || enm.hp <= 0) continue;
              if (dist(enm.x, enm.y, hz.x, hz.y) <= hz.radius) {
                if (_api && typeof _api.damageEnemy === 'function') {
                  _api.damageEnemy(enm, 6, false);
                }
              }
            }
          }
        }

        // --- Mağara: Düşən kristal sarğıları (1s xəbərdarlıq, sonra zərbə) ---
        else if (hz.type === 'falling_crystals') {
          hz.timer -= safeDt;
          if (hz.timer <= hz.warningDuration) {
            hz.warning = true;
          }
          if (hz.timer <= 0) {
            // Zərbə anı!
            hz.warning = false;
            hz.timer = hz.cycleTime + Math.random() * 2.0;

            if (_api && _api.explosion) _api.explosion(hz.x, hz.y, '#00d2ff', 25, hz.radius);
            if (_api && _api.shake) _api.shake(5, 0.25);
            if (_api && _api.playSFX) _api.playSFX('hammer');

            // Oyunçuya zərbə zərəri
            if (dist(player.x, player.y, hz.x, hz.y) <= hz.radius) {
              if (_api && _api.engine && typeof _api.engine.damagePlayer === 'function') {
                _api.engine.damagePlayer(22, hz.x, hz.y);
              }
            }
            // Düşmənlərə böyük taktiki zərər (45 zərər)
            for (let eL = 0; eL < enemies.length; eL++) {
              const enm = enemies[eL];
              if (!enm || enm.hp <= 0) continue;
              if (dist(enm.x, enm.y, hz.x, hz.y) <= hz.radius) {
                if (_api && typeof _api.damageEnemy === 'function') {
                  _api.damageEnemy(enm, 45, true);
                }
              }
            }
          }
        }

        // --- Qala: Alov sütunları (3s açıq / 2s bağlı) ---
        else if (hz.type === 'flame_pillar') {
          hz.timer = (hz.timer + safeDt) % 5.0; // 5s dövr
          hz.isActive = (hz.timer < 3.0); // İlk 3s aktiv, son 2s bağlı

          if (hz.isActive) {
            // Aktiv olanda oyunçuya alov zərəri
            if (dist(player.x, player.y, hz.x, hz.y) <= hz.radius) {
              if (shouldApplyPillarTick && _api && _api.engine && typeof _api.engine.damagePlayer === 'function') {
                _api.engine.damagePlayer(5, hz.x, hz.y);
              }
            }
            // Düşmənlərə güclü alov zərəri
            if (shouldApplyPillarTick) {
              for (let eM = 0; eM < enemies.length; eM++) {
                const enm = enemies[eM];
                if (!enm || enm.hp <= 0) continue;
                if (dist(enm.x, enm.y, hz.x, hz.y) <= hz.radius) {
                  if (_api && typeof _api.damageEnemy === 'function') {
                    _api.damageEnemy(enm, 14, false);
                  }
                }
              }
            }
          }
        }
      }
    },

    /**
     * Dünya Koordinatlarında Qrafik Renderi (renderWorld)
     * Kamera transformu artıq aktivdir (ctx.translate artıq edilib).
     */
    renderWorld: function (ctx, time, worldState) {
      if (!ctx) return;
      time = time || (Date.now() * 0.001);

      // ======================================================================
      // 1. BÖLGƏ TƏHLÜKƏLƏRİNİN (HAZARDS) RENDERİ
      // ======================================================================
      for (let h = 0; h < _hazards.length; h++) {
        const hz = _hazards[h];
        if (!hz) continue;

        // Meşə: Zəhərli göbələklər sahəsi
        if (hz.type === 'spore_field') {
          ctx.save();
          // Zəhər aurası (duman)
          const grad = ctx.createRadialGradient(hz.x, hz.y, 10, hz.x, hz.y, hz.radius);
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
          grad.addColorStop(0.7, 'rgba(5, 150, 105, 0.18)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
          ctx.fill();

          // Göbələklərin rəsmi
          if (Array.isArray(hz.spores)) {
            for (let s = 0; s < hz.spores.length; s++) {
              const sp = hz.spores[s];
              const sx = hz.x + sp.ox;
              const sy = hz.y + sp.oy;

              // Göbələk ayağı
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(sx - 2, sy, 4, 8);

              // Göbələk papağı
              ctx.fillStyle = sp.color;
              ctx.beginPath();
              ctx.arc(sx, sy, sp.r * 0.7, Math.PI, 0);
              ctx.fill();

              // Nöqtələr
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(sx, sy - 2, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        // Mağara: Düşən kristal sarğıları
        else if (hz.type === 'falling_crystals') {
          ctx.save();
          if (hz.warning) {
            // 1s Xəbərdarlıq qırmızı/firuzəyi pulsasiya edən indikator dairəsi
            const pulse = 0.5 + 0.5 * Math.sin(time * 12);
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 + 0.4 * pulse})`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Mərkəzə daralan təhlükə halqası
            const shrinkR = Math.max(5, hz.radius * (hz.timer / (hz.warningDuration || 1.0)));
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.beginPath();
            ctx.arc(hz.x, hz.y, shrinkR, 0, Math.PI * 2);
            ctx.fill();

            // Mətn
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ef4444';
            ctx.fillText('⚠️ KRİSTAL UÇQUNU!', hz.x, hz.y - hz.radius - 6);
          } else {
            // Zəmində köhnə qırıntı kristalları
            ctx.fillStyle = 'rgba(0, 210, 255, 0.25)';
            ctx.beginPath();
            ctx.arc(hz.x, hz.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          ctx.restore();
        }

        // Qala: Alov sütunları
        else if (hz.type === 'flame_pillar') {
          ctx.save();
          // Zəmində közərən dəlik
          ctx.fillStyle = hz.isActive ? '#ef4444' : '#1c1917';
          ctx.beginPath();
          ctx.arc(hz.x, hz.y, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = hz.isActive ? '#ff4500' : '#44403c';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Alov püskürməsi
          if (hz.isActive) {
            const fGrad = ctx.createRadialGradient(hz.x, hz.y, 5, hz.x, hz.y, hz.radius);
            fGrad.addColorStop(0, 'rgba(255, 235, 59, 0.85)');
            fGrad.addColorStop(0.4, 'rgba(255, 87, 34, 0.6)');
            fGrad.addColorStop(1, 'rgba(244, 67, 54, 0)');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
            ctx.fill();

            // Şaquli alov dilləri
            for (let fl = 0; fl < 4; fl++) {
              const flAng = (fl * Math.PI / 2) + Math.sin(time * 8 + fl) * 0.3;
              const flX = hz.x + Math.cos(flAng) * (hz.radius * 0.55);
              const flY = hz.y + Math.sin(flAng) * (hz.radius * 0.55);
              ctx.fillStyle = '#ffeb3b';
              ctx.beginPath();
              ctx.arc(flX, flY, 6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }
      }

      // ======================================================================
      // 2. ALOV İZLƏRİ (FLAME TRAILS) RENDERİ
      // ======================================================================
      if (_flameTrails.length > 0) {
        ctx.save();
        for (let trI = 0; trI < _flameTrails.length; trI++) {
          const tr = _flameTrails[trI];
          const alpha = clamp(tr.life / tr.maxLife, 0, 1);
          const tGrad = ctx.createRadialGradient(tr.x, tr.y, 2, tr.x, tr.y, tr.radius);
          tGrad.addColorStop(0, `rgba(255, 230, 0, ${alpha * 0.85})`);
          tGrad.addColorStop(0.5, `rgba(255, 69, 0, ${alpha * 0.6})`);
          tGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = tGrad;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, tr.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ======================================================================
      // 3. PARTLAYAN ELİT BOMBALARI (DEATH BOMBS) RENDERİ
      // ======================================================================
      if (_deathBombs.length > 0) {
        ctx.save();
        for (let dbI = 0; dbI < _deathBombs.length; dbI++) {
          const db = _deathBombs[dbI];
          const prog = clamp(1.0 - (db.timer / db.maxTimer), 0, 1); // 0 -> 1

          // Qırmızı xəbərdarlıq çərçivəsi
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(db.x, db.y, db.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Genişlənən dolğu
          ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + prog * 0.35})`;
          ctx.beginPath();
          ctx.arc(db.x, db.y, db.radius * prog, 0, Math.PI * 2);
          ctx.fill();

          // Mətn
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f87171';
          ctx.fillText(`💥 PARTLAYIŞ: ${db.timer.toFixed(1)}s`, db.x, db.y - db.radius - 8);
        }
        ctx.restore();
      }

      // ======================================================================
      // 4. ELİT DÜŞMƏNİN ALTINDA FIRLANAN RƏNGLİ HALQA VƏ BAŞÜSTÜ AD/BAR
      // ======================================================================
      const enemies = (worldState && worldState.enemies) || [];
      for (let e = 0; e < enemies.length; e++) {
        const en = enemies[e];
        if (!en || en.hp <= 0 || !en.isElite) continue;

        const r = en.radius || 22;
        const mainAffix = (en.affixObjects && en.affixObjects[0]) || AFFIXES.fire;
        const ringColor = mainAffix.color || '#ff4500';

        ctx.save();

        // 4.1 Altında rəngli fırlanan halqa və tikanlar
        ctx.translate(en.x, en.y + r * 0.3);
        const spin = time * 2.5;

        // Xarici parıltı
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.35, r * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Fırlanan rün nöqtələri
        for (let sp = 0; sp < 4; sp++) {
          const spAng = spin + (sp * Math.PI / 2);
          const px = Math.cos(spAng) * (r * 1.35);
          const py = Math.sin(spAng) * (r * 0.7);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Qalxan aktivdirsə qızılı qoruyucu sfera
        if (en._shieldActive) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, -r * 0.3, r * 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
          ctx.fill();
        }

        ctx.restore();

        // 4.2 Üstündə Ad, Affiks İkonları və Xüsusi Elit HP Barı
        ctx.save();
        const barW = Math.max(48, r * 2.2);
        const barH = 5;
        const barY = en.y - r * 1.35 - 18;
        const hpRatio = clamp((en.hp || 0) / (en.maxHp || 1), 0, 1);

        // Arxa fon və qızılı haşiyə
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(en.x - barW / 2 - 2, barY - 2, barW + 4, barH + 4);
        ctx.strokeStyle = en.isChampionLeader ? '#ffd700' : ringColor;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(en.x - barW / 2 - 2, barY - 2, barW + 4, barH + 4);

        // Can dolğusu (Qradiyent)
        const hpGrad = ctx.createLinearGradient(en.x - barW / 2, 0, en.x + barW / 2, 0);
        hpGrad.addColorStop(0, '#ef4444');
        hpGrad.addColorStop(1, ringColor);
        ctx.fillStyle = hpGrad;
        ctx.fillRect(en.x - barW / 2, barY, barW * hpRatio, barH);

        // Başüstü Mətn (Ad və Affiks İkonları)
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = en.isChampionLeader ? '#ffd700' : '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        const printName = en.displayName || en.name || 'Elit Düşmən';
        ctx.fillText(printName, en.x, barY - 5);

        ctx.restore();
      }
    }
  };

  // --- Qeydiyyat və Modul İxracı (SKILL.md Müqaviləsinə Uyğun) ---
  if (typeof window !== 'undefined') {
    window.GameElites = GameElites;
    (window.GamePlugins = window.GamePlugins || []).push(GameElites);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameElites;
  }

})();
