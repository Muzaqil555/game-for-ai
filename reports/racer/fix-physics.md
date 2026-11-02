# Apex Pursuit 3D: physics fix report

Agent: `physics-game-feel-engineer`. Owned file: `src/vehicle_physics.js` only. The earlier partial attempt crashed (`_applyStats` was called but never defined); this version defines every method it calls (`_applyStats`, `setStats`, `getStats`, `getNitroDrainPerSecond`, `_ratio`, `scrapeWall`, `measureGarageStats`). `racer.html` has NOT been changed; the old wall path (`applyContactImpulse`) still works, so the game runs unchanged until the REQUESTS below are applied.

## What changed

1. **Wall scrape.** New `physics.scrapeWall(laneX, limitX, dt)`, one call per step, touching or not. Lateral speed into the rail is reflected with restitution 0.5. Forward speed decays as `exp(-lossPerSec*dt)` with `lossPerSec = min(0.22, 0.10 + 0.015*normalSpeed)`, so grinding costs at most 22 % of speed per second and is frame-rate independent. The lane is clamped to the rail (no interpenetration). It returns a reused object: `collided, resolvedLaneX, side, impact, normalSpeed, impactSpeed, lossPerSec, energy, sparks, shake, rumble, scrape`. `sparks` is a rate-based integer count for this step; `impact` and `shake` fire once per hit (0.25 s cooldown); `GameJuice.shake` is only called on impact. `resolveGuardrailCollision` is kept as a wrapper.
2. **Drift gate and score.** Drift sustain now also requires speed at or above `minDriftSpeedKmh` (35); entry already did. A float accumulator `physics.driftScore` (total) and `physics.driftScoreRate` (points per second) are updated every step, 0 below the gate and during a spinout. Rate = `min(|slip|, 1.05 rad) * 3000 * driftScoreMult` (same as the old `|slip|*50*mult*60`). Per-step increment: `update()` result `.driftScoreDelta`.
3. **Mini-turbo.** `update()` now returns a reused step result: `{ miniTurbo (fired this update), miniTurboActive, miniTurboCount, driftScoreDelta, driftScore, driftScoreRate, drifting, spinout, shifted, backfire (0..1 peak intensity) }`. Also `physics.onEvent = (name, detail) => {}` receives `'miniturbo'` and `'wallimpact'`. The `neon:miniturbo` window event still fires (detail gains `count`).
4. **Cars match ARCADE_SPEC.** `baseTopSpeed` is now an enforced ceiling (it was ignored before: every car topped out near 330). Per-car gear scaling and a soft governor make the stated speed reachable. Measured with `measureGarageStats()`: see table. `driftScoreMult` 1.5 / 3.0 / 2.0 and `nitroDuration` 3.5 / 4.2 / 5.0 follow the spec. Nitro lifts the ceiling +8 %, mini-turbo +5 %, fading out in about 0.5 s.
5. **Stat hooks.** `physics.setStats({ topSpeed, accel, handling, nitroCapacity, nitroPower })` (multipliers, 1.0 stock, clamped 0.5 to 3), `getStats()`. `topSpeed` scales the ceiling and gearing, `accel` the engine torque, `handling` tyre grip and steering response, `nitroCapacity` sets `physics.nitroCapacity` (100 stock), `nitroPower` the nitro torque bonus. `getNitroDrainPerSecond()` returns `100 / nitroDuration`.
6. **dt audit.** Fixed: tyre-smoke emission (was a per-frame count; now rate based), smoke `vy *= 0.95` (now `exp`), smoke size lerp (was per-frame, now from `size0` by progress), limiter backfire chance (28 % per frame, now `1-exp`), spinout yaw noise (now `sqrt(dt)` scaled), skid-mark segments (distance spacing of 0.25 m instead of one per frame), `resolve3DMTVCollision` (takes `dt`, velocity loss via `exp`). `update()` splits frames longer than 34 ms into equal sub-steps (up to 200 ms) instead of silently slowing down. Everything else already used dt.

## Garage numbers (measured, 60 Hz, full throttle from standstill)

| Car | Top speed | 0-100 km/h | Old card |
| :- | :-: | :-: | :- |
| interceptor | 300 KM/H (measured 302) | 2.2 s | 340 KM/H |
| cyber_drifter | 320 KM/H (measured 321) | 2.0 s | 330 KM/H |
| phantom | 360 KM/H (measured 361) | 1.9 s | 365 KM/H, "ACCELERATION 2.5s" |

Suggested bar widths (top speed / 360): 83 %, 89 %, 100 %.

## Verification (headless Node, `playtest-results/racer-physics/`, deleted afterwards)

- Grinding the rail for 1 s starting at 180 km/h, throttle held, steer into the wall, emulating the `racer.html` lane update: ends at 177 / 181 / 183 km/h (interceptor / drifter / phantom), minimum 177 km/h, at both dt = 1/60 and 1/144 (differences under 0.3 km/h). Max lane 14.4500 m = the rail, never beyond. Sparks 80 vs 79 per second at 60 vs 144 Hz; 1 impact event in both.
- Engine off, same grind: 180 -> 151.1 km/h at both dt (-16 %, inside the 22 % cap).
- Drift below 35 km/h (handbrake + full steer, 3 s): score 0, not drifting, at both dt. Above the gate: 1096 vs 1052 points over 2 s at 60 vs 144 Hz (the handbrake entry differs slightly per step size; accumulator equals the sum of step deltas).
- Mini-turbo: step result flag and `onEvent` callback each fired once.
- Stat hooks: `topSpeed 1.1, accel 1.2, nitroCapacity 1.5` gives ceiling 330 km/h, tank 150, reached 332 km/h.
- `node --check src/vehicle_physics.js` OK; `npm run check` OK (24 scripts, 28 agents); `npm run playtest -- racer.html --seconds 10`: PASS, 0 errors, 0 failed requests, avg 143 FPS.

Not verified: feel in a live browser with the new wall API (racer.html not yet wired); the 500-body perf bar does not apply to this file.

## REQUESTS

**game-engine-developer, `racer.html`:**
1. Wall (`racer.html:1547-1578`): replace both barrier branches with one call after the lane update:
   ```js
   const wall = physics.scrapeWall(playerLaneX, BARRIER_LIMIT, dt);
   if (wall.collided) {
     playerLaneX = wall.resolvedLaneX;
     if (wall.sparks) emit3DSparks(wall.side * BARRIER_LIMIT, 0.45, 0, wall.sparks, -wall.side, 0.5, -0.2);
     if (wall.impact) triggerCameraShake(wall.shake);
     if (window.RacerAudio) window.RacerAudio.playMetalScrape(wall.scrape * 0.6 + (wall.impact ? 0.4 : 0));
   }
   ```
   (`emit3DSparks`'s count argument is currently 18 per frame; pass `wall.sparks`. Call `playMetalScrape` per step without the `Math.random() < 0.3` gate only if the audio module throttles it; otherwise throttle to about 8/s.) Stop calling `applyContactImpulse` for walls.
2. Lane update (`racer.html:1542`): `playerLaneX += physics.velocityLat * 2.4 * dt + steer * (physics.speedKmh/360) * 18 * dt;` (0.04 per frame equals 2.4 per second; this makes drift lateral travel frame-rate independent).
3. Drift scoring (`racer.html:1663-1668`): delete the `Math.round(...)` block. Use `const r = physics.update(...)` (capture the return value at ~L1531) and `score += r.driftScoreDelta;` (float; round only for display, e.g. `Math.floor(score)`). The multiplier now lives in the car (`physics.config.driftScoreMult`: 1.5 / 3.0 / 2.0); the HUD `driftMult` should show `physics.config.driftScoreMult`, replacing `selectedCarModel === 'cyber_drifter' ? 3.5 : 2.0` at ~L1727.
4. Mini-turbo: `if (r.miniTurbo) { /* HUD banner, RacerAudio cue, FOV punch */ }`, or listen to `window` event `neon:miniturbo` (detail `{ speedKmh, duration, count }`). Also available: `r.spinout`, `r.shifted`, `r.backfire`.
5. Nitro: drain `physics.getNitroDrainPerSecond()` instead of the literal `24`, and cap the tank at `physics.nitroCapacity` (normalize the HUD by it) so upgrades work.
6. Garage cards (`racer.html:413, 424, 435, 437`): TOP SPEED `300 KM/H` (interceptor), `320 KM/H` (cyber_drifter), `360 KM/H` (phantom). Phantom's "ACCELERATION 2.5s" becomes `0-100 KM/H 1.9s`; add the same row for the others (2.2 s, 2.0 s). Bar widths 83 % / 89 % / 100 %.
7. Optional: `const m = window.NeonVehiclePhysics.measureGarageStats(model)` returns the measured numbers (takes a few ms) if the cards should be generated rather than typed.

**enemy-ai-engineer / game-engine-developer:** the in-lane cop speed cap (qa finding 4) comes from repeated `applyContactImpulse` rear-end calls in `racer.html`; give those a per-contact cooldown or use a relative-velocity impulse. Not touched here (not my file).

**progression-economy-designer:** the upgrade garage can call `physics.setStats(...)` right after `createVehicle` and again on every purchase.
