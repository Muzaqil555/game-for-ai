# Void Nova (shooter.html) - fix 3: weapons, projectiles, boons, drones

Only `shooter.html` was edited. HUD layout untouched (one `.badge-common` CSS rule and a reroll button created from JS inside `#boon-modal`, styled inline; see REQUESTS).

## What changed

| # | Item | Change |
| :- | :- | :- |
| 1 | Honest boons | Every card now does what its text says (table below). Each card has `max` levels, shows `LV n/max`, and leaves the pool when maxed. Two new common cards (PLASMA COILS, HULL PLATING) give the rarity tier real content. |
| 2 | Rarity and draft | `rollChoices(n, avoid)`: weighted draw without replacement, weights common 55 / rare 30 / epic 11 / legendary 4 (`RARITY_WEIGHT`). The biased `sort(random)` is gone. No duplicates in a draft or after a reroll. One reroll per draft (`reroll()`, button `#boon-reroll`); rerolled cards avoid the first three. `pick(cardId)` is the single pick path (state-guarded). |
| 3 | Boss targeting | `findNearestEnemy` always considers the boss (as its aim point: nearest live shield node, else core). Missiles home to the boss, a salvo spreads over the 3 nearest hostiles (`pickTargets`). Tesla routes through `damageBoss(dmg,'tesla')`, which hits only the node nearest the ship while nodes live. Bullet hits on the core go through `damageBoss`; node hits through `damageNode`. No code outside `damageEnemy`/`damageBoss`/`damageNode` subtracts enemy or boss hp. |
| 4 | Balance | See DPS table. |
| 5 | Tesla arcs | Arcs live in a pool (`arcPool`, 96) written in `update()` and drawn by `drawArcs()` inside the camera transform in `render()` (zig-zag plus white core, 0.14 s life). `drawJaggedLightning` removed. Chain now picks the nearest unvisited enemy (was first in array) and uses no per-shot allocation. |
| 6 | Drones | Nearest hostile (enemy or boss) within 900 px of the drone, retargeted every shot; cooldown accumulates dt; scales with attack speed and damage; extra levels add drones spaced evenly. |
| 7 | Fire timing | Weapon and drone cooldowns are accumulators (`cooldown += cd` instead of `= cd`), up to 6 catch-up shots, shots due mid-frame are placed `lead` seconds ahead, backlog dropped on hitch, no banked shots while the trigger is up. |
| 8 | Damage routing | All new damage (crit sparks, chain procs, Tesla, drones, splash) goes through `damageEnemy`/`damageBoss`. |

Extra fixes found on the way: plasma `pierce 3` used to hit the same enemy on three consecutive frames (frame-rate dependent); bullets now keep per-bullet hit memory. Fast bullets are sub-stepped (<=16 px, max 4 steps) so low fps cannot tunnel through targets. All player projectiles spawn through `spawnBullet()` which resets every field (no stale `target`/`aoe`). Plasma blast is centred on the hit enemy, so splash does not depend on the frame at which the shell first touches.

### Boons: text vs behaviour

| Card (rarity, max) | Effect now (measured) |
| :- | :- |
| PLASMA COILS (common, 3) | +20% damage on weapons, drones, chain. Laser 427 -> 512 DPS (x1.20). |
| HULL PLATING (common, 2) | +25 max hull, heals 25. hp 60/100 -> 85/125. |
| OVERDRIVE CORE (rare, 2) | +25% attack speed, +15% crit chance; crit = x2 and a spark for 50% into the nearest other enemy. Crit rate 15.4%, crit damage 20 from 10, spark 40 + 20 on neighbour, laser DPS x1.45 (expected 1.4375). Crits now exist. |
| PHOTONIC AEGIS (rare, 2) | +50 max shield (60 -> 110) and -25% damage taken. 40 damage: hull -30, shield -30. |
| TESLA HYPER-CONDUIT (rare, 3) | Laser/plasma/missile/drone hits: 25%/level chance to chain 3 enemies for 60% damage (measured 24.7%, second target takes 10.8 = 18 x 0.6). Zeus Arc gets +1 jump per level (3 -> 4 arcs). No longer dead. |
| NANO-REPAIR SIPHON (rare, 2) | Large asteroid, sniper, mine: +4 hull +12 shield per level. Swarmers and small/medium fragments give 0 (measured). Was: every kill, +4/+10. |
| TACTICAL EMP ARRAY (epic, 9) | Text now states what EMP does: 90 to enemies (measured 90), 150 per boss node (150), core 0 while nodes live. |
| QUANTUM DASH DECOY (epic, 1) | Text corrected to about 2s (code 2.2s), 250 damage, 220 px. |
| AUTONOMOUS COMBAT DRONE (legendary, 3) | Text no longer claims "secondary fire". 64 DPS per drone at 60 and 144 Hz; shoots the near enemy (126 damage) and not `enemies[0]` far away (0); hit the boss for 198 in 3 s. |
| VORTEX WARHEADS (legendary, 1) | Unchanged behaviour. |

Draft odds measured over 20,000 drafts: 0 duplicates; share of offered cards common 38.3%, rare 48.5%, epic 9.7%, legendary 3.6%; a legendary appears in about 10.6% of drafts (drone 5.3%, vortex 5.4%), an epic in about 14.5% each. Maxed cards were offered 0 times in 2,000 drafts. Reroll: first works, second refused, 0 overlap with the first three.

## DPS / role table (nominal, 1.0x attack speed, no boons)

Measured by stepping `update()` for 30 s of simulated time against stationary 1e9-hp dummies (single target at 450 px, 5-pack cluster of dummies 62 px around a centre; Tesla at 250 px).

| Weapon | Role | Single DPS | 5-pack DPS | 30 / 60 / 144 / 240 Hz (single) |
| :- | :- | -: | -: | :- |
| Vortex Twin Laser (slot 1) | Fast precise bolts, needs aim; best sustained single-target and boss DPS | 428 | 430 | 428 / 428 / 428 / 428 |
| Matter Annihilator (2) | Slow heavy shell, recoil, 2 pierce + one 40% blast; crowd breaker | 354 | 1146 | 354 / 354 / 354 / 354 (cluster 1146 at all four) |
| Hydra Seeker Pods (3) | Homing, long reach (900), spreads over 3 targets; fire-and-forget while kiting | 305 | 306 | 305 / 306 / 304 / 305 |
| Zeus Resonance Arc (4) | 340 px hitscan, no aim, chains 3; close brawler | 280 | 683 | 280 / 280 / 280 / 280 (cluster 683 at all four) |

Old values (QA F5): missiles scored about 4.7x laser, plasma about 0.3x. Now single-target DPS ranges 280-428 (Tesla 65% of laser, missiles 71%, plasma 83%), and each weapon pays for its strength: laser needs aim, plasma is slow with recoil, missiles trade peak for never missing, Tesla needs 340 px range. Plasma on a tight 5-pack is the highest number in the table by design (it is the crowd tool); it needs the pack to be lined up and the shell to arrive. Shots per second for the laser: 12.1 / 12.0 / 12.1 / 12.0 at 30 / 60 / 144 / 240 Hz.

Versus the boss (10 s, boss 330 px away, static): nodes up, laser 428, plasma 360, missiles 306, Tesla 280 DPS all land on shield nodes and 0 on the core; nodes down, the core takes 425 / 360 / 306 / 280. Tesla hits exactly one node, the nearest to the ship, and never the core while nodes live.

## Evidence

Playwright probe (script deleted, as asked; screenshots kept in `playtest-results/shooter-fix3/`). Game loop frozen, `update(dt)` stepped by hand with a seeded RNG, 0 page errors.

- DPS at 30/60/144/240 Hz: equal within 1% for every weapon and layout (largest spread 428 vs 430, 304 vs 306).
- Pools: bullet pool 500, arc pool 96, unchanged after 30 s runs of every weapon (no per-shot allocation).
- `1-tesla-arcs.png`: green arcs from ship to target and between five targets, visible; 6 live arcs after 4 frames.
- `2-boon-draft.png`: draft with LV badges and the reroll button.
- Gates: inline script `node --check` OK. `npm run playtest -- shooter.html --seconds 15`: PASS, 0 errors, 0 warnings, 64.4 FPS. `--mobile`: PASS, 0 errors, 64.2 FPS.

## Not verified
- FPS: this session the machine gives about 64 FPS everywhere (an untouched `racer.html` also gives 64.3), versus 143 FPS in fix 1 and 2, so display or power state is capped near 60 Hz. I did not measure the shooter at 144 Hz after my change, and I did not separately measure a pooling stress of 20 shots per second with 100+ enemies on a real display.
- Feel and balance by human play: DPS numbers are for stationary dummies. Real hit rates (laser aim, plasma slow shell), survivability and the boss kill time (15,000 HP + 3,600 node HP; at 428 DPS about 43 s of perfect laser fire) are not playtested.
- Weighted odds were measured against the 10-card deck; new cards change the numbers.
- Boon stacking at max levels (for example 3x Plasma Coils with Overdrive and drones) was not tested for runaway power.
- No sound for crits, chain procs or boon pick.

---
STATUS: done
FILES: shooter.html (edited); reports/shooter/fix-3-weapons.md; playtest-results/shooter-fix3/1-tesla-arcs.png, 2-boon-draft.png
API: VoidNova.rollChoices(n, avoid), pick(id), reroll(), boonLevel(id), spawnBullet(...), aimPoint(t), nearestBossNode(x,y), findNearestEnemy(x,y,max,skip), chainFrom, critSpark, addArc, drawArcs; player.damageMult/critChance/damageTaken/chainLevel/nanoLevel/boons; consts RARITY_WEIGHT, CHAIN_DAMAGE, CRIT_MULT, DRONE_COOLDOWN
VERIFIED: node --check OK; playtest desktop and mobile PASS 0 errors (about 64 FPS, machine-capped); probe: DPS equal within 1% at 30-240 Hz, all boon effects measured, boss damaged correctly by all four weapons, Tesla hits nearest node only, arcs visible
REQUESTS: ui-hud-engineer: style the reroll button `#boon-reroll` and `.badge-common` properly, check the draft at 375x812, show boon levels / active boons on the HUD, give crit damage (gold "!" float text) and chain arcs (cyan `#7df9ff`) a legend or onboarding line, add sounds for crit, chain and boon pick (audio-designer); weapon slot labels may want DPS/role tooltips from the table above. level-boss-designer: confirm boss kill time with the new weapon DPS (about 43 s of perfect laser fire vs 15,000 HP + 3,600 node HP).
NOTES: plasma pierce reduced 3 -> 2 and splash fires once per shell to keep crowd DPS bounded. Rarity weights, boon max levels and numbers are single constants at the top of the data block. Probe script deleted.
