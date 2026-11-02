# Void Nova (`shooter.html`): security and robustness audit

Auditor: `security-auditor` (report only, no game files edited)
Scope: `shooter.html` (all JS inline, lines 327-2366). `GAME_SPEC.md` does not cover this showcase game, so the owners below come from the AGENTS.md roster by domain. Because the whole game is one file, every fix must go through **one writer at a time** (phase 6, `bug-fixer`, or the named owner working serially).

## How this was verified
- A static read of the whole file, plus a grep for `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, string `setTimeout`/`setInterval`, `localStorage`, `JSON.parse`, `addEventListener`/`removeEventListener`, `disconnect`, CDN `<script>`, `integrity`, `api_key` and `token`.
- A temporary Playwright probe in headless Chromium, loading `file://.../shooter.html` with Google Fonts blocked. It wrote only to `playtest-results/shooter-security/`, and that folder was deleted afterwards. `npm run playtest` was not run.
  - Instrumentation: it counted `AudioContext` source nodes (created vs `ended`), `setTimeout` calls and rAF frames. It sampled CDP `Performance.getMetrics` (JSHeapUsedSize, Nodes, JSEventListeners) after two forced GCs.
  - **10-restart check**: each cycle started a run, autofired, forced a wave clear, picked a boon card, then died.
  - **3-minute run**: the player was invulnerable, autofiring, cycling weapons and dashing. It played normal waves from 0 to 60 s, boss phase 2 from 60 to 120 s and boss phase 3 from 120 to 180 s.
  - **Edge probes A-F**: these are the triggers quoted below.

## Findings

| # | Severity | Location | What goes wrong | Concrete trigger / evidence | Minimal fix | Owner |
| :- | :- | :- | :- | :- | :- | :- |
| 1 | **high** | `shooter.html:917` (`initUI`), reached from `:2363` | `localStorage.getItem` is called unguarded inside the constructor. When storage access throws, the constructor throws, `window.VoidNova` is never created and the start button does nothing. The game is completely unplayable. | Probe B: `localStorage` getter throws `SecurityError`. This is what Chrome does with "Block all cookies", or in an iframe sandboxed without `allow-same-origin`. Result: `pageerror: Access is denied`, `typeof VoidNova === 'undefined'`, menu still shown after clicking LAUNCH. | Wrap both reads (`:917`, `:1974`) and the write (`:1976`) in a tiny `safeGet/safeSet` with `try/catch` that `console.warn`s once and falls back to `0` / no-op. | `backend-persistence-engineer` |
| 2 | **high** | `shooter.html:935-962` (`startNewGame`) | A restart does not reset the bullet/particle pools and does not hide the boss HUD. Enemy bullets frozen at game over resume on the new run, and the player respawns at (1600,1600), usually inside them. | Probe D: die in boss phase 2 and click RE-LAUNCH. 176 enemy bullets are still active at restart (42 within 400 px of spawn). Wave 1 enemies cannot reach the player in under 1 s, yet hull+shield fell **160 → 70 within 1 s**. `#boss-hud` stays `flex` showing "PHASE 2" during wave 1. | In `startNewGame`, set `active=false` on every item of `bulletPool`, `enemyBulletPool`, `particlePool` and `floatTextPool`, and set `#boss-hud` to `display:none`. | `game-engine-developer` |
| 3 | medium | `shooter.html:1077-1204` (`update`), `:1828-1829`, `:1679-1680`, `:1833-1834` | `update()` does not stop after `gameOver()`. If the player dies in the same frame the wave's last enemy dies, `updateSpawner` calls `openBoonDraft()`, which overwrites `gameState` with `'boon_select'`. The player can then pick a boon and keep playing with negative HP, under the "STARSHIP DESTROYED" modal. | Probe C: hp 5, shield 0, ram the last small asteroid (contact 12 dmg, it dies from the 40-dmg ram). Result: state `boon_select`, hp -7, both modals visible. After picking a card: state `playing`, wave 2, hp -7, menu modal still `flex`. The high score can be written again on the next hit. | Return early from `update()` once `gameState !== 'playing'` after each sub-step, or simply guard `openBoonDraft` with `if (this.gameState !== 'playing' \|\| this.player.hp <= 0) return;`. | `game-engine-developer` |
| 4 | medium | `shooter.html:1622` (phase 2), `:1653` (phase 3); pool fallback `:749-753` | Boss bullet emission is per frame, not per second, so bullet density scales with refresh rate (Studio rule 5). At 144 Hz and above the 400-bullet pool saturates. `obtain()` then O(n)-scans and recycles bullets that are still flying, so they vanish mid-air. | Probe E (5 s simulated per rate). Phase 2: **59/s at 60 Hz, 144/s at 144 Hz, 241/s at 240 Hz**. Phase 3: 18/s vs 45/s. Phase 2 bullets live 4 s, so 144 Hz needs about 576 slots > pool 400. | Use an accumulator: `this.boss.emitAcc += dt; while (emitAcc >= 1/20) { emitAcc -= 1/20; fire 3 arms }` for phase 2, and the same with 1/18 s for phase 3 instead of `Math.random() < 0.3`. | `level-boss-designer` |
| 5 | low | `shooter.html:1974-1976`, `:917-918` | The high score is parsed without validation. A non-numeric stored value makes `parseInt` return `NaN`, so `score > NaN` is always false and the record is never updated again. It is shown with `innerText`, so there is **no XSS**. The demo is deployed to `muzaqil555.github.io`, an origin shared with every other Pages site of that account, so any of them can write this key. | Probe A: `void_nova_high_score='abc'`. The menu shows "RECORD SCORE: abc PTS". After a 99 999-point run the stored value is still `'abc'`. | `const n = Number.parseInt(raw, 10); const high = Number.isFinite(n) && n >= 0 ? n : 0;` and use it in both places. Store `String(Math.floor(score))`. | `backend-persistence-engineer` |
| 6 | low | `shooter.html:1310-1311`, `:1276-1278`, `:1285-1287` | `findNearestEnemy` falls back to the boss, so the Tesla arc damages the boss core directly and bypasses the phase-1 "core invulnerable while orbiters live" rule (bullets respect it at `:1414-1415`). It also calls `killEnemy(boss)`, which runs with `radius`/`color`/`type` undefined: `Math.floor(NaN)` particle count, `fillStyle = undefined` and an extra combo/score. | Probe F: Tesla held 250 px from the boss for 2 s. Boss hp **12000 → 11268 with all 6 orbiters alive**. No exception was thrown (the NaN loop count just spawns 0 particles). | In `fireActiveWeapon` (Tesla) and `applyTeslaArc`, skip the boss while any orbiter has `hp > 0`, and never pass the boss to `killEnemy`. | `weapons-upgrades-designer` |
| 7 | low | `shooter.html:1673` + `:1680` | On boss death `openBoonDraft()` runs twice in the same frame: once from `updateBoss`, then again from `updateSpawner`. The cards are rebuilt and the chime plays twice. It does not leak, because `innerHTML=''` drops the old cards and their listeners. | Probe F: setting `boss.hp=-1` produced `openBoonDraftCalls: 2`. | `return` from `update()` after `openBoonDraft()` (the fix in #3 also fixes this). | `game-engine-developer` |
| 8 | low | `shooter.html:1030`, `:1366`, `:1794` | EMP, plasma splash and singularity shockwave subtract HP but never call `killEnemy`. Enemies at `hp <= 0` stay alive, still deal contact damage and keep the wave from ending until something hits them again. Homing missiles re-acquire these "zombies" every frame (`:1327`). | Code path: an EMP lowers a 28-hp swarmer to -62. It stays in `this.enemies` and in `waveEnemiesLeft` logic until its next hit or ram. | After each AoE loop, collect the enemies with `hp <= 0` and `killEnemy` them once. | `game-engine-developer` |
| 9 | low | `shooter.html:865-891` | There is no `blur`/`visibilitychange` handler. If the player alt-tabs while holding a fire or move key, `keyup`/`mouseup` never arrive, so firing or thrust stays stuck on return. | Hold W + mouse, alt-tab, come back: the ship keeps thrusting and firing. | `window.addEventListener('blur', () => { Object.keys(this.keys).forEach(k => this.keys[k] = false); this.mouse.down = false; });` (registered once, in `initEvents`). | `ui-hud-engineer` |
| 10 | low | `shooter.html:216` | `target="_blank"` link with no `rel`. Modern browsers imply `noopener`, so the practical risk is tiny, and the target is the repo's own GitHub. | n/a (hardening) | Add `rel="noopener noreferrer"`. | `ui-hud-engineer` |
| 11 | low | `shooter.html:10` | The Google Fonts stylesheet has no SRI. Google's CSS varies by user agent, so SRI is not possible here. It loads over HTTPS and tells Google the player's IP. There is no third-party **script**. | n/a | Acceptable. Optionally self-host the two fonts or drop to the `monospace`/`sans-serif` fallback. | `ui-hud-engineer` |

No critical findings.

## Clean categories (checked, none found)
- **Injection / XSS: none found.** The `innerHTML` at `:1845` only interpolates the constant `BOON_DECK` fields, and the one at `:1968` only interpolates the numbers `this.wave` and `this.score`. No storage, URL or network data reaches HTML: the saved high score goes through `innerText` (`:918`, `:1977`). There is no `eval`, `new Function`, string `setTimeout`, `document.write`, `outerHTML` or `insertAdjacentHTML`. Hardening note: keep `:1968` numeric-only. Never interpolate the stored high score there.
- **Secrets: none found.** There are no keys, tokens or private URLs in `shooter.html`.
- **Server trust: n/a.** Scores are client-only and never sent anywhere.
- **Listener / DOM leaks across restarts: none found.** All window and button listeners are registered once (`initEvents`/`initUI`, called only from the constructor). Boon-card listeners are dropped with `innerHTML=''`. 10-restart check: DOM nodes **320 → 320**, JS listeners **48 → 48**, heap 2.25 → 2.44 MB (about 20 KB per cycle, consistent with JIT/IC warm-up, not retained objects).
- **Unbounded arrays in a long session: none found.**
  - Bullets, particles and floating text use fixed pools (500/400/1200/100). These never grew in 3 minutes of bullet-hell.
  - `decoys` is spliced after 2.2 s and stayed at 0-2.
  - `enemies` is bounded per wave (14 + 6n spawns, with asteroid splits).
  - `drones` grows by at most one per boon pick.
  - Heap over the 3-minute run: **1.78 MB at t=0, then 2.21-2.36 MB from t=15 s to t=180 s (flat)**. DOM nodes stayed at 275/314 (boss HUD shown), listeners at 34-44, FPS 59-61, 0 page errors.
  - Not a leak, but a cost: `killEnemy` allocates a new array per kill (`:1748`, `filter`), and boids are O(n²) at high waves. Both are performance-optimizer items.
- **Timers: none leaking.**
  - The music scheduler is one self-rescheduling `setTimeout` chain, guarded by `if (this.ctx) return` in `init()`. It measured about 8.5 calls/s, which matches 16th notes at 128 BPM, and did not multiply across 10 restarts.
  - `showBanner` timeouts are one-shot. Overlapping banners can hide each other early, which is cosmetic only.
- **AudioNodes: none leaking.** Every one-shot oscillator or buffer source is `start`ed and `stop`ped. Created vs `ended` stayed balanced (3 897 created / 3 895 ended after 3 min; 523 / 521 after 10 restarts, the gap being the notes playing at that moment). Stopped sources with no JS references are collected by the engine, so an explicit `disconnect()` is not required. There is one `AudioContext` per page.
- **NaN in homing-missile math: none found.**
  - `atan2` never returns ±Infinity, so the `while` angle-normalisation loops (`:1332-1333`) always terminate.
  - A NaN `diff` falls through harmlessly.
  - Boids divide only when `d > 0` (`:1479`) or `neighborCount > 0`. Graviton pull is guarded by `dist > 15`. The speed cap only divides when `curSpeed > maxSpeed`.
  - Every 15 s sample in both runs showed 0 NaN positions for the player, enemies and bullets.
  - The only NaN seen is the boss particle count in #6, which spawns zero particles.

## Notes for other owners (not security)
- `drawJaggedLightning` (`:1294`) is called from `update()`, outside the camera transform, and is wiped by `clearRect` in the same frame, so Tesla chain arcs are never visible. Route to `art-director`.
- On the first rAF frame `dt` can be negative, because `lastTime` is taken in the constructor and `Math.min` has no lower bound (`:2349`). It is harmless today because the first frames are in the menu. `Math.max(0, …)` makes it safe.

---

```
STATUS: done
FILES: reports/shooter/security.md (created). No game files edited. Temporary probe playtest-results/shooter-security/ created and deleted.
API: none
VERIFIED: static review of shooter.html plus grep for risky patterns; headless Chromium probe: 10-restart check (nodes 320->320, listeners 48->48, heap +0.19 MB), 3-minute bullet-hell run (heap flat 2.21-2.36 MB, 59-61 FPS, 0 errors, audio sources created/ended balanced), edge probes A-F reproducing findings 1-7; npm run playtest not run (per brief)
REQUESTS: #1 and #5 -> backend-persistence-engineer (guarded and validated localStorage); #2, #3, #7, #8 -> game-engine-developer (restart reset, state guard, AoE kills); #4 -> level-boss-designer (dt-based boss emission); #6 -> weapons-upgrades-designer (Tesla respects boss shield); #9, #10, #11 -> ui-hud-engineer. All in one file: apply serially.
NOTES: No critical findings; two high (storage-blocked crash, stale bullets after restart). No XSS, secrets, listener/timer/AudioNode leaks or unbounded arrays. GAME_SPEC.md does not cover shooter.html, so owners were assigned by domain. Retest after fixes: probes B, C and D.
```
