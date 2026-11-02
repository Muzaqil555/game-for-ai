# Void Nova (shooter.html) - fix 2: enemies, spawning, waves, boss

Only `shooter.html` was edited. Boons, weapons and HUD layout were not touched (a few damage call sites in weapon code were re-routed through `damageEnemy`, see item 2).

## What changed

| # | Item | Change |
| :- | :- | :- |
| 1 | Frame-rate dependence (QA F1) | Swarmer and sniper use an exact exponential integrator: `ENEMY_DRAG = -60 ln 0.94 = 3.712/s`, `v = vt + (v - vt) * exp(-k dt)` with `vt = force / k`. Terminal speed no longer depends on dt. Camera follow (0.08), zoom (0.06) and shake decay (0.88) use `1 - (1-c)^(dt*60)` and `0.88^(dt*60)`. Exhaust and missile-smoke particle rolls are dt-scaled. The old build never reached the nominal 280 px/s (about 62 px/s at 60 Hz), so swarmer `speed` is now the real cruise speed: `170 + 9 * min(wave,10)` = 179..260 px/s (ship tops out at 620). Sniper strafe and standoff forces are unchanged (about 100 px/s). Swarmers, snipers and mines are clamped inside the arena; asteroids are clamped when they bounce. |
| 2 | Zombies | New `damageEnemy(e, amount)` is the one place that subtracts enemy HP and calls `killEnemy` at hp <= 0. Used by bullets, plasma splash, Tesla arcs, EMP, singularity chain, decoy blast and contact self-damage. `killEnemy` is idempotent (`e.dead`), bullet loops skip dead enemies, and `updateEnemies` sweeps any hp <= 0 enemy as a safety net. |
| 3 | Boss danmaku / beams | Phase 2 volley every `BOSS_P2_VOLLEY_EVERY = 0.085 s` (3 arms, about 35 bullets/s; old code was about fps/3 volleys of 3). Phase 3 beam bullet every `1/18 s` (18/s; old `0.3 * fps`). Both use accumulators (max 4 catch-up steps, banked burst discarded after a hitch). All boss bullets go through `bossBullet()`, which stops emitting when 360 bullets are live (pool is 400). |
| 4 | Shield bypass | `damageBoss(amount, source)`: while any shield node lives the core is immune. EMP deals 150 to every live node; Tesla deals its damage to the live node nearest the ship. Bullets already hit nodes first. The core takes EMP (250) and Tesla only after all six nodes are down. |
| 5 | Spawn pacing | Spawns are placed on a ring just outside the visible rectangle (half-size `w/2/zoom + 90`, around the camera), inside the arena, and are announced by a pulsing chevron on the screen edge for 0.7 s (`pendingSpawns`, `drawSpawnWarnings`, colour per type). Wave 1: first spawn 0.15 s after launch with a shortened 0.45 s warning, scripted opening swarmer, swarmer, asteroid, swarmer; the first three spawns of every wave are 0.55 s apart. Mix: asteroids 20% in wave 1, +5% per wave up to the old 45% at wave 6; snipers from wave 2, mines from wave 3 (the old 45/30/17/8 mix is reached at wave 6). Drifters are launched toward the ship. Wave size is unchanged (`14 + 6n` spawn events); spawn gap `max(0.4, 1.2 - 0.1 n)`. Stragglers: 12 s after the last spawn, asteroids and mines slowly steer to the ship (110 and 70 px/s^2, capped at 90 and 60 px/s), so a wave can always be finished. |
| 6 | Contact damage | See table below, plus a 340 px/s knockback so one touch really is one touch. |
| 7 | Boss HP | 15,000 (ARCADE_SPEC 3.3), constant `BOSS_HP`. Nodes stay 600 x 6 on top. Rationale: the spec is the contract; the fight is now fairer (flat bullet density, immunity cues) and EMP/Tesla no longer chip the core, so the old 12,000 plus bypass is replaced rather than stacked. Revisit after the weapons pass if it runs long. |
| 8 | Wave progress API | `VoidNova.getWaveProgress()` returns `{wave, remaining, total, boss, bossHpPct, toSpawn, alive}`. Unit = one enemy alive or one pending spawn event. `total = remaining + killed this wave` (grows when asteroids split). During a boss wave: `remaining 1, total 1, boss true, bossHpPct 0..1`. |

Boss extras (spec: phases, invulnerable transition, visual cue, no unfair hits): the boss enters about 900 px from the ship on the far side of the arena (was a fixed point that could be on top of the player) with 2.0 s immunity. Each phase change gives 1.2 s immunity, a white pulsing shell, clears enemy bullets and pauses attacks. The phase 3 teleport now marks its destination with a purple shrinking ring for the last 0.9 s and never lands within 380 px of the ship. Boss death still awards 15000 and clears bullets.

### Contact damage (full pool 100 HP + 60 shield = 160; once per contact, then 0.5 s i-frames)

| Enemy | Was | Now | % of pool |
| :- | -: | -: | -: |
| Large asteroid | 25 | 22 | 14% |
| Medium asteroid | 18 | 16 | 10% |
| Small asteroid | 12 | 10 | 6% |
| Swarmer | 15 | 12 | 8% |
| Sniper | 20 | 18 | 11% |
| Singularity mine | 35 | 30 | 19% |

Bullets unchanged (sniper slug 35, boss 15-25). Staying inside an enemy costs at most one hit per 0.5 s, and each hit throws the ship out at 340 px/s. A single touch is never worse than 19% of the pool; a careless run through a pack costs a visible 30-60.

## Evidence

All from a Playwright probe (script deleted; screenshots kept in `playtest-results/shooter-fix2/`). For exact comparisons the probe froze the game's own loop and stepped `update(dt)` by hand with a seeded RNG; it also ran the real game in the browser.

**Enemy speed, same scenario at 30 / 60 / 144 / 240 Hz**

| Metric | 30 | 60 | 144 | 240 |
| :- | -: | -: | -: | -: |
| Swarmer avg speed, t = 1..2 s (px/s) | 178.0 | 177.9 | 177.9 | 177.9 |
| Sniper avg speed (px/s) | 99.6 | 99.6 | 99.6 | 99.5 |
| Camera x after 1 s following a 500 px jump | 2096.6 | 2096.6 | 2096.6 | 2096.6 |
| Camera shake left after 1 s from 20 | 0.0093 | 0.0093 | 0.0093 | 0.0093 |

**Wave 1 clear time (s), idle god-mode bot that aims and fires, 3 seeds, fixed step**

| Hz | seed 11 | seed 12 | seed 13 | mean |
| -: | -: | -: | -: | -: |
| 30 | 34.9 | 38.3 | 33.8 | 35.7 |
| 60 | 36.1 | 34.9 | 33.7 | 34.9 |
| 144 | 34.4 | 34.3 | 33.1 | 33.9 |
| 240 | 33.2 | 36.5 | 36.4 | 35.4 |

The spread is seed noise (about 2 s) with no trend against frame rate. Before the fix, 144 Hz never finished (QA F1).

**Real browser, wave 1 to boon draft, same bot:** native cadence (143.6 FPS) cleared in 34.0 s wall time; forced 60 Hz through a rAF shim (62.6 FPS) cleared in 32.7 s. Both ended in `boon_select`. Screenshots at 1.5 s: `1-native-t1.5s.png`, `1-forced60-t1.5s.png`.

**Boss bullets per second (10 s window after the transition, ship invulnerable so nothing absorbs bullets)**

| Phase | 30 Hz | 60 Hz | 144 Hz | 240 Hz | Peak live bullets (pool 400) |
| :- | -: | -: | -: | -: | -: |
| 2 (spiral) | 35.4 | 35.1 | 35.4 | 35.4 | 144 |
| 3 (beam) | 18.1 | 18.0 | 18.0 | 18.0 | 46 |
| 1 (nodes, random timers) | | 3.8 | 4.0 | | not measured |

For reference, from the code the old phase 2 gave roughly 60/s at 60 Hz and 144/s at 144 Hz (phase 3: 18/s vs 43/s). I did not run the old build to confirm these.

**Shield bypass:** fresh boss with nodes alive, core 15000: after one EMP the core is 15000 and each node 600 -> 450; after three EMPs and ten Tesla zaps the core is still 15000 (nodes 150/150/150/30/150/150). With all nodes dead, EMP takes the core to 14750. During a phase transition (invuln 1.2 s) an EMP leaves the core unchanged.

**Zombies:** EMP on 6 enemies with 50-100 hp: 5 killed, 1 left alive (100 hp > 90 damage, correct), 0 with hp <= 0. Plasma splash on 4 weak neighbours: 0 zombies. Mine chain reaction: 4 kills, 0 left. A run with two EMPs mid-wave still closes to the boon draft with 0 zombies.

**Pacing (8 seeds, 60 Hz, idle ship):** first enemy spawns at 0.63 s every time (0.15 + 0.45 warning), always a swarmer, 62-118 px outside the visible rectangle; first enemy inside the visible rectangle at 1.05-1.62 s (median about 1.12 s). Spawn mix over 4000 draws: wave 1 asteroids 19% / swarmers 81%; wave 2 24 / 58 / 18 sniper; wave 3 31 / 44 / 17 / 8 mine; wave 6 45 / 28.5 / 18 / 8. The boss spawned 900 px from the ship.

**One-touch damage measured:** large 22, medium 16, small 10, swarmer 12, sniper 18, mine 30.

**Gates:** inline script `node --check` OK; `npm run playtest -- shooter.html --seconds 15` PASS, 143.8 FPS, 0 errors; `--mobile` PASS, 143.2 FPS, 0 errors. Probe page errors: 0.

Screenshots: `1-native-t1.5s.png`, `1-forced60-t1.5s.png`, `2-*-t10s.png`, `3-*-end.png`, `4-spawn-warning.png` (edge chevron at top-left), `5-boss-intro-immune.png`, `6-boss-phase3-teleport-marker.png` (purple ring = jump destination).

## Not verified
- Boss fight by genuine play: it was reached and exercised through the API with nodes zeroed and HP set. A real kill time against 15,000 HP plus 3,600 node HP was not measured and will depend on the weapons pass.
- Spawn chevron on the real 375x812 mobile layout (desktop screenshot only).
- Real 60 Hz and 144 Hz monitors: 60 Hz was emulated with a rAF shim, 30 and 240 Hz by fixed-step simulation.
- Difficulty feel at waves 2-4 (no human play), especially sniper pressure and mine pull with the new knockback.
- Missile smoke and exhaust particle rates were made dt-scaled by reasoning only, not counted.
- The bot is stationary and invulnerable, so these numbers measure enemy behaviour, not survivability.

---
STATUS: done
FILES: shooter.html (edited); reports/shooter/fix-2-enemies.md; playtest-results/shooter-fix2/*.png (9 screenshots)
API: VoidNova.getWaveProgress() -> {wave, remaining, total, boss, bossHpPct, toSpawn, alive}; damageEnemy(e, amt), damageBoss(amt, source), damageNode; pendingSpawns[]; boss.invuln / boss.tpPending / boss.tpX,tpY; stragglerTimer; constants ENEMY_DRAG, BOSS_HP, BOSS_P2_VOLLEY_EVERY, BOSS_P3_BEAM_EVERY, ENEMY_BULLET_BUDGET, SPAWN_WARN_TIME
VERIFIED: node --check OK; playtest desktop 143.8 FPS and mobile 143.2 FPS, 0 errors; probe shows identical swarmer/sniper speed, camera and boss bullets/s at 30-240 Hz, wave 1 clears at every rate (mean 33.9-35.7 s), 0 zombies, boss core immune behind nodes
REQUESTS: weapons-upgrades-designer: route any new damage through damageEnemy / damageBoss (never touch e.hp or boss.hp directly); Tesla now hits the nearest shield node while nodes live (tune or add visuals); drones target enemies[0] instead of the nearest; boon text may need updating (EMP no longer chips the core); weapon cooldowns are dt-quantised at low fps. ui-hud-engineer: show getWaveProgress() (enemies left, boss bar via bossHpPct); restyle the canvas spawn chevrons (drawSpawnWarnings), the boss immune shell and teleport ring if desired; check chevron visibility on mobile and under the WAVE n INCOMING banner.
NOTES: ARCADE_SPEC says 15,000 boss HP and the game now matches; the spec owner should confirm. Swarmers are now really 179-260 px/s (old build ran about 62 px/s at 60 Hz), so wave 1 feels faster than before. Probe scripts were deleted.
