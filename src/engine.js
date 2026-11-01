/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V2.0 — AAA Mega-Edition)
 * src/engine.js — Əsas 60–120 FPS Oyun Mühərriki və İdarəetmə Mərkəzi
 * Qlobal Obyekt: window.GameEngine
 * 
 * Bu modul oyun döngüsünü (Game Loop), oyunçu idarəetməsini, döyüş kombinasiyalarını,
 * 4 dəyişdirilən silah arsenalını (Qılınc, Xəncərlər, Çəkic, Yay), Roguelike reliktlərini,
 * Yoldaş Ruhlarını, Ultimate ("Aether Qiyaməti"), Stil Kombonu və Sonsuz Kolizey rejimini idarə edir.
 */

(function () {
  'use strict';

  // --- Köməkçi Riyazi Funksiyalar ---
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  // --- Əsas GameEngine Obyekti ---
  const GameEngine = {
    // DOM & Render
    canvas: null,
    ctx: null,
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    isDialogueOpen: false,

    // Zaman və Performans
    lastTime: 0,
    fps: 60,
    frameCount: 0,
    fpsTimer: 0,

    // Cari Vəziyyət
    currentRegionIndex: 0,
    interactionPrompt: null,
    activeInteraction: null,

    // Daxiletmə (Input) Vəziyyəti
    keys: {},
    mouse: {
      screenX: 0,
      screenY: 0,
      worldX: 0,
      worldY: 0,
      isDown: false,
      rightDown: false
    },
    joystick: {
      active: false,
      dx: 0,
      dy: 0
    },

    // Oyunçu Obyekti (Player)
    player: {
      x: 400,
      y: 400,
      vx: 0,
      vy: 0,
      radius: 22,
      angle: 0,
      hp: 100,
      maxHp: 100,
      mana: 100,
      maxMana: 100,
      manaRegen: 14,
      moveSpeed: 270,
      attackDamage: 38,
      spellDamage: 52,
      critChance: 0.15,
      skinColor: '#6366f1',
      weaponType: 'sword', // 'sword' | 'daggers' | 'hammer' | 'bow'

      // Cooldown-lar və Bacarıq Taymerləri
      dashCooldown: 0,
      dashMaxCooldown: 1.1,
      dashDuration: 0.22,
      dashTimer: 0,
      dashSpeed: 750,
      dashDirX: 0,
      dashDirY: 0,

      spellCooldown: 0,
      spellMaxCooldown: 0.42,
      spellManaCost: 18,

      aoeCooldown: 0,
      aoeMaxCooldown: 4.2,
      aoeManaCost: 38,
      aoeRadius: 230,

      comboStep: 1,
      comboTimer: 0,
      attackCooldown: 0,
      attackTimer: 0,
      invulnTimer: 0
    },

    // Qlobal Oyun Dünyası Vəziyyəti (WorldState)
    worldState: {
      time: 0,
      regionIndex: 0,
      region: null,
      enemies: [],
      projectiles: [],
      pickups: [],
      player: null,
      boss: null,
      bossSpawned: false,
      bossDefeated: false,
      portalUnlocked: false,
      spawnTimer: 0,
      companion: null,
      orbitals: []
    },

    // Oyun Statistikası
    stats: {
      kills: 0,
      bossesDefeated: 0,
      chestsOpened: 0,
      damageDealt: 0,
      goldCollected: 0,
      playTime: 0
    },

    // Fallback Daxili Kamera (Əgər GameJuice gec yüklənərsə)
    fallbackCamera: {
      x: 0,
      y: 0,
      zoom: 1.0
    },

    // ==========================================
    // 1. İNİSİALİZASİYA VƏ BAŞLANĞIC METODLARI
    // ==========================================

    init: function (canvasElement) {
      this.canvas = canvasElement || document.getElementById('game-canvas') || document.getElementById('gameCanvas');
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '0';
        document.body.appendChild(this.canvas);
      }

      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();

      // Oyunçu istinadı
      this.worldState.player = this.player;

      // Event listener-ləri bağla
      this.bindInputEvents();

      // Digər modulları təhlükəsiz şəkildə inisializasiya et
      if (window.GameAudio && typeof window.GameAudio.init === 'function') {
        window.GameAudio.init();
      }
      if (window.GameProgression && typeof window.GameProgression.init === 'function') {
        window.GameProgression.init();
      }
      if (window.GameVFX && typeof window.GameVFX.init === 'function') {
        window.GameVFX.init(this.canvas, this.ctx);
      }

      // V2.0 Sistemlərinin inisializasiyası
      if (window.GameRelics && typeof window.GameRelics.init === 'function') {
        window.GameRelics.init();
      }
      if (window.GameCompanions && typeof window.GameCompanions.init === 'function') {
        window.GameCompanions.init();
      }
      if (window.GameEvents && typeof window.GameEvents.init === 'function') {
        window.GameEvents.init();
      }
      if (window.GameMissions && typeof window.GameMissions.init === 'function') {
        window.GameMissions.init();
      }

      // V4.0 Plugin Sistemlərinin inisializasiyası (Loot, Talent Tree, Elites, Daily Trials)
      this._callPlugins('init', this.getPluginApi());

      // UI callbacks bağla
      if (window.GameUI && typeof window.GameUI.init === 'function') {
        window.GameUI.init({
          onStartNewGame: () => this.startNewGame(),
          onStartArena: () => this.startArenaGame(),
          onContinueGame: () => this.continueGame(),
          onPause: () => this.pauseGame(),
          onResume: () => this.resumeGame(),
          onPauseGame: () => this.pauseGame(),
          onResumeGame: () => this.resumeGame(),
          onRestart: () => this.startNewGame(),
          onBackToMenu: () => this.pauseGame(),
          onChangeRegion: (idx) => this.changeRegion(idx),
          onBuyUpgrade: (key) => this.syncProgressionStats(),
          onEquipSkin: (skinId) => this.syncProgressionStats(),
          onJoystickMove: (dx, dy, active) => this.setJoystickInput(dx, dy),
          onTouchAction: (action, isDown) => { if (isDown) this.triggerAction(action); }
        });
      }

      // Ana menyu fonunda canlı 2.5D dünya önizləməsini (Attract Mode) dərhal yüklə və render dövrünü başlat
      this.syncProgressionStats();
      this.changeRegion(0, true);
      this.isPaused = true;
      if (!this.isRunning) {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
      }

      console.log('⚔️ [GameEngine V2.0] Mühərrik və bütün alt sistemlər uğurla inisializasiya olundu.');
    },

    resizeCanvas: function () {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth || 1280;
      this.canvas.height = window.innerHeight || 720;
    },

    bindInputEvents: function () {
      // Pəncərə ölçüsü dəyişdikdə
      window.addEventListener('resize', () => this.resizeCanvas());

      // Klaviatura
      window.addEventListener('keydown', (e) => {
        // Input və ya textarea daxilində yazırsa keç
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return;

        // Oyunçu hərəkət düymələri və ekran scroll-unun qarşısını al
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }

        // Təkrarlanan (repeat) hadisələrin qarşısını al
        if (e.repeat) return;

        this.keys[e.code] = true;

        // V4.0 Plugin Klaviatura Qısayolları ([T] İstedad Ağacı, [J] Gündəlik Sınaq, [H] Bələdçi Keç və s.)
        if (!this.isDialogueOpen && this._callPlugins('handleKey', e.code, this.getPluginApi())) {
          e.preventDefault();
          return;
        }

        // V2.0 Silah Dəyişmə (1, 2, 3, 4 düymələri)
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          if (!this.isDialogueOpen) this.switchWeapon(1);
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          if (!this.isDialogueOpen) this.switchWeapon(2);
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          if (!this.isDialogueOpen) this.switchWeapon(3);
        } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
          if (!this.isDialogueOpen) this.switchWeapon(4);
        }

        // V2.0 Yoldaş Ruhu [C], Ultimate [R] və V3.0 Ov Müqaviləsi [M]
        if (e.code === 'KeyC') {
          if (!this.isDialogueOpen) this.cycleCompanion();
        }
        if (e.code === 'KeyR') {
          if (!this.isDialogueOpen) this.triggerUltimate();
        }
        if (e.code === 'KeyM') {
          if (!this.isDialogueOpen && window.GameMissions && typeof window.GameMissions.cycleOrStartBounty === 'function') {
            window.GameMissions.cycleOrStartBounty(this.worldState);
          }
        }

        // Döyüş və Hərəkət Qısayolları
        if (e.code === 'KeyF') {
          if (this.isDialogueOpen) return;
          this.performInteraction();
        }
        if (e.code === 'KeyQ') {
          if (this.isDialogueOpen) return;
          this.performArcaneBolt();
        }
        if (e.code === 'KeyE') {
          if (this.isDialogueOpen) return;
          this.performAoeNova();
        }
        if (e.code === 'KeyJ') {
          if (this.isDialogueOpen) return;
          this.performSwordAttack();
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Space') {
          if (this.isDialogueOpen) return;
          this.performDash();
        }
        if (e.code === 'KeyB' || e.code === 'Tab') {
          e.preventDefault();
          if (window.GameUI && typeof window.GameUI.toggleShopModal === 'function') {
            window.GameUI.toggleShopModal();
          }
        }
        if (e.code === 'Escape') {
          if (this.isPaused) this.resumeGame();
          else this.pauseGame();
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      // Siçan hadisələri
      window.addEventListener('mousemove', (e) => {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.screenX = e.clientX - rect.left;
        this.mouse.screenY = e.clientY - rect.top;
      });

      window.addEventListener('mousedown', (e) => {
        if (window.GameAudio && typeof window.GameAudio.init === 'function') {
          window.GameAudio.init();
        }

        if (this.isDialogueOpen) return;

        if (e.button === 0) { // Sol klik
          this.mouse.isDown = true;
          this.performSwordAttack();
        } else if (e.button === 2) { // Sağ klik
          this.mouse.rightDown = true;
          this.performArcaneBolt();
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouse.isDown = false;
        if (e.button === 2) this.mouse.rightDown = false;
      });

      window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });

      // Sensor ekran (Touch) dəstəyi
      window.addEventListener('touchmove', (e) => {
        if (!this.canvas || e.touches.length === 0) return;
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.screenX = e.touches[0].clientX - rect.left;
        this.mouse.screenY = e.touches[0].clientY - rect.top;
      }, { passive: true });
    },

    syncProgressionStats: function () {
      if (window.GameProgression && typeof window.GameProgression.getComputedPlayerStats === 'function') {
        const stats = window.GameProgression.getComputedPlayerStats();
        if (stats) {
          const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
          this.player.maxHp = stats.maxHp || 100;
          this.player.hp = Math.min(this.player.maxHp, this.player.maxHp * hpRatio);
          this.player.attackDamage = stats.attackDamage || 38;
          this.player.spellDamage = stats.spellDamage || 52;
          this.player.moveSpeed = stats.moveSpeed || 270;
          this.player.critChance = stats.critChance || 0.15;
          if (stats.skinColor) this.player.skinColor = stats.skinColor;
        }
      }
    },

    // ==========================================
    // 2. OYUN DÖVRÜ (START, ARENA, PAUSE, RESUME)
    // ==========================================

    startNewGame: function () {
      this.isGameOver = false;
      this.isVictory = false;
      this.isPaused = false;
      this.isDialogueOpen = false;
      this.currentRegionIndex = 0;

      // Stats sıfırla
      this.stats = {
        kills: 0,
        bossesDefeated: 0,
        chestsOpened: 0,
        damageDealt: 0,
        goldCollected: 0,
        playTime: 0
      };

      // Progression sıfırla və ya oxu
      if (window.GameProgression) {
        if (typeof window.GameProgression.resetSave === 'function') {
          window.GameProgression.resetSave();
        }
        this.syncProgressionStats();
      }

      // V2.0 Reliktlər, Yoldaşlar və Kombo sistemini sıfırla
      if (window.GameRelics && typeof window.GameRelics.init === 'function') {
        window.GameRelics.init();
      }
      if (window.GameCompanions && typeof window.GameCompanions.init === 'function') {
        window.GameCompanions.init();
      }
      if (window.GameEvents) {
        if (typeof window.GameEvents.endArenaMode === 'function') {
          window.GameEvents.endArenaMode(this.worldState);
        } else {
          window.GameEvents.isArenaMode = false;
        }
        if (typeof window.GameEvents.resetCombo === 'function') {
          window.GameEvents.resetCombo();
        }
      }
      if (window.GameMissions && typeof window.GameMissions.init === 'function') {
        window.GameMissions.init();
      }

      // V4.0 Plugin Sistemlərinin run başlanğıcı (Story)
      this._callPlugins('onRunStart', 'story', this.getPluginApi());

      this.player.weaponType = 'sword';
      this._applyPluginMaxHp(this.getPluginStats());
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;
      this.player.vx = 0;
      this.player.vy = 0;

      this.changeRegion(0);

      if (!this.isRunning) {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
      }
    },

    /**
     * V2.0 Sonsuz Kolizey Rejimini (Endless Arena / Boss Rush) başladır
     */
    startArenaGame: function () {
      this.isGameOver = false;
      this.isVictory = false;
      this.isPaused = false;
      this.isDialogueOpen = false;

      // Statistikaları sıfırla
      this.stats = {
        kills: 0,
        bossesDefeated: 0,
        chestsOpened: 0,
        damageDealt: 0,
        goldCollected: 0,
        playTime: 0
      };

      // Progression statslarını sinxronlaşdır
      this.syncProgressionStats();

      // V2.0 Reliktlər, Yoldaşlar və Kombo sistemini sıfırla
      if (window.GameRelics && typeof window.GameRelics.init === 'function') {
        window.GameRelics.init();
      }
      if (window.GameCompanions && typeof window.GameCompanions.init === 'function') {
        window.GameCompanions.init();
      }
      if (window.GameEvents) {
        if (typeof window.GameEvents.endArenaMode === 'function') {
          window.GameEvents.endArenaMode(this.worldState);
        } else {
          window.GameEvents.isArenaMode = false;
        }
        if (typeof window.GameEvents.resetCombo === 'function') {
          window.GameEvents.resetCombo();
        }
      }
      if (window.GameMissions && typeof window.GameMissions.init === 'function') {
        window.GameMissions.init();
      }

      // V4.0 Plugin Sistemlərinin run başlanğıcı (Arena)
      this._callPlugins('onRunStart', 'arena', this.getPluginApi());

      this.player.weaponType = 'sword';
      this._applyPluginMaxHp(this.getPluginStats());
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;
      this.player.vx = 0;
      this.player.vy = 0;

      // Xəritəni quraşdır
      this.changeRegion(0);

      // Sonsuz Kolizey rejimini və 'arena' musiqisini başlat!
      if (window.GameEvents && typeof window.GameEvents.startArenaMode === 'function') {
        window.GameEvents.startArenaMode(this.worldState, {
          onArenaStart: (wave) => {
            console.log('⚔️ [GameEngine] Sonsuz Kolizey başladı. Dalğa:', wave);
          }
        });
      }

      if (window.GameAudio && typeof window.GameAudio.playBGM === 'function') {
        try { window.GameAudio.playBGM('arena'); } catch (_) {}
      }

      if (!this.isRunning) {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
      }
    },

    continueGame: function () {
      this.isGameOver = false;
      this.isVictory = false;
      this.isPaused = false;
      this.isDialogueOpen = false;

      let regIdx = 0;
      if (window.GameProgression && window.GameProgression.state) {
        regIdx = window.GameProgression.state.currentRegion || 0;
      }
      this.syncProgressionStats();
      this._callPlugins('onRunStart', 'continue', this.getPluginApi());
      this._applyPluginMaxHp(this.getPluginStats());
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;

      this.changeRegion(regIdx);

      if (!this.isRunning) {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
      }
    },

    pauseGame: function () {
      this.isPaused = true;
    },

    resumeGame: function () {
      this.isPaused = false;
      this.lastTime = performance.now();
    },

    changeRegion: function (regionIndex, isPreview) {
      this.currentRegionIndex = clamp(regionIndex, 0, 2);
      this.worldState.regionIndex = this.currentRegionIndex;

      // Region yüklə
      let regionData = null;
      if (window.GameLevels && typeof window.GameLevels.loadRegion === 'function') {
        regionData = window.GameLevels.loadRegion(this.currentRegionIndex);
      } else {
        regionData = {
          id: 'forest',
          name: 'Zümrüd Qədim Meşəsi',
          theme: 'forest',
          width: 2600,
          height: 2600,
          playerSpawn: { x: 400, y: 400 },
          obstacles: [
            { x: 300, y: 250, radius: 45, type: 'tree', color: '#166534' },
            { x: 600, y: 450, radius: 50, type: 'ruin', color: '#64748b' },
            { x: 800, y: 300, radius: 40, type: 'pillar', color: '#94a3b8' }
          ],
          obelisks: [
            { id: 'ob1', x: 500, y: 300, radius: 35, activated: false, name: 'Həyat Rünü' },
            { id: 'ob2', x: 1200, y: 600, radius: 35, activated: false, name: 'Alov Rünü' },
            { id: 'ob3', x: 800, y: 1400, radius: 35, activated: false, name: 'Fırtına Rünü' }
          ],
          chests: [
            { id: 'ch1', x: 450, y: 650, radius: 25, opened: false, gold: 60, crystals: 12 },
            { id: 'ch2', x: 1350, y: 400, radius: 25, opened: false, gold: 100, crystals: 25 }
          ],
          npcs: [
            {
              id: 'npc_elder',
              name: 'Qoca Sylvan',
              title: 'Meşə Mühafizi',
              x: 420,
              y: 350,
              radius: 30,
              dialogues: [
                'Salam, cəsur qəhrəman! Aetheria kölgələr altında inildəyir.',
                'Qədim 3 Rün Obeliskini aktivləşdirsən, bu torpaqların azğın Boss-u qarşına çıxacaq!',
                'Onu məğlub et və Portaldan keçərək Kölgələr Qalasına doğru irəlilə!'
              ]
            }
          ],
          portal: { x: 1300, y: 1300, radius: 50, active: false },
          quests: [
            { id: 'q_obelisk', title: 'Qədim Rünlər', description: '3 Rün Obeliskini tap və aktivləşdir', type: 'obelisks', target: 3, progress: 0, completed: false },
            { id: 'q_boss', title: 'Bölgənin Hakimi', description: 'Epik Boss-u məğlub et', type: 'boss', target: 1, progress: 0, completed: false }
          ]
        };
      }

      this.worldState.region = regionData;
      this.worldState.obstacles = (regionData && regionData.obstacles) || [];
      this.worldState.player = this.player;

      // Oyunçunu spawn nöqtəsinə qoy
      if (regionData.playerSpawn) {
        this.player.x = regionData.playerSpawn.x;
        this.player.y = regionData.playerSpawn.y;
      }
      this.player.vx = 0;
      this.player.vy = 0;

      // Xəritə obyektlərini sıfırla
      this.worldState.enemies = [];
      this.worldState.projectiles = [];
      this.worldState.pickups = [];
      this.worldState.boss = null;
      this.worldState.bossSpawned = false;
      this.worldState.bossDefeated = false;
      this.worldState.portalUnlocked = false;
      this.worldState.spawnTimer = 0;

      // İlkin düşmən dəstəsi spawn et
      this.spawnInitialEnemies();

      const px = this.player.x;
      const py = this.player.y;
      const minSafeDist = 420;
      const regW = (regionData && regionData.width) || 2600;
      const regH = (regionData && regionData.height) || 2600;

      for (let i = 0; i < this.worldState.enemies.length; i++) {
        const en = this.worldState.enemies[i];
        if (!en) continue;
        if (distance(px, py, en.x, en.y) < minSafeDist) {
          const centerAngle = Math.atan2((regH / 2) - py, (regW / 2) - px);
          for (let attempt = 0; attempt < 10; attempt++) {
            const spread = (Math.random() - 0.5) * (Math.PI * 0.7);
            const safeAngle = centerAngle + spread;
            const targetDist = minSafeDist + 50 + Math.random() * 120;
            const nx = clamp(px + Math.cos(safeAngle) * targetDist, 100, regW - 100);
            const ny = clamp(py + Math.sin(safeAngle) * targetDist, 100, regH - 100);
            if (distance(px, py, nx, ny) >= minSafeDist) {
              en.x = nx;
              en.y = ny;
              break;
            }
          }
          en.vx = 0;
          en.vy = 0;
        }
      }

      this.isDialogueOpen = false;

      // V3.0 Missiya, Kampaniya və Qurbangah sistemini bölgə üçün qur
      if (window.GameMissions && typeof window.GameMissions.onRegionLoaded === 'function') {
        window.GameMissions.onRegionLoaded(this.currentRegionIndex, this.worldState);
      }

      // V4.0 Pluginlərə bölgə yüklənməsi və ilkin düşmənlər barədə xəbər ver
      this._callPlugins('onRegionLoaded', this.currentRegionIndex, this.worldState, this.getPluginApi());
      this._notifyNewEnemies();

      if (isPreview) return;

      // Musiqi dəyiş (Əgər Arena deyilsə)
      const isArena = window.GameEvents && window.GameEvents.isArenaMode;
      if (!isArena && window.GameAudio && typeof window.GameAudio.playBGM === 'function') {
        window.GameAudio.playBGM(regionData.theme || 'forest');
      }

      // Bildiriş
      if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
        window.GameUI.showNotification(
          regionData.name || 'Yeni Bölgə',
          '3 Qədim Rün Obeliskini taparaq aktivləşdirin! — 1-4: Silahlar | C: Yoldaş | R: Qiyamət',
          'portal'
        );
      }

      // Yaddaşda saxla
      if (window.GameProgression && window.GameProgression.state) {
        window.GameProgression.state.currentRegion = this.currentRegionIndex;
        if (typeof window.GameProgression.save === 'function') {
          window.GameProgression.save();
        }
      }
    },

    respawnPlayer: function () {
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.invulnTimer = 2.5;

      if (this.worldState.region && this.worldState.region.playerSpawn) {
        this.player.x = this.worldState.region.playerSpawn.x;
        this.player.y = this.worldState.region.playerSpawn.y;
      }

      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('spell');
      }
      if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(6, 0.3);
      }
      if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
        window.GameUI.showNotification('YENİDƏN DOĞUŞ!', 'Ruhun bədənə qayıtdı. Döyüşə davam et!', 'warning');
      }
    },

    // ==========================================
    // 3. V2.0 SİLAH VƏ YOLDAŞ SİSTEMİ İDARƏETMƏSİ
    // ==========================================

    /**
     * Silah Dəyişmə (1-4 düymələri və ya metod çağırışı)
     * @param {number|string} slotOrId - 1, 2, 3, 4 və ya 'sword'|'daggers'|'hammer'|'bow'
     */
    switchWeapon: function (slotOrId) {
      if (this.isDialogueOpen) return;

      if (window.GameRelics && typeof window.GameRelics.switchWeapon === 'function') {
        const weapon = window.GameRelics.switchWeapon(slotOrId);
        if (weapon) {
          this.player.weaponType = weapon.id;

          if (window.GameMissions && typeof window.GameMissions.onWeaponSwitched === 'function') {
            window.GameMissions.onWeaponSwitched(weapon.id);
          }
          this._callPlugins('onWeaponSwitched', weapon.id, this.getPluginApi());

          // Ekranda vizual üzən bildiriş
          if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
            window.GameVFX.spawnFloatingText(
              this.player.x,
              this.player.y - 36,
              `${weapon.icon || '⚔️'} ${weapon.name}`,
              weapon.color || '#38bdf8',
              18
            );
          }
          return weapon;
        }
      }
    },

    /**
     * Yoldaş Ruhunu Dövri Dəyişdirir ([C] düyməsi)
     * Simurq -> Astral Əjdaha -> Kölgə Qurdu
     */
    cycleCompanion: function () {
      if (this.isDialogueOpen) return;

      if (window.GameCompanions && typeof window.GameCompanions.cycleCompanion === 'function') {
        const active = window.GameCompanions.cycleCompanion();
        if (active && window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(
            this.player.x,
            this.player.y - 36,
            `${active.icon || '🦅'} ${active.name}`,
            active.color || '#ff6b35',
            18
          );
        }
        return active;
      }
    },

    /**
     * Ultimate Super Gücü Aktivləşdirir: [R] "Aether Qiyaməti"
     * 14 meteor yağdırır, sahə zərəri və ekran sarsıntısı yaradır!
     */
    triggerUltimate: function () {
      if (this.isDialogueOpen) return false;

      if (!window.GameCompanions) return false;

      if (typeof window.GameCompanions.canCastUltimate === 'function' && !window.GameCompanions.canCastUltimate()) {
        const rage = typeof window.GameCompanions.getRage === 'function' ? Math.floor(window.GameCompanions.getRage()) : 0;
        if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(this.player.x, this.player.y - 30, `Qəzəb çatmır! (${rage}/100)`, '#ff0055', 16);
        }
        return false;
      }

      const enemies = this.worldState.enemies;
      const callbacks = {
        onDamageEnemy: (enemy, dmg) => {
          if (enemy && enemy.hp > 0) {
            this.damageEnemy(enemy, dmg, true, 280, 0, 0);
          }
        },
        onScreenShake: (amount, dur) => {
          if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
            window.GameJuice.shake(amount, dur);
          }
        }
      };

      const triggered = window.GameCompanions.triggerUltimate(this.player, enemies, callbacks);
      if (triggered) {
        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          try { window.GameAudio.playSFX('ultimate'); } catch (_) {
            try { window.GameAudio.playSFX('bossRoar'); } catch (__) {}
          }
        }
        if (window.GameVFX && typeof window.GameVFX.spawnMeteorStrike === 'function') {
          window.GameVFX.spawnMeteorStrike(this.player.x, this.player.y);
        }
      }
      return triggered;
    },

    /**
     * Level-Up və ya Qənimət Sandığı/Boss öldükdə 3 Relikt kartı seçimi açır
     */
    openRelicDraft: function () {
      if (!window.GameRelics || typeof window.GameRelics.getRelicChoices !== 'function') return;

      const choices = window.GameRelics.getRelicChoices(3);
      if (!choices || choices.length === 0) return;

      // Oyunu seçim zamanı müvəqqəti pauza et
      const wasPaused = this.isPaused;
      this.isPaused = true;

      const onSelect = (relicId) => {
        if (window.GameRelics && typeof window.GameRelics.selectRelic === 'function') {
          window.GameRelics.selectRelic(relicId);
        }
        this._callPlugins('onRelicPicked', relicId, this.getPluginApi());
        // Seçim bitdikdən sonra davam et
        this.isPaused = wasPaused;
        this.lastTime = performance.now();
      };

      if (window.GameUI && typeof window.GameUI.showRelicDraftModal === 'function') {
        window.GameUI.showRelicDraftModal(choices, onSelect);
      } else {
        // Fallback: Əgər UI modalı yoxdursa dərhal birincini aktivləşdir və davam et
        onSelect(choices[0].id);
      }
    },

    // ==========================================
    // V4.0 PLUGIN REGISTRY (window.GamePlugins)
    // Müqavilə: .agents/skills/game-plugin-module/SKILL.md
    // ==========================================

    _getPlugins: function () {
      return (typeof window !== 'undefined' && Array.isArray(window.GamePlugins)) ? window.GamePlugins : [];
    },

    getPluginApi: function () {
      if (this._pluginApi) return this._pluginApi;
      const self = this;
      const safeSFX = (name) => {
        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          try { window.GameAudio.playSFX(name); } catch (_) {}
        }
      };
      this._pluginApi = {
        engine: self,
        get player() { return self.player; },
        get worldState() { return self.worldState; },
        spawnEnemy: (type, x, y, opts) => {
          const cb = self._getMissionCallbacks();
          return cb.onSpawnEnemy(type, x, y, !!(opts && opts.elite));
        },
        damageEnemy: (enemy, dmg, isCrit) => {
          if (enemy && enemy.hp > 0) self.damageEnemy(enemy, dmg, !!isCrit, 0, 0, 0);
        },
        healPlayer: (amt) => {
          self.player.hp = Math.min(self.player.maxHp, self.player.hp + (amt || 0));
        },
        addGold: (n) => {
          self.stats.goldCollected += (n || 0);
          if (window.GameProgression && typeof window.GameProgression.addGold === 'function') window.GameProgression.addGold(n);
        },
        addCrystals: (n) => {
          if (window.GameProgression && typeof window.GameProgression.addCrystals === 'function') window.GameProgression.addCrystals(n);
        },
        addXP: (n) => {
          if (window.GameProgression && typeof window.GameProgression.addXP === 'function') {
            const res = window.GameProgression.addXP(n);
            if (res && res.leveledUp) { self.syncProgressionStats(); self.openRelicDraft(); }
          }
        },
        addRage: (n) => {
          if (window.GameCompanions && typeof window.GameCompanions.addRage === 'function') window.GameCompanions.addRage(n);
        },
        openRelicDraft: () => self.openRelicDraft(),
        notify: (title, subtitle, type) => {
          if (window.GameUI && typeof window.GameUI.showNotification === 'function') window.GameUI.showNotification(title, subtitle, type);
        },
        floatingText: (x, y, text, color, size) => {
          if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') window.GameVFX.spawnFloatingText(x, y, text, color, size);
        },
        explosion: (x, y, color, count, radius) => {
          if (window.GameVFX && typeof window.GameVFX.spawnExplosion === 'function') window.GameVFX.spawnExplosion(x, y, color, count, radius);
        },
        shake: (a, d) => { if (window.GameJuice && typeof window.GameJuice.shake === 'function') window.GameJuice.shake(a, d); },
        slowMo: (s, d) => { if (window.GameJuice && typeof window.GameJuice.triggerSlowMo === 'function') window.GameJuice.triggerSlowMo(s, d); },
        hitStop: (sec) => { if (window.GameJuice && typeof window.GameJuice.hitStop === 'function') window.GameJuice.hitStop(sec); },
        playSFX: safeSFX,
        pause: () => self.pauseGame(),
        resume: () => self.resumeGame(),
        getActiveWeaponId: () => {
          if (window.GameRelics && typeof window.GameRelics.getActiveWeapon === 'function') {
            const w = window.GameRelics.getActiveWeapon();
            if (w && w.id) return w.id;
          }
          return self.player.weaponType || 'sword';
        },
        getRelicIds: () => {
          if (window.GameRelics && typeof window.GameRelics.getActiveRelics === 'function') {
            return window.GameRelics.getActiveRelics().map(r => r.id);
          }
          return [];
        },
        getCompanionId: () => {
          if (window.GameCompanions && typeof window.GameCompanions.getActiveCompanion === 'function') {
            const c = window.GameCompanions.getActiveCompanion();
            return c ? c.id : null;
          }
          return null;
        }
      };
      return this._pluginApi;
    },

    _callPlugins: function (hook) {
      const plugins = this._getPlugins();
      if (plugins.length === 0) return false;
      const args = Array.prototype.slice.call(arguments, 1);
      let anyTrue = false;
      for (let i = 0; i < plugins.length; i++) {
        const pl = plugins[i];
        if (pl && typeof pl[hook] === 'function') {
          try {
            if (pl[hook].apply(pl, args) === true) anyTrue = true;
          } catch (err) {
            if (!this._pluginErrLogged) this._pluginErrLogged = {};
            const key = (pl.id || pl.name || i) + ':' + hook;
            if (!this._pluginErrLogged[key]) {
              this._pluginErrLogged[key] = true;
              console.warn('⚠️ [Plugin] ' + key + ' xətası:', err);
            }
          }
        }
      }
      return anyTrue;
    },

    _reducePlugins: function (hook, value, argsFn) {
      const plugins = this._getPlugins();
      let v = value;
      for (let i = 0; i < plugins.length; i++) {
        const pl = plugins[i];
        if (pl && typeof pl[hook] === 'function') {
          try {
            const res = pl[hook].apply(pl, argsFn(v));
            if (typeof res === 'number' && isFinite(res)) v = Math.max(0, res);
          } catch (err) {
            console.warn('⚠️ [Plugin] ' + (pl.id || i) + ':' + hook + ' xətası:', err);
          }
        }
      }
      return v;
    },

    getPluginStats: function () {
      const out = { damageMult: 1, speedMult: 1, critBonus: 0, goldMult: 1, xpMult: 1, damageTakenMult: 1, maxHpBonus: 0, manaRegenMult: 1, dropChanceMult: 1 };
      const plugins = this._getPlugins();
      for (let i = 0; i < plugins.length; i++) {
        const pl = plugins[i];
        if (!pl || typeof pl.getStatMultipliers !== 'function') continue;
        let m = null;
        try { m = pl.getStatMultipliers(); } catch (_) { m = null; }
        if (!m) continue;
        ['damageMult', 'speedMult', 'goldMult', 'xpMult', 'damageTakenMult', 'manaRegenMult', 'dropChanceMult'].forEach((k) => {
          if (typeof m[k] === 'number' && isFinite(m[k]) && m[k] > 0) out[k] *= m[k];
        });
        if (typeof m.critBonus === 'number' && isFinite(m.critBonus)) out.critBonus += m.critBonus;
        if (typeof m.maxHpBonus === 'number' && isFinite(m.maxHpBonus)) out.maxHpBonus += m.maxHpBonus;
      }
      out.damageTakenMult = Math.max(0.25, out.damageTakenMult);
      out.speedMult = clamp(out.speedMult, 0.3, 2.5);
      return out;
    },

    _pluginsBlocking: function () {
      const plugins = this._getPlugins();
      for (let i = 0; i < plugins.length; i++) {
        const pl = plugins[i];
        if (pl && typeof pl.isBlockingInput === 'function') {
          try { if (pl.isBlockingInput()) return true; } catch (_) {}
        }
      }
      return false;
    },

    _notifyNewEnemies: function () {
      const enemies = this.worldState.enemies;
      if (!enemies || this._getPlugins().length === 0) return;
      const api = this.getPluginApi();
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en && !en._pluginSeen) {
          en._pluginSeen = true;
          this._callPlugins('onEnemySpawned', en, this.worldState, api);
        }
      }
    },

    _applyPluginMaxHp: function (pStats) {
      const p = this.player;
      if (typeof p.baseMaxHp !== 'number') p.baseMaxHp = p.maxHp;
      const desired = Math.round(p.baseMaxHp + (pStats.maxHpBonus || 0));
      if (desired !== p.maxHp && desired > 0) {
        const diff = desired - p.maxHp;
        p.maxHp = desired;
        if (diff > 0) p.hp = Math.min(p.maxHp, p.hp + diff);
        else p.hp = Math.min(p.hp, p.maxHp);
      }
    },

    _getMissionCallbacks: function () {
      return {
        onSpawnEnemy: (type, x, y, isElite) => {
          if (window.GameLevels && typeof window.GameLevels.createEnemy === 'function') {
            const en = window.GameLevels.createEnemy(type || 'goblin', x, y, this.currentRegionIndex);
            if (en) {
              if (isElite) {
                en.isElite = true;
                en.hp = Math.round((en.hp || 100) * 1.8);
                en.maxHp = en.hp;
                en.damage = Math.round((en.damage || 15) * 1.35);
                en.radius = (en.radius || 18) * 1.25;
                en.goldValue = (en.goldValue || 18) * 3;
                en.expValue = (en.expValue || 25) * 2.5;
              }
              this.worldState.enemies.push(en);
              return en;
            }
          }
          return null;
        },
        onGrantRelicDraft: () => {
          this.openRelicDraft();
        },
        onAddGold: (amt) => {
          this.stats.goldCollected += (amt || 0);
          if (window.GameProgression && typeof window.GameProgression.addGold === 'function') {
            window.GameProgression.addGold(amt);
          }
        },
        onAddCrystals: (amt) => {
          if (window.GameProgression && typeof window.GameProgression.addCrystals === 'function') {
            window.GameProgression.addCrystals(amt);
          }
        },
        onAddRage: (amt) => {
          if (window.GameCompanions && typeof window.GameCompanions.addRage === 'function') {
            window.GameCompanions.addRage(amt);
          }
        },
        onNotification: (title, subtitle, type) => {
          if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
            window.GameUI.showNotification(title, subtitle, type);
          }
        },
        onScreenShake: (amt, dur) => {
          if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
            window.GameJuice.shake(amt, dur);
          }
        },
        onSpawnBoss: () => {
          this.spawnBoss();
        }
      };
    },

    // ==========================================
    // 4. OYUN DÖNGÜSÜ (GAME LOOP - 60-120 FPS)
    // ==========================================

    gameLoop: function (timestamp) {
      if (!this.isRunning) return;

      const rawDt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      // FPS sayğacı
      this.frameCount++;
      this.fpsTimer += rawDt;
      if (this.fpsTimer >= 0.5) {
        this.fps = Math.round((this.frameCount / this.fpsTimer));
        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      // GameJuice ilə kamera və timeScale yenilənməsi
      let scaledDt = rawDt;
      const worldW = this.worldState.region ? this.worldState.region.width : 2600;
      const worldH = this.worldState.region ? this.worldState.region.height : 2600;

      if (window.GameJuice && typeof window.GameJuice.update === 'function') {
        scaledDt = window.GameJuice.update(
          rawDt,
          this.player.x,
          this.player.y,
          this.canvas.width,
          this.canvas.height,
          worldW,
          worldH
        );
      } else {
        this.fallbackCamera.x += (this.player.x - this.canvas.width / 2 - this.fallbackCamera.x) * Math.min(1, rawDt * 6);
        this.fallbackCamera.y += (this.player.y - this.canvas.height / 2 - this.fallbackCamera.y) * Math.min(1, rawDt * 6);
      }

      // Siçanın dünya koordinatlarını hesabla
      const cam = this.getCamera();
      if (window.GameJuice && typeof window.GameJuice.screenToWorld === 'function') {
        const wPos = window.GameJuice.screenToWorld(this.mouse.screenX, this.mouse.screenY, this.canvas);
        this.mouse.worldX = wPos.x;
        this.mouse.worldY = wPos.y;
      } else {
        this.mouse.worldX = (this.mouse.screenX / (cam.zoom || 1)) + cam.x;
        this.mouse.worldY = (this.mouse.screenY / (cam.zoom || 1)) + cam.y;
      }

      if (!this.isPaused && !this.isGameOver && !this._pluginsBlocking()) {
        this.update(scaledDt);
      }

      this.render();

      requestAnimationFrame((t) => this.gameLoop(t));
    },

    getCamera: function () {
      if (window.GameJuice && window.GameJuice.camera) {
        return window.GameJuice.camera;
      }
      return this.fallbackCamera;
    },

    // ==========================================
    // 5. MƏNTİQİ YENİLƏNMƏLƏR (UPDATE LOGIC)
    // ==========================================

    update: function (dt) {
      if (this.isDialogueOpen) {
        this.player.vx = 0;
        this.player.vy = 0;
        if (this.worldState.enemies) {
          for (let i = 0; i < this.worldState.enemies.length; i++) {
            const en = this.worldState.enemies[i];
            if (en) {
              en.vx = 0;
              en.vy = 0;
            }
          }
        }
        if (window.GameVFX && typeof window.GameVFX.update === 'function') {
          window.GameVFX.update(dt, this.getCamera(), this.worldState);
        }
        if (window.GameUI && typeof window.GameUI.updateHUD === 'function') {
          const prog = window.GameProgression ? window.GameProgression.state : null;
          window.GameUI.updateHUD(this.player, this.worldState, prog, this.fps);
        }
        return;
      }

      this.worldState.time += dt;
      this.stats.playTime += dt;
      this.worldState.player = this.player;

      // V4.0 Plugin stat çarpanlarını (MaxHP və s.) tətbiq et
      const pStats = this.getPluginStats();
      this._applyPluginMaxHp(pStats);

      // 1. Oyunçunu yenilə
      this.updatePlayer(dt);

      // 2. VFX yenilə
      if (window.GameVFX && typeof window.GameVFX.update === 'function') {
        window.GameVFX.update(dt, this.getCamera(), this.worldState);
      }

      // 3. Mərmiləri yenilə
      this.updateProjectiles(dt);

      // 4. Düşmənləri yenilə
      this.updateEnemies(dt);

      // 5. Əşyaları (Pickups) yenilə
      this.updatePickups(dt);

      // 6. Düşmən spawn dalğalarını yenilə (Arena rejimində deyilsə)
      if (!window.GameEvents || !window.GameEvents.isArenaMode) {
        this.updateEnemyWaves(dt);
      }

      // 7. V2.0 Yoldaş Ruhlar (Companions) yenilə
      if (window.GameCompanions && typeof window.GameCompanions.update === 'function') {
        window.GameCompanions.update(
          dt,
          this.player,
          this.worldState.enemies,
          this.worldState.pickups,
          this.worldState.projectiles,
          {
            onDamageEnemy: (enemy, dmg) => {
              if (enemy && enemy.hp > 0) this.damageEnemy(enemy, dmg, false, 160, 0, 0);
            },
            onHealPlayer: (amt) => {
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + amt);
            },
            onScreenShake: (amount, dur) => {
              if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
                window.GameJuice.shake(amount, dur);
              }
            }
          }
        );
        this.worldState.companion = window.GameCompanions.getActiveCompanion
          ? window.GameCompanions.getActiveCompanion()
          : null;
      }

      // 8. V2.0 Fırlanan Alov Kürələri (Orbitals) və Tələlər
      if (window.GameRelics) {
        if (typeof window.GameRelics.updateOrbitals === 'function') {
          window.GameRelics.updateOrbitals(
            dt,
            this.player,
            this.worldState.enemies,
            {
              onHitEnemy: (enemy, dmg, type) => {
                if (enemy && enemy.hp > 0) this.damageEnemy(enemy, dmg, false, 140, 0, 0);
              }
            }
          );
          this.worldState.orbitals = window.GameRelics.getOrbitals
            ? window.GameRelics.getOrbitals()
            : [];
        }
        if (typeof window.GameRelics.updateTrapsAndDOTs === 'function') {
          window.GameRelics.updateTrapsAndDOTs(
            dt,
            this.worldState.enemies,
            {
              onHitEnemy: (enemy, dmg, type) => {
                if (enemy && enemy.hp > 0) this.damageEnemy(enemy, dmg, true, 220, 0, 0);
              }
            }
          );
        }
      }

      // 9. V2.0 Dinamik Dünya Hadisələri və Sonsuz Kolizey Rejimi
      if (window.GameEvents) {
        // Kombo taymerini yenilə
        if (typeof window.GameEvents.updateCombo === 'function') {
          window.GameEvents.updateCombo(dt);
        }
        // Mükəmməl yayınma buff-unu yenilə
        if (typeof window.GameEvents.updatePerfectDodge === 'function') {
          window.GameEvents.updatePerfectDodge(dt, this.player);
        }
        // Dinamik Dünya Hadisələri (Qaçan Qızıl Qoblin & Meteor Sandığı)
        if (typeof window.GameEvents.updateWorldEvents === 'function') {
          window.GameEvents.updateWorldEvents(dt, this.worldState, {
            onGoblinKilled: (goblin) => {
              this.openRelicDraft();
            },
            onMeteorChestOpened: (chest) => {
              this.openRelicDraft();
            }
          });
        }
        // Sonsuz Kolizey Rejimi (Arena Dalğaları)
        if (window.GameEvents.isArenaMode && typeof window.GameEvents.updateArena === 'function') {
          window.GameEvents.updateArena(dt, this.worldState, {
            onWaveCleared: (wave) => {
              this.openRelicDraft();
            }
          });
        }
      }

      // 10. V3.0 Missiya Kampaniyası, Müdafiə Dairəsi, Müqavilələr və Qurbangahlar
      if (window.GameMissions && typeof window.GameMissions.update === 'function') {
        window.GameMissions.update(dt, this.player, this.worldState, this._getMissionCallbacks());
      }

      // 10.5 V4.0 Plugin Sistemləri (Loot & Sinerji, İstedad Ağacı, Elit Düşmənlər, Gündəlik Sınaq)
      this._notifyNewEnemies();
      this._callPlugins('update', dt, this.player, this.worldState, this.getPluginApi());

      // 11. Ətrafdakı interaktiv obyektləri yoxla
      this.updateInteractions();

      // 12. Tapşırıqları və Boss trigger-lərini yoxla
      this.checkBossAndQuests();

      // 13. UI HUD yenilə
      if (window.GameUI && typeof window.GameUI.updateHUD === 'function') {
        const prog = window.GameProgression ? window.GameProgression.state : null;
        window.GameUI.updateHUD(this.player, this.worldState, prog, this.fps);
      }
    },

    updatePlayer: function (dt) {
      const p = this.player;

      // Taymerləri azalt
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.spellCooldown = Math.max(0, p.spellCooldown - dt);
      p.aoeCooldown = Math.max(0, p.aoeCooldown - dt);
      p.attackCooldown = Math.max(0, p.attackCooldown - dt);
      p.attackTimer = Math.max(0, (p.attackTimer || 0) - dt);
      p.invulnTimer = Math.max(0, p.invulnTimer - dt);

      // Kombo taymeri
      if (p.comboTimer > 0) {
        p.comboTimer -= dt;
        if (p.comboTimer <= 0) {
          p.comboStep = 1;
        }
      }

      // Təbii Mana bərpası (V4.0 Plugin manaRegenMult ilə)
      const pStats = this.getPluginStats();
      p.mana = Math.min(p.maxMana, p.mana + p.manaRegen * (pStats.manaRegenMult || 1.0) * dt);

      // Baxış bucağı (Siçan kursoruna doğru)
      const dxToMouse = this.mouse.worldX - p.x;
      const dyToMouse = this.mouse.worldY - p.y;
      p.angle = Math.atan2(dyToMouse, dxToMouse);

      // Dash icrası (Kölgə Sıçrayışı hərəkəti)
      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        p.vx = p.dashDirX * p.dashSpeed;
        p.vy = p.dashDirY * p.dashSpeed;

        // Dash kölgə izi
        if (window.GameVFX && typeof window.GameVFX.spawnDashTrail === 'function') {
          window.GameVFX.spawnDashTrail(p.x, p.y, p.angle, '#818cf8');
        }
      } else {
        // Normal 8-istiqamətli hərəkət girişi
        let inputX = 0;
        let inputY = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) inputY -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) inputY += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

        // Virtual Joystik girişi
        if (this.joystick.active) {
          inputX = this.joystick.dx;
          inputY = this.joystick.dy;
        }

        const len = Math.hypot(inputX, inputY);
        if (len > 1) {
          inputX /= len;
          inputY /= len;
        }

        // Axıcı akselerasiya və dekselerasiya (V3.0 Ovçu Rütbəsi, Qurbangah və V4.0 Plugin Sürət Buff-u ilə)
        const missionStats = (window.GameMissions && typeof window.GameMissions.getStatMultipliers === 'function')
          ? window.GameMissions.getStatMultipliers()
          : null;
        const speedMult = ((missionStats && missionStats.speedMult) ? missionStats.speedMult : 1.0) * (pStats.speedMult || 1.0);
        const targetVx = inputX * p.moveSpeed * speedMult;
        const targetVy = inputY * p.moveSpeed * speedMult;
        const accelRate = 18;
        p.vx += (targetVx - p.vx) * Math.min(1, dt * accelRate);
        p.vy += (targetVy - p.vy) * Math.min(1, dt * accelRate);
      }

      // Fizika və Toqquşma
      const obstacles = (this.worldState.region && this.worldState.region.obstacles) || [];
      const worldBounds = {
        width: this.worldState.region ? this.worldState.region.width : 2600,
        height: this.worldState.region ? this.worldState.region.height : 2600
      };

      if (window.GameJuice && typeof window.GameJuice.updateEntityPhysics === 'function') {
        window.GameJuice.updateEntityPhysics(p, dt, obstacles, worldBounds);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        for (let i = 0; i < obstacles.length; i++) {
          const obs = obstacles[i];
          const dist = distance(p.x, p.y, obs.x, obs.y);
          const minDist = p.radius + obs.radius;
          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            p.x += ((p.x - obs.x) / dist) * overlap;
            p.y += ((p.y - obs.y) / dist) * overlap;
          }
        }

        p.x = clamp(p.x, p.radius, worldBounds.width - p.radius);
        p.y = clamp(p.y, p.radius, worldBounds.height - p.radius);
      }
    },

    updateProjectiles: function (dt) {
      const projectiles = this.worldState.projectiles;
      const obstacles = (this.worldState.region && this.worldState.region.obstacles) || [];
      const enemies = this.worldState.enemies;

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.life -= dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        let destroyed = false;

        // Ömrü bitibsə
        if (proj.life <= 0) {
          destroyed = true;
        }

        // Maneələrlə toqquşma
        if (!destroyed) {
          for (let o = 0; o < obstacles.length; o++) {
            const obs = obstacles[o];
            if (distance(proj.x, proj.y, obs.x, obs.y) < proj.radius + obs.radius) {
              destroyed = true;
              if (window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
                window.GameVFX.spawnHitSparks(proj.x, proj.y, proj.color || '#38bdf8', 6);
              }
              break;
            }
          }
        }

        // Oyunçu mərmisi -> Düşmənlə toqquşma
        if (!destroyed && proj.isPlayer) {
          for (let e = 0; e < enemies.length; e++) {
            const enemy = enemies[e];
            if (enemy.hp > 0 && distance(proj.x, proj.y, enemy.x, enemy.y) < proj.radius + enemy.radius) {
              // Simurq Alov Yayı deşici oxları (Pierce logic)
              if (proj.isBowArrow) {
                proj.hitEnemies = proj.hitEnemies || [];
                if (proj.hitEnemies.includes(enemy)) continue;
                proj.hitEnemies.push(enemy);

                const isCrit = Math.random() < this.player.critChance;
                const dmg = isCrit ? proj.damage * 1.8 : proj.damage;
                const dirX = proj.vx !== 0 ? proj.vx / Math.hypot(proj.vx, proj.vy) : 1;
                const dirY = proj.vy !== 0 ? proj.vy / Math.hypot(proj.vx, proj.vy) : 0;

                this.damageEnemy(enemy, dmg, isCrit, 240, dirX, dirY);

                proj.pierceLeft = (proj.pierceLeft !== undefined ? proj.pierceLeft : 1) - 1;
                if (proj.pierceLeft <= 0) {
                  destroyed = true;
                  break;
                }
              } else {
                destroyed = true;
                const isCrit = Math.random() < this.player.critChance;
                const dmg = isCrit ? proj.damage * 1.8 : proj.damage;
                const dirX = proj.vx !== 0 ? proj.vx / Math.hypot(proj.vx, proj.vy) : 1;
                const dirY = proj.vy !== 0 ? proj.vy / Math.hypot(proj.vx, proj.vy) : 0;

                this.damageEnemy(enemy, dmg, isCrit, 280, dirX, dirY);
                break;
              }
            }
          }
        }

        // Düşmən mərmisi -> Oyunçu ilə toqquşma
        if (!destroyed && !proj.isPlayer) {
          const p = this.player;
          if (distance(proj.x, proj.y, p.x, p.y) < proj.radius + p.radius) {
            destroyed = true;
            this.damagePlayer(proj.damage || 15, proj.x, proj.y);
          }
        }

        if (destroyed) {
          projectiles.splice(i, 1);
        }
      }
    },

    updateEnemies: function (dt) {
      const enemies = this.worldState.enemies;
      const p = this.player;
      const obstacles = (this.worldState.region && this.worldState.region.obstacles) || [];
      const worldBounds = {
        width: this.worldState.region ? this.worldState.region.width : 2600,
        height: this.worldState.region ? this.worldState.region.height : 2600
      };

      // AI Direktoru mövcuddursa istifadə et
      if (window.GameAI && typeof window.GameAI.updateEnemies === 'function') {
        window.GameAI.updateEnemies(
          enemies,
          p,
          this.worldState.projectiles,
          dt,
          this.worldState,
          {
            onEnemyAttack: (enemy) => {
              if (distance(enemy.x, enemy.y, p.x, p.y) <= enemy.radius + p.radius + 15) {
                this.damagePlayer(enemy.damage || 12, enemy.x, enemy.y);
              }
            },
            onSpawnProjectile: (proj) => {
              this.worldState.projectiles.push(proj);
            },
            onSpawnMinion: (type, x, y) => {
              if (window.GameLevels && typeof window.GameLevels.createEnemy === 'function') {
                const minion = window.GameLevels.createEnemy(type, x, y, this.currentRegionIndex);
                if (minion) this.worldState.enemies.push(minion);
              }
            },
            onBossPhaseChange: (boss) => {
              if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
                window.GameJuice.shake(12, 0.6);
              }
              if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
                window.GameAudio.playSFX('bossRoar');
              }
              if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
                window.GameUI.showNotification('BOSS QƏZƏBLƏNDİ!', `${boss.name} ${boss.phase}-ci mərhələyə keçdi!`, 'boss');
              }
            }
          }
        );

        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy || enemy.hp <= 0) continue;
          if (window.GameJuice && typeof window.GameJuice.updateEntityPhysics === 'function' && enemy.type !== 'wraith') {
            window.GameJuice.updateEntityPhysics(enemy, dt, obstacles, worldBounds);
          } else {
            enemy.x = clamp(enemy.x + (enemy.vx || 0) * dt, enemy.radius || 16, worldBounds.width - (enemy.radius || 16));
            enemy.y = clamp(enemy.y + (enemy.vy || 0) * dt, enemy.radius || 16, worldBounds.height - (enemy.radius || 16));
          }
        }
      } else {
        // Fallback sadə düşmən davranışı
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (enemy.hp <= 0) continue;

          const dist = distance(enemy.x, enemy.y, p.x, p.y);
          if (dist > enemy.radius + p.radius + 5) {
            const dirX = (p.x - enemy.x) / dist;
            const dirY = (p.y - enemy.y) / dist;
            enemy.vx = (enemy.vx || 0) + (dirX * (enemy.speed || 120) - (enemy.vx || 0)) * dt * 4;
            enemy.vy = (enemy.vy || 0) + (dirY * (enemy.speed || 120) - (enemy.vy || 0)) * dt * 4;
          } else {
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.attackTimer = (enemy.attackTimer || 0) - dt;
            if (enemy.attackTimer <= 0) {
              enemy.attackTimer = enemy.attackCooldown || 1.2;
              this.damagePlayer(enemy.damage || 10, enemy.x, enemy.y);
            }
          }

          enemy.x += (enemy.vx || 0) * dt;
          enemy.y += (enemy.vy || 0) * dt;
        }
      }

      // Ölü düşmənləri təmizlə
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.hp <= 0) {
          this.handleEnemyDeath(enemy);
          enemies.splice(i, 1);
        }
      }
    },

    updatePickups: function (dt) {
      const pickups = this.worldState.pickups;
      const p = this.player;

      for (let i = pickups.length - 1; i >= 0; i--) {
        const item = pickups[i];
        const dist = distance(p.x, p.y, item.x, item.y);

        // Maqnit cazibə effekti
        if (dist < 140 && dist > 0) {
          const pullSpeed = 420;
          item.x += ((p.x - item.x) / dist) * pullSpeed * dt;
          item.y += ((p.y - item.y) / dist) * pullSpeed * dt;
        }

        // Oyunçu ilə toqquşma -> Əşyanı yığ
        if (dist <= p.radius + item.radius) {
          if (item.type === 'gold') {
            const amt = item.value || 15;
            this.stats.goldCollected += amt;
            if (window.GameProgression && typeof window.GameProgression.addGold === 'function') {
              window.GameProgression.addGold(amt);
            }
            if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
              window.GameAudio.playSFX('coin');
            }
            if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
              window.GameVFX.spawnFloatingText(item.x, item.y, `+${amt} Qızıl`, '#fbbf24', 16);
            }
          } else if (item.type === 'crystal') {
            const amt = item.value || 5;
            if (window.GameProgression && typeof window.GameProgression.addCrystals === 'function') {
              window.GameProgression.addCrystals(amt);
            }
            if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
              window.GameAudio.playSFX('coin');
            }
            if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
              window.GameVFX.spawnFloatingText(item.x, item.y, `+${amt} Kristal`, '#38bdf8', 16);
            }
          } else if (item.type === 'health') {
            const heal = item.heal || 35;
            p.hp = Math.min(p.maxHp, p.hp + heal);
            if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
              window.GameAudio.playSFX('spell');
            }
            if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
              window.GameVFX.spawnFloatingText(item.x, item.y, `+${heal} Can`, '#10b981', 18);
            }
          } else if (item.type === 'mana') {
            const manaAmt = item.mana || 40;
            p.mana = Math.min(p.maxMana, p.mana + manaAmt);
            if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
              window.GameAudio.playSFX('spell');
            }
            if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
              window.GameVFX.spawnFloatingText(item.x, item.y, `+${manaAmt} Mana`, '#6366f1', 18);
            }
          }

          pickups.splice(i, 1);
        }
      }
    },

    updateEnemyWaves: function (dt) {
      if (this.worldState.bossDefeated) return;

      this.worldState.spawnTimer += dt;
      if (this.worldState.spawnTimer >= 7.0 && this.worldState.enemies.length < 8) {
        this.worldState.spawnTimer = 0;
        this.spawnRandomPatrol();
      }
    },

    spawnInitialEnemies: function () {
      const types = ['goblin', 'archer', 'golem', 'wraith', 'knight'];
      const reg = this.worldState.region;
      if (!reg) return;

      const count = 7;
      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = 400 + Math.random() * 800;
        const ex = clamp(this.player.x + Math.cos(angle) * dist, 100, reg.width - 100);
        const ey = clamp(this.player.y + Math.sin(angle) * dist, 100, reg.height - 100);

        if (window.GameLevels && typeof window.GameLevels.createEnemy === 'function') {
          const enemy = window.GameLevels.createEnemy(type, ex, ey, this.currentRegionIndex);
          if (enemy) this.worldState.enemies.push(enemy);
        }
      }
    },

    spawnRandomPatrol: function () {
      const types = ['goblin', 'archer', 'wraith'];
      const reg = this.worldState.region;
      if (!reg) return;

      const type = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 600 + Math.random() * 300;
      const ex = clamp(this.player.x + Math.cos(angle) * dist, 100, reg.width - 100);
      const ey = clamp(this.player.y + Math.sin(angle) * dist, 100, reg.height - 100);

      if (window.GameLevels && typeof window.GameLevels.createEnemy === 'function') {
        const enemy = window.GameLevels.createEnemy(type, ex, ey, this.currentRegionIndex);
        if (enemy) this.worldState.enemies.push(enemy);
      }
    },

    // ==========================================
    // 6. İNTERAKSİYA VƏ QARŞILIQLI ƏLAQƏ
    // ==========================================

    updateInteractions: function () {
      const reg = this.worldState.region;
      if (!reg) {
        this.interactionPrompt = null;
        this.activeInteraction = null;
        return;
      }

      const p = this.player;
      let nearestPrompt = null;
      let nearestObj = null;
      let minDist = 999;

      // 1. NPC yoxlanışı
      if (reg.npcs) {
        for (let i = 0; i < reg.npcs.length; i++) {
          const npc = reg.npcs[i];
          const d = distance(p.x, p.y, npc.x, npc.y);
          if (d <= 145 && d < minDist) {
            minDist = d;
            nearestPrompt = `[F] — ${npc.name} ilə danış`;
            nearestObj = { type: 'npc', data: npc };
          }
        }
      }

      // 2. Sandıq yoxlanışı
      if (reg.chests) {
        for (let i = 0; i < reg.chests.length; i++) {
          const chest = reg.chests[i];
          if (!chest.opened) {
            const d = distance(p.x, p.y, chest.x, chest.y);
            if (d <= 85 && d < minDist) {
              minDist = d;
              nearestPrompt = `[F] — Xəzinə Sandığını aç`;
              nearestObj = { type: 'chest', data: chest };
            }
          }
        }
      }

      // 3. Obelisk yoxlanışı
      if (reg.obelisks) {
        for (let i = 0; i < reg.obelisks.length; i++) {
          const ob = reg.obelisks[i];
          if (!ob.activated) {
            const d = distance(p.x, p.y, ob.x, ob.y);
            if (d <= 95 && d < minDist) {
              minDist = d;
              nearestPrompt = `[F] — ${ob.name} Obeliskini aktivləşdir`;
              nearestObj = { type: 'obelisk', data: ob };
            }
          }
        }
      }

      // 4. Portal yoxlanışı
      if (reg.portal && reg.portal.active) {
        const d = distance(p.x, p.y, reg.portal.x, reg.portal.y);
        if (d <= 105 && d < minDist) {
          minDist = d;
          const nextText = this.currentRegionIndex >= 2 ? 'Qələbəyə addımla' : 'Növbəti bölgəyə keç';
          nearestPrompt = `[F] — Portaldan keç (${nextText})`;
          nearestObj = { type: 'portal', data: reg.portal };
        }
      }

      // 5. V3.0 Tale Qurbangahı (Mystery Shrine) yoxlanışı
      if (window.GameMissions && typeof window.GameMissions.getNearestInteractable === 'function') {
        const mInt = window.GameMissions.getNearestInteractable(p);
        if (mInt && (mInt.dist || 80) < minDist) {
          minDist = mInt.dist || 80;
          nearestPrompt = mInt.text || mInt.prompt || `[F] — Qurbangahı aktivləşdir`;
          nearestObj = { type: 'shrine', data: mInt.data || mInt };
        }
      }

      this.interactionPrompt = nearestPrompt;
      this.activeInteraction = nearestObj;
    },

    interact: function () {
      this.performInteraction();
    },

    performInteraction: function () {
      if (this.isDialogueOpen) return;
      if (!this.activeInteraction) return;

      const act = this.activeInteraction;

      if (act.type === 'shrine') {
        if (window.GameMissions && typeof window.GameMissions.tryInteract === 'function') {
          window.GameMissions.tryInteract(this.player, this.worldState, this._getMissionCallbacks());
        }
        return;
      }

      if (act.type === 'npc') {
        const npc = act.data;
        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          window.GameAudio.playSFX('click');
        }
        if (window.GameMissions && typeof window.GameMissions.onNpcTalked === 'function') {
          window.GameMissions.onNpcTalked(npc, this.worldState, this._getMissionCallbacks());
        }
        this.isDialogueOpen = true;
        if (window.GameUI && typeof window.GameUI.showDialogue === 'function') {
          window.GameUI.showDialogue(npc.name, npc.title, npc.dialogues, () => {
            this.isDialogueOpen = false;
          });
        } else {
          this.isDialogueOpen = false;
        }
      } else if (act.type === 'chest') {
        const chest = act.data;
        chest.opened = true;
        this.stats.chestsOpened++;

        const gold = chest.gold || 75;
        const crystals = chest.crystals || 15;

        if (window.GameProgression) {
          if (typeof window.GameProgression.addGold === 'function') window.GameProgression.addGold(gold);
          if (typeof window.GameProgression.addCrystals === 'function') window.GameProgression.addCrystals(crystals);
          if (typeof window.GameProgression.checkAchievements === 'function') {
            window.GameProgression.checkAchievements('chests', this.stats.chestsOpened);
          }
        }

        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          window.GameAudio.playSFX('chest');
        }
        if (window.GameVFX) {
          if (typeof window.GameVFX.spawnExplosion === 'function') {
            window.GameVFX.spawnExplosion(chest.x, chest.y, '#fbbf24', 20, 70);
          }
          if (typeof window.GameVFX.spawnFloatingText === 'function') {
            window.GameVFX.spawnFloatingText(chest.x, chest.y - 20, `+${gold} Qızıl, +${crystals} Kristal!`, '#fbbf24', 20);
          }
        }
        if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
          window.GameUI.showNotification('XƏZİNƏ AÇILDI!', `+${gold} Qızıl və +${crystals} Kristal qazandınız!`, 'chest');
        }
      } else if (act.type === 'obelisk') {
        const ob = act.data;
        ob.activated = true;

        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          window.GameAudio.playSFX('quest');
        }
        if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
          window.GameJuice.shake(6, 0.25);
        }
        if (window.GameVFX) {
          if (typeof window.GameVFX.spawnExplosion === 'function') {
            window.GameVFX.spawnExplosion(ob.x, ob.y, '#38bdf8', 22, 110);
          }
          if (typeof window.GameVFX.spawnFloatingText === 'function') {
            window.GameVFX.spawnFloatingText(ob.x, ob.y - 30, 'RÜN AKTİVLƏŞDİ!', '#38bdf8', 22);
          }
        }
        if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
          window.GameUI.showNotification('QƏDİM RÜN PARILDAYIR!', `${ob.name} aktivləşdi!`, 'quest');
        }

        this.updateQuestProgress('obelisks', 1);
        if (window.GameMissions && typeof window.GameMissions.onObeliskActivated === 'function') {
          window.GameMissions.onObeliskActivated(ob, this.worldState, this._getMissionCallbacks());
        }
        this.checkBossAndQuests();
      } else if (act.type === 'portal') {
        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          window.GameAudio.playSFX('portal');
        }

        if (this.currentRegionIndex >= 2) {
          this.isVictory = true;
          if (window.GameUI && typeof window.GameUI.showGameOver === 'function') {
            window.GameUI.showGameOver(true, this.stats);
          }
        } else {
          this.changeRegion(this.currentRegionIndex + 1);
        }
      }
    },

    updateQuestProgress: function (type, amount) {
      const reg = this.worldState.region;
      if (!reg || !reg.quests) return;

      for (let i = 0; i < reg.quests.length; i++) {
        const q = reg.quests[i];
        if (q.type === type && !q.completed) {
          q.progress = (q.progress || 0) + amount;
          if (q.progress >= q.target) {
            q.progress = q.target;
            q.completed = true;
            if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
              window.GameAudio.playSFX('quest');
            }
            if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
              window.GameUI.showNotification('TAPŞIRIQ TAMAMLANDI!', q.title, 'quest');
            }
          }
        }
      }
    },

    // ==========================================
    // 7. BOSS VƏ TAPŞIRIQ MƏNTİQİ
    // ==========================================

    checkBossAndQuests: function () {
      const reg = this.worldState.region;
      if (!reg || this.worldState.bossSpawned) return;

      let allObelisksActive = true;
      if (reg.obelisks && reg.obelisks.length > 0) {
        for (let i = 0; i < reg.obelisks.length; i++) {
          if (!reg.obelisks[i].activated) {
            allObelisksActive = false;
            break;
          }
        }
      } else {
        allObelisksActive = false;
      }

      const killsTrigger = this.stats.kills >= 14;

      if (allObelisksActive || killsTrigger) {
        this.spawnBoss();
      }
    },

    spawnBoss: function () {
      if (this.worldState.bossSpawned) return;
      this.worldState.bossSpawned = true;

      const reg = this.worldState.region;
      const spawnX = reg ? reg.width / 2 : 1300;
      const spawnY = reg ? reg.height / 2 : 1300;

      let boss = null;
      if (window.GameLevels && typeof window.GameLevels.createBoss === 'function') {
        boss = window.GameLevels.createBoss(this.currentRegionIndex, spawnX, spawnY);
      } else {
        boss = {
          id: 'boss_' + this.currentRegionIndex,
          isBoss: true,
          name: this.currentRegionIndex === 0 ? 'Sylvanos' : (this.currentRegionIndex === 1 ? 'Kryos' : 'Malakor'),
          title: 'Kölgələrin Qədim Hakimi',
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          radius: 48,
          hp: 850,
          maxHp: 850,
          phase: 1,
          maxPhases: 3,
          speed: 130,
          damage: 26,
          color: '#ef4444',
          attackTimer: 1.5,
          attackCooldown: 1.8,
          state: 'chase'
        };
      }

      this.worldState.boss = boss;
      this.worldState.enemies.push(boss);

      if (window.GameAudio) {
        if (typeof window.GameAudio.playBGM === 'function') window.GameAudio.playBGM('boss');
        if (typeof window.GameAudio.playSFX === 'function') window.GameAudio.playSFX('bossRoar');
      }
      if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(14, 0.8);
      }
      if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
        window.GameUI.showNotification(
          'EPİK BOSS PEYDA OLDU!',
          `${boss.name} — ${boss.title}`,
          'boss'
        );
      }
    },

    handleBossDeath: function (boss) {
      this.worldState.bossDefeated = true;
      this.worldState.boss = null;
      this.stats.bossesDefeated++;

      // Portal aktivləşir
      this.worldState.portalUnlocked = true;
      if (this.worldState.region && this.worldState.region.portal) {
        this.worldState.region.portal.active = true;
      }

      this.updateQuestProgress('boss', 1);
      if (window.GameMissions && typeof window.GameMissions.onBossDefeated === 'function') {
        window.GameMissions.onBossDefeated(boss, this.worldState, this._getMissionCallbacks());
      }
      this._callPlugins('onBossDefeated', boss, this.worldState, this.getPluginApi());
      this._callPlugins('onEnemyKilled', boss, this.player, this.worldState, this.getPluginApi());

      // V2.0 Boss öldükdə Relikt Seçimi təqdim et!
      this.openRelicDraft();

      // Bollu Mükafatlar Spawn Et
      const goldReward = 300 + this.currentRegionIndex * 150;
      const crystalReward = 50 + this.currentRegionIndex * 30;

      for (let i = 0; i < 8; i++) {
        const offX = (Math.random() - 0.5) * 120;
        const offY = (Math.random() - 0.5) * 120;
        this.worldState.pickups.push({
          x: boss.x + offX,
          y: boss.y + offY,
          type: 'gold',
          value: Math.round(goldReward / 8),
          radius: 12
        });
      }

      for (let i = 0; i < 4; i++) {
        const offX = (Math.random() - 0.5) * 140;
        const offY = (Math.random() - 0.5) * 140;
        this.worldState.pickups.push({
          x: boss.x + offX,
          y: boss.y + offY,
          type: 'crystal',
          value: Math.round(crystalReward / 4),
          radius: 12
        });
      }

      this.worldState.pickups.push({
        x: boss.x,
        y: boss.y,
        type: 'health',
        heal: 80,
        radius: 16
      });

      if (window.GameJuice) {
        if (typeof window.GameJuice.triggerSlowMo === 'function') window.GameJuice.triggerSlowMo(0.2, 1.2);
        if (typeof window.GameJuice.shake === 'function') window.GameJuice.shake(16, 0.9);
      }
      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('portal');
      }

      if (this.currentRegionIndex >= 2) {
        if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
          window.GameUI.showNotification(
            'KÖLGƏLƏR HÖKMÜ BİTDİ!',
            'Malakor devrildi! Portala daxil olaraq zəfəri qeyd edin.',
            'boss'
          );
        }
      } else {
        if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
          window.GameUI.showNotification(
            'BOSS MƏĞLUB EDİLDİ!',
            'Qədim Portal aktivləşdi! "F" düyməsi ilə növbəti dünyaya adlayın.',
            'portal'
          );
        }
      }
    },

    // ==========================================
    // 8. DÖYÜŞ VƏ BACARIQLAR (4 SİLAH VƏ DÖYÜŞ)
    // ==========================================

    performSwordAttack: function () {
      if (this.isDialogueOpen) return;
      const p = this.player;
      if (p.attackCooldown > 0 || p.dashTimer > 0) return;

      // Aktiv silah məlumatını al
      const curWeapon = (window.GameRelics && typeof window.GameRelics.getActiveWeapon === 'function')
        ? window.GameRelics.getActiveWeapon()
        : { id: p.weaponType || 'sword', damageMult: 1.0, cooldown: 0.22, range: 110, spread: Math.PI * 0.55 };

      const weaponType = curWeapon.id || p.weaponType || 'sword';
      p.weaponType = weaponType;

      // -------------------------------------------------------------
      // 1. SIMURQ ALOV YAYI (BOW) — 3 Alov Oxu Mərmisi (Uzaq Döyüş)
      // -------------------------------------------------------------
      if (weaponType === 'bow') {
        p.attackCooldown = curWeapon.cooldown || 0.32;
        p.attackTimer = p.attackCooldown;

        let arrows = [];
        if (window.GameRelics && typeof window.GameRelics.createBowProjectiles === 'function') {
          arrows = window.GameRelics.createBowProjectiles(p, p.angle);
        } else {
          const count = 3;
          const spread = (15 * Math.PI) / 180;
          const half = spread;
          for (let i = 0; i < count; i++) {
            const angle = (p.angle - half) + (i * spread);
            arrows.push({
              x: p.x + Math.cos(angle) * 22,
              y: p.y + Math.sin(angle) * 22,
              vx: Math.cos(angle) * 720,
              vy: Math.sin(angle) * 720,
              angle: angle,
              radius: 6,
              damage: Math.round(p.attackDamage * 0.88),
              pierce: 2,
              pierceLeft: 2,
              hitEnemies: [],
              life: 0.9,
              maxLife: 0.9,
              color: '#f97316',
              arrowColor: '#fb923c',
              isBowArrow: true,
              isPlayer: true
            });
          }
        }

        if (Array.isArray(arrows) && arrows.length > 0) {
          for (let i = 0; i < arrows.length; i++) {
            this.worldState.projectiles.push(arrows[i]);
          }
        }

        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          try { window.GameAudio.playSFX('bow'); } catch (_) {}
        }
        return;
      }

      // -------------------------------------------------------------
      // 2. ASTRAL DÖYÜŞ ÇƏKİCİ (HAMMER) — 1.85x Zərər, Şok Dalğası, Stun
      // -------------------------------------------------------------
      if (weaponType === 'hammer') {
        p.attackCooldown = curWeapon.cooldown || 0.52;
        p.attackTimer = p.attackCooldown;

        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          try { window.GameAudio.playSFX('hammer'); } catch (_) {}
        }

        const shockRadius = curWeapon.shockwaveRadius || 140;
        const hammerDmg = Math.round(p.attackDamage * (curWeapon.damageMult || 1.85));

        if (window.GameVFX) {
          if (typeof window.GameVFX.spawnExplosion === 'function') {
            window.GameVFX.spawnExplosion(p.x + Math.cos(p.angle) * 50, p.y + Math.sin(p.angle) * 50, '#60a5fa', 18, shockRadius);
          }
          if (typeof window.GameVFX.spawnSlashArc === 'function') {
            window.GameVFX.spawnSlashArc(p.x, p.y, p.angle, 3, '#60a5fa');
          }
        }
        if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
          window.GameJuice.shake(7, 0.22);
        }

        const enemies = this.worldState.enemies;
        const hx = p.x + Math.cos(p.angle) * 50;
        const hy = p.y + Math.sin(p.angle) * 50;

        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (enemy.hp <= 0) continue;

          const dist = distance(hx, hy, enemy.x, enemy.y);
          if (dist <= shockRadius + enemy.radius) {
            const isCrit = Math.random() < p.critChance;
            const totalDmg = isCrit ? hammerDmg * 1.85 : hammerDmg;
            const kx = dist > 0 ? (enemy.x - hx) / dist : Math.cos(p.angle);
            const ky = dist > 0 ? (enemy.y - hy) / dist : Math.sin(p.angle);

            // Düşməni 0.8s dondur (Stun)
            enemy.stunTimer = Math.max(enemy.stunTimer || 0, curWeapon.stunDuration || 0.8);
            this.damageEnemy(enemy, totalDmg, isCrit, curWeapon.knockbackForce || 460, kx, ky);
          }
        }
        return;
      }

      // -------------------------------------------------------------
      // 3. ƏKİZ KÖLGƏ XƏNCƏRLƏRİ (DAGGERS) — Sürətli (0.14s), +25% Krit, Bleed
      // -------------------------------------------------------------
      if (weaponType === 'daggers') {
        p.attackCooldown = curWeapon.cooldown || 0.14; // İldırım sürətli (0.14s)
        p.attackTimer = p.attackCooldown;

        if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
          try { window.GameAudio.playSFX('dagger'); } catch (_) {}
        }

        const daggerDmg = Math.round(p.attackDamage * (curWeapon.damageMult || 0.76));
        const arcRange = curWeapon.range || 85;
        const arcSpread = curWeapon.spread || (Math.PI * 0.42);

        if (window.GameVFX && typeof window.GameVFX.spawnSlashArc === 'function') {
          window.GameVFX.spawnSlashArc(p.x, p.y, p.angle, 1, '#c084fc');
        }

        const enemies = this.worldState.enemies;
        const arcHalf = arcSpread / 2;

        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (enemy.hp <= 0) continue;

          const dist = distance(p.x, p.y, enemy.x, enemy.y);
          if (dist <= arcRange + enemy.radius) {
            const angleToEnemy = Math.atan2(enemy.y - p.y, enemy.x - p.x);
            const diff = Math.abs(normalizeAngle(angleToEnemy - p.angle));

            if (diff <= arcHalf) {
              const critChance = p.critChance + (curWeapon.critBonus || 0.25);
              const isCrit = Math.random() < critChance;
              const totalDmg = isCrit ? daggerDmg * 2.0 : daggerDmg;

              // 3.0s Kölgə qanaxması (Bleed DOT)
              enemy.bleedTimer = curWeapon.bleedTimer || 3.0;
              enemy.bleedDps = curWeapon.bleedDps || 18;
              enemy.bleedColor = '#c084fc';

              const kx = dist > 0 ? (enemy.x - p.x) / dist : Math.cos(p.angle);
              const ky = dist > 0 ? (enemy.y - p.y) / dist : Math.sin(p.angle);

              this.damageEnemy(enemy, totalDmg, isCrit, 180, kx, ky);
            }
          }
        }
        return;
      }

      // -------------------------------------------------------------
      // 4. AETHER QILINCI (SWORD) — Balanslı 3-lü Zərbə Kombinasiyası
      // -------------------------------------------------------------
      if (p.comboTimer > 0) {
        p.comboStep = (p.comboStep % 3) + 1;
      } else {
        p.comboStep = 1;
      }

      p.comboTimer = 0.9;
      p.attackCooldown = (p.comboStep === 3) ? (curWeapon.finisherCooldown || 0.32) : (curWeapon.cooldown || 0.22);
      p.attackTimer = p.attackCooldown;

      const step = p.comboStep;

      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX(`slash${step}`);
      }

      let arcColor = '#67e8f9';
      let arcRange = curWeapon.range || 105;
      let arcSpread = curWeapon.spread || (Math.PI * 0.55);
      let dmgMultiplier = (curWeapon.comboDamageMults && curWeapon.comboDamageMults[step - 1]) || 1.0;

      if (step === 2) {
        arcColor = '#c084fc';
        arcRange = 115;
        arcSpread = Math.PI * 0.65;
      } else if (step === 3) {
        arcColor = curWeapon.finisherColor || '#fbbf24';
        arcRange = curWeapon.finisherRange || 140;
        arcSpread = curWeapon.finisherSpread || (Math.PI * 1.85); // 330° epik finişer!
      }

      if (window.GameVFX && typeof window.GameVFX.spawnSlashArc === 'function') {
        window.GameVFX.spawnSlashArc(p.x, p.y, p.angle, step, arcColor);
      }

      const enemies = this.worldState.enemies;
      const arcHalf = arcSpread / 2;

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (enemy.hp <= 0) continue;

        const dist = distance(p.x, p.y, enemy.x, enemy.y);
        if (dist <= arcRange + enemy.radius) {
          const angleToEnemy = Math.atan2(enemy.y - p.y, enemy.x - p.x);
          const diff = Math.abs(normalizeAngle(angleToEnemy - p.angle));

          if (step === 3 || diff <= arcHalf) {
            const isCrit = Math.random() < (p.critChance + (step === 3 ? 0.25 : 0));
            const baseDmg = p.attackDamage * dmgMultiplier * (0.9 + Math.random() * 0.2);
            const totalDmg = isCrit ? baseDmg * 1.85 : baseDmg;

            const kx = dist > 0 ? (enemy.x - p.x) / dist : Math.cos(p.angle);
            const ky = dist > 0 ? (enemy.y - p.y) / dist : Math.sin(p.angle);
            const knockForce = (step === 3 ? 420 : 260);

            this.damageEnemy(enemy, totalDmg, isCrit, knockForce, kx, ky);
          }
        }
      }
    },

    performArcaneBolt: function () {
      if (this.isDialogueOpen) return;
      const p = this.player;
      if (p.spellCooldown > 0) return;

      if (p.mana < p.spellManaCost) {
        if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(p.x, p.y - 30, 'Mana çatışmır!', '#38bdf8', 15);
        }
        return;
      }

      p.mana -= p.spellManaCost;
      p.spellCooldown = p.spellMaxCooldown;

      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('spell');
      }

      const boltSpeed = 680;
      const boltDmg = p.spellDamage * (0.92 + Math.random() * 0.16);

      const bolt = {
        x: p.x + Math.cos(p.angle) * 26,
        y: p.y + Math.sin(p.angle) * 26,
        vx: Math.cos(p.angle) * boltSpeed,
        vy: Math.sin(p.angle) * boltSpeed,
        radius: 9,
        damage: boltDmg,
        isPlayer: true,
        life: 1.8,
        color: '#38bdf8',
        type: 'arcane_bolt'
      };

      this.worldState.projectiles.push(bolt);

      if (window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
        window.GameVFX.spawnHitSparks(p.x, p.y, '#38bdf8', 5);
      }
    },

    performAoeNova: function () {
      if (this.isDialogueOpen) return;
      const p = this.player;
      if (p.aoeCooldown > 0) return;

      if (p.mana < p.aoeManaCost) {
        if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(p.x, p.y - 30, 'Mana çatışmır!', '#38bdf8', 15);
        }
        return;
      }

      p.mana -= p.aoeManaCost;
      p.aoeCooldown = p.aoeMaxCooldown;

      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('explosion');
      }
      if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(10, 0.35);
      }
      if (window.GameVFX && typeof window.GameVFX.spawnExplosion === 'function') {
        window.GameVFX.spawnExplosion(p.x, p.y, '#60a5fa', 24, p.aoeRadius);
      }

      const enemies = this.worldState.enemies;
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (enemy.hp <= 0) continue;

        const dist = distance(p.x, p.y, enemy.x, enemy.y);
        if (dist <= p.aoeRadius + enemy.radius) {
          const dmg = p.spellDamage * 1.6 + 25;
          const kx = dist > 0 ? (enemy.x - p.x) / dist : 1;
          const ky = dist > 0 ? (enemy.y - p.y) / dist : 0;
          this.damageEnemy(enemy, dmg, true, 480, kx, ky);
        }
      }
    },

    /**
     * Dash (Kölgə Sıçrayışı) və Mükəmməl Yayınma (Perfect Dodge)
     */
    performDash: function () {
      if (this.isDialogueOpen) return;
      const p = this.player;
      if (p.dashCooldown > 0) return;

      // Dash Animation Cancel
      p.attackTimer = 0;
      p.attackCooldown = 0;
      p.dashCooldown = p.dashMaxCooldown;
      p.dashTimer = p.dashDuration;
      p.invulnTimer = p.dashDuration + 0.15; // İ-frame

      let moveX = 0;
      let moveY = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

      if (this.joystick.active) {
        moveX = this.joystick.dx;
        moveY = this.joystick.dy;
      }

      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > 0.1) {
        p.dashDirX = moveX / moveLen;
        p.dashDirY = moveY / moveLen;
      } else {
        p.dashDirX = Math.cos(p.angle);
        p.dashDirY = Math.sin(p.angle);
      }

      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('dash');
      }
      if (window.GameVFX && typeof window.GameVFX.spawnDashTrail === 'function') {
        window.GameVFX.spawnDashTrail(p.x, p.y, p.angle, '#818cf8');
      }

      // V2.0 Mükəmməl Yayınma (Perfect Dodge / Witch Time) Yoxlanışı
      if (window.GameEvents && typeof window.GameEvents.checkPerfectDodge === 'function') {
        const isPerfect = window.GameEvents.checkPerfectDodge(
          p,
          this.worldState.enemies,
          this.worldState.projectiles
        );

        if (isPerfect) {
          if (window.GameJuice && typeof window.GameJuice.triggerSlowMo === 'function') {
            window.GameJuice.triggerSlowMo(0.25, 0.85);
          }
          if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
            try {
              window.GameAudio.playSFX('perfectDodge');
            } catch (_) {
              try { window.GameAudio.playSFX('dash'); } catch (__) {}
            }
          }
          if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
            window.GameVFX.spawnFloatingText(p.x, p.y - 42, '⚡ MÜKƏMMƏL YAYINMA!', '#00e5ff', 20);
          }
        }
      }

      // V2.0 Dash Relikt Effekti (Kölgə Klonu Tələsi)
      if (window.GameRelics && typeof window.GameRelics.applyOnDashEffects === 'function') {
        window.GameRelics.applyOnDashEffects(p, this.worldState.enemies);
      }
    },

    /**
     * Düşmənə zərər vurur, Relikt On-Hit effektlərini və Kombo qeydiyyatını çağırır
     */
    damageEnemy: function (enemy, amount, isCrit, knockForce, kx, ky) {
      if (!enemy || enemy.hp <= 0) return;

      // 1. V2.0 Stil Kombo Qeydiyyatı və Çarpanı
      let comboMult = 1.0;
      if (window.GameEvents && typeof window.GameEvents.registerHit === 'function') {
        const comboState = window.GameEvents.registerHit(amount);
        if (comboState && comboState.multiplier) {
          comboMult = comboState.multiplier;
        }
      }

      let totalDamage = amount * comboMult;
      if (window.GameMissions && typeof window.GameMissions.getStatMultipliers === 'function') {
        const mStats = window.GameMissions.getStatMultipliers();
        if (mStats && mStats.damageMult) {
          totalDamage *= mStats.damageMult;
        }
      }
      const pStats = this.getPluginStats();
      totalDamage *= (pStats.damageMult || 1.0);
      totalDamage = this._reducePlugins('modifyOutgoingDamage', totalDamage, (v) => [enemy, v, isCrit, this.player, this.getPluginApi()]);
      if (totalDamage <= 0) return;

      // 2. V2.0 Relikt On-Hit Effektləri (Vampir, İldırım Zənciri, Buz, Cəllad)
      if (window.GameRelics && typeof window.GameRelics.applyOnHitEffects === 'function') {
        const hitRes = window.GameRelics.applyOnHitEffects(
          this.player,
          enemy,
          this.worldState.enemies,
          totalDamage,
          {
            onHitEnemy: (other, dmg, type) => {
              this.stats.damageDealt += dmg;
              if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
                window.GameVFX.spawnFloatingText(other.x, other.y - 14, `-${Math.round(dmg)}`, '#00e5ff', 15);
              }
            },
            onChainLightning: (fromPos, toTarget, dmg) => {
              if (window.GameVFX && typeof window.GameVFX.spawnChainLightning === 'function') {
                window.GameVFX.spawnChainLightning(fromPos.x, fromPos.y, toTarget.x, toTarget.y, '#00e5ff');
              }
            }
          }
        );
        if (hitRes && typeof hitRes.totalAppliedDamage === 'number') {
          totalDamage = hitRes.totalAppliedDamage;
        }
      }

      enemy.hp -= totalDamage;
      this.stats.damageDealt += totalDamage;
      this._callPlugins('onEnemyHit', enemy, totalDamage, isCrit, this.player, this.getPluginApi());

      // V2.0 Hər zərbədə Ultimate Qəzəb (Rage) enerjisi doldur
      if (window.GameCompanions && typeof window.GameCompanions.addRage === 'function') {
        window.GameCompanions.addRage(isCrit ? 7 : 4);
      }

      // Hit-stop və kamera reaksiyası
      if (isCrit) {
        if (window.GameJuice) {
          if (typeof window.GameJuice.hitStop === 'function') window.GameJuice.hitStop(0.06);
          if (typeof window.GameJuice.shake === 'function') window.GameJuice.shake(8, 0.25);
          if (typeof window.GameJuice.zoomPunch === 'function') window.GameJuice.zoomPunch(0.04, 0.18);
        }
        if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(enemy.x, enemy.y - 18, `KRİTİK! -${Math.round(totalDamage)}`, '#fbbf24', 22);
        }
      } else {
        if (window.GameJuice) {
          if (typeof window.GameJuice.hitStop === 'function') window.GameJuice.hitStop(0.035);
          if (typeof window.GameJuice.shake === 'function') window.GameJuice.shake(3.5, 0.14);
        }
        if (window.GameVFX && typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(enemy.x, enemy.y - 12, `-${Math.round(totalDamage)}`, '#ffffff', 16);
        }
      }

      // Səs və qığılcımlar
      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('hit');
      }
      if (window.GameVFX && typeof window.GameVFX.spawnHitSparks === 'function') {
        window.GameVFX.spawnHitSparks(enemy.x, enemy.y, isCrit ? '#fbbf24' : '#f97316', isCrit ? 10 : 6);
      }

      // Knockback təpməsi
      if (knockForce > 0 && window.GameJuice && typeof window.GameJuice.applyKnockback === 'function') {
        window.GameJuice.applyKnockback(enemy, kx, ky, knockForce);
      } else if (knockForce > 0) {
        enemy.vx = (enemy.vx || 0) + kx * knockForce;
        enemy.vy = (enemy.vy || 0) + ky * knockForce;
      }
    },

    damagePlayer: function (amount, sourceX, sourceY) {
      const p = this.player;
      if (p.invulnTimer > 0 || p.dashTimer > 0) return;

      const pStats = this.getPluginStats();
      amount = amount * (pStats.damageTakenMult || 1.0);
      amount = this._reducePlugins('modifyIncomingDamage', amount, (v) => [v, p, { x: sourceX, y: sourceY }, this.getPluginApi()]);
      if (amount <= 0) return;

      p.hp -= amount;
      p.invulnTimer = 0.45;
      this._callPlugins('onPlayerDamaged', amount, p, this.getPluginApi());

      // V2.0 Kombonu zədə aldıqda yarıya endir
      if (window.GameEvents && typeof window.GameEvents.onPlayerDamaged === 'function') {
        window.GameEvents.onPlayerDamaged();
      }
      // V3.0 Zərbəsiz Müqavilə (Untouchable Bounty) yoxlanışı
      if (window.GameMissions && typeof window.GameMissions.onPlayerDamaged === 'function') {
        window.GameMissions.onPlayerDamaged(amount);
      }

      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('playerHurt');
      }
      if (window.GameJuice && typeof window.GameJuice.shake === 'function') {
        window.GameJuice.shake(7, 0.22);
      }
      if (window.GameVFX) {
        if (typeof window.GameVFX.spawnFloatingText === 'function') {
          window.GameVFX.spawnFloatingText(p.x, p.y - 20, `-${Math.round(amount)}`, '#ef4444', 20);
        }
        if (typeof window.GameVFX.spawnHitSparks === 'function') {
          window.GameVFX.spawnHitSparks(p.x, p.y, '#ef4444', 7);
        }
      }

      // Geri təpmə
      const dist = distance(p.x, p.y, sourceX, sourceY);
      if (dist > 0) {
        const kx = (p.x - sourceX) / dist;
        const ky = (p.y - sourceY) / dist;
        if (window.GameJuice && typeof window.GameJuice.applyKnockback === 'function') {
          window.GameJuice.applyKnockback(p, kx, ky, 240);
        } else {
          p.vx += kx * 240;
          p.vy += ky * 240;
        }
      }

      // Ölüm yoxlanışı (V4.0 Simurq Dirilməsi / Phoenix Soul və digər plugin qorumaları ilə)
      if (p.hp <= 0) {
        if (this._callPlugins('onPlayerDeath', p, this.stats, this.getPluginApi())) {
          if (p.hp <= 0) p.hp = Math.round(p.maxHp * 0.5);
          p.invulnTimer = 2.5;
          return;
        }
        p.hp = 0;
        this.respawnPlayer();
      }
    },

    handleEnemyDeath: function (enemy) {
      this.stats.kills++;

      // V2.0 Düşmən öldükdə əlavə Qəzəb (Rage) enerjisi
      if (window.GameCompanions && typeof window.GameCompanions.addRage === 'function') {
        window.GameCompanions.addRage(enemy.isBoss ? 50 : 12);
      }

      // Boss öldüsə xüsusi metod
      if (enemy.isBoss) {
        this.handleBossDeath(enemy);
        return;
      }

      // Qaçan Qızıl Xəzinə Qoblini öldüsə Relikt Draft aç
      if (enemy.isTreasureGoblin || enemy.isGoblin || enemy.type === 'treasure_goblin') {
        this.openRelicDraft();
      }

      // Tapşırıq irəliləyişi və V3.0 Missiya / Kill-Streak / Ovçu Rütbəsi + V4.0 Pluginlər
      this.updateQuestProgress('kill', 1);
      if (window.GameMissions && typeof window.GameMissions.onEnemyKilled === 'function') {
        window.GameMissions.onEnemyKilled(enemy, this.player, this.worldState, this._getMissionCallbacks());
      }
      this._callPlugins('onEnemyKilled', enemy, this.player, this.worldState, this.getPluginApi());

      // Partlayış effekti
      if (window.GameVFX && typeof window.GameVFX.spawnExplosion === 'function') {
        window.GameVFX.spawnExplosion(enemy.x, enemy.y, enemy.color || '#ef4444', 16, 50);
      }

      // XP və Qızıl (V3.0 Qurbangah & Rütbə + V4.0 Plugin Qızıl/XP Çarpanları ilə)
      const mStats = (window.GameMissions && typeof window.GameMissions.getStatMultipliers === 'function')
        ? window.GameMissions.getStatMultipliers()
        : null;
      const pStats = this.getPluginStats();
      const goldMult = ((mStats && mStats.goldMult) ? mStats.goldMult : 1.0) * (pStats.goldMult || 1.0);
      const gold = Math.round((enemy.goldValue || 14) * goldMult);
      const xp = Math.round((enemy.expValue || 22) * (pStats.xpMult || 1.0));

      if (window.GameProgression) {
        if (typeof window.GameProgression.addGold === 'function') {
          window.GameProgression.addGold(gold);
        }
        if (typeof window.GameProgression.addXP === 'function') {
          const res = window.GameProgression.addXP(xp);
          if (res && res.leveledUp) {
            if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
              window.GameAudio.playSFX('levelUp');
            }
            if (window.GameUI && typeof window.GameUI.showNotification === 'function') {
              window.GameUI.showNotification('SƏVİYYƏ ARTDI!', `Yeni Səviyyə: ${res.newLevel}! Güclər artdı.`, 'levelUp');
            }
            this.syncProgressionStats();

            // V2.0 Level-Up zamanı 3-kartlı Relikt Draft Modalı aç!
            this.openRelicDraft();
          }
        }
        if (typeof window.GameProgression.checkAchievements === 'function') {
          window.GameProgression.checkAchievements('kills', this.stats.kills);
        }
      }

      // Pickups Yarat
      this.worldState.pickups.push({
        x: enemy.x,
        y: enemy.y,
        type: 'gold',
        value: gold,
        radius: 10
      });

      // Dinamik Drop Ehtimalı
      let dropChance = 0.25;
      if (window.GameAI && typeof window.GameAI.getDynamicDropChance === 'function') {
        const aiDrop = window.GameAI.getDynamicDropChance(this.player);
        if (typeof aiDrop === 'number') {
          dropChance = aiDrop;
        } else if (aiDrop && typeof aiDrop === 'object') {
          dropChance = Math.max(aiDrop.healthOrb || 0.25, aiDrop.manaOrb || 0.2);
        }
      }

      if (Math.random() < dropChance) {
        if (this.player.hp < this.player.maxHp * 0.5) {
          this.worldState.pickups.push({
            x: enemy.x + (Math.random() - 0.5) * 20,
            y: enemy.y + (Math.random() - 0.5) * 20,
            type: 'health',
            heal: 35,
            radius: 14
          });
        } else {
          this.worldState.pickups.push({
            x: enemy.x + (Math.random() - 0.5) * 20,
            y: enemy.y + (Math.random() - 0.5) * 20,
            type: 'mana',
            mana: 35,
            radius: 14
          });
        }
      }
    },

    // ==========================================
    // 9. EKRAN RENDERİ VƏ V2.0 QRAFIKA
    // ==========================================

    render: function () {
      const ctx = this.ctx;
      if (!ctx) return;

      const cam = this.getCamera();
      const time = this.worldState.time;

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 1. Kamera Transformu Başlayır
      if (window.GameJuice && typeof window.GameJuice.applyCameraTransform === 'function') {
        window.GameJuice.applyCameraTransform(ctx, this.canvas);
      } else {
        ctx.save();
        ctx.translate(-cam.x, -cam.y);
      }

      // 2. Arxa Fon (Background)
      if (window.GameVFX && typeof window.GameVFX.renderBackground === 'function') {
        window.GameVFX.renderBackground(ctx, cam, this.worldState.region, time);
      } else {
        this.fallbackRenderBackground(ctx);
      }

      // 3. Əşyalar, Obyektlər və Canlılar
      if (window.GameVFX && typeof window.GameVFX.renderPropsAndEntities === 'function') {
        window.GameVFX.renderPropsAndEntities(ctx, cam, this.worldState, time);
      } else {
        this.fallbackRenderEntities(ctx);
      }

      // 3.1 V2.0 Kölgə Klonu Tələləri (ctx artıq dünya koordinatlarındadır, ona görə sıfır kamera ofseti ötürülür)
      if (window.GameRelics && typeof window.GameRelics.renderTraps === 'function') {
        window.GameRelics.renderTraps(ctx, { x: 0, y: 0, zoom: 1 });
      }

      // 3.2 V2.0 Ultimate Meteor Yağışı və Kraterlər Renderi (GameCompanions.draw)
      if (window.GameCompanions && typeof window.GameCompanions.draw === 'function' && window.GameCompanions.isUltimateActive && window.GameCompanions.isUltimateActive()) {
        window.GameCompanions.draw(ctx, { x: 0, y: 0 });
      }

      // 3.3 V2.0 Dinamik Dünya Hadisələri Renderi (Qoblin və Meteor Sandığı)
      if (window.GameEvents && typeof window.GameEvents.renderWorldEvents === 'function') {
        window.GameEvents.renderWorldEvents(ctx, { x: 0, y: 0 });
      }

      // 3.4 V3.0 Missiya Obyektləri: Müdafiə Dairəsi, Tale Qurbangahları və Canlı GPS Hədəf Oxu
      if (window.GameMissions && typeof window.GameMissions.renderWorldObjects === 'function') {
        window.GameMissions.renderWorldObjects(ctx, { x: 0, y: 0 }, time);
      }

      // 3.5 V4.0 Plugin Dünya Obyektləri (Loot Şüaları, Elit Auralar, Regional Təhlükələr)
      this._callPlugins('renderWorld', ctx, time, this.worldState);

      // 4. İşıqlandırma və PostFX
      if (window.GameVFX && typeof window.GameVFX.renderLightingAndPostFX === 'function') {
        window.GameVFX.renderLightingAndPostFX(ctx, this.canvas, cam, this.worldState, time);
      }

      // 5. Kamera Transformu Bərpa Edilir
      if (window.GameJuice && typeof window.GameJuice.restoreCameraTransform === 'function') {
        window.GameJuice.restoreCameraTransform(ctx);
      } else {
        ctx.restore();
      }

      // 6. Qarşılıqlı Əlaqə Bildirişi (Interaction Prompt)
      if (this.interactionPrompt) {
        this.renderInteractionHUD(ctx);
      }

      // 7. V2.0 Dinamik Bildiriş Banneri və Kolizey HUD (Canvas Səviyyəsində)
      if (window.GameEvents) {
        if (window.GameEvents.worldEvents && window.GameEvents.worldEvents.banner && window.GameEvents.worldEvents.banner.timer > 0 && typeof window.GameEvents._renderBannerHUD === 'function') {
          window.GameEvents._renderBannerHUD(ctx, this.canvas.width, this.canvas.height);
        }
        if (window.GameEvents.isArenaMode && typeof window.GameEvents._renderArenaHUD === 'function') {
          window.GameEvents._renderArenaHUD(ctx, this.canvas.width, this.canvas.height);
        }
      }

      // 8. V3.0 Missiya Kampaniyası, Vaxtlı Ov Müqaviləsi [M], Ovçu Rütbəsi və Kill-Streak HUD
      if (window.GameMissions && typeof window.GameMissions.renderMissionHUD === 'function') {
        window.GameMissions.renderMissionHUD(ctx, this.canvas.width, this.canvas.height);
      }

      // 9. V4.0 Plugin HUD və Overlay-ləri (Loot/Sinerji, İstedad Ağacı [T], Elit Banner, Gündəlik Sınaq [J] və Bələdçi)
      this._callPlugins('renderHUD', ctx, this.canvas.width, this.canvas.height, this.worldState);
    },

    renderInteractionHUD: function (ctx) {
      const text = this.interactionPrompt;
      ctx.save();
      ctx.font = '600 17px system-ui, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const boxWidth = textWidth + 36;
      const boxHeight = 40;
      const x = this.canvas.width / 2 - boxWidth / 2;
      const y = this.canvas.height - 110;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.canvas.width / 2, y + boxHeight / 2);
      ctx.restore();
    },

    fallbackRenderBackground: function (ctx) {
      const reg = this.worldState.region || { width: 2600, height: 2600 };
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, reg.width, reg.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let x = 0; x < reg.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, reg.height);
        ctx.stroke();
      }
      for (let y = 0; y < reg.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(reg.width, y);
        ctx.stroke();
      }
    },

    fallbackRenderEntities: function (ctx) {
      const reg = this.worldState.region;

      // Maneələr
      if (reg && reg.obstacles) {
        for (let i = 0; i < reg.obstacles.length; i++) {
          const obs = reg.obstacles[i];
          ctx.fillStyle = obs.color || '#475569';
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Obelisklər
      if (reg && reg.obelisks) {
        for (let i = 0; i < reg.obelisks.length; i++) {
          const ob = reg.obelisks[i];
          ctx.fillStyle = ob.activated ? '#38bdf8' : '#64748b';
          ctx.beginPath();
          ctx.arc(ob.x, ob.y, ob.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pickups
      const pickups = this.worldState.pickups;
      for (let i = 0; i < pickups.length; i++) {
        const item = pickups[i];
        ctx.fillStyle = item.type === 'gold' ? '#fbbf24' : (item.type === 'crystal' ? '#38bdf8' : '#10b981');
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Düşmənlər
      const enemies = this.worldState.enemies;
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        ctx.fillStyle = en.color || '#ef4444';
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Oyunçu
      const p = this.player;
      ctx.fillStyle = p.skinColor || '#6366f1';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Baxış xətti
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30);
      ctx.stroke();

      // Mərmilər
      const projs = this.worldState.projectiles;
      for (let i = 0; i < projs.length; i++) {
        const proj = projs[i];
        ctx.fillStyle = proj.color || '#38bdf8';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // ==========================================
    // 10. MOBİL / VİRTUAL İDARƏETMƏ KÖMƏKÇİLƏRİ
    // ==========================================

    triggerAction: function (actionName) {
      if (actionName === 'attack') {
        this.performSwordAttack();
      } else if (actionName === 'spell') {
        this.performArcaneBolt();
      } else if (actionName === 'aoe' || actionName === 'nova') {
        this.performAoeNova();
      } else if (actionName === 'dash') {
        this.performDash();
      } else if (actionName === 'interact') {
        this.performInteraction();
      } else if (actionName === 'ult') {
        this.triggerUltimate();
      } else if (actionName === 'comp') {
        this.cycleCompanion();
      } else if (actionName === 'weapon1') {
        this.switchWeapon(1);
      } else if (actionName === 'weapon2') {
        this.switchWeapon(2);
      } else if (actionName === 'weapon3') {
        this.switchWeapon(3);
      } else if (actionName === 'weapon4') {
        this.switchWeapon(4);
      }
    },

    setJoystickInput: function (dx, dy) {
      this.joystick.dx = dx;
      this.joystick.dy = dy;
      this.joystick.active = (dx !== 0 || dy !== 0);
    }
  };

  // Qlobal Obyekt kimi ixrac et
  if (typeof window !== 'undefined') {
    window.GameEngine = GameEngine;
  }

  // Node mühiti üçün ixracat (Test və sintaksis yoxlanışı üçün)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngine;
  }

})();
