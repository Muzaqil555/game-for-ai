# Apex Pursuit 3D: phase 3 integration (`racer.html`)

Agent: `game-engine-developer`. Only `racer.html` was edited. Evidence: `playtest-results/racer-integration/` (14 screenshots, `probe-results.json`; the probe scripts were deleted). Gates: `npm run check` ok (24 scripts, 28 agents); `npm run playtest -- racer.html --seconds 20` PASS, 0 errors, 0 failed requests, desktop and `--mobile`.

## What was wired

| # | Item | Result |
| :- | :- | :- |
| 1 | AI | One AI instance, `reset()` on every restart. Full player state in (`x, z, speed, isDrifting, driftAngle` in radians, `isNitro`); `playerSpeedScale`, `playerLateralPush` and `blowoutSpeedCap` (80 km/h, eased) applied. Credits only in `onCredits`; `onTakedown` only refills nitro, adds score, sparks. The solver's own takedown branch is gone: contacts go through `pursuitAI.reportContact`, and the solver only separates bodies (heavy units: geometry only; plain contacts: a 0.4 s rate-limited impulse, so a cop in lane no longer pins the car). `onAlert` maps to `NeonHUD.pushAlert` (`+$N` is parsed out of the text into `amount`; `heat_up` alerts are skipped because the HUD announces heat itself). `onHeatChange` stores the tier name that is passed as `heatName`, and the HUD raises the banner. `onBusted` ends the run. Cop opacity is `u.fade`; lightbar brightness follows `u.telegraph`. Hit-stop is owned by the AI (the sim freezes while `hitStopActive`). |
| 2 | Audio | `onAudioEvent: (cue, data) => RacerAudio.handleAICue(cue, data)` in the constructor; `connectToAI` is not called. `init/startEngine/startMusic` on launch, `playNitro` on press/release edges, `stopAllSirens + playNitro(false) + stopEngine + stopMusic` on end, restart and garage, `ctx.suspend/resume` on pause. Wall scrape sound throttled to about 8/s. Mute label read from the persisted state. |
| 3 | Physics | `scrapeWall` replaces both barrier branches; lane `velocityLat * 2.4 * dt`; float drift score from `r.driftScoreDelta`; mini-turbo gives audio, HUD toast, FOV punch and shake; nitro drains `getNitroDrainPerSecond()` and the tank is `physics.nitroCapacity` (HUD normalised by it); HUD multiplier `physics.config.driftScoreMult`. Garage cards: 300 / 320 / 360 km/h, bars 83 / 89 / 100 %, 0-100 km/h row on all three cards filled from `measureGarageStats` (2.2 / 2.0 / 1.9 s, typed fallback), drifter multiplier 3.0x. |
| 4 | HUD | `setCallbacks({onPause, onRunAgain, onGarage})` once at load; `reset()` on launch; `pushAlert` for every AI event and mini-turbo; `heatPercent` clamped 0-100; sim stops while paused or while the summary is open. |
| 5 | State machine | `idle \| running \| paused \| ended`. ESC and P pause (sim, AI, audio stop; `NeonHUD.setPaused`), they never open the garage over a race. Start button, Enter, Space only act in `idle`/`ended` with the garage open (`liveRun()` guard). Pause menu gets an "End run" button (added to the HUD-built menu by `racer.html`). Pause on `blur` and `visibilitychange`; held keys are cleared. |
| 6 | Summary | Busted or ended: duration, takedowns, peak heat, score, credits earned this run, best score. Best score is committed once at run end (or when a live run is abandoned), not per frame. |
| 7 | Traffic and spikes | Rendered. `trafficEnabled: true`. Traffic: pooled groups per type (sedan, sports, truck) over shared geometries and materials. Spike strips: two shared `InstancedMesh` (plates, teeth; triggered strips flatten). Cops: pooled meshes, shared geometries, per-mesh materials (needed for fade), 2 fixed siren `PointLight`s assigned to the nearest cops (light count constant, no shader recompiles); the chopper light is always in the scene with intensity 0 when inactive. The front of every cop mesh now faces +Z (rhino was never built before because it tested a field the AI does not set). |
| 8 | Security | #1, #2: pooled cops, `disposeTree` for the player car, car not rebuilt on launch when the model is unchanged. #4: SRI on all 7 CDN tags (hashes re-computed with curl + openssl against what the CDN serves today, all 7 match `security.md`). #5: `safeGetNum` / `safeSet` (try/catch, `Number.isFinite`, `>= 0`), credits saved on each `onCredits`. #10: `H = Math.max(1, ...)` in both places. #11: empty catch replaced by `warnOnce`. Also: camera lerps are dt-based (QA #9). |
| 9 | Mobile | Header: a "GAMES" button (visible under 700 px) opens a dropdown with the three games. Launch hint reads "TAP THE BUTTON TO LAUNCH" on touch and the keyboard controls bar is replaced by a touch one. The garage scrolls (no clipped top), content starts at 58 px under the 44 px header, the start button is sticky at the bottom. Pause button (HUD) reaches pause menu, End run, Restart, Garage. |

## Probe results (Playwright, real Chromium, desktop 1280x720 and 375x812 touch)

| Check | Result |
| :- | :- |
| 30 s drive with nitro | 0 errors, peak 302 km/h (interceptor), min 43-50 FPS sampled under vsync with screenshots in flight |
| Guardrail grind (hold W+D at 194 km/h, 1.5 s on the rail) | minimum 206 km/h while touching the rail (was 180 to 13 km/h) |
| Takedown | one `onCredits` call (800), credits delta 800, alert text `+$800`: all equal. A second run also showed a near miss +$200 in the same window: every credit change matches one `onCredits` call |
| Busted (heat 2, speed forced to about 0, cop within 5 m) | state `ended`, summary visible, `playerZ` unchanged over 0.5 s |
| ESC mid-run | state `paused`, `playerZ` frozen, garage hidden, PAUSED menu visible; Space does not reset; ESC resumes; End run shows the summary |
| 5 restarts (plus 24 car-card clicks) | `renderer.info.memory.geometries` 214, 214, 214, 214, 214, 214 and 214 before/after the clicks; programs flat at 11, textures at 12 (security.md measured +12 geometries per restart before) |
| Traffic / spikes in view | 15-16 traffic cars and a spike strip drawn (`d2_traffic_spikes.png`, `m2_drive.png`) |
| Mobile | hint without SPACE, GAMES menu opens, title at y = 58, touch gas reaches 189 km/h, pause button pauses, summary to garage works, 0 console warnings or errors |
| FPS | `npm run playtest` reports 65 avg for this build and also 64.5 for the unmodified HEAD `racer.html` run in the same session (vsync-capped harness, machine busy). Uncapped (`--disable-frame-rate-limit`): 235 FPS in the garage, 145 FPS in a run with traffic. |

Screenshots looked at: `d0`, `d2`, `d5`, `m0`, `m1`, `m2`. Spike strip, traffic and the busted summary render correctly; the mobile garage is no longer clipped.

## Limits and notes

- Heat 3+ content (roadblock, rhino, chopper) was not driven to completion in the probe; roadblock/rhino contacts go through the same `reportContact` path and were only code-read, spawn timing is the AI's.
- The summary cell is labelled "DRIFT SCORE" by the HUD; `racer.html` passes the run's total score (drift + 2,500 per takedown + 1,200 per spike evasion) so it matches the HUD number and the best score.
- Busted progress (`bustedProgress`) is not shown by the HUD; only the AI's "SURROUNDED" alert tells the player.
- `racer.html` still reads and writes `neon_velocity_credits` / `neon_velocity_best_score` itself (now guarded). AGENTS.md says only `GameSave` should touch storage: left for `backend-persistence-engineer`.
- Debug handle `window.ApexPursuit` (read-only getters: `state, ai, physics, fps, credits, score, ...`) is exposed for tests; no `?debug=1` overlay was added.

## REQUESTS

- `ui-hud-engineer` (`src/racer_hud.js`): add a native "End run" action to the pause menu (`onEndRun` callback) so `racer.html` can drop its DOM injection; rename the summary cell "DRIFT SCORE" to "SCORE"; optional `bustedProgress` meter.
- `backend-persistence-engineer`: move the two `neon_velocity_*` keys behind `GameSave`.
- `enemy-ai-engineer`: none blocking. Note `connectToAI` in `racer_audio.js` is now unused by this page.
- `audio-designer`: `playMetalScrape` plays a full crash sample per call; racer.html throttles it to about 8/s.

STATUS: done
FILES: racer.html, reports/racer/fix-integration.md, playtest-results/racer-integration/*.png
API: window.ApexPursuit (read-only test handle)
VERIFIED: npm run check; playtest racer.html desktop and --mobile 0 errors; Playwright probe (30 s nitro drive, rail grind 206+ km/h, single-payout takedown, busted summary and sim stop, ESC pause, 5 restarts flat geometries, mobile menu/pause/summary) all PASS; screenshots reviewed
REQUESTS: ui-hud-engineer (End run callback, summary label), backend-persistence-engineer (storage keys)
NOTES: FPS 65 in the vsync-capped harness (same as unmodified HEAD), 145 uncapped in-run; heat 3+ roadblock/rhino paths code-read only
