# Playtest Council: VOID NOVA (shooter.html)

Scope: review only. No game files were edited. Spec: `ARCADE_SPEC.md` section 3 (Void Nova).
Date: 2026-11-02. Build: `shooter.html` as checked in (single file, ~2368 lines).

## Evidence used

| Source | What it covers | Confidence |
| :- | :- | :- |
| `playtest-results/shooter/report.json`, `shooter/start|mid|end.png` | Existing desktop run: 0 errors, avg 143.8 FPS, 24 s, random input | High for crash-free load, low for real play (random input) |
| `playtest-results/shooter-mobile/*` | Existing mobile run: 0 errors, avg 143.2 FPS, nav bar and DASH/EMP overlap visible | High for layout |
| `playtest-results/shooter-council/capture-log.json` + `desk-*.png` | New 55 s desktop bot run (aims at nearest enemy, holds fire, moves, cycles weapons 1-4, dashes, EMPs at low HP, picks boons), 1280x720, same GPU flags as `tools/playtest.mjs` | Medium-high (bot aim is perfect; human difficulty will differ) |
| `capture-log.json` probes (state injection, labelled below) | Mine touch damage, EMP on asteroid, boon card UI, resize | High for the numbers reported, medium for the claim about real play |
| Code, `shooter.html` line references | Inputs, spawn, contact damage, boons, menus | High |

Not verified at runtime (missing evidence, confidence lowered):
- **Boss phases 1-3 (probe C invalid).** My probe emptied the wave, which opened the boon draft and paused `update()` (`shooter.html:1078`), so the boss never advanced past phase 1. The boss numbers in the log are not usable.
- **Touch movement on a phone.** The CDP touch probe crashed the harness after the drag (page context lost, cause not isolated). The "no touch movement" claim rests on code (`shooter.html:865-876`, `897-904`) and on the absence of any joystick markup.
- **Tesla Hyper-Conduit in play.** Not drawn in the probe, so it was not applied. The "dead boon" claim is from code.

## Desktop bot run: measured numbers

- Average FPS 128.9; p95 frame 7.4 ms; worst frame 104 ms (one hitch); 142 of 7099 frames over 16.7 ms. Automation overhead may inflate the dips.
- Wave 1 (20 units, `shooter.html:975`) took about 26 s just to spawn (`spawnTimer = max(0.4, 1.4 - wave*0.1)`, `shooter.html:1687`). The bot cleared it at about 34 s.
- On-screen enemies: average 1.8 (t 0-9 s), 1.7 (t 10-34 s), 1.6 (t 35-54 s). Total alive: average 5.9, peak 16 (`desk-crowd.png` shows 4 visible of 16).
- Hull: lowest 90/100 over the whole run, 0 deaths. Shield 0 for about 3 s. Difficulty is very low for a competent player.
- Zombies: enemies with `hp <= 0` still in the array. Present in 16 of 55 seconds, peak 5 (`capture-log.json` samples t=11-54).
- Combo peaked at x65 (MAX OVERDRIVE, 160 BPM); score reached 57k by 55 s.

## Probe results (state injection, labelled)

- **Singularity mine touch:** HP 100 -> 55, shield 60 -> 0 from one touch (3 frames x 35 contact damage, `shooter.html:1559-1567`, mine `contactDmg 35` at `1742`). Probe `mineTouch`.
- **EMP on a 90 HP asteroid:** after 300 ms HP is 0, the enemy is still in the array (stun 2.68 s). Four seconds later it is still there, `waveLeft = 0`, `gameState = 'playing'`, and no boon modal. The wave cannot end until the enemy is shot or touched. Probe `empOnAsteroid` / `afterFourSeconds`. Screenshot `probe-emp-zombie.png`: the zombie is drawn with the same visuals as a live enemy.
- **Boon draft (desktop):** 3 cards at 12 px description text, clean layout (`probe-boon-desktop.png`, `desk-boon-offer.png`). Card text is readable.
- **Resize:** 1280x720 -> 800x600 -> back. Canvas follows (800x556, then 1280x676). No errors (`probe-resize-800x600.png`).

## Persona scores

| # | Persona | Score | Loved (evidence) | Hated (evidence, owner, file area) |
| :- | :- | :-: | :- | :- |
| 1 | Casual newcomer | 6 | One big LAUNCH button and a clear hotbar with key labels (`playtest-results/shooter/start.png`, `shooter.html:260-294`). | No control legend anywhere. WASD move, mouse-hold fire and Shift dash are not stated on the menu (`shooter.html:309-325`). Owner: `ui-hud-engineer`, menu/HUD markup `shooter.html:309-325`. |
| 2 | Hardcore gamer | 5 | Inertial thrust, dash along aim and a recoil plasma are responsive (`shooter.html:1077-1132`, `991-1010`). | Zero deaths and 10 hull lost in 55 s (`capture-log.json`). A single mine touch costs 105 HP-equivalent (`mineTouch`), a hit with no fair counter. Owner: `narrative-balance-designer` (tunables), `physics-game-feel-engineer` (contact loop `shooter.html:1559-1567`). |
| 3 | UI critic | 5 | HUD cards are consistent, neon, high contrast (`shooter/mid.png`), boon cards are clean (`probe-boon-desktop.png`). | Mobile nav wraps to 3 lines in a fixed 44 px bar (`shooter-mobile/start.png`, `shooter.html:16-22`, links `213-216`). DASH covers the TWIN LASER label and EMP covers TESLA ARC (`shooter-mobile/mid.png`; weapon bar `82-85`, dash `115-122`, EMP `102-110`). Labels are 8-9 px (`w-name` `shooter.html:99`, `w-key` `:98`, `hud-label` `:50`). Owner: `ui-hud-engineer`. |
| 4 | Impatient stress tester | 5 | Zero console or page errors across both runs and the resize probe. | Zombie enemies stall the wave clear (`afterFourSeconds`, owner `enemy-ai-engineer`, `shooter.html:1448-1569`, EMP `1012-1042`, singularity kill `1789-1798`). Focus loss leaves keys and fire stuck: no `blur` or `visibilitychange` handler, keys only clear on `keyup` (`shooter.html:865-891`; owner `game-engine-developer`). No pause, so a stuck run cannot be paused. |
| 5 | Explorer | 4 | Four weapons with distinct behaviour (`shooter.html:1206-1282`), dash decoy and drone perks. | No settings, mute, volume or pause in the markup (`shooter.html:207-326`). Two boons do not do what they say (see fix 7). Only persistence is a high score (`shooter.html:917`, `1974-1976`). Owner: `weapons-upgrades-designer` (boons), `ui-hud-engineer` (settings). |
| 6 | Story / RPG fan | 3 | Boss names ("OMEGA VOID-TITAN", phase names) give a little flavour (`shooter.html:237`, `1579-1583`). | No premise beyond "SECTOR CLEARED" and "WAVE n INCOMING". Nothing ties the waves together. Owner: `narrative-balance-designer` (content), `mission-campaign-designer`. |
| 7 | Streamer | 6 | Crowd bursts and combo ramp read well on screen (`desk-crowd.png`, `desk-t30.png`: x65, 160 BPM). | Long dull stretches: 1.8 visible enemies on average for the first 35 s (capture log). Wave 1 spends about 26 s spawning (`shooter.html:975`, `1687`). Owner: `level-boss-designer` (wave scripts). |
| 8 | Completionist | 3 | High score is saved (`shooter.html:1974-1976`). | No goals, unlocks, collections or run stats beyond score. No meta progression. Owner: `meta-progression-designer` (`src/talents.js`), `progression-economy-designer`. |
| 9 | Teen action gamer | 6 | Dash, EMP and combo BPM ramp give fast loops (`desk-t30.png`, `capture-log.json`). | Slow start and low density (see 7). Mobile has no move input (code, `shooter.html:897-904`), and the bottom buttons overlap (see 3). Owner: `level-boss-designer` (pacing), `ui-hud-engineer` (mobile). |

**Council average: 4.8 / 10** (43 / 9 = 4.78).
**Verdict: REWORK** (average below 5). The engine and feel are solid. The score is pulled down by missing content (progression, story, onboarding) and by a few real bugs (zombies, dead boons, mobile movement). The average is close to the POLISH line, so this is a borderline REWORK. Lowest scores are 3 (story, completionist), and no persona is at 3 or below for ship-blocking reasons beyond the average rule.

## Top 10 fixes (ranked by personas helped)

1. **Remove zombie enemies (`hp <= 0` still alive).** EMP sets `hp -= 90` with no kill check (`shooter.html:1030`), and the singularity blast does the same (`1794`). Add a sweep in `update()` or `killEnemy` for `hp <= 0`. Owner: `enemy-ai-engineer`. Helps personas 2, 4, 7, 9.
2. **Add a touch move input.** Phones can aim and fire by dragging but cannot move (`shooter.html:897-904`). Add a virtual left stick or drag-to-move. Owner: `ui-hud-engineer`. Helps 1, 4, 9.
3. **Fix the mobile HUD collisions and nav overflow.** Move DASH/EMP clear of the hotbar (`shooter.html:82-122`, `260-294`) and let the arcade nav wrap or shrink (`:16-22`, `213-216`). Owner: `ui-hud-engineer`. Helps 1, 3, 9.
4. **Raise early density and shorten wave 1.** Wave 1 needs about 26 s just to spawn; on-screen count stays near 2. Spawn in groups or start with more units (`shooter.html:975`, `1687`). Owner: `level-boss-designer`, with numbers from `narrative-balance-designer`. Helps 2, 7, 9, 1.
5. **Tune difficulty.** Zero deaths and 10 hull lost in 55 s. Lower shield regen (`shooter.html:1144-1145`) or raise spawn pressure after wave 2. Owner: `narrative-balance-designer`. Helps 2, 9, 8.
6. **Stop per-frame contact stacking.** Contact damages every frame and the mine deals 105 total (`shooter.html:1559-1567`). Add a short i-frame or a one-hit contact per enemy. Owner: `physics-game-feel-engineer`. Helps 2, 4, 1.
7. **Make boons match their text, or remove the dead ones.** Tesla Hyper-Conduit sets `chainChance` but nothing reads it (`shooter.html:697`, `796`, `944`; no read in fire or hit code `1206-1424`). Photonic Aegis claims a 25% damage reduction but only adds max shield (`673-679` vs `damagePlayer` `1810-1831`). Overdrive Core mentions "critical hits" and none exist (`655-661`). Drone says "secondary fire" but fires gold bolts at `enemies[0]` (`1161-1176`). Owner: `weapons-upgrades-designer`. Helps 5, 6, 8.
8. **Reset input on focus loss and add pause.** Clear `keys` and `mouse.down` on `blur` and `visibilitychange`, and add a pause key (`shooter.html:865-891`). Owner: `game-engine-developer`. Helps 4, 1, 9.
9. **Add a control legend on the menu and a first-wave hint.** State WASD/arrows move, mouse aim, hold to fire, Shift dash, Space EMP (`shooter.html:309-325`). Owner: `ui-hud-engineer`, copy by `onboarding-designer`. Helps 1, 5.
10. **Add long-term goals and a settings panel.** Persist run stats and unlocks, add mute and volume, and a pause menu. Owner: `meta-progression-designer` (`src/talents.js`), `progression-economy-designer`, UI by `ui-hud-engineer`. Helps 8, 5, 6, 4.

Smaller items, not in the top 10: HUD labels at 8-9 px (`shooter.html:50`, `98`, `99`) and the boss fight is unverified (see missing evidence).

## Artifacts

- `playtest-results/shooter-council/capture-log.json` (samples, probes, errors)
- `playtest-results/shooter-council/desk-t05.png`, `desk-t15.png`, `desk-t30.png`, `desk-t45.png`, `desk-crowd.png`, `desk-boon-offer.png`
- `playtest-results/shooter-council/probe-mine-touch.png`, `probe-emp-zombie.png`, `probe-boon-desktop.png`, `probe-resize-800x600.png`
- `playtest-results/shooter-council/probe-boss-p1.png` to `p3.png` (not valid, boss stuck in boon state)
- `playtest-results/shooter-council/mobile-touch-drag.png` (captured before the harness failure)
- Temporary capture script was deleted after the run.

STATUS: partial
FILES: reports/shooter/council.md (created); playtest-results/shooter-council/ (capture-log.json and screenshots kept; capture.mjs and dbg.mjs deleted)
API: none (review only, no game files edited)
VERIFIED: existing `playtest-results/shooter` and `shooter-mobile` reports read (0 errors each); new 55 s desktop bot run with 0 page errors; probes for mine touch, EMP zombie, resize and boon UI; mobile touch probe FAILED mid-run (page context lost), boss probe INVALID (boon state paused boss update)
REQUESTS: `ui-hud-engineer`: mobile move input and HUD layout (fixes 2, 3, 9); `enemy-ai-engineer`: zombie sweep (fix 1); `weapons-upgrades-designer`: boon text vs behaviour (fix 7); `level-boss-designer`: density and wave 1 pacing (fix 4); `game-engine-developer`: focus reset and pause (fix 8)
NOTES: Average 4.8 is borderline REWORK. Re-run the boss probe with the boon draft closed and the mobile touch probe on a fresh page before shipping. Bot aim is perfect, so difficulty scores are for a skilled player and should be re-checked with a human. The file is single-file, so ownership of shooter.html areas is mapped by role to the roster (ARCADE_SPEC names no per-file owner).
