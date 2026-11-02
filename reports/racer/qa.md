# QA report: Apex Pursuit 3D (`racer.html`)

Reviewer: qa-browser-tester. Review only; no game file was edited.
Method: own Playwright scripts (GPU Chromium, 1280x720 and 375x812 touch), with a test-only probe that wraps `NeonPursuitAI` and samples the rendered scene graph every frame to measure car-to-car overlap. Scripts were deleted afterwards. Screenshots are in `playtest-results/racer-qa/` and every one cited here was opened and looked at.
Not re-proved (already known): wall contact stops the car, ESC does not pause, start button resets a live run, near-miss/evasion rewards unpaid, cop mesh GPU leak, mobile HUD overlap.

## Verdict

Desktop: loads and plays, 0 console errors, 0 failed requests across about 12 minutes of play. Gate items that pass: all 3 cars selectable and drivable, C/M work, restart via ESC then Enter x3 works.
Not passing the brief: there is no game-over, busted or crash state, so "die and restart" cannot be exercised. Touch steering to the right is broken. Traffic does not exist visually.

## Findings

| # | Sev | Title | Owner |
| :- | :- | :- | :- |
| 1 | High | Mobile: STEER RIGHT button centre is dead and its right half triggers E-BRAKE | ui-hud-engineer |
| 2 | High | No fail state: no busted, crash, damage or game over; the pursuit never ends | game-engine-developer (+ enemy-ai-engineer) |
| 3 | Medium | Civilian traffic is simulated (16 units) but never rendered or collidable by the player | game-engine-developer / art-director |
| 4 | Medium | A cop sitting in the player's lane acts as an invisible speed governor | physics-game-feel-engineer |
| 5 | Medium | Mobile has no way to reach the garage, restart or pause; garage shows keyboard hint and title is hidden behind the site nav | ui-hud-engineer |
| 6 | Medium | Unguarded `localStorage` in `racer.html` (can throw at boot) and it breaks the "only GameSave touches storage" rule | game-engine-developer, backend-persistence-engineer |
| 7 | Low | No blur / visibilitychange handler: held keys can stick | game-engine-developer |
| 8 | Low | Two parallel collision/takedown systems (AI and 3D solver) with different rules and rewards | enemy-ai-engineer + physics-game-feel-engineer |
| 9 | Low | Lateral drift step is not scaled by dt; camera lerp is per frame | physics-game-feel-engineer |
| 10 | Low | Touch layer is decided once at init; hint text, hood cam beam, number format | ui-hud-engineer |
| 11 | Info | Heat 3+ content (roadblocks, chopper, SWAT Rhino) not reached in a 2 minute run | narrative-balance-designer |

### 1. HIGH: Steer-right is unusable on touch
- Repro: 375x812 touch, tap start, hit-test each control. With CDP touch on the centre of `#btn-steer-right` (127,757): `elementFromPoint` returns `.mobile-pedals-zone`, `NeonHUD.getMobileInputs().steer` stays 0. A touch at (149,757) (right edge of the same button) sets `handbrake: true`. Only a roughly 15 px strip on the left of the button steers right. Left, NOS, E-BRAKE, BRAKE and GAS centres all respond correctly and release cleanly (inputs return to 0 on touchend).
- Result: you can steer left but effectively not right on a phone, and pressing the right arrow often locks the handbrake.
- Cause: both zones are pinned to the bottom corners and are wider than the 375 px screen. `.mobile-steering-zone` spans x 24-156; `.mobile-pedals-zone` (right:24) extends left to about x 101, and `.mobile-nitro-btn` uses `margin-right:-32px` at max-width 600 px, pulling NOS and E-BRAKE over the steer buttons.
- Suspected: `src/racer_hud.css:695` (`.mobile-pedals-zone`), `:738` and `:906` (`.mobile-nitro-btn`, negative margin), `:874` media block.
- Evidence: `playtest-results/racer-qa/e2_gas.png`, `e3_steer.png` (arrows visibly stacked against NOS and E-BRAKE).

### 2. HIGH: No lose condition
- Repro: ram cops, grind the wall, drive 2 minutes with heat 2 and 2 cops. Nothing ends the run: no player health, no "busted", no arrest timer, no wreck of the player. `grep` for bust/arrest/damage/gameOver in `racer.html`, `src/racer_ai.js`, `src/racer_hud.js` finds only cop health. Heat 5 and the 400000 track length also have no consequence or finish.
- `isPlaying` is only ever set to true (`racer.html:1287`). The AI also mutates `player.speed` on rhino/civilian hits, but `racer.html` passes a throwaway object each frame, so those penalties are discarded.
- Impact: the brief's "busted/crashing, game over, restart" flow does not exist. Restart is only possible through ESC then Enter or the start button.

### 3. MEDIUM: Traffic is invisible
- `ai.trafficUnits.length` is 16 in every run, civilians collide and "near miss" inside `src/racer_ai.js:1143` (`_resolveCollisions`), but `racer.html` has no reference to `trafficUnits`: only `policeUnits` are meshed (`update3DPoliceUnits`, `racer.html:963`). Player cannot see or hit traffic; the spec promises heavy traffic.
- Evidence: all driving screenshots (e.g. `a2_drive_interceptor.png`, `d_cam_drone.png`) show an empty road apart from one cop.

### 4. MEDIUM: Cop in lane caps your speed
- Repro: hold W only (no steering). At 10.3 s the player (173 km/h) reaches a patrol cruiser at distance 5 m in the same lane. For the next 25 s speed saw-tooths 66-95 km/h while the cop stays at 5 m (cop `vz` 80). Relative speed is under the takedown threshold (`relKmh > 38`, `racer.html:1384`) so the cop is never wrecked, and each rear-end contact applies `applyContactImpulse` (`racer.html:1473`-ish rear-end branch). The car is pinned for as long as the player doesn't steer.
- Evidence: `playtest-results/racer-qa/b_drop_0.png` (cop bumper on the car's roof line, 71 km/h, full throttle).

### 5. MEDIUM: Mobile has no menu path
- No pause/garage/restart button on touch (`start-race-btn` is the only visible non-HUD button). Esc is the only way back to the garage.
- Garage on phone: the site nav bar covers the top of the modal (title "APEX PURSUIT 3D" is hidden behind it, the first card is clipped) and the launch hint says "PRESS SPACE OR ENTER TO LAUNCH". Evidence: `e0_garage.png`.
- Touch controls are decided once at init (`src/racer_hud.js:750`); resizing a desktop window to 900 px or 375 px afterwards leaves `mobile-touch-layer` inactive (`d_resize_900.png`; at 375 the layer shows only because of the `@media` rule forcing it).

### 6. MEDIUM: Storage
- `racer.html:1106-1107` read `localStorage` at boot with no try/catch; with blocked storage (private window, cleared site data) the whole IIFE aborts before `animate` starts. Writes at `:1248`, `:1397`, `:1669` are also unguarded. AGENTS.md rule says only `src/save.js` touches storage. Not run with storage blocked; code-read.

### 7. LOW: Stuck keys
- No `blur`/`visibilitychange` handler (only keydown/keyup at `racer.html:1179`, `:1207`). Alt-tab with W or Shift held leaves it latched. Code-read; the synthetic blur I fired could not reproduce focus loss.

### 8. LOW: Duplicate takedown logic
- `NeonPursuitAI._resolveCollisions` (`src/racer_ai.js:984`) can wreck a cop and fire `onTakedown`, whose handler awards `event.bounty || 1500` (`racer.html:1247`; the event actually carries `reward`, so the fallback 1500 always wins), while `resolve3DVehicleCollisions` awards `takedownValue` (800 for a patrol cruiser). Credits seen: first takedown +$800, later steps +$1,500 and +$2,300 in one 5 s window. Possible double payout; not isolated.

### 9. LOW: Frame-rate dependence (code-read)
- `racer.html:1542` adds `physics.velocityLat * 0.04` per frame without `dt` (it drifts about 2.4x faster at 143 FPS than at 60); `racer.html:1783` lerps the camera by a fixed 0.16 per frame. Plain steering is dt-correct (measured dx 6.7 m at 100 FPS vs 6.9 m at 20 FPS), so only drift lateral travel is affected.

### 10. LOW: Cosmetics
- Credits/score use locale grouping so "1.300" and "$1.600" read as decimals (`d_esc.png` HUD).
- Hood cam: the cop's white thruster beam fills the screen centre (`d_cam_hood.png`) and the player's own car is invisible.

### 11. INFO: Heat pacing
- Weaving with handbrake and nitro (Phantom) took about 100 s to reach HEAT 2; passive driving gains 0.012 progress per second so HEAT 2 takes 80 s or more. Roadblocks, spike strips, helicopter and SWAT Rhino (heat 3+) were not reached, so their collision paths are untested here.

## Collision and clipping results (the studio's "objects pass through each other" rule)

| Test | Setup | Result |
| :- | :- | :- |
| Rear-end a cop (30 s, 143 FPS) | bot holds throttle, steers into cop's lane | max visible overlap 0.014 m, 3211 frame samples, 0 clips, 0 tunnelling |
| Nitro ram (30 s) | bot nitros into cops | max 0.014 m, 0 clips, 0 tunnelling (3094 samples) |
| Side-swipe (30 s) | bot lines up beside cop, swerves in | max 0.012 m, 0 clips (3154 samples) |
| Low FPS (CPU x6, about 15 FPS, dt near clamp) | nitro ram 40 s | max 0.044 m, 0 tunnelling (620 samples) |
| Guardrails, both sides | hold W+D then W+A for 8 s each | position clamps at +/-14.45 m, never exceeds it; never passes through. Contact collapses speed to 12-18 km/h (known) |
| Traffic | n/a | no visible traffic, see finding 3 |
| Roadblocks, SWAT Rhino, spike strips | needs heat 3+ | not reached, untested |

Note: an early probe that sampled before the solver ran showed 1.6 m residual overlap with a cop. That was a measurement artifact; sampling the rendered scene shows no clipping. Cop-versus-player contact is solid.

## Feature checklist

| Item | Result |
| :- | :- |
| Select all 3 cars | PASS, card marks selected, correct physics model each time (`a1_select_*.png`) |
| Accelerate, brake, steer | PASS (e.g. 0 to about 190 km/h in 8 s, braking to 50 in 2.5 s) |
| Drift (Space + steer) | PASS, slip angle and score update (`a3_drift_*.png`) |
| Nitro (Shift) | PASS, speed rises and bar drains |
| Camera C | PASS, CHASE to HOOD to DRONE to CHASE (`d_cam_*.png`) |
| Mute M | PASS, button text toggles MUTED/AUDIO |
| Heat rising | PASS but slow, see 11 |
| Takedowns and credits | PASS, banners and credits update |
| Busted, game over | FAIL, does not exist (2) |
| Restart x3 | PASS via ESC then Enter; fresh AI each time, 0 errors |
| Pause (ESC) | Known: game keeps running behind the garage (631 world units advanced in 1 s) |
| Resize 1280 to 900 to 375 | PASS, canvas follows (900x556, 375x656), no errors; touch layer does not adapt (5) |
| Mobile touch controls | Exist (steer, NOS, E-BRAKE, BRAKE, GAS); steer-right broken (1) |
| Console errors / failed requests | 0 / 0 in every run |

## Frame rate
About 100-143 FPS desktop during these runs (`h_fps` 101 FPS at no throttle); consistent with the existing playtest at 143 FPS. No stutter noticed.

## Top fixes to route
1. ui-hud-engineer: separate the mobile steer and pedal zones (finding 1), add a pause/menu button and fix garage layout (5).
2. game-engine-developer with enemy-ai-engineer: add a busted/crash/game-over loop (2); render traffic (3) or remove it.
3. physics-game-feel-engineer: stop the in-lane cop from capping speed (4).

STATUS: done
FILES: reports/racer/qa.md (screenshots in playtest-results/racer-qa/; probe scripts deleted)
API: none
VERIFIED: own Playwright runs on racer.html desktop and 375x812 touch; 0 console errors, 0 failed requests; all cited screenshots opened
REQUESTS: ui-hud-engineer (findings 1, 5, 10); game-engine-developer (2, 3, 6, 7); enemy-ai-engineer (2, 8); physics-game-feel-engineer (4, 9); narrative-balance-designer (11); backend-persistence-engineer (6)
NOTES: heat 3+ collision paths (roadblocks, Rhino, spikes) untested; findings 6, 7, 9 are code-read, not reproduced
