# Aetheria QA playtest (manual-style, Playwright, GPU Chromium)

Page: `index.html`. Desktop 1280x720 and mobile 375x812 touch. Evidence: `playtest-results/aetheria-qa/` (screenshots + `*.json`). The scripts were deleted after the run; the JSON results and screenshots remain.
Console: 0 uncaught errors, 0 console.error, 0 failed requests in every scenario.
Test setup notes: a hero "god-mode" interval (hp = maxHp) was used in several scenarios so input handling could be isolated; gold/souls were seeded in a few shop/talent checks. Neither affects the findings below.

## Findings

| # | Sev | Finding | Repro | Evidence | Suspect | Owner |
|---|-----|---------|-------|----------|---------|-------|
| 1 | high | **Esc on the main menu un-pauses the attract-mode simulation.** The hero fights, levels up, opens the relic draft over the menu and gold/XP are written to `aetheria_save_v1` before any run starts. | Load page, wait 3 s (sim paused, playTime 0), press Esc, wait 6 s. | `a2_menu.json` menuAfterEsc6s: paused false, kills 1, hp 106->11, gold 130, saved JSON gold 130. `a2-menu-after-esc.png`; relic draft over menu `a-daily-menu.png`. | `src/engine.js:319` (Esc toggles `isPaused` regardless of menu), `src/ui.js:555` | ui-hud-engineer + bug-fixer |
| 2 | high | **Esc while the shop is open closes the shop AND silently pauses the game.** No pause menu shows; world frozen. A second Esc is needed. | Start run, press B, press Esc. | `d_pause.json` esc_with_shop_open: afterEsc paused true, modals [], playTime frozen. `d02-esc-from-shop.png` (frozen frame, floating "-15"). | `src/engine.js:319-322` + `src/ui.js:555-562` both handle Esc | ui-hud-engineer |
| 3 | high | **Pause modal and engine pause desync.** After pause modal is up, B opens the shop over it; Esc closes the shop and the engine resumes while the pause modal stays visible, so the game runs (and can kill the hero) behind the modal. Also Esc with an NPC dialogue open stacks pause modal on dialogue and J/T are then dead. | Esc, press B, press Esc. Or F near NPC (spawn), Esc. | `d_pause.json` dialogue_esc (modals pause+dialogue), panel_T afterEsc: paused false with modal-pause visible. `d03b-dialogue-esc.png`. | same Esc double handlers; `engine.js:1013` `_pluginsBlocking`, `ui.js:555` | ui-hud-engineer |
| 4 | high | **Max HP shop upgrade has no effect in play.** Computed maxHp becomes 136 but `player.maxHp` stays 106. | Buy "Maksimum Can" in shop (gold 1000). | `f_econ.json` after_hp: computed.maxHp 136, player maxHp 106. | `src/engine.js:1039` `baseMaxHp` cached once and then `_applyPluginMaxHp` overwrites what `syncProgressionStats` (engine.js ~line 392) set | bug-fixer (engine) / progression-economy-designer |
| 5 | medium | **Companion and rage not reset by New Game / arena.** `GameCompanions.init()` early-returns once `initialized`, so a new run keeps rage 100% and the wolf. | Arm rage + switch companion, go to menu, New Game. | `g_misc.json` newgame_after_arena: rage 100%, comp "Kölgə Ruh Qurdu". Also run start shows rage 50% / "Alov Simurqu". | `src/companions_ultimates.js:195-212` | companion-ultimate-designer |
| 6 | medium | **M triggers `cycleOrStartBounty` twice per press** (engine key + missions' own keydown listener), so a bounty is started then immediately cycled. F runs both `performInteraction` and `tryInteract`. Weapon keys 1-4 are handled by 3 listeners (Engine 2x, Relics 3x calls). | Instrumented counters, press M / F / 3. | `c_keys.json`: M calls 2; Digit3 Engine 2 / Relics 3; F 1+1. | `src/missions_campaign.js:303`, `src/weapons_relics.js:334`, `src/engine.js:286,293` | mission-campaign-designer, weapons-upgrades-designer |
| 7 | medium | **Talent tree card footers are clipped at 1280x720** (cards fixed ~193 px, `overflow:hidden`, content 233-249 px): cost/"Öyrən" button hidden for all 4 cards until scrolled; title clipped after scrollIntoView. | Press T. | `f_econ.json` talent_cards_geometry btnClipped true x4. `a-talents-menu.png`, `e03-talent-bought.png` (title cut, button half visible). | `src/talent_tree.js:716` `.talent-card` fixed height | meta-progression-designer / ui-hud-engineer |
| 8 | medium | **FPS dips below the 55 gate in arena and after the ultimate.** Arena 53.9 avg, worst frame 90 ms (`g_misc.json`); 53.3 after ultimate (`b_run.json`). Idle play ~110 FPS. | Start Arena, wait 3 s with enemies spawning. | `g_misc.json` arena.fps | `vfx.js` / `events_arena.js` spawn bursts | performance-optimizer |
| 9 | medium | **J daily panel is rendered behind the main menu** (visible only as faint ghost); Esc in play does not close it, it opens pause instead (header says "[J] Paneli Bağla"). T panel layers correctly. | Menu: press J. In play: J then Esc. | `a2-J-on-menu.png`; `e_panels.json` panel_J afterEsc modal-pause | `src/daily_trials.js` z-index / Esc handling | onboarding-designer (daily) |
| 10 | medium | **Pause main-menu from Arena leaves `isArenaMode` true** while on the menu; main menu background sim keeps arena flag. | Arena, Esc, "Ana Menyuya Qayıt". | `g_misc.json` arena.arenaStillOn true | `src/events_arena.js` (`endArenaMode` only called on New Game/Arena start) | combo-events-designer |
| 11 | low | Shop header gold desyncs from real gold after the 4th purchase (shop "550", HUD/state 630). | Buy all four upgrades in a row. | `f_econ.json` after_speed shopGold 550 vs hudGold 630 | `src/ui.js:924` `renderShopContent` vs `toggleShopModal` refresh | ui-hud-engineer |
| 12 | low | Talent "Sıfırla" (respec) single click gave no refund and no confirm dialog was shown (souls 45, level 1 unchanged); possibly needs a hidden second click. Unverified. | T, buy, click Sıfırla. | `f_econ.json` respec | `src/talent_tree.js:1008` | meta-progression-designer |
| 13 | low | Main menu at 720 px high: top badge text "ELİTLƏR & GÜNDƏLİK SINAQ" is clipped under the arcade bar; HUD quest text bleeds through the title. | Load page at 1280x720. | `a00-menu.png` | `index.html` menu layout | ui-hud-engineer |
| 14 | low | Esc from Region select (opened via Pause) resumes the game instead of returning to the pause menu. | Esc, "Bölgə Seçimi", Esc. | `e_panels.json` afterRegionEsc paused false | `src/ui.js:555` | ui-hud-engineer |
| 15 | low | Daily reward claimed from the menu shows its notification only inside the hidden HUD; only the button label changes. | Menu: "Gündəlik Mükafat". | `a2-daily-btn.png` | `src/ui.js:331` `showNotification` while HUD hidden | ui-hud-engineer |

Already known (re-confirmed, not re-analysed): New Game wipes progress (`resetSave`), C key triple dispatch makes companion switching a no-op (`c_keys.json` C: Engine 2 + Companions 3 calls = full rotation of 3 types), defeat screen unreachable (death calls `respawnPlayer`, no game over; `g_misc.json` death: hp 106, modal none), mobile HUD overflow (`h_mobile.json` hudOverflow; touch buttons overlap the skill bar and tutorial card in `h01-play.png`).

## Pass / fail

- PASS: loads, 0 console errors, 0 failed requests (all scenarios, desktop and mobile)
- PASS: every main-menu button opens something (Controls, Shop + 3 tabs, Talents, Daily, Continue, New Game, Arena)
- PASS: movement WASD and arrows; dash (Space) activates; Q/E spend mana; R needs full rage and fires
- PASS: weapons 1-4 switch (HUD slot and label follow); sword and daggers deal damage
- FAIL: companion switching (C), see known issues
- PASS: Esc pause/resume from pause button, Resume button, audio toggle
- FAIL: Esc with shop/dialogue/region open (#2, #3, #14); Esc on main menu (#1)
- PASS: shop purchase deducts gold and persists after reload; Sword/Spell/Speed take effect; FAIL Max HP (#4)
- PARTIAL: talent purchase works (souls 60 -> 45, persists after reload) but UI clips (#7)
- FAIL: death -> game over -> restart (no defeat screen); forced `showGameOver` + Restart works 3 times with correct reset, sim speed 1.0x each run (no loop leak), HTML in region name is escaped
- PASS: Arena starts; PARTIAL FPS (#8), flag leak (#10)
- PASS: Continue after reload restores region and gold
- PASS: resize 800x500, 375x812, 1920x1080 keeps canvas sized, no horizontal scroll; hidden tab does not advance sim
- PARTIAL mobile 375x812: touch joystick moves the hero (+82 px), attack/dash/spell/nova buttons work, pause works, 109 FPS; HUD overlap known
- FPS: desktop idle ~104-110, arena 53.9, post-ultimate 53.3, mobile 109.5

## Top 3 to fix first
1. Single Esc handler (engine or ui, not both) with a modal stack (#1, #2, #3, #14).
2. Max HP upgrade (#4) and per-run reset of companion/rage (#5).
3. Remove duplicate key listeners (C, M, F, 1-4), then re-test companions (#6).

STATUS: done
FILES: reports/aetheria/qa.md; playtest-results/aetheria-qa/*.png and *.json (scripts a_menu, a2_menu, b_run, c_keys, d_pause, e_panels, f_econ, g_misc, h_mobile, lib still present, to delete)
API: none
VERIFIED: Playwright GPU Chromium runs on a local static server; 0 console errors, 0 failed requests; all screenshots opened
REQUESTS: bug-fixer for #1-#4; companion-ultimate-designer #5; mission-campaign-designer/weapons-upgrades-designer #6; meta-progression-designer #7, #12; performance-optimizer #8
NOTES: god-mode and seeded gold/souls used in some checks; #12 unverified
