# Void Nova (shooter.html) - QA playtest report

Method: own Playwright scripts (real keyboard/mouse/touch input, GPU Chromium, 1280x720 and 375x812 touch). `npm run playtest` was not re-run; existing evidence (143 FPS, 0 errors) accepted. Scripts deleted after use. Screenshots: `playtest-results/shooter-qa/`. Debug shortcuts (reading `window.VoidNova`, god mode, `startWave(5)`, setting `boss.hp`) were used only to reach the boss and are marked below. `shooter.html` was not modified.

Console: 0 page errors, 0 console errors/warnings, 0 failed requests across ~15 minutes of play, 5 restarts, 4 resizes, input mash.

Already known, not re-proved: no mobile movement, per-frame contact damage, frame-rate-dependent boss danmaku, boons not matching text, invisible Tesla arcs.

## Acceptance checklist

| Check | Result | Evidence |
| :- | :- | :- |
| Launch / menu | PASS | 01-menu.png; start button begins run |
| WASD + arrows | PASS | up -255, right +262, down +187, left -182 px per 0.7 s; speed capped 619/620 |
| Mouse aim | PASS | aim angle 0 / 1.57 / 3.12 / -1.57 for right/down/left/up |
| Fire | PASS | hold LMB spawns bullets, score rises |
| 4 weapons (1-4, wheel, slot click) | PASS | all four fire; wheel cycles; HUD slot highlight tracks. Q/E are not bound (spec lists only 1-4/scroll) |
| Dash / EMP | PASS | dash moves ~225 px; Space and button consume a bomb |
| Wave clear + boon draft | PASS (forced) | draft appears on clear, card click starts next wave; natural clear of wave 1 did not complete (see F1) |
| Boss (debug path) | PASS with bugs | all 3 phases, HUD, death -> +15000, draft, wave 6 start (31/33/34/35 png). Not killed by genuine play |
| Die -> game over -> restart x3 | PARTIAL | works, but leaves stale state (F2) |
| Pause | FAIL | no pause exists (F4) |
| Resize | PASS | canvas follows window at 800x600, 1920x1080, 500x900; no errors |
| Tab switch / blur | PASS | dt capped at 50 ms, no teleport or damage |
| Mobile 375x812 | FAIL | known no-move issue plus layout overlaps (F6) |

Numbers: weapon score gain in 3.5 s on the same wave: laser 1350, plasma 410, missiles 6298, Tesla 1779. Boss damage in 6 s with orbiters dead: laser 2992, plasma 1485, missiles 1952, Tesla unreliable (see F5). Standing still on wave 1: death in 28.7 s. Kiting with laser for 40 s: lowest HP+shield 125 of 160.

## Findings

### F1 - HIGH - Enemy movement is frame-rate dependent; waves cannot be finished at high refresh rates
Repro: start a run on a 144 Hz display (or this harness at ~143 FPS), keep firing, do not leave the spawn. After 40 s `waveEnemiesLeft` is 0 but 12 enemies remain; after another 2 minutes 3-4 remain and no boon draft ever opens (draft requires every enemy dead).
Evidence: stall dump at 143 FPS shows swarmers at ~700-840 px from the player with speed ~15-21 px/s (nominal 280), snipers at 570-810 px with speed ~12-24 px/s. 20 enemies were spread across the 3200 px arena. 30-stall.png, 07-fair-end.png.
Cause: per-frame damping `e.vx * 0.94` is not scaled by dt while the acceleration is, so terminal speed = accel*dt/0.06. At 60 FPS swarmers top out near 62 px/s, at 143 FPS near 26 px/s, instead of 280. Same for snipers (`*= 0.94`). Asteroids and mines never chase. Related per-frame constants: camera lerp 0.08, `cam.shake *= 0.88`, zoom lerp 0.06.
Suspected lines: shooter.html ~1470-1500 (swarmer), ~1503-1520 (sniper), ~1146-1148 (camera).
Impact: difficulty and pacing change with monitor refresh; on high-refresh screens waves become a hunt for slow stragglers.
Owner: enemy-ai-engineer (enemy steering), physics-game-feel-engineer (camera/shake constants). Fix: use `Math.pow(0.94, dt*60)`.

### F2 - HIGH - Restart does not reset everything (stale boss HUD, enemy bullets, banner)
Repro: die during the boss wave (or any time after a boss spawned), click RE-LAUNCH FIGHTER.
Evidence: after restart `#boss-hud` stays `display:flex` and overlaps the "WAVE 1 INCOMING!" banner with "OMEGA VOID-TITAN / PHASE 1" (14-restart1.png). It stays visible on every later restart (restart 2 and 3 values: bossHud "flex"). Enemy bullets from the previous run remain active (ebullets 1 at restart 1, up to 29 when dying mid-boss). Game-over title text is never restored; the menu title stays "STARSHIP DESTROYED" if the modal is reopened.
Suspected lines: `startNewGame` ~935-962 (no boss-hud hide, no pool reset, no `player.shieldTimer/weaponCooldown/dashCooldown/empCooldown/isDashing` reset); `gameOver` ~1963.
Owner: game-engine-developer (state machine / restart), ui-hud-engineer (boss HUD).

### F3 - MEDIUM - Boss death leaves all its bullets alive, then they resume in the next wave
Repro: kill the boss while phase 3 danmaku is on screen.
Evidence: at boss death 103 enemy bullets active; during the boon draft they are frozen, after picking a card 69 are still live and fly into the player on wave 6 start (34-boss-dead.png, 35-wave6.png). The reverse is already true for EMP (it clears bullets).
Suspected line: `updateBoss` boss-death block ~1655-1664.
Owner: enemy-ai-engineer / level-boss-designer. Fix: deactivate `enemyBulletPool` items on boss death and before `startWave`.

### F4 - MEDIUM - No pause
Repro: press Escape or P mid-run: state stays `playing`, enemies keep attacking. No pause button, no auto-pause on blur or hidden tab (a hidden tab is only frozen because rAF stops).
Evidence: 5-pause step, state printed `playing` for both keys. The spec file has no pause requirement but the QA gate expects pause to work.
Suspected lines: keydown handler ~865-876 has no Escape/P; no `blur`/`visibilitychange` listeners.
Owner: ui-hud-engineer (pause menu), game-engine-developer (`paused` state).

### F5 - MEDIUM - Missiles and Tesla cannot target the boss
`findNearestEnemy` (~1300) only searches `this.enemies`; the boss is not in that array. Missiles fly straight (random spread) and Tesla fires nothing at the boss, so with the boss as the only target two of four weapons are weak or dead. Measured 6 s on boss: Tesla 0 damage for the first 3 s, then small unexplained drops; plasma only 1485 vs laser 2992. Also balance: missiles earn ~4.7x the laser's score on normal waves while plasma earns ~0.3x, which makes weapon 2 a trap pick.
Owner: weapons-upgrades-designer.

### F6 - MEDIUM - Mobile layout (beyond the known no-movement bug)
Evidence at 375x812 (21/22-mobile png): the top arcade bar wraps and is clipped (title and buttons cut off, 3 of 4 links partly out of view); DASH (left) and EMP (right) circles sit on top of the weapon hotbar, hiding weapon 1 and weapon 4 slots; HUD cards overlap vertically (threat card and combo meter touch). Tapping weapon slot 4 is intercepted by `#emp-btn` (Playwright could not tap it for 30 s). No `@media` rules exist in the file. `touchstart` is not handled (only `touchmove` sets `mouse.down`), so a single tap never fires and aim only updates once the finger moves; `touchend` clears firing for all fingers when one lifts.
Menu itself fits (20-mobile-menu.png). Lines: touch handlers ~898-904; CSS HUD blocks ~100-200.
Owner: ui-hud-engineer.

### F7 - LOW - Latent: game over while the boon draft is open
If `damagePlayer` ever fires while `gameState === 'boon_select'`, the boon modal (z-index 600) covers the game-over modal (z 500) and picking a card calls `startWave` in the game-over state, resurrecting the run with negative HP (17-gameover-with-draft-open.png, forced via `damagePlayer(99999)`). Not reachable in normal play because `update()` is skipped during the draft, but cheap to guard in `gameOver`/the card click handler (~1851).
Owner: game-engine-developer.

### F8 - LOW - Wave-clear UX: no way to find the last enemies
Even when enemies do move, there is no radar, off-screen arrow, or "N left" counter; the wave ends only when every enemy, including split asteroid fragments, is dead. Large drifting asteroids/mines never approach.
Owner: ui-hud-engineer (indicator), enemy-ai-engineer (cleanup rule, e.g. make stragglers hunt after a timer).

### F9 - LOW - Input edge cases
- Keys are not released on window blur (no blur handler): holding W and alt-tabbing keeps the ship thrusting (emulated; the ship drifted 102 px).
- Any mouse button, including right-click and clicking HUD buttons/cards, sets `mouse.down` and fires; no `contextmenu` handling.
- Dash and EMP buttons keep firing weapon via the same click (mousedown on window).
Owner: game-engine-developer.

### Passed edge cases
Mash of random keys + mouse for 8 s (0 errors, EMP spent, state stays valid); double-click on restart (single clean start); resize mid-game at four sizes; tab switch for 2.5 s.

## Not verified
Genuine boss kill by fair play (bot too weak; boss reached by `startWave(5)` and killed by setting `boss.hp`), natural wave 1 to 2 transition (blocked by F1), real-device touch.

## Pass gate
0 errors: PASS. FPS (existing evidence 143): PASS. Reaches playing and survives input: PASS. Restart works: PASS functionally, FAIL on state hygiene (F2). Overall: FAIL until F1, F2, F4 are fixed.

---
STATUS: done
FILES: reports/shooter/qa.md, playtest-results/shooter-qa/*.png (35 screenshots)
API: none
VERIFIED: own Playwright runs on shooter.html (desktop 1280x720 and mobile 375x812 touch): 0 console errors, 0 failed requests; findings F1-F9 reproduced with evidence above; scripts deleted
REQUESTS: enemy-ai-engineer: F1, F3, F8. game-engine-developer: F2, F4, F7, F9. ui-hud-engineer: F2 (boss HUD), F4, F6, F8. weapons-upgrades-designer: F5. physics-game-feel-engineer: F1 camera constants. All edits go through bug-fixer, one writer at a time.
NOTES: F1 means 143 FPS evidence hides slow enemies; re-test wave pacing with `--software` or a 60 Hz cap after the fix. Debug shortcuts used: god mode, startWave(5), boss.hp edits.
