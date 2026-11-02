# Void Nova (shooter.html) - fix 1: engine / lifecycle / input

Only `shooter.html` was edited (inline script, one pause overlay block in the HTML/CSS, one `rel` attribute). Enemy behaviour, boss patterns, boons and HUD layout were not touched.

## What changed

| # | Item | Change |
| :- | :- | :- |
| 1 | Restart hygiene (QA F2/F3, sec #2) | `startNewGame` now deactivates every pooled bullet, enemy bullet, particle and float text (`resetPools`), clears enemies, boss, decoys, hides `#boss-hud` and resets its bar, resets combo/score/kills/wave timers, spawn timer, camera, aim, shield timer and all player cooldowns (dash, EMP, weapon, dashing), and resets audio combo. Boss death and every boon-card pick call `clearEnemyBullets()` before the next wave starts. `startWave` always sets `spawnTimer = 0.5`. |
| 2 | Pause (QA F4/F9) | New `paused` state. Esc and P toggle (ignores key repeat), `#pause-modal` overlay with a RESUME button, `audio.duck()` drops master gain to 0.12 and restores it. `window blur` and `visibilitychange(hidden)` auto-pause and clear held keys and mouse-fire. Simulation does not run while paused; keyboard actions are ignored unless `playing`. |
| 3 | Storage (sec #1/#5) | `safeGetHigh` / `safeSetHigh` wrap every localStorage access in try/catch; value accepted only if `Number.isFinite` and `>= 0`, fallback 0. |
| 4 | Playing on after death (sec #3/#7, QA F7) | `openBoonDraft` returns unless `gameState === 'playing'` and HP > 0; boon cards re-check state on click; `gameOver` is idempotent, hides boon/pause modals and the boss HUD. `damagePlayer` ignores calls when not playing or already dead. |
| 5 | Contact damage (engagement #1) | `player.iFrames` (0.5 s, `CONTACT_IFRAMES`) is set by any damage; contact damage is blocked while it runs. Each enemy also has `contactCd` (0.5 s). Result: one hit per contact, then at most one per 0.5 s while still overlapping. Enemy bullets are not blocked by i-frames (bullet-hell balance unchanged). Damage numbers untouched. |
| 6 | Mouse / link | Only button 0 fires; mousedown on buttons, links, boon cards, weapon slots is ignored; context menu suppressed while playing; touch only sets fire while playing. GitHub link has `rel="noopener noreferrer"`. |
| 7 | Honest game over | Title stays "STARSHIP DESTROYED"; subtitle is now "Reached WAVE n - Kills: k / Final Score: s PTS"; the record line shows "RECORD SCORE: best" or "NEW RECORD SCORE". Added `this.kills` counted in `killEnemy`. |
| 8 | dt | All new timers use `dt`. Loop dt now clamped to `[0, 0.05]` (first-frame negative dt). Enemy/boss dt bugs left alone. |

## Evidence

- Inline script extracted and `node --check`: SYNTAX_OK.
- `npm run playtest -- shooter.html --seconds 15`: PASS, 142.1 FPS avg, 0 errors, 0 warnings.
- `npm run playtest -- shooter.html --seconds 15 --mobile`: PASS, 140.9 FPS avg, 0 errors.
- Playwright probe, 21/21 checks passed (script deleted; screenshots kept in `playtest-results/shooter-fix1/`):
  - 1: with 81 enemy bullets, 60 player bullets and the boss HUD showing, the first synchronous state after clicking RE-LAUNCH had 0 bullets, 0 particles, 0 enemies, boss null, HUD `none`, score/combo 0, wave 1, cooldowns 0, HP 100. Boss death with 100 live bullets leaves 0 active, in the draft and after picking a card (wave 6).
  - 2: Esc pauses (enemy x frozen at 1900 for 600 ms, overlay `flex`), Esc and P resume; holding W + mouse then `blur` gives `paused`, `keys.w=false`, `mouse.down=false`; `visibilitychange` hidden pauses.
  - 3: `localStorage` getter throwing SecurityError: game starts, dies, 0 errors. Stored `'abc'`: menu shows 0 and a later record overwrites it with `777`.
  - 4: hp 5, last asteroid rammed in the same frame: state `gameover`, boon modal hidden, game-over modal shown, and a direct `openBoonDraft()` call is refused. (Before the fix this gave `boon_select` and hp -7.)
  - 5: mine on the player, shield 60 / hp 100: 160 -> 125 at 0.4 s (one 35 hit), 90 at 0.6 s, 55 at 1.2 s, i.e. one hit per 0.5 s instead of 3 hits in 3 frames.
  - 6/7: right button does not fire, left does; rel contains noopener; game-over text "STARSHIP DESTROYED / Reached WAVE 5 - Kills: 12 / Final Score: 4321 PTS".
- Screenshots: `1-after-restart.png`, `2-paused.png`, `3-storage-blocked-gameover.png`, `4-gameover-wins.png`, `7-gameover-summary.png`.

## Not verified
Real alt-tab focus loss (the `blur` and `visibilitychange` events were dispatched, not produced by the OS). Real touch device. Audio ducking was checked by code only (headless has no audible output).

---
STATUS: done
FILES: shooter.html (edited); reports/shooter/fix-1-engine.md; playtest-results/shooter-fix1/*.png (5 screenshots)
API: VoidNova.setPaused(bool), clearEnemyBullets(), resetPools(), clearInput(), kills; gameState gains 'paused'; NovaAudioEngine.duck(bool); player.iFrames; enemy.contactCd; CONTACT_IFRAMES = 0.5
VERIFIED: node --check OK; playtest desktop 142 FPS and mobile 141 FPS, 0 errors; 21/21 Playwright probe checks for items 1-7
REQUESTS: enemy-ai-engineer: F1 frame-rate-dependent swarmer/sniper damping and camera constants (camera lerp 0.08, shake 0.88, zoom 0.06 are still per-frame), boss phase 2/3 emit gates (per frame, ~L1622/L1653), boss bypass via EMP/Tesla, AoE kills that never call killEnemy (EMP/plasma leave hp<=0 zombies), exhaust/missile smoke per-frame rolls, tune contact damage numbers now that it is once per contact. weapons-upgrades-designer: dead/untruthful boons, findNearestEnemy ignoring the boss (F5), shuffle bias. ui-hud-engineer: style `#pause-modal` and the game-over summary (currently plain text in `.menu-subtitle`), wave-progress readout, mobile layout and touch stick (touchstart fire, movement), onboarding of Esc/P in the menu pills.
NOTES: Two boss-death `openBoonDraft` calls in one frame are now harmless (second is refused). Music scheduler keeps running while paused (ducked, not suspended). Probe script kept at no path in the repo (deleted as requested).
