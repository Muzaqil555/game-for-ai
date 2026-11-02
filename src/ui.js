// ============================================================================
// AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ — UI MÜHƏRRİKİ (src/ui.js)
// window.GameUI — Müasir, Glassmorphism & Dark Fantasy İnterfeys Sistemi
// ============================================================================

(function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Dirty-checked DOM writers: skip the write when the value is unchanged so the
  // browser does not invalidate/repaint the (backdrop-filtered) HUD panels every frame.
  function setText(el, v) {
    if (!el) return;
    v = String(v);
    if (el.textContent !== v) el.textContent = v;
  }
  function setStyle(el, prop, v) {
    if (!el) return;
    v = String(v);
    if (el.style[prop] !== v) el.style[prop] = v;
  }
  function setTitle(el, v) {
    if (!el) return;
    v = String(v);
    if (el.title !== v) el.title = v;
  }
  function setCls(el, name, on) {
    if (!el) return;
    on = !!on;
    if (el.classList.contains(name) !== on) el.classList.toggle(name, on);
  }

  function sanitizeColor(c) {
    if (typeof c === 'string') {
      var trimmed = c.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
      if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/i.test(trimmed)) return trimmed;
    }
    return '#f5c542';
  }

  var GameUI = {
    callbacks: {},
    activeDialogue: null,
    notificationTimeout: null,
    currentShopTab: 'upgrades',
    radarSweepAngle: 0,
    _lastShopToggleTime: 0,
    _lastPanelSync: 0,
    _lastQuestSignature: '',
    _lastRelicsSignature: '',
    _lastComboCount: 0,

    // Element Keşi
    dom: {},

    /**
     * UI Sistemini başladır və hadisə dinləyicilərini qoşur.
     * @param {Object} engineCallbacks
     */
    init: function (engineCallbacks) {
      this.callbacks = engineCallbacks || {};

      // Əgər həm köhnə #game-canvas, həm də mühərrikin #gameCanvas elementi varsa, üst-üstə düşməni aradan qaldır
      var legacyCanvas = document.getElementById('game-canvas');
      var engineCanvas = document.getElementById('gameCanvas');
      if (legacyCanvas && engineCanvas && legacyCanvas !== engineCanvas) {
        legacyCanvas.style.display = 'none';
        engineCanvas.style.zIndex = '1';
      }

      this._cacheElements();
      this._bindEvents();
      this._initMinimap();
      this._initTouchControls();

      // Audio statusunu ilkin yoxla
      this.updateAudioButtonState();

      console.log('⚔ [GameUI] İnterfeys sistemi uğurla başladıldı.');
    },

    /**
     * DOM elementlərini kəş edir
     */
    _cacheElements: function () {
      this.dom = {
        // Ekranlar
        mainMenu: document.getElementById('main-menu'),
        gameHud: document.getElementById('game-hud'),
        modalShop: document.getElementById('modal-shop'),
        modalDialogue: document.getElementById('modal-dialogue'),
        modalPause: document.getElementById('modal-pause'),
        modalGameOver: document.getElementById('modal-gameover'),
        modalControls: document.getElementById('modal-controls'),
        modalRegionSelect: document.getElementById('modal-region-select'),

        // HUD - Sol Yuxarı
        playerLevel: document.getElementById('hud-player-level'),
        regionName: document.getElementById('hud-region-name'),
        hpFill: document.getElementById('hp-fill'),
        hpText: document.getElementById('hp-text'),
        hpContainer: document.getElementById('hp-bar-container'),
        mpFill: document.getElementById('mp-fill'),
        mpText: document.getElementById('mp-text'),
        xpFill: document.getElementById('xp-fill'),
        xpText: document.getElementById('xp-text'),
        goldCount: document.getElementById('hud-gold'),
        crystalCount: document.getElementById('hud-crystals'),

        // HUD - Yuxarı Mərkəz
        bossHud: document.getElementById('boss-hud'),
        bossName: document.getElementById('boss-name'),
        bossTitle: document.getElementById('boss-title'),
        bossPhase: document.getElementById('boss-phase'),
        bossHpFill: document.getElementById('boss-hp-fill'),
        bossHpGhost: document.getElementById('boss-hp-ghost'),
        bossHpText: document.getElementById('boss-hp-text'),
        notificationBanner: document.getElementById('notification-banner'),
        notifTitle: document.getElementById('notif-title'),
        notifSubtitle: document.getElementById('notif-subtitle'),

        // HUD - Yuxarı Sağ
        minimapCanvas: document.getElementById('minimap-canvas'),
        btnAudioToggle: document.getElementById('btn-audio-toggle'),
        btnHudShop: document.getElementById('btn-hud-shop'),
        btnHudRegion: document.getElementById('btn-hud-region'),
        btnHudPause: document.getElementById('btn-hud-pause'),
        fpsCounter: document.getElementById('hud-fps'),

        // HUD - Orta Sağ
        questTracker: document.getElementById('quest-tracker'),
        questList: document.getElementById('quest-list'),
        interactPrompt: document.getElementById('interact-prompt'),
        interactPromptKey: document.getElementById('interact-key'),
        interactPromptText: document.getElementById('interact-text'),

        // HUD - Aşağı Mərkəz (Bacarıq Barı)
        skillComboPips: document.querySelectorAll('.combo-pip'),
        skillSlotLmb: document.getElementById('skill-slot-lmb'),
        skillSlotWeaponIcon: document.getElementById('skill-slot-weapon-icon'),
        skillSlotWeaponLabel: document.getElementById('skill-slot-weapon-label'),
        skillSlotQ: document.getElementById('skill-slot-q'),
        skillCooldownQ: document.getElementById('skill-cd-q'),
        skillSlotE: document.getElementById('skill-slot-e'),
        skillCooldownE: document.getElementById('skill-cd-e'),
        skillSlotSpace: document.getElementById('skill-slot-space'),
        skillCooldownSpace: document.getElementById('skill-cd-space'),
        skillSlotR: document.getElementById('skill-slot-r'),
        skillRageFill: document.getElementById('skill-rage-fill'),
        skillRageText: document.getElementById('skill-rage-text'),
        skillSlotC: document.getElementById('skill-slot-c'),
        skillSlotM: document.getElementById('skill-slot-m'),
        companionIcon: document.getElementById('companion-icon'),
        companionNameBadge: document.getElementById('companion-name-badge'),

        // HUD - Silah Seçim Paneli (1-4)
        weaponsHudPanel: document.getElementById('weapons-hud-panel'),
        weaponSlots: document.querySelectorAll('.weapon-slot'),

        // HUD - Canlı Stil Kombo Sayğacı (DMC/Hades Tipli)
        comboHud: document.getElementById('combo-hud'),
        comboRank: document.getElementById('combo-rank'),
        comboHits: document.getElementById('combo-hits'),
        comboMultiplier: document.getElementById('combo-multiplier'),
        comboTimerBar: document.getElementById('combo-timer-bar'),

        // HUD - Aktiv Reliktlər Siyahısı
        activeRelicsContainer: document.getElementById('hud-active-relics'),

        // 3-Kartlı Roguelike Relikt Seçim Modalı
        modalRelicDraft: document.getElementById('modal-relic-draft'),
        relicCardsContainer: document.getElementById('relic-cards-container'),

        // Ana Menyu Düymələri
        btnNewGame: document.getElementById('btn-new-game'),
        btnStartArena: document.getElementById('btn-start-arena') || document.getElementById('btn-arena-mode'),
        btnContinue: document.getElementById('btn-continue'),
        btnDailyBonus: document.getElementById('btn-daily-bonus'),
        btnMenuShop: document.getElementById('btn-menu-shop'),
        btnMenuControls: document.getElementById('btn-menu-controls'),

        // Dialoq Elementləri
        dialogueNpcName: document.getElementById('dialogue-npc-name'),
        dialogueNpcTitle: document.getElementById('dialogue-npc-title'),
        dialogueText: document.getElementById('dialogue-text'),
        btnDialogueNext: document.getElementById('btn-dialogue-next'),
        btnDialogueClose: document.getElementById('btn-dialogue-close'),

        // Mağaza Elementləri
        shopGold: document.getElementById('shop-gold-count'),
        shopCrystals: document.getElementById('shop-crystal-count'),
        tabUpgrades: document.getElementById('tab-btn-upgrades'),
        tabSkins: document.getElementById('tab-btn-skins'),
        tabAchievements: document.getElementById('tab-btn-achievements'),
        shopPaneUpgrades: document.getElementById('shop-pane-upgrades'),
        shopPaneSkins: document.getElementById('shop-pane-skins'),
        shopPaneAchievements: document.getElementById('shop-pane-achievements'),
        btnCloseShop: document.getElementById('btn-close-shop'),

        // Pauza Modalı
        btnResumeGame: document.getElementById('btn-resume-game'),
        btnPauseAudio: document.getElementById('btn-pause-audio'),
        btnPauseRegion: document.getElementById('btn-pause-region'),
        btnPauseShop: document.getElementById('btn-pause-shop'),
        btnPauseMainMenu: document.getElementById('btn-pause-main-menu'),

        // Game Over Modalı
        gameOverTitle: document.getElementById('gameover-title'),
        gameOverSubtitle: document.getElementById('gameover-subtitle'),
        gameOverStats: document.getElementById('gameover-stats'),
        btnGameOverRestart: document.getElementById('btn-gameover-restart'),
        btnGameOverMenu: document.getElementById('btn-gameover-menu'),

        // İdarəetmə Modalı
        btnCloseControls: document.getElementById('btn-close-controls'),

        // Bölgə Seçimi Modalı
        btnCloseRegion: document.getElementById('btn-close-region'),
        regionCards: document.querySelectorAll('.region-card'),

        // Touch Düymələri
        touchJoystickBase: document.getElementById('touch-joystick-base'),
        touchJoystickStick: document.getElementById('touch-joystick-stick'),
        btnTouchAttack: document.getElementById('btn-touch-attack'),
        btnTouchDash: document.getElementById('btn-touch-dash'),
        btnTouchSpell: document.getElementById('btn-touch-spell'),
        btnTouchNova: document.getElementById('btn-touch-nova'),
        btnTouchUlt: document.getElementById('btn-touch-ult'),
        btnTouchComp: document.getElementById('btn-touch-comp'),
        btnTouchInteract: document.getElementById('btn-touch-interact')
      };
    },

    /**
     * Bütün düymələri və klaviatura hadisələrini bağlayır
     */
    _bindEvents: function () {
      var self = this;

      // 1. Ana Menyu Düymələri
      if (this.dom.btnNewGame) {
        this.dom.btnNewGame.addEventListener('click', function () {
          self._playClickSound();
          self.hideMenu();
          if (self.callbacks.onStartNewGame) {
            self.callbacks.onStartNewGame();
          } else if (window.GameEngine && window.GameEngine.startNewGame) {
            window.GameEngine.startNewGame();
          }
        });
      }

      // 1.1 V2.0: Sonsuz Kolizey (Arena) Düyməsi
      if (this.dom.btnStartArena) {
        this.dom.btnStartArena.addEventListener('click', function () {
          self._playClickSound();
          self.hideMenu();
          if (self.callbacks.onStartArena) {
            self.callbacks.onStartArena();
          } else if (window.GameEngine && typeof window.GameEngine.startArenaGame === 'function') {
            window.GameEngine.startArenaGame();
          } else if (window.GameEvents && typeof window.GameEvents.startArenaMode === 'function' && window.GameEngine) {
            window.GameEvents.startArenaMode(window.GameEngine.worldState, self.callbacks);
          }
        });
      }

      // 1.2 V2.0: Silah Seçim Slotları (1-4)
      if (this.dom.weaponSlots && this.dom.weaponSlots.length > 0) {
        this.dom.weaponSlots.forEach(function (slotEl) {
          slotEl.addEventListener('click', function () {
            var slotNum = parseInt(slotEl.getAttribute('data-weapon-slot'), 10);
            var weaponId = slotEl.getAttribute('data-weapon-id');
            self._playClickSound();
            self.switchWeapon(slotNum || weaponId);
          });
        });
      }

      // 1.3 V2.0: Ultimate [R] və Yoldaş Ruhu [C] Düymələri
      if (this.dom.skillSlotR) {
        this.dom.skillSlotR.addEventListener('click', function () {
          self.triggerUltimate();
        });
      }

      if (this.dom.skillSlotC) {
        this.dom.skillSlotC.addEventListener('click', function () {
          self.cycleCompanion();
        });
      }

      if (this.dom.skillSlotM) {
        this.dom.skillSlotM.addEventListener('click', function () {
          self._playClickSound();
          if (window.GameMissions && typeof window.GameMissions.cycleOrStartBounty === 'function' && window.GameEngine) {
            window.GameMissions.cycleOrStartBounty(window.GameEngine.worldState);
          }
        });
      }

      if (this.dom.btnContinue) {
        this.dom.btnContinue.addEventListener('click', function () {
          self._playClickSound();
          self.hideMenu();
          if (self.callbacks.onContinueGame) {
            self.callbacks.onContinueGame();
          } else if (window.GameEngine && window.GameEngine.continueGame) {
            window.GameEngine.continueGame();
          }
        });
      }

      if (this.dom.btnDailyBonus) {
        this.dom.btnDailyBonus.addEventListener('click', function () {
          self._playClickSound();
          if (window.GameProgression && window.GameProgression.claimDailyBonus) {
            var bonus = window.GameProgression.claimDailyBonus();
            if (bonus && bonus.success) {
              if (window.GameAudio) window.GameAudio.playSFX('chest');
              self.showNotification(
                'GÜNDƏLİK MÜKAFAT ALINDI!',
                '+' + bonus.gold + ' Qızıl, +' + bonus.crystals + ' Astral Kristal qazandınız!',
                'bonus'
              );
              self.dom.btnDailyBonus.classList.add('claimed');
              self.dom.btnDailyBonus.setAttribute('disabled', 'true');
              self.dom.btnDailyBonus.querySelector('.btn-label').textContent = 'Mükafat Alındı ✓';
            } else {
              self.showNotification('MÜKAFAT ARTIQ ALINIB', 'Növbəti gün yenidən cəhd edin.', 'warning');
            }
          }
        });
      }

      if (this.dom.btnMenuShop) {
        this.dom.btnMenuShop.addEventListener('click', function () {
          self._playClickSound();
          self.toggleShopModal();
        });
      }

      if (this.dom.btnMenuControls) {
        this.dom.btnMenuControls.addEventListener('click', function () {
          self._playClickSound();
          self.toggleControlsModal(true);
        });
      }

      // 2. HUD Üst Düymələri
      if (this.dom.btnAudioToggle) {
        this.dom.btnAudioToggle.addEventListener('click', function () {
          self.toggleAudio();
        });
      }

      if (this.dom.btnHudShop) {
        this.dom.btnHudShop.addEventListener('click', function () {
          self._playClickSound();
          self.toggleShopModal();
        });
      }

      if (this.dom.btnHudRegion) {
        this.dom.btnHudRegion.addEventListener('click', function () {
          self._playClickSound();
          self.toggleRegionSelectModal(true);
        });
      }

      if (this.dom.btnHudPause) {
        this.dom.btnHudPause.addEventListener('click', function () {
          self._playClickSound();
          self.togglePauseModal(true);
          if (self.callbacks.onPauseGame) {
            self.callbacks.onPauseGame();
          } else if (window.GameEngine && window.GameEngine.pauseGame) {
            window.GameEngine.pauseGame();
          }
        });
      }

      // 3. Dialoq Pəncərəsi
      if (this.dom.btnDialogueNext) {
        this.dom.btnDialogueNext.addEventListener('click', function () {
          self._playClickSound();
          self._advanceDialogue();
        });
      }

      if (this.dom.btnDialogueClose) {
        this.dom.btnDialogueClose.addEventListener('click', function () {
          self._playClickSound();
          self._closeDialogue();
        });
      }

      // 4. Mağaza Tabları və Düymələri
      if (this.dom.btnCloseShop) {
        this.dom.btnCloseShop.addEventListener('click', function () {
          self._playClickSound();
          self.toggleShopModal(false);
        });
      }

      if (this.dom.tabUpgrades) {
        this.dom.tabUpgrades.addEventListener('click', function () {
          self._switchShopTab('upgrades');
        });
      }
      if (this.dom.tabSkins) {
        this.dom.tabSkins.addEventListener('click', function () {
          self._switchShopTab('skins');
        });
      }
      if (this.dom.tabAchievements) {
        this.dom.tabAchievements.addEventListener('click', function () {
          self._switchShopTab('achievements');
        });
      }

      // 5. Pauza Modalı Düymələri
      if (this.dom.btnResumeGame) {
        this.dom.btnResumeGame.addEventListener('click', function () {
          self._playClickSound();
          self.togglePauseModal(false);
          if (self.callbacks.onResumeGame) {
            self.callbacks.onResumeGame();
          } else if (window.GameEngine && window.GameEngine.resumeGame) {
            window.GameEngine.resumeGame();
          }
        });
      }

      if (this.dom.btnPauseAudio) {
        this.dom.btnPauseAudio.addEventListener('click', function () {
          self.toggleAudio();
        });
      }

      if (this.dom.btnPauseRegion) {
        this.dom.btnPauseRegion.addEventListener('click', function () {
          self._playClickSound();
          self.togglePauseModal(false);
          self.toggleRegionSelectModal(true);
        });
      }

      if (this.dom.btnPauseShop) {
        this.dom.btnPauseShop.addEventListener('click', function () {
          self._playClickSound();
          self.togglePauseModal(false);
          self.toggleShopModal(true);
        });
      }

      if (this.dom.btnPauseMainMenu) {
        this.dom.btnPauseMainMenu.addEventListener('click', function () {
          self._playClickSound();
          self.togglePauseModal(false);
          self.showMenu();
          if (self.callbacks.onBackToMenu) {
            self.callbacks.onBackToMenu();
          } else if (window.GameEngine) {
            window.GameEngine.state = 'MENU';
          }
        });
      }

      // 6. Qələbə / Məğlubiyyət Düymələri
      if (this.dom.btnGameOverRestart) {
        this.dom.btnGameOverRestart.addEventListener('click', function () {
          self._playClickSound();
          self.dom.modalGameOver.classList.add('hidden');
          if (self.callbacks.onRestart) {
            self.callbacks.onRestart();
          } else if (window.GameEngine && window.GameEngine.startNewGame) {
            window.GameEngine.startNewGame();
          }
        });
      }

      if (this.dom.btnGameOverMenu) {
        this.dom.btnGameOverMenu.addEventListener('click', function () {
          self._playClickSound();
          self.dom.modalGameOver.classList.add('hidden');
          self.showMenu();
          if (self.callbacks.onBackToMenu) {
            self.callbacks.onBackToMenu();
          } else if (window.GameEngine) {
            window.GameEngine.state = 'MENU';
          }
        });
      }

      // 7. İdarəetmə Modalı Bağla
      if (this.dom.btnCloseControls) {
        this.dom.btnCloseControls.addEventListener('click', function () {
          self._playClickSound();
          self.toggleControlsModal(false);
        });
      }

      // 8. Bölgə Seçimi Modalı
      if (this.dom.btnCloseRegion) {
        this.dom.btnCloseRegion.addEventListener('click', function () {
          self._playClickSound();
          self.toggleRegionSelectModal(false);
        });
      }

      if (this.dom.regionCards && this.dom.regionCards.length > 0) {
        this.dom.regionCards.forEach(function (card) {
          card.addEventListener('click', function () {
            var regionIdx = parseInt(card.getAttribute('data-region-index'), 10);
            self._playClickSound();
            self.toggleRegionSelectModal(false);
            if (self.callbacks.onChangeRegion) {
              self.callbacks.onChangeRegion(regionIdx);
            } else if (window.GameEngine && window.GameEngine.changeRegion) {
              window.GameEngine.changeRegion(regionIdx);
            }
          });
        });
      }

      // 8b. Panel exclusivity: J / T close the other open modal panels before the engine toggles its own
      window.addEventListener('keydown', function (e) {
        if (e.repeat || self.activeDialogue) return;
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.code === 'KeyJ') self.closeOtherPanels('daily');
        else if (e.code === 'KeyT') self.closeOtherPanels('talents');
      }, true);

      // 9. Klaviatura Qısayolları (Esc -> Pauza, B -> Mağaza, F -> Qarşılıqlı Əlaqə)
      window.addEventListener('keydown', function (e) {
        // Dialoq aktivdirsə Space və ya Enter ilə irəlilə
        if (self.activeDialogue && (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter')) {
          e.preventDefault();
          self._advanceDialogue();
          return;
        }

        if (e.code === 'Escape') {
          // Əgər açıq modal varsa, onu bağla, yoxdursa pauzanı aç/bağla
          if (self.dom.modalShop && !self.dom.modalShop.classList.contains('hidden')) {
            self.toggleShopModal(false);
          } else if (self.dom.modalControls && !self.dom.modalControls.classList.contains('hidden')) {
            self.toggleControlsModal(false);
          } else if (self.dom.modalRegionSelect && !self.dom.modalRegionSelect.classList.contains('hidden')) {
            self.toggleRegionSelectModal(false);
          } else if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            // GameEngine öz keydown dinləyicisində PLAYING/PAUSED zamanı Escape-i idarə edir
            if (!window.GameEngine || (window.GameEngine.state !== 'PLAYING' && window.GameEngine.state !== 'PAUSED')) {
              var isPauseHidden = self.dom.modalPause.classList.contains('hidden');
              self.togglePauseModal(isPauseHidden);
              if (isPauseHidden) {
                if (self.callbacks.onPauseGame) self.callbacks.onPauseGame();
                else if (window.GameEngine && window.GameEngine.pauseGame) window.GameEngine.pauseGame();
              } else {
                if (self.callbacks.onResumeGame) self.callbacks.onResumeGame();
                else if (window.GameEngine && window.GameEngine.resumeGame) window.GameEngine.resumeGame();
              }
            }
          }
        } else if (e.code === 'KeyB') {
          if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            // GameEngine PLAYING rejimində KeyB-ni artıq çağırır; ikiqat açılıb-bağlanmanın qarşısını al
            if (!window.GameEngine || window.GameEngine.state !== 'PLAYING') {
              self.toggleShopModal();
            }
          }
        } else if (e.code === 'Digit1') {
          if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            self.switchWeapon(1);
          }
        } else if (e.code === 'Digit2') {
          if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            self.switchWeapon(2);
          }
        } else if (e.code === 'Digit3') {
          if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            self.switchWeapon(3);
          }
        } else if (e.code === 'Digit4') {
          if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            self.switchWeapon(4);
          }
        } else if (e.code === 'KeyR') {
          if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            self.triggerUltimate();
          }
        } else if (e.code === 'KeyC') {
          if (self.dom.gameHud && !self.dom.gameHud.classList.contains('hidden')) {
            self.cycleCompanion();
          }
        }
      });
    },

    /**
     * Minimap canvas-ı hazır vəziyyətə gətirir
     */
    _initMinimap: function () {
      if (this.dom.minimapCanvas) {
        this.minimapCtx = this.dom.minimapCanvas.getContext('2d');
      }
    },

    /**
     * Mobil sensor və joystik idarəetməsini qurur
     */
    _initTouchControls: function () {
      var self = this;
      var base = this.dom.touchJoystickBase;
      var stick = this.dom.touchJoystickStick;

      if (!base || !stick) return;

      var touchId = null;
      var baseRect = null;
      var maxRadius = 45;

      base.addEventListener(
        'touchstart',
        function (e) {
          e.preventDefault();
          var touch = e.changedTouches[0];
          touchId = touch.identifier;
          baseRect = base.getBoundingClientRect();
          handleMove(touch.clientX, touch.clientY);
        },
        { passive: false }
      );

      window.addEventListener(
        'touchmove',
        function (e) {
          if (touchId === null) return;
          for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
              handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
              break;
            }
          }
        },
        { passive: false }
      );

      var endJoystick = function (e) {
        if (touchId === null) return;
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            touchId = null;
            stick.style.transform = 'translate(-50%, -50%)';
            if (self.callbacks.onJoystickMove) {
              self.callbacks.onJoystickMove(0, 0, false);
            }
            if (window.GameEngine) {
              if (window.GameEngine.handleVirtualJoystick) {
                window.GameEngine.handleVirtualJoystick(0, 0, false);
              }
              if (window.GameEngine.setJoystickInput) {
                window.GameEngine.setJoystickInput(0, 0);
              }
            }
            break;
          }
        }
      };

      window.addEventListener('touchend', endJoystick);
      window.addEventListener('touchcancel', endJoystick);

      function handleMove(clientX, clientY) {
        if (!baseRect) return;
        var centerX = baseRect.left + baseRect.width / 2;
        var centerY = baseRect.top + baseRect.height / 2;
        var dx = clientX - centerX;
        var dy = clientY - centerY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        stick.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';

        var normX = dx / maxRadius;
        var normY = dy / maxRadius;

        if (self.callbacks.onJoystickMove) {
          self.callbacks.onJoystickMove(normX, normY, true);
        }
        if (window.GameEngine) {
          if (window.GameEngine.handleVirtualJoystick) {
            window.GameEngine.handleVirtualJoystick(normX, normY, true);
          }
          if (window.GameEngine.setJoystickInput) {
            window.GameEngine.setJoystickInput(normX, normY);
          }
        }
      }

      // Sensor aksiyon düymələri
      var bindTouchBtn = function (el, actionKey) {
        if (!el) return;
        var engineActionKey = actionKey === 'nova' ? 'aoe' : actionKey;
        el.addEventListener(
          'touchstart',
          function (e) {
            e.preventDefault();
            el.classList.add('active');
            if (self.callbacks.onTouchAction) {
              self.callbacks.onTouchAction(actionKey, true);
            }
            if (actionKey === 'ult') {
              self.triggerUltimate();
            } else if (actionKey === 'comp') {
              self.cycleCompanion();
            }
            if (window.GameEngine) {
              if (window.GameEngine.handleVirtualButton) {
                window.GameEngine.handleVirtualButton(actionKey, true);
              }
              if (window.GameEngine.triggerAction) {
                window.GameEngine.triggerAction(engineActionKey);
              }
            }
          },
          { passive: false }
        );

        el.addEventListener('touchend', function (e) {
          e.preventDefault();
          el.classList.remove('active');
          if (self.callbacks.onTouchAction) {
            self.callbacks.onTouchAction(actionKey, false);
          }
          if (window.GameEngine && window.GameEngine.handleVirtualButton) {
            window.GameEngine.handleVirtualButton(actionKey, false);
          }
        });
      };

      bindTouchBtn(this.dom.btnTouchAttack, 'attack');
      bindTouchBtn(this.dom.btnTouchDash, 'dash');
      bindTouchBtn(this.dom.btnTouchSpell, 'spell');
      bindTouchBtn(this.dom.btnTouchNova, 'nova');
      bindTouchBtn(this.dom.btnTouchUlt, 'ult');
      bindTouchBtn(this.dom.btnTouchComp, 'comp');
      bindTouchBtn(this.dom.btnTouchInteract, 'interact');
    },

    /**
     * Səs düyməsi kliklənməsi
     */
    toggleAudio: function () {
      this._playClickSound();
      if (window.GameAudio && window.GameAudio.toggleMute) {
        window.GameAudio.toggleMute();
      }
      this.updateAudioButtonState();
    },

    updateAudioButtonState: function () {
      var isMuted = window.GameAudio ? window.GameAudio.isMuted : false;
      var iconHtml = isMuted
        ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';

      if (this.dom.btnAudioToggle) {
        this.dom.btnAudioToggle.innerHTML = iconHtml;
        this.dom.btnAudioToggle.title = isMuted ? 'Səsi Aç' : 'Səsi Bağla';
      }
      if (this.dom.btnPauseAudio) {
        this.dom.btnPauseAudio.innerHTML = (isMuted ? '🔇 Səsi Aç' : '🔊 Səsi Bağla');
      }
    },

    _playClickSound: function () {
      if (window.GameAudio && window.GameAudio.playSFX) {
        window.GameAudio.playSFX('click');
      }
    },

    /**
     * Ana Menyu görünüşü
     */
    showMenu: function () {
      if (this.dom.mainMenu) this.dom.mainMenu.classList.remove('hidden');
      if (this.dom.gameHud) this.dom.gameHud.classList.add('hidden');
      if (this.dom.modalPause) this.dom.modalPause.classList.add('hidden');
      if (this.dom.modalGameOver) this.dom.modalGameOver.classList.add('hidden');
      if (this.dom.modalRelicDraft) this.dom.modalRelicDraft.classList.add('hidden');
      if (window.GameAudio && window.GameAudio.playBGM) {
        window.GameAudio.playBGM('menu');
      }
    },

    hideMenu: function () {
      if (this.dom.mainMenu) this.dom.mainMenu.classList.add('hidden');
      if (this.dom.gameHud) this.dom.gameHud.classList.remove('hidden');
    },

    /**
     * Pauza Modalı
     */
    togglePauseModal: function (forceState) {
      if (!this.dom.modalPause) return;
      var show = forceState !== undefined ? forceState : this.dom.modalPause.classList.contains('hidden');
      if (show) {
        this.dom.modalPause.classList.remove('hidden');
      } else {
        this.dom.modalPause.classList.add('hidden');
      }
    },

    /**
     * İdarəetmə Bələdçisi Modalı
     */
    toggleControlsModal: function (forceState) {
      if (!this.dom.modalControls) return;
      var show = forceState !== undefined ? forceState : this.dom.modalControls.classList.contains('hidden');
      if (show) {
        this.dom.modalControls.classList.remove('hidden');
      } else {
        this.dom.modalControls.classList.add('hidden');
      }
    },

    /**
     * Bölgə Seçimi Modalı
     */
    toggleRegionSelectModal: function (forceState) {
      if (!this.dom.modalRegionSelect) return;
      var show = forceState !== undefined ? forceState : this.dom.modalRegionSelect.classList.contains('hidden');
      if (show) {
        this.dom.modalRegionSelect.classList.remove('hidden');
      } else {
        this.dom.modalRegionSelect.classList.add('hidden');
      }
    },

    /**
     * Mağaza və Təkmilləşdirmələr Modalı
     */
    // Modal panel manager: only one modal panel (shop B, talents T, daily trials J) at a time.
    _isShopOpen: function () {
      return !!(this.dom.modalShop && !this.dom.modalShop.classList.contains('hidden'));
    },
    _isTalentsOpen: function () {
      return !!(window.GameTalents && typeof window.GameTalents.isBlockingInput === 'function' && window.GameTalents.isBlockingInput());
    },
    _isDailyOpen: function () {
      if (!window.GameDaily || typeof window.GameDaily.getSummary !== 'function') return false;
      var sum = window.GameDaily.getSummary();
      return !!(sum && sum.isPanelOpen);
    },
    // Close every modal panel except `keep` ('shop' | 'talents' | 'daily' | undefined)
    closeOtherPanels: function (keep) {
      if (keep !== 'shop' && this._isShopOpen()) this.dom.modalShop.classList.add('hidden');
      if (keep !== 'talents' && this._isTalentsOpen()) window.GameTalents.closeModal();
      if (keep !== 'daily' && this._isDailyOpen() && typeof window.GameDaily.togglePanel === 'function') {
        window.GameDaily.togglePanel();
      }
    },
    // Hide HUD trackers while any modal panel is open (cheap, throttled, dirty-checked)
    _syncPanelState: function (nowMs) {
      if (nowMs - this._lastPanelSync < 120) return;
      this._lastPanelSync = nowMs;
      var open = this._isShopOpen() || this._isTalentsOpen() || this._isDailyOpen();
      setCls(this.dom.gameHud, 'panel-open', open);
    },

    toggleShopModal: function (forceState) {
      if (!this.dom.modalShop) return;
      var now = Date.now();
      if (forceState === undefined && now - this._lastShopToggleTime < 60) {
        return;
      }
      this._lastShopToggleTime = now;

      var show = forceState !== undefined ? forceState : this.dom.modalShop.classList.contains('hidden');
      if (show) {
        this.closeOtherPanels('shop');
        this.renderShopContent();
        this.dom.modalShop.classList.remove('hidden');
      } else {
        this.dom.modalShop.classList.add('hidden');
      }
    },

    _switchShopTab: function (tabName) {
      this.currentShopTab = tabName;
      this._playClickSound();

      if (this.dom.tabUpgrades) this.dom.tabUpgrades.classList.toggle('active', tabName === 'upgrades');
      if (this.dom.tabSkins) this.dom.tabSkins.classList.toggle('active', tabName === 'skins');
      if (this.dom.tabAchievements) this.dom.tabAchievements.classList.toggle('active', tabName === 'achievements');

      if (this.dom.shopPaneUpgrades) this.dom.shopPaneUpgrades.classList.toggle('hidden', tabName !== 'upgrades');
      if (this.dom.shopPaneSkins) this.dom.shopPaneSkins.classList.toggle('hidden', tabName !== 'skins');
      if (this.dom.shopPaneAchievements) this.dom.shopPaneAchievements.classList.toggle('hidden', tabName !== 'achievements');

      this.renderShopContent();
    },

    /**
     * Mağaza məzmununu GameProgression məlumatları ilə yeniləyir
     */
    renderShopContent: function () {
      var prog = window.GameProgression;
      if (!prog || !prog.state) return;

      var state = prog.state;

      // Resurslar
      if (this.dom.shopGold) this.dom.shopGold.textContent = state.gold || 0;
      if (this.dom.shopCrystals) this.dom.shopCrystals.textContent = state.crystals || 0;

      var self = this;

      // 1. TƏKMİLLƏŞDİRMƏLƏR (Upgrades)
      if (this.currentShopTab === 'upgrades' && this.dom.shopPaneUpgrades) {
        var upgradeKeys = [
          { key: 'damage', name: 'Qılınc Gücü', desc: 'Əsas yaxın zərbə və kombo zərəri', icon: '⚔' },
          { key: 'spellPower', name: 'Sehr Qüvvəti', desc: 'Arcane Mərmi və İldırım Novası zərəri', icon: '✨' },
          { key: 'maxHp', name: 'Maksimum Can', desc: 'Qəhrəmanın ümumi dözümlülüyü', icon: '❤️' },
          { key: 'speed', name: 'Çeviklik & Sürət', desc: 'Hərəkət sürəti və manevr qabiliyyəti', icon: '⚡' }
        ];

        var html = '<div class="shop-grid">';
        upgradeKeys.forEach(function (item) {
          var currentLvl = (state.upgrades && state.upgrades[item.key]) || 0;
          var cost = prog.getUpgradeCost ? prog.getUpgradeCost(item.key) : (currentLvl + 1) * 50;
          var isMax = !Number.isFinite(cost);
          var canAfford = !isMax && state.gold >= cost;

          html += `
            <div class="shop-card glass-panel">
              <div class="shop-card-header">
                <span class="card-icon">${escapeHtml(item.icon)}</span>
                <div class="card-titles">
                  <h4>${escapeHtml(item.name)}</h4>
                  <span class="card-level">Səviyyə ${escapeHtml(currentLvl)}</span>
                </div>
              </div>
              <p class="card-desc">${escapeHtml(item.desc)}</p>
              <div class="card-footer">
                <div class="card-cost">
                  <span class="gold-icon">🪙</span>
                  <span>${isMax ? 'MAKSİMUM' : escapeHtml(cost) + ' Qızıl'}</span>
                </div>
                <button class="action-btn gold-btn btn-buy-upgrade ${canAfford ? '' : 'disabled'}" data-upgrade="${escapeHtml(item.key)}" ${canAfford ? '' : 'disabled'}>
                  ${isMax ? 'Maksimum' : 'Təkmilləşdir'}
                </button>
              </div>
            </div>
          `;
        });
        html += '</div>';
        this.dom.shopPaneUpgrades.innerHTML = html;

        // Düymələri bağla
        var buyButtons = this.dom.shopPaneUpgrades.querySelectorAll('.btn-buy-upgrade');
        buyButtons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var key = btn.getAttribute('data-upgrade');
            var res = prog.buyUpgrade ? prog.buyUpgrade(key) : false;
            var ok = res && typeof res === 'object' ? res.success === true : Boolean(res);
            if (ok) {
              if (window.GameAudio) window.GameAudio.playSFX('levelUp');
              if (self.callbacks.onBuyUpgrade) self.callbacks.onBuyUpgrade(key);
              if (window.GameEngine && window.GameEngine.syncProgressionStats) {
                window.GameEngine.syncProgressionStats();
              }
              self.showNotification('TƏKMİLLƏŞDİRİLDİ!', itemTitle(key) + ' uğurla artırıldı.', 'success');
              self.renderShopContent();
            } else {
              var failMsg =
                res && (res.reason === 'max_level' || res.reason === 'Maksimum səviyyəyə çatılıb.')
                  ? 'Bu bacarıq artıq maksimum səviyyədədir.'
                  : 'Düşmənləri məğlub edərək qızıl toplayın.';
              self.showNotification('KİFAYƏT QƏDƏR QIZIL YOXDUR!', failMsg, 'warning');
            }
          });
        });

        function itemTitle(k) {
          for (var i = 0; i < upgradeKeys.length; i++) {
            if (upgradeKeys[i].key === k) return upgradeKeys[i].name;
          }
          return 'Bacarıq';
        }
      }

      // 2. QƏHRƏMAN SKİNLƏRİ (Skins)
      if (this.currentShopTab === 'skins' && this.dom.shopPaneSkins) {
        var skins = prog.getSkins ? prog.getSkins() : [
          { id: 'default', name: 'Aetheria Qoruyucusu', cost: 0, color: '#f5c542', desc: 'Klassik qızılı-polad zireh' },
          { id: 'crimson_flame', name: 'Qırmızı Alov Cəngavəri', cost: 10, color: '#ef4444', desc: 'Alovlu döyüş zirehi (+%10 Kritik)' },
          { id: 'astral_void', name: 'Astral Boşluq Sehrbazı', cost: 20, color: '#8b5cf6', desc: 'Qədim kosmik enerji xələti' },
          { id: 'golden_paladin', name: 'Müqəddəs Günəş Paladini', cost: 35, color: '#ffd700', desc: 'Şərəf və işığın ali simvolu' }
        ];

        var unlockedSkins = state.unlockedSkins || ['default'];
        var activeSkin = state.activeSkin || 'default';

        var sHtml = '<div class="shop-grid">';
        skins.forEach(function (skin) {
          var isUnlocked = unlockedSkins.indexOf(skin.id) !== -1;
          var isActive = activeSkin === skin.id;
          var costCrystals = typeof skin.costCrystals === 'number' ? skin.costCrystals : (skin.cost || 0);
          var costGold = typeof skin.costGold === 'number' ? skin.costGold : 0;
          var canBuy = state.crystals >= costCrystals && state.gold >= costGold;
          var safeColor = sanitizeColor(skin.color || skin.primaryColor);
          var skinDesc = skin.desc || skin.description || '';

          var costParts = [];
          if (costGold > 0) costParts.push(costGold + ' Qızıl');
          if (costCrystals > 0) costParts.push(costCrystals + ' Kristal');
          var costLabel = costParts.length > 0 ? costParts.join(' + ') : 'Pulsuz';
          var buyBtnLabel = costCrystals > 0 && costGold > 0
            ? '🪙 ' + escapeHtml(costGold) + ' + 💎 ' + escapeHtml(costCrystals) + ' Al'
            : (costCrystals > 0 ? '💎 ' + escapeHtml(costCrystals) + ' Al' : '🪙 ' + escapeHtml(costGold) + ' Al');

          sHtml += `
            <div class="shop-card glass-panel ${isActive ? 'active-skin-card' : ''}">
              <div class="skin-preview-swatch" style="background: radial-gradient(circle, ${safeColor} 30%, #151324 85%); border-color: ${safeColor}">
                <div class="skin-swatch-glow" style="box-shadow: 0 0 25px ${safeColor}"></div>
              </div>
              <div class="shop-card-header">
                <div class="card-titles">
                  <h4>${escapeHtml(skin.name)}</h4>
                  <span class="card-level">${isActive ? '✦ İSTİFADƏDƏDİR' : (isUnlocked ? '✓ Açılıb' : escapeHtml(costLabel))}</span>
                </div>
              </div>
              <p class="card-desc">${escapeHtml(skinDesc)}</p>
              <div class="card-footer">
                ${isActive
                  ? '<button class="action-btn disabled" disabled>Seçilib</button>'
                  : (isUnlocked
                    ? `<button class="action-btn gold-btn btn-equip-skin" data-skin="${escapeHtml(skin.id)}">Təchiz Et</button>`
                    : `<button class="action-btn crystal-btn btn-buy-skin ${canBuy ? '' : 'disabled'}" data-skin="${escapeHtml(skin.id)}" ${canBuy ? '' : 'disabled'}>${buyBtnLabel}</button>`
                  )
                }
              </div>
            </div>
          `;
        });
        sHtml += '</div>';
        this.dom.shopPaneSkins.innerHTML = sHtml;

        var syncEquippedSkin = function (sId) {
          if (self.callbacks.onEquipSkin) self.callbacks.onEquipSkin(sId);
          if (window.GameEngine) {
            if (window.GameEngine.player) window.GameEngine.player.skin = sId;
            if (window.GameEngine.syncProgressionStats) window.GameEngine.syncProgressionStats();
          }
        };

        // Skin Düymələrini bağla
        var equipBtns = this.dom.shopPaneSkins.querySelectorAll('.btn-equip-skin');
        equipBtns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var sId = btn.getAttribute('data-skin');
            var res = prog.buyOrEquipSkin ? prog.buyOrEquipSkin(sId) : false;
            var ok = res && typeof res === 'object' ? res.success === true : Boolean(res);
            if (ok) {
              if (window.GameAudio) window.GameAudio.playSFX('spell');
              syncEquippedSkin(sId);
              self.showNotification('ZİREH TƏCHİZ EDİLDİ', 'Yeni görünüşünüz aktivdir.', 'success');
              self.renderShopContent();
            }
          });
        });

        var buySkinBtns = this.dom.shopPaneSkins.querySelectorAll('.btn-buy-skin');
        buySkinBtns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var sId = btn.getAttribute('data-skin');
            var res = prog.buyOrEquipSkin ? prog.buyOrEquipSkin(sId) : false;
            var ok = res && typeof res === 'object' ? res.success === true : Boolean(res);
            if (ok) {
              if (window.GameAudio) window.GameAudio.playSFX('chest');
              syncEquippedSkin(sId);
              self.showNotification('YENİ ZİREH AÇILDI!', 'Qəhrəmanınız daha güclü görünür.', 'bonus');
              self.renderShopContent();
            } else {
              var errReason = (res && res.reason) ? res.reason : 'Bossları məğlub edərək Qızıl və Astral Kristal toplayın.';
              self.showNotification('RESURS ÇATIŞMIR!', errReason, 'warning');
            }
          });
        });
      }

      // 3. NAİLİYYƏTLƏR (Achievements)
      if (this.currentShopTab === 'achievements' && this.dom.shopPaneAchievements) {
        var achList = prog.getAchievementsList
          ? prog.getAchievementsList()
          : [
              { id: 'first_blood', title: 'İlk Zərbə', desc: 'İlk kölgə bədheybətini məğlub et', reward: '100 Qızıl' },
              { id: 'treasure_hunter', title: 'Xəzinə Ovçusu', desc: '5 qədim sandığı tap və aç', reward: '250 Qızıl' },
              { id: 'boss_hunter', title: 'Boss Ovçusu', desc: 'İlk dəfə Bölgə Bossunu məğlub et', reward: '300 Qızıl + 3 Kristal' },
              { id: 'all_bosses', title: 'Aetheria Xilaskarı', desc: 'Bütün 3 Bölgə Bossunu məğlub et', reward: '1000 Qızıl + 10 Kristal' }
            ];

        var aHtml = '<div class="achievements-list">';
        achList.forEach(function (ach) {
          var isDone = Boolean(ach.unlocked || (state.achievements && state.achievements[ach.id]));
          var achDesc = ach.description || ach.desc || '';
          var rewardStr = ach.reward || '';
          if (!rewardStr) {
            var rParts = [];
            if (ach.rewardGold) rParts.push(ach.rewardGold + ' Qızıl');
            if (ach.rewardCrystals) rParts.push(ach.rewardCrystals + ' Kristal');
            rewardStr = rParts.join(' + ') || 'Şərəf';
          }

          aHtml += `
            <div class="achievement-item glass-panel ${isDone ? 'completed' : 'locked'}">
              <div class="ach-icon">${isDone ? '🏆' : '🔒'}</div>
              <div class="ach-details">
                <div class="ach-title">${escapeHtml(ach.title)} ${isDone ? '<span class="ach-check">✓ Tamamlandı</span>' : ''}</div>
                <div class="ach-desc">${escapeHtml(achDesc)}</div>
              </div>
              <div class="ach-reward">Mükafat: <strong>${escapeHtml(rewardStr)}</strong></div>
            </div>
          `;
        });
        aHtml += '</div>';
        this.dom.shopPaneAchievements.innerHTML = aHtml;
      }
    },

    /**
     * NPC Dialoq Pəncərəsi
     * @param {string} npcName
     * @param {string} npcTitle
     * @param {Array|string} messages
     * @param {Function} onComplete
     */
    showDialogue: function (npcName, npcTitle, messages, onComplete) {
      var msgArray = Array.isArray(messages) ? messages : [messages];
      this.activeDialogue = {
        name: npcName || 'Müqəddəs Ruh',
        title: npcTitle || 'Qədim Yolçu',
        messages: msgArray,
        index: 0,
        onComplete: onComplete
      };

      if (this.dom.dialogueNpcName) this.dom.dialogueNpcName.textContent = this.activeDialogue.name;
      if (this.dom.dialogueNpcTitle) this.dom.dialogueNpcTitle.textContent = this.activeDialogue.title;
      this._renderDialogueStep();

      if (this.dom.modalDialogue) {
        this.dom.modalDialogue.classList.remove('hidden');
      }
      if (window.GameAudio) window.GameAudio.playSFX('spell');
    },

    _renderDialogueStep: function () {
      if (!this.activeDialogue) return;
      var currentMsg = this.activeDialogue.messages[this.activeDialogue.index] || '';
      if (this.dom.dialogueText) {
        this.dom.dialogueText.textContent = currentMsg;
      }

      var isLast = this.activeDialogue.index >= this.activeDialogue.messages.length - 1;
      if (this.dom.btnDialogueNext) {
        this.dom.btnDialogueNext.textContent = isLast ? 'Tamamla [F]' : 'Növbəti [F] ➔';
      }
    },

    _advanceDialogue: function () {
      if (!this.activeDialogue) return;
      this.activeDialogue.index++;
      if (this.activeDialogue.index >= this.activeDialogue.messages.length) {
        this._closeDialogue();
      } else {
        this._renderDialogueStep();
      }
    },

    _closeDialogue: function () {
      if (this.dom.modalDialogue) {
        this.dom.modalDialogue.classList.add('hidden');
      }
      if (this.activeDialogue && typeof this.activeDialogue.onComplete === 'function') {
        this.activeDialogue.onComplete();
      }
      this.activeDialogue = null;
    },

    /**
     * Yuxarı Epik Bildiriş Banneri
     */
    showNotification: function (title, subtitle, type) {
      var banner = this.dom.notificationBanner;
      if (!banner) return;

      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      if (this.dom.notifTitle) this.dom.notifTitle.textContent = title;
      if (this.dom.notifSubtitle) this.dom.notifSubtitle.textContent = subtitle || '';

      banner.className = 'notification-banner active type-' + (type || 'default');

      this.notificationTimeout = setTimeout(function () {
        banner.className = 'notification-banner hidden';
      }, 3800);
    },

    /**
     * Qələbə / Məğlubiyyət Pəncərəsi
     */
    showGameOver: function (isVictory, stats) {
      if (!this.dom.modalGameOver) return;

      stats = stats || {};
      var kills = stats.kills || 0;
      var goldEarned = stats.gold || 0;
      var regionTitle = stats.regionName || 'Aetheria Səltənəti';

      if (isVictory) {
        if (this.dom.gameOverTitle) {
          this.dom.gameOverTitle.textContent = 'QƏLƏBƏ! ƏBƏDİ İŞIQ BƏRPA OLUNDU';
          this.dom.gameOverTitle.className = 'gameover-title victory-text';
        }
        if (this.dom.gameOverSubtitle) {
          this.dom.gameOverSubtitle.textContent = 'Bütün kölgə hökmranları məğlub edildi və qədim torpaqlara dinclik gəldi!';
        }
        if (window.GameAudio) window.GameAudio.playSFX('levelUp');
      } else {
        if (this.dom.gameOverTitle) {
          this.dom.gameOverTitle.textContent = 'KÖLGƏLƏR SƏNİ UDDU...';
          this.dom.gameOverTitle.className = 'gameover-title defeat-text';
        }
        if (this.dom.gameOverSubtitle) {
          this.dom.gameOverSubtitle.textContent = 'Ruhun qədim obelisklərin yanında yenidən oyanmaq üçün güc toplayır.';
        }
        if (window.GameAudio) window.GameAudio.playSFX('playerHurt');
      }

      if (this.dom.gameOverStats) {
        var safeKills = Number.isFinite(Number(kills)) ? Math.max(0, Math.floor(Number(kills))) : 0;
        var safeGold = Number.isFinite(Number(goldEarned)) ? Math.max(0, Math.floor(Number(goldEarned))) : 0;
        this.dom.gameOverStats.innerHTML = `
          <div class="stat-row"><span>Bölgə:</span> <strong>${escapeHtml(regionTitle)}</strong></div>
          <div class="stat-row"><span>Məhv Edilən Bədheybətlər:</span> <strong>${escapeHtml(safeKills)}</strong></div>
          <div class="stat-row"><span>Toplanan Xəzinə:</span> <strong>${escapeHtml(safeGold)} Qızıl</strong></div>
        `;
      }

      this.dom.modalGameOver.classList.remove('hidden');
    },

    /**
     * Hər Frame Canlı Oyun HUD-unu yeniləyir
     */
    updateHUD: function (player, worldState, progressionState, fps) {
      if (!player) return;
      worldState = worldState || {};
      this._syncPanelState(Date.now());
      progressionState = progressionState || (window.GameProgression ? window.GameProgression.state : null);

      // 1. Can (HP)
      var maxHp = Math.max(1, Number(player.maxHp) || 100);
      var curHp = Math.max(0, Number(player.hp) || 0);
      var hpPct = Math.min(100, Math.max(0, (curHp / maxHp) * 100));

      if (this.dom.hpFill) setStyle(this.dom.hpFill, 'width', hpPct + '%');
      if (this.dom.hpText) setText(this.dom.hpText, Math.ceil(curHp) + ' / ' + maxHp);

      if (this.dom.hpContainer) {
        if (hpPct < 25) {
          setCls(this.dom.hpContainer, 'low-hp-pulsing', true);
        } else {
          setCls(this.dom.hpContainer, 'low-hp-pulsing', false);
        }
      }

      // 2. Mana (MP)
      var maxMp = Math.max(1, Number(player.maxMana) || 100);
      var curMp = Math.max(0, Number(player.mana) || 0);
      var mpPct = Math.min(100, Math.max(0, (curMp / maxMp) * 100));

      if (this.dom.mpFill) setStyle(this.dom.mpFill, 'width', mpPct + '%');
      if (this.dom.mpText) setText(this.dom.mpText, Math.ceil(curMp) + ' / ' + maxMp);

      // 3. XP və Level
      if (progressionState) {
        var xp = Math.max(0, Number(progressionState.xp) || 0);
        var xpNext = Math.max(1, Number(progressionState.xpToNext) || 100);
        var xpPct = Math.min(100, Math.max(0, (xp / xpNext) * 100));

        if (this.dom.xpFill) setStyle(this.dom.xpFill, 'width', xpPct + '%');
        if (this.dom.xpText) setText(this.dom.xpText, 'XP: ' + xp + ' / ' + xpNext);
        if (this.dom.playerLevel) setText(this.dom.playerLevel, 'LVL ' + (progressionState.level || 1));
        if (this.dom.goldCount) setText(this.dom.goldCount, progressionState.gold || 0);
        if (this.dom.crystalCount) setText(this.dom.crystalCount, progressionState.crystals || 0);
      }

      // 4. Region Adı
      if (worldState.region && worldState.region.name && this.dom.regionName) {
        setText(this.dom.regionName, worldState.region.name);
      }

      // 5. FPS
      if (this.dom.fpsCounter && fps !== undefined) {
        setText(this.dom.fpsCounter, Math.round(fps) + ' FPS');
      }

      // 6. Action Bar Cooldownları və Kombo
      this._updateActionBar(player);

      // 6.1 V2.0: Silah Seçim Paneli
      this._updateWeaponsHUD(player);

      // 6.2 V2.0: Ultimate [R] Qəzəb və Yoldaş [C]
      this._updateUltimateAndCompanion(player);

      // 6.3 V2.0: Canlı Stil Kombo Sayğacı (DMC/Hades Tipli)
      this._updateComboHUD(player, worldState);

      // 6.4 V2.0: Aktiv Reliktlər Siyahısı (Mini Nişanlar)
      this._updateActiveRelicsHUD(player);

      // 7. Boss HUD
      this._updateBossHUD(worldState.boss);

      // 8. Quest Tracker
      this._updateQuests(worldState.region ? worldState.region.quests : null);

      // 9. Qarşılıqlı Əlaqə İpucu (F Prompt)
      this._updateInteractPrompt(player, worldState);

      // 10. Minimap Radar
      this._renderMinimap(player, worldState);
    },

    _updateActionBar: function (player) {
      // Combo Pips (LMB / J)
      var step = player.comboStep || 0;
      if (this.dom.skillComboPips && this.dom.skillComboPips.length >= 3) {
        setCls(this.dom.skillComboPips[0], 'active', step >= 1);
        setCls(this.dom.skillComboPips[1], 'active', step >= 2);
        setCls(this.dom.skillComboPips[2], 'active', step >= 3);
      }

      // Spell Q Cooldown
      if (this.dom.skillCooldownQ) {
        var spellCd = player.spellCooldown || 0;
        var maxSpellCd = 0.8;
        if (spellCd > 0.05) {
          var sPct = Math.min(100, (spellCd / maxSpellCd) * 100);
          setStyle(this.dom.skillCooldownQ, 'height', sPct + '%');
          setText(this.dom.skillCooldownQ, spellCd.toFixed(1) + 's');
          setCls(this.dom.skillCooldownQ, 'hidden', false);
        } else {
          setCls(this.dom.skillCooldownQ, 'hidden', true);
        }
      }

      // Nova E Cooldown
      if (this.dom.skillCooldownE) {
        var aoeCd = player.aoeCooldown || 0;
        var maxAoeCd = 4.0;
        if (aoeCd > 0.05) {
          var aPct = Math.min(100, (aoeCd / maxAoeCd) * 100);
          setStyle(this.dom.skillCooldownE, 'height', aPct + '%');
          setText(this.dom.skillCooldownE, aoeCd.toFixed(1) + 's');
          setCls(this.dom.skillCooldownE, 'hidden', false);
        } else {
          setCls(this.dom.skillCooldownE, 'hidden', true);
        }
      }

      // Dash Space Cooldown
      if (this.dom.skillCooldownSpace) {
        var dashCd = player.dashCooldown || 0;
        var maxDashCd = 1.2;
        if (dashCd > 0.05) {
          var dPct = Math.min(100, (dashCd / maxDashCd) * 100);
          setStyle(this.dom.skillCooldownSpace, 'height', dPct + '%');
          setText(this.dom.skillCooldownSpace, dashCd.toFixed(1) + 's');
          setCls(this.dom.skillCooldownSpace, 'hidden', false);
        } else {
          setCls(this.dom.skillCooldownSpace, 'hidden', true);
        }
      }
    },

    _updateBossHUD: function (boss) {
      if (!this.dom.bossHud) return;

      if (boss && boss.hp > 0 && boss.isBoss) {
        setCls(this.dom.bossHud, 'hidden', false);
        if (this.dom.bossName) setText(this.dom.bossName, boss.name || 'Epik Lord');
        if (this.dom.bossTitle) setText(this.dom.bossTitle, boss.title || 'Kölgələrin Qədim Hakimi');
        if (this.dom.bossPhase) {
          setText(this.dom.bossPhase, 'FAZA ' + (boss.phase || 1) + ' / ' + (boss.maxPhases || 3));
        }

        var bMaxHp = boss.maxHp || 1000;
        var bCurHp = Math.max(0, boss.hp);
        var bPct = Math.min(100, Math.max(0, (bCurHp / bMaxHp) * 100));

        if (this.dom.bossHpFill) setStyle(this.dom.bossHpFill, 'width', bPct + '%');
        if (this.dom.bossHpGhost) {
          // Yumşaq arxadan gələn can
          setStyle(this.dom.bossHpGhost, 'width', bPct + '%');
        }
        if (this.dom.bossHpText) {
          setText(this.dom.bossHpText, Math.ceil(bCurHp) + ' / ' + bMaxHp);
        }
      } else {
        setCls(this.dom.bossHud, 'hidden', true);
      }
    },

    _updateQuests: function (quests) {
      if (!this.dom.questList) return;

      var combinedQuests = [];
      if (window.GameMissions && typeof window.GameMissions.getMissionState === 'function') {
        var mState = window.GameMissions.getMissionState();
        if (mState && mState.mainMission) {
          var mm = mState.mainMission;
          combinedQuests.push({
            id: 'campaign_' + (mm.stageIndex || 0),
            title: '👑 ' + (mm.stageTitle || 'Əsas Missiya'),
            description: (mm.stageDesc || '') + (mm.rewardText ? ' [' + mm.rewardText + ']' : ''),
            progress: mm.progress || 0,
            target: mm.target || 1,
            completed: Boolean(mm.isCompleted)
          });
        }
        if (mState && mState.activeBounty && !mState.activeBounty.failed) {
          var b = mState.activeBounty;
          combinedQuests.push({
            id: 'bounty_' + (b.type || 'active'),
            title: (b.icon || '📜') + ' ' + (b.title || 'Ov Müqaviləsi') + (b.completed ? ' ✓' : ' (' + Math.ceil(b.timer || 0) + 's)'),
            description: b.description || '',
            progress: Math.floor(b.progress || 0),
            target: b.targetValue || 1,
            completed: Boolean(b.completed)
          });
        }
        if (mState && mState.hunterRank) {
          var hr = mState.hunterRank;
          combinedQuests.push({
            id: 'rank_' + (hr.id || 0),
            title: (hr.badge || '🎖️') + ' Rütbə: ' + (hr.name || 'Ovçu'),
            description: '+' + Math.round((hr.damageBonus || 0) * 100) + '% Zərər & Qızıl Bonusu',
            progress: hr.currentXP || 0,
            target: Number.isFinite(hr.nextXP) ? hr.nextXP : (hr.currentXP || 100),
            completed: !Number.isFinite(hr.nextXP)
          });
        }
      }
      if (Array.isArray(quests)) {
        for (var qi = 0; qi < quests.length; qi++) {
          combinedQuests.push(quests[qi]);
        }
      }

      if (!combinedQuests || combinedQuests.length === 0) {
        if (this._lastQuestSignature !== '__EMPTY__') {
          this._lastQuestSignature = '__EMPTY__';
          this.dom.questList.innerHTML = '<li class="quest-item empty">Ətrafı kəşf et və qədim rünləri axtar...</li>';
        }
        return;
      }

      var sigParts = [];
      for (var s = 0; s < combinedQuests.length; s++) {
        var sq = combinedQuests[s];
        sigParts.push((sq.id || s) + ':' + sq.title + ':' + (sq.progress || 0) + ':' + (sq.target || 0) + ':' + Boolean(sq.completed));
      }
      var sig = sigParts.join('|');
      if (sig === this._lastQuestSignature) return;
      this._lastQuestSignature = sig;

      var qHtml = '';
      for (var i = 0; i < combinedQuests.length; i++) {
        var q = combinedQuests[i];
        var isDone = q.completed || (q.target && q.progress >= q.target);
        var progText = q.target ? ' (' + Math.floor(Number(q.progress) || 0) + '/' + Math.floor(Number(q.target) || 0) + ')' : '';

        qHtml += `
          <li class="quest-item ${isDone ? 'quest-done' : ''}">
            <span class="quest-check">${isDone ? '✓' : '⚔'}</span>
            <div class="quest-texts">
              <span class="quest-item-title">${escapeHtml(q.title)}</span>
              <span class="quest-item-desc">${escapeHtml(q.description)}${escapeHtml(progText)}</span>
            </div>
          </li>
        `;
      }
      this.dom.questList.innerHTML = qHtml;
    },

    _updateInteractPrompt: function (player, worldState) {
      if (!this.dom.interactPrompt) return;

      var foundInteract = null;
      var interactDist = 80;

      // 1. NPC
      if (worldState.region && worldState.region.npcs) {
        for (var i = 0; i < worldState.region.npcs.length; i++) {
          var npc = worldState.region.npcs[i];
          var d = Math.hypot(npc.x - player.x, npc.y - player.y);
          if (d <= interactDist + (npc.radius || 24)) {
            foundInteract = { text: npc.name + ' ilə danış', key: 'F' };
            break;
          }
        }
      }

      // 2. Sandıqlar
      if (!foundInteract && worldState.region && worldState.region.chests) {
        for (var c = 0; c < worldState.region.chests.length; c++) {
          var chest = worldState.region.chests[c];
          if (!chest.opened) {
            var dc = Math.hypot(chest.x - player.x, chest.y - player.y);
            if (dc <= interactDist + (chest.radius || 24)) {
              foundInteract = { text: 'Qədim Sandığı Aç', key: 'F' };
              break;
            }
          }
        }
      }

      // 3. Obelisklər
      if (!foundInteract && worldState.region && worldState.region.obelisks) {
        for (var o = 0; o < worldState.region.obelisks.length; o++) {
          var ob = worldState.region.obelisks[o];
          if (!ob.activated) {
            var dobel = Math.hypot(ob.x - player.x, ob.y - player.y);
            if (dobel <= interactDist + (ob.radius || 30)) {
              foundInteract = { text: (ob.name || 'Rünik Obelisk') + ' aktivləşdir', key: 'F' };
              break;
            }
          }
        }
      }

      // 4. Portal
      if (!foundInteract && worldState.region && worldState.region.portal && worldState.region.portal.active) {
        var p = worldState.region.portal;
        var dp = Math.hypot(p.x - player.x, p.y - player.y);
        if (dp <= interactDist + (p.radius || 40)) {
          foundInteract = { text: 'Növbəti Bölgəyə Keç', key: 'F' };
        }
      }

      // 5. V3.0: Tale Qurbangahı (Mystery Shrine)
      if (!foundInteract && window.GameMissions && typeof window.GameMissions.getNearestInteractable === 'function') {
        var mInt = window.GameMissions.getNearestInteractable(player);
        var mPrompt = mInt && (mInt.text || mInt.prompt);
        if (mPrompt) {
          foundInteract = { text: mPrompt.replace(/^\[F\]\s*—?\s*/i, ''), key: 'F' };
        }
      }

      if (foundInteract) {
        if (this.dom.interactPromptKey) setText(this.dom.interactPromptKey, foundInteract.key);
        if (this.dom.interactPromptText) setText(this.dom.interactPromptText, foundInteract.text);
        setCls(this.dom.interactPrompt, 'hidden', false);
      } else {
        setCls(this.dom.interactPrompt, 'hidden', true);
      }
    },

    /**
     * Canlı Minimap Radar Çəkir
     */
    _renderMinimap: function (player, worldState) {
      var ctx = this.minimapCtx;
      if (!ctx || !player) return;

      var canvas = this.dom.minimapCanvas;
      var w = canvas.width;
      var h = canvas.height;
      var cx = w / 2;
      var cy = h / 2;
      var radarRadius = w / 2 - 4;

      ctx.clearRect(0, 0, w, h);

      // Radar arxa dairəsi
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8, 7, 14, 0.88)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(245, 197, 66, 0.45)';
      ctx.stroke();
      ctx.clip(); // Yalnız radar dairəsi daxilində çək

      // Şəbəkə halqaları
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius * 0.35, 0, Math.PI * 2);
      ctx.arc(cx, cy, radarRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Çarpaz xətlər
      ctx.beginPath();
      ctx.moveTo(cx, cy - radarRadius);
      ctx.lineTo(cx, cy + radarRadius);
      ctx.moveTo(cx - radarRadius, cy);
      ctx.lineTo(cx + radarRadius, cy);
      ctx.stroke();

      // Radar Fırlanan Şüa (Sweep)
      this.radarSweepAngle += 0.04;
      if (this.radarSweepAngle > Math.PI * 2) this.radarSweepAngle -= Math.PI * 2;

      ctx.save();
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarRadius);
      grad.addColorStop(0, 'rgba(0, 245, 160, 0.25)');
      grad.addColorStop(1, 'rgba(0, 245, 160, 0.0)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarRadius, this.radarSweepAngle, this.radarSweepAngle + 0.5);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Miqyas: Radar əhatə radiusu 900 vahid
      var radarViewRange = 950;
      var scale = radarRadius / radarViewRange;

      function toRadarCoords(wx, wy) {
        var dx = wx - player.x;
        var dy = wy - player.y;
        return {
          x: cx + dx * scale,
          y: cy + dy * scale,
          dist: Math.hypot(dx, dy)
        };
      }

      // 1. Obelisklər (Mavi Romb)
      if (worldState.region && worldState.region.obelisks) {
        for (var o = 0; o < worldState.region.obelisks.length; o++) {
          var ob = worldState.region.obelisks[o];
          var posO = toRadarCoords(ob.x, ob.y);
          if (posO.dist <= radarViewRange) {
            ctx.fillStyle = ob.activated ? '#00f5a0' : '#00d9ff';
            ctx.beginPath();
            ctx.arc(posO.x, posO.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // 2. Sandıqlar (Qızılı Sarı)
      if (worldState.region && worldState.region.chests) {
        for (var c = 0; c < worldState.region.chests.length; c++) {
          var ch = worldState.region.chests[c];
          if (!ch.opened) {
            var posC = toRadarCoords(ch.x, ch.y);
            if (posC.dist <= radarViewRange) {
              ctx.fillStyle = '#f5c542';
              ctx.fillRect(posC.x - 3, posC.y - 3, 6, 6);
            }
          }
        }
      }

      // 3. NPC-lər (Zümrüd Yaşıl)
      if (worldState.region && worldState.region.npcs) {
        for (var n = 0; n < worldState.region.npcs.length; n++) {
          var npc = worldState.region.npcs[n];
          var posN = toRadarCoords(npc.x, npc.y);
          if (posN.dist <= radarViewRange) {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(posN.x, posN.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 4. Portal (Bənövşəyi Burulğan)
      if (worldState.region && worldState.region.portal && worldState.region.portal.active) {
        var port = worldState.region.portal;
        var posP = toRadarCoords(port.x, port.y);
        if (posP.dist <= radarViewRange) {
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(posP.x, posP.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      }

      // 5. Adi Düşmənlər (Qırmızı Nöqtələr)
      if (worldState.enemies && worldState.enemies.length > 0) {
        ctx.fillStyle = '#ef4444';
        for (var e = 0; e < worldState.enemies.length; e++) {
          var en = worldState.enemies[e];
          if (en.hp > 0 && !en.isBoss) {
            var posE = toRadarCoords(en.x, en.y);
            if (posE.dist <= radarViewRange) {
              ctx.beginPath();
              ctx.arc(posE.x, posE.y, 2.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // 6. Boss (İri Parlaq Qırmızı Kəllə / Ulduz)
      if (worldState.boss && worldState.boss.hp > 0) {
        var bPos = toRadarCoords(worldState.boss.x, worldState.boss.y);
        if (bPos.dist <= radarViewRange) {
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(bPos.x, bPos.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fef08a';
          ctx.stroke();
        }
      }

      // 7. Oyunçu Mərkəzdə (Parlaq Qızılı Ox / İşıq)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(player.angle || 0);

      // Oyunçu aurası
      ctx.fillStyle = 'rgba(245, 197, 66, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Oyunçu oxu
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore(); // clip sonu
    },

    /**
     * Silahı dəyişir (slot 1-4 və ya weapon ID)
     * @param {number|string} slotOrId
     */
    switchWeapon: function (slotOrId) {
      if (this.callbacks.onSwitchWeapon) {
        this.callbacks.onSwitchWeapon(slotOrId);
      } else if (window.GameEngine && typeof window.GameEngine.switchWeapon === 'function') {
        window.GameEngine.switchWeapon(slotOrId);
      } else if (window.GameRelics && typeof window.GameRelics.switchWeapon === 'function') {
        window.GameRelics.switchWeapon(slotOrId);
      }

      if (window.GameEngine && window.GameEngine.player) {
        this._updateWeaponsHUD(window.GameEngine.player);
      }
    },

    /**
     * [R] Ultimate Bacarığını işə salır (Aether Qiyaməti)
     */
    triggerUltimate: function () {
      if (this.callbacks.onTriggerUltimate) {
        this.callbacks.onTriggerUltimate();
      } else if (window.GameEngine && typeof window.GameEngine.triggerUltimate === 'function') {
        window.GameEngine.triggerUltimate();
      } else if (window.GameCompanions && typeof window.GameCompanions.triggerUltimate === 'function') {
        var engine = window.GameEngine;
        var p = engine ? engine.player : null;
        var enemies = engine && engine.worldState ? engine.worldState.enemies : [];
        window.GameCompanions.triggerUltimate(p, enemies, this.callbacks);
      }

      if (window.GameEngine && window.GameEngine.player) {
        this._updateUltimateAndCompanion(window.GameEngine.player);
      }
    },

    /**
     * [C] Yoldaş Ruhunu növbətiyə çevirir (Simurq -> Əjdaha -> Qurd)
     */
    cycleCompanion: function () {
      if (this.callbacks.onCycleCompanion) {
        this.callbacks.onCycleCompanion();
      } else if (window.GameEngine && typeof window.GameEngine.cycleCompanion === 'function') {
        window.GameEngine.cycleCompanion();
      } else if (window.GameCompanions && typeof window.GameCompanions.cycleCompanion === 'function') {
        window.GameCompanions.cycleCompanion();
      }

      if (window.GameEngine && window.GameEngine.player) {
        this._updateUltimateAndCompanion(window.GameEngine.player);
      }
    },

    /**
     * 3-Kartlı "Hades" tipli Roguelike Relikt Seçim Modalı
     * @param {Array} choices
     * @param {Function} onSelect
     */
    showRelicDraftModal: function (choices, onSelect) {
      var modal = this.dom.modalRelicDraft;
      var container = this.dom.relicCardsContainer;
      if (!modal || !container) return;

      // Əgər choices verilməyibsə və ya boşdursa, GameRelics-dən 3 təsadüfi seçim çək
      if (!choices || !Array.isArray(choices) || choices.length === 0) {
        if (window.GameRelics && typeof window.GameRelics.getRelicChoices === 'function') {
          choices = window.GameRelics.getRelicChoices(3);
        }
      }

      if (!choices || choices.length === 0) {
        console.warn('⚠️ [GameUI] Seçilə biləcək relikt tapılmadı.');
        return;
      }

      var self = this;
      var rarityLabels = {
        common: 'Ümumi',
        rare: 'Nadir',
        epic: 'Epik',
        legendary: 'Əfsanəvi'
      };

      var html = '';
      for (var i = 0; i < choices.length; i++) {
        var card = choices[i];
        var safeRarity = escapeHtml(card.rarity || 'common');
        var rLabel = rarityLabels[card.rarity] || card.rarity || 'Relikt';
        var isNew = card.isNew || !card.currentLevel;
        var levelText = isNew
          ? '★ YENİ RELİKT'
          : ('Səviyyə ' + (card.level || 1) + ' / ' + (card.maxLevel || 3));

        html += `
          <div class="relic-choice-card rarity-${safeRarity}" data-relic-id="${escapeHtml(card.id)}">
            <span class="relic-card-rarity-tag">${escapeHtml(rLabel)}</span>
            <div class="relic-card-icon">${escapeHtml(card.icon || '💎')}</div>
            <h3 class="relic-card-name">${escapeHtml(card.name)}</h3>
            <div class="relic-card-level">${escapeHtml(levelText)}</div>
            <p class="relic-card-desc">${escapeHtml(card.description || '')}</p>
            <button class="relic-card-select-btn" type="button">SEÇ VƏ GÜCLƏNDİR</button>
          </div>
        `;
      }

      container.innerHTML = html;

      // Klik hadisələrini kartlara bağla
      var cardEls = container.querySelectorAll('.relic-choice-card');
      cardEls.forEach(function (cEl) {
        cEl.addEventListener('click', function () {
          var relicId = cEl.getAttribute('data-relic-id');
          var selectedChoice = null;
          for (var c = 0; c < choices.length; c++) {
            if (choices[c].id === relicId) {
              selectedChoice = choices[c];
              break;
            }
          }

          self._playClickSound();
          if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
            window.GameAudio.playSFX('levelUp');
          }

          self.hideRelicDraftModal();

          if (window.GameRelics && typeof window.GameRelics.selectRelic === 'function') {
            window.GameRelics.selectRelic(relicId);
          }

          if (typeof onSelect === 'function') {
            onSelect(relicId, selectedChoice);
          }

          if (self.callbacks.onSelectRelic) {
            self.callbacks.onSelectRelic(relicId, selectedChoice);
          }

          var cardName = selectedChoice ? selectedChoice.name : 'Aether Relikti';
          self.showNotification('RELİKT SEÇİLDİ!', cardName + ' döyüş təchizatına əlavə edildi.', 'success');

          // HUD-u dərhal təravətləndir
          if (window.GameEngine && window.GameEngine.player) {
            self._updateActiveRelicsHUD(window.GameEngine.player);
          }
        });
      });

      modal.classList.remove('hidden');

      if (window.GameAudio && typeof window.GameAudio.playSFX === 'function') {
        window.GameAudio.playSFX('spell');
      }
    },

    /**
     * Relikt Seçim Modalını gizlədir
     */
    hideRelicDraftModal: function () {
      if (this.dom.modalRelicDraft) {
        setCls(this.dom.modalRelicDraft, 'hidden', true);
      }
    },

    /**
     * Silah seçim panelini (1-4) və əsas hücum slotu ikonunu yeniləyir
     */
    _updateWeaponsHUD: function (player) {
      var activeWeapon = null;
      if (window.GameRelics && typeof window.GameRelics.getActiveWeapon === 'function') {
        activeWeapon = window.GameRelics.getActiveWeapon();
      }

      var activeSlot = 1;
      var activeId = 'sword';
      if (activeWeapon) {
        activeSlot = activeWeapon.slot || 1;
        activeId = activeWeapon.id || 'sword';
      } else if (player) {
        activeSlot = player.weaponSlot || (player.weapon && player.weapon.slot) || 1;
        activeId = player.weaponId || (player.weapon && player.weapon.id) || 'sword';
      }

      // Slot elementlərini işarələ
      var slots = this.dom.weaponSlots;
      if (!slots || slots.length === 0) {
        slots = document.querySelectorAll('.weapon-slot');
      }
      if (slots && slots.length > 0) {
        for (var i = 0; i < slots.length; i++) {
          var sEl = slots[i];
          var slotNum = parseInt(sEl.getAttribute('data-weapon-slot'), 10);
          var slotWId = sEl.getAttribute('data-weapon-id');
          var isMatch = slotNum === activeSlot || (slotWId && slotWId === activeId);
          setCls(sEl, 'active', Boolean(isMatch));
        }
      }

      // Action Bar silah ikonu və adı
      if (this.dom.skillSlotWeaponIcon && activeWeapon) {
        setText(this.dom.skillSlotWeaponIcon, activeWeapon.icon || '⚔');
      }
      if (this.dom.skillSlotWeaponLabel && activeWeapon) {
        var shortName = activeWeapon.name ? activeWeapon.name.split(' ')[0] : 'Hücum';
        setText(this.dom.skillSlotWeaponLabel, shortName);
      }
    },

    /**
     * Ultimate [R] Qəzəb şkalasını və Yoldaş [C] statusunu yeniləyir
     */
    _updateUltimateAndCompanion: function (player) {
      // 1. Ultimate Qəzəb
      var comp = window.GameCompanions;
      var curRage = 0;
      var maxRage = 100;
      var isReady = false;

      if (comp) {
        curRage = typeof comp.getRage === 'function' ? comp.getRage() : (comp.rage || 0);
        maxRage = typeof comp.getMaxRage === 'function' ? comp.getMaxRage() : (comp.maxRage || 100);
        isReady = typeof comp.canCastUltimate === 'function' ? comp.canCastUltimate() : (curRage >= maxRage);
      } else if (player) {
        curRage = player.rage || 0;
        maxRage = player.maxRage || 100;
        isReady = curRage >= maxRage;
      }

      var ragePct = Math.min(100, Math.max(0, (curRage / (maxRage || 100)) * 100));

      if (this.dom.skillRageFill) {
        setStyle(this.dom.skillRageFill, 'height', ragePct + '%');
      }
      if (this.dom.skillRageText) {
        setText(this.dom.skillRageText, Math.floor(ragePct) + '%');
      }
      if (this.dom.skillSlotR) {
        setCls(this.dom.skillSlotR, 'ultimate-ready', isReady);
      }
      if (this.dom.btnTouchUlt) {
        setCls(this.dom.btnTouchUlt, 'ready', isReady);
      }

      // 2. Yoldaş [C]
      var activeComp = null;
      if (comp && typeof comp.getActiveCompanion === 'function') {
        activeComp = comp.getActiveCompanion();
      }

      if (activeComp) {
        if (this.dom.companionIcon) {
          setText(this.dom.companionIcon, activeComp.icon || '🦅');
        }
        if (this.dom.companionNameBadge) {
          setText(this.dom.companionNameBadge, activeComp.name || 'Simurq');
        }
        if (this.dom.skillSlotC) {
          setTitle(this.dom.skillSlotC, '[C] Yoldaş: ' + (activeComp.name || '') + ' - ' + (activeComp.description || ''));
        }
        if (this.dom.btnTouchComp) {
          setText(this.dom.btnTouchComp, activeComp.icon || '🦅');
        }
      }
    },

    /**
     * Canlı DMC/Hades tipli Stil Kombo Sayğacını yeniləyir
     */
    _updateComboHUD: function (player, worldState) {
      if (!this.dom.comboHud) return;

      var comboState = null;
      if (window.GameEvents && typeof window.GameEvents.getComboState === 'function') {
        comboState = window.GameEvents.getComboState();
      }

      if (comboState && comboState.count > 0) {
        setCls(this.dom.comboHud, 'hidden', false);

        if (this.dom.comboRank) {
          setText(this.dom.comboRank, comboState.rank || 'D');
          if (comboState.color) {
            setStyle(this.dom.comboRank, 'color', comboState.color);
          }
        }

        if (this.dom.comboHits) {
          setText(this.dom.comboHits, comboState.count + 'x HIT');
        }

        if (this.dom.comboMultiplier) {
          var titleStr = comboState.title ? ' ' + comboState.title : '';
          var multVal = typeof comboState.multiplier === 'number' ? comboState.multiplier.toFixed(1) : '1.0';
          setText(this.dom.comboMultiplier, '[' + (comboState.rank || 'D') + ']' + titleStr + ' (' + multVal + 'x Zərər)');
          if (comboState.color) {
            setStyle(this.dom.comboMultiplier, 'color', comboState.color);
          }
        }

        if (this.dom.comboTimerBar) {
          var pct = typeof comboState.progress === 'number'
            ? comboState.progress * 100
            : ((comboState.timer / (comboState.maxTimer || 4)) * 100);
          pct = Math.min(100, Math.max(0, pct));
          setStyle(this.dom.comboTimerBar, 'width', pct + '%');
          if (comboState.color) {
            setStyle(this.dom.comboTimerBar, 'backgroundColor', comboState.color);
          }
        }

        // Zərbə sayğacı artdıqda pop animasiyası
        if (this._lastComboCount !== comboState.count) {
          this._lastComboCount = comboState.count;
          setCls(this.dom.comboHud, 'combo-bump', false);
          void this.dom.comboHud.offsetWidth;
          setCls(this.dom.comboHud, 'combo-bump', true);
        }
      } else {
        setCls(this.dom.comboHud, 'hidden', true);
        this._lastComboCount = 0;
      }
    },

    /**
     * Aktiv Relikt nişanlarını (hud-active-relics) yeniləyir
     */
    _updateActiveRelicsHUD: function (player) {
      if (!this.dom.activeRelicsContainer) return;

      var relics = [];
      if (window.GameRelics && typeof window.GameRelics.getActiveRelics === 'function') {
        relics = window.GameRelics.getActiveRelics();
      }

      if (!relics || relics.length === 0) {
        if (this._lastRelicsSignature !== '__EMPTY__') {
          this._lastRelicsSignature = '__EMPTY__';
          this.dom.activeRelicsContainer.innerHTML = '';
        }
        return;
      }

      var sigParts = [];
      for (var i = 0; i < relics.length; i++) {
        var r = relics[i];
        sigParts.push((r.id || i) + ':' + (r.level || 1));
      }
      var sig = sigParts.join('|');
      if (sig === this._lastRelicsSignature) return;
      this._lastRelicsSignature = sig;

      var html = '';
      for (var j = 0; j < relics.length; j++) {
        var rel = relics[j];
        var safeRarity = escapeHtml(rel.rarity || 'common');
        var safeTitle = escapeHtml(rel.name || 'Relikt') + ' (Səviyyə ' + escapeHtml(rel.level || 1) + ')\n' + escapeHtml(rel.description || '');
        html += `
          <div class="relic-badge rarity-${safeRarity}" title="${safeTitle}">
            <span>${escapeHtml(rel.icon || '💎')}</span>
            <span class="relic-badge-lvl">${escapeHtml(rel.level || 1)}</span>
          </div>
        `;
      }
      this.dom.activeRelicsContainer.innerHTML = html;
    }
  };

  // Qlobal Obyekt
  window.GameUI = GameUI;
})();
