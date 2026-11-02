# Playtest Council 2: VOID NOVA (shooter.html), after the fix pass

Scope: review only. No game files were edited. Previous council: `reports/shooter/council.md` (4.8/10, REWORK).
Date: 2026-11-02. Build: `shooter.html` after fix-1 (engine), fix-2 (enemies), fix-3 (weapons), fix-4 (HUD).

## Evidence used

| Source | What it covers | Confidence |
| :- | :- | :- |
| `playtest-results/shooter-council2/desktop-log.json` | 1 s samples of a 1280x720 run: 90 s of play, boss phase, death, restart. Events with timestamps | High for flow, medium for feel (bot aims perfectly) |
| `playtest-results/shooter-council2/mobile-log.json` | 375x812 CDP touch run, 45 s, then a labelled API step | High for touch flow, medium for feel |
| `playtest-results/shooter-council2/d-*.png` (24) and `m-*.png` (11) | Every frame listed was opened and read | High |
| `playtest-results/shooter-council2/bugrun-*` | First mobile run (before the fire fix): 23 samples, screenshots, log | High for the bug |
| Two CDP probes (deleted after use, results quoted below) | Touch release semantics and the DASH tap side effect | High for the mechanism in Chromium |
| `powercfg`-style Windows System log (Kernel-Power events) | Explains a 1,083 s freeze in the first desktop attempt | Medium (timing match, no direct proof) |

How the playthroughs were driven (not a human):
- Desktop: keyboard WASD, mouse aim and hold-to-fire via `page.mouse`, weapon keys 1-4 every 10 s, Shift dash every ~6 s, Space EMP when 5+ enemies were alive, a real click on the reroll button, a real click on a card, key 2 and key 3 picks, Esc pause with P resume, a real click on PLAY AGAIN.
- Desktop, labelled API steps: `VoidNova.startWave(5)` after clearing the enemies at 90 s (to reach the boss in budget). `VoidNova.damagePlayer(9999)` at 116 s (the game's own lethal-hit path, to reach game over in budget). Nothing else was injected.
- Mobile (final run): CDP touch. Left thumb drives the joystick, right thumb holds fire and drags to the target. Taps on DASH, EMP, weapon slots, pause and resume and a real tap on boon card 2 at 30 s. No API step was needed on the final mobile run (the draft came naturally at 30 s).
- Mobile first attempt (`bugrun-*`) used the same bot before the fire-fix and shows the defect.

## Headline results

- Desktop: 0 page errors. FPS avg 139.7, p95 frame 7.1 ms, worst frame 444.7 ms (one hitch). Measured on battery; the 65 FPS cap the brief expected was not seen, so no FPS penalty was applied.
- Mobile (final): 0 page errors. FPS avg 130.4, worst 416.6 ms.
- Pause: Esc froze the field (4 enemies identical positions over 1 s) and the overlay showed. P resumed play.
- Reroll: first draft offered `emp_bomb_pack, overdrive_core, chain_lightning`. Reroll gave `nano_siphon, plasma_coils, hull_plating` with "NO REROLLS LEFT" after. No duplicates in any draft.
- Boss (API jump at 90 s): core stayed at 15000 for ~18 s while shield nodes absorbed the fire, then dropped 15000 -> 10637 by 116 s once the nodes were down. Phase 1 only was observed; phases 2-3 were not reached.
- Death: game-over summary showed WAVE 5, SCORE 349,243, KILLS 254, BEST COMBO x254, TIME 1:52, BOONS 2, NEW RECORD!. PLAY AGAIN (real click) restarted at wave 1, score 0, hp 100, EMP x2, no boss.
- Hull: stayed at 100 for the whole 90 s desktop play. A perfect-aim bot does not test difficulty; a human result is still missing.
- Mobile: no death in the final run, 90 kills, boon drafted naturally at 30 s, wave 2 reached at 45 s.

## Mobile defect found and proven (fire stops after a HUD tap)

Symptom: on touch, once the right thumb holds fire, tapping DASH, EMP or a weapon slot stops firing until the thumb lifts and re-presses. The first mobile run died at 17 s with 0 bullets fired after the first DASH (`bugrun-mobile-log.json`: `mouseDown` false in 23 of 23 samples; `bugrun-m-t12.png`: hull 60%, shield 0, 33 enemies, score 920; `bugrun-m-t20.png`: game over).

Mechanism (probe, Chromium touch emulation):
- Right thumb down: `mouse.down` true (`touchstart`, `shooter.html:2990`).
- Tap on `#dash-btn` (pointerdown is cancelled at `shooter.html:1412`, yet Chromium still fires trusted `mousedown` and `mouseup` at the DIV).
- The window `mouseup` listener (`shooter.html:1397`) sets `mouse.down = false`.
- Holding the aim finger and dragging does not re-arm it (only `touchstart` sets it, `shooter.html:2990`).

Confidence: high for Chromium emulation. Real Android Chrome was not tested. Owner: `ui-hud-engineer` (touch and HUD input in `shooter.html`).

Harness note (not a game bug): Playwright's own `locator.tap()` desynchronises CDP touch ids for later touches, so the final bot sends every HUD tap on the same CDP path. This is why the earlier bot runs looked dead.

## Freeze in the first desktop attempt (probably the machine, not the game)

The first desktop attempt froze at ~63 s of game time and the bot hung for 1,083 s. A stack capture was not available. The Windows System log shows Kernel-Power standby and resume events (506/507) at 4:30:36 PM, 4:30:57 PM and 4:49:06 PM. The 4:49 PM resume matches the end of the freeze, so the machine most likely went into standby. This is an inference (medium confidence). Two later runs with a CDP watchdog (stall capture) had no stall: worst frames 384 ms and 444 ms. The game did not show a stall in those runs.

## Persona scores

| # | Persona | Old | New | Loved (evidence) | Hated (evidence, owner, file:line) |
| :- | :- | :-: | :-: | :- | :- |
| 1 | Casual newcomer | 6 | 8 | Menu legend lists keyboard and touch controls (`d-00-menu.png`, `m-00-menu.png`, `shooter.html:631-640`). Joystick labelled MOVE and the "WAVE 1 INCOMING!" banner read clearly (`m-01-playing-start.png`). | Mobile fire can silently stop after a DASH tap, so a newcomer sees enemies pile up with no response (`bugrun-m-t12.png`). Owner `ui-hud-engineer`, `shooter.html:1397` and `1412`. |
| 2 | Hardcore gamer | 5 | 6 | Shield-node mechanic is readable: core is immune until nodes fall (desktop samples 90-116 s, `d-boss-mid.png`, `d-boss-late.png`). Weapon swap, dash and EMP respond instantly (`d-t15.png`, `d-t30.png`). | Zero hull loss in 90 s of play (desktop samples: hull 100 throughout), so the challenge is not felt. Score grows with unbounded combo: 349,243 in 2 min (`shooter.html:2708`). Owners `narrative-balance-designer` (difficulty), `combo-events-designer` (scoring). |
| 3 | UI critic | 5 | 7 | Boon cards with rarity badges, LV counter and key hint, reroll state visible (`d-draft-1.png`, `d-draft-1-rerolled.png`, `m-draft.png`). Game-over summary is a clean stat grid (`d-gameover.png`). | Boss intro: "WAVE 5 INCOMING!" banner covers the boss name and phase line (`d-boss-intro.png`; banner `shooter.html:569`, boss HUD `:502`). On mobile the banner sits over the mute button (`m-01-playing-start.png`). Owner `ui-hud-engineer`. |
| 4 | Impatient stress tester | 5 | 5 | 0 page errors in every run (desktop 90 s + boss + death + restart; three mobile runs). Esc/P pause and restart reset both verified. | Fire-stop after HUD tap (above). The desktop freeze is probably the OS and is not counted against the game. Owner `ui-hud-engineer`. |
| 5 | Explorer | 4 | 6 | Pause menu has sound and screen-shake toggles, boon list and controls (`d-paused.png`, `m-pause.png`). Boon text now matches behaviour (LV counts, reroll). | Only boons and two toggles to explore; no unlocks, no secrets, no run history. Owners `meta-progression-designer`, `progression-economy-designer`. |
| 6 | Story / RPG fan | 3 | 3 | Boss has a name and phase line (`d-boss-mid.png`: OMEGA VOID-TITAN, PHASE 1). | Still no premise beyond the menu line "360 degree twin-stick roguelite" (`d-00-menu.png`). Owners `narrative-balance-designer`, `mission-campaign-designer`. |
| 7 | Streamer | 6 | 7 | Combo ramp to x254 MAX OVERDRIVE and four weapon visuals on screen (`d-t60.png`, `d-weapon-6s.png` to `d-weapon-76s.png`). Boss shell and nodes are clip-worthy (`d-boss-intro.png`). | Boss intro banner collision (above). Long quiet stretches on mobile at 35-44 s with 2 enemies left (`m-t36.png`). Owner `level-boss-designer`. |
| 8 | Completionist | 3 | 4 | Run summary: wave, score, kills, best combo, time, boons, NEW RECORD (`d-gameover.png`). Record persists across restarts. | No unlocks, achievements, collections or long-term targets. Owner `meta-progression-designer`. |
| 9 | Teen action gamer | 6 | 7 | Fast loop: dash, EMP, four weapons, combo, boon in ~27-31 s (`d-draft-1.png`, `m-draft.png`). Mobile dual-thumb control works (`m-t20.png`). | Fire can stop on mobile after a DASH tap (above). Mobile wave 2 is busy: 28 enemies on screen with the hint text still covering the play area (`m-end.png`, `m-t5.png`). Owners `ui-hud-engineer`, `level-boss-designer`. |

**Council average: 5.9 / 10** (53 / 9 = 5.89). Previous: 4.8 (43 / 9).
**Verdict: POLISH** (average 5 to 7). SHIP is not reached: the average is below 7 and Story / RPG stays at 3, which blocks SHIP under the rule "no score at or below 3".

## What got better (old fix list vs now)

- Touch movement: fixed. Left-thumb joystick works and drives the ship (`m-01`, `m-t5`).
- Mobile HUD: fixed in layout. No horizontal scroll at 375 px, DASH/EMP stacked above the weapon bar, nav collapsed (`m-00`, `m-t20`). The aim hint still covers the play area.
- Pause and restart: fixed and verified (Esc, P, PLAY AGAIN).
- Boons: fixed. Reroll works, LV badges, text matches the boon.
- Control legend on the menu: fixed (desktop and mobile).
- Boss shield logic: now reads correctly on screen (core immune behind nodes).
- Game-over summary: new and clear.

## Still open (carried over or new)

- Difficulty: old fix 5 is not done. Zero hull damage in 90 s of desktop play.
- Density and pacing: not re-measured for zombies (old fix 1). The fix-2 probe reports 0 zombies, not repeated here.
- Score inflation: combo scale is unbounded (new).
- Long-term goals and story: still missing (old fixes 9-10 partly done).
- Boss phases 2-3 were not observed, so their feel is unverified.

## Top 5 remaining fixes (ranked by personas helped)

1. **Mobile fire stops after a DASH, EMP or weapon-slot tap.** Owner: `ui-hud-engineer`. Area: `shooter.html` touch/input (`1397` window mouseup, `1412-1413` dash/EMP pointerdown, `1421-1426` weapon slots). Fix: ignore compatibility mouse events while `touchIds.aim` is set (for example `e.sourceCapabilities?.firesTouchEvents`), or cancel the synthetic mouse events on HUD touchend. Helps personas 1, 2, 4, 9 (+ mobile players).
2. **Boss intro banner covers the boss HUD; mobile banner covers mute.** Owner: `ui-hud-engineer`. Area: `shooter.html` banner CSS (`207`, `273`, `395`, `444`), banner markup `569`, boss HUD `502`. Fix: move the banner below the boss bar on boss waves, or raise the boss bar layer. Helps personas 1, 3, 7.
3. **Difficulty and density.** Owner: `level-boss-designer` (wave scripts, spawn at `2584-2587`) with `narrative-balance-designer` (contact and bullet numbers). Area: `shooter.html` waves and contact damage. Fix: raise pressure after wave 2 and keep wave 1 short. Re-test with a human, since the bot aims perfectly. Helps personas 2, 7, 9.
4. **Long-term goals.** Owner: `meta-progression-designer` (unlocks, run history) and `progression-economy-designer` (rewards). Area: a new module that persists through the existing localStorage pattern (`safeGetHigh` in `shooter.html`). Fix: 3 to 5 unlocks, run history and a short boss premise line. Helps personas 5, 6, 8.
5. **Combo score scaling.** Owner: `combo-events-designer` (combo rules) with `narrative-balance-designer` (numbers). Area: `shooter.html:2708` (`score += Math.floor(100 * (1 + combo * 0.1))`). Fix: cap the per-kill multiplier or the combo term so runs stay in a readable range. Helps personas 2, 5, 8.

Smaller items (not in the top 5): the "HOLD THIS SIDE TO AIM + FIRE" hint stays over the play area on mobile (`shooter.html:552`, `296-300`). Desktop key hints in the boon card corners are tiny (`d-draft-1.png`). Mobile floating damage numbers cross the HUD card (`m-end.png`).

## Missing evidence and limits

- The bot aims perfectly and kites; difficulty scores are for a skilled player and need a human check.
- Boss phases 2-3 were not reached. The boss was reached via `VoidNova.startWave(5)` at 90 s (labelled API step).
- Game over at 116 s was forced with `VoidNova.damagePlayer(9999)` (labelled API step, the game's own path).
- Real devices were not tested; touch was Chromium emulation via CDP. The DASH mouseup behaviour is verified in Chromium only.
- Alt-tab focus loss was not retested in this round (fix-1 covered it with dispatched events).
- Old fix 1 (zombies) and fix 6 (contact stacking) were not re-measured here.
- FPS was measured on battery at 130 to 140, not the expected 65. No FPS penalty was applied.

## Artifacts

- Logs: `playtest-results/shooter-council2/desktop-log.json`, `playtest-results/shooter-council2/mobile-log.json`, `playtest-results/shooter-council2/bugrun-mobile-log.json`.
- Desktop screenshots (24): `d-00-menu`, `d-draft-1`, `d-draft-1-rerolled`, `d-draft-2`, `d-paused`, `d-t15`, `d-t30`, `d-t60`, `d-t88`, `d-weapon-6s`, `d-weapon-16s`, `d-weapon-26s`, `d-weapon-36s`, `d-weapon-46s`, `d-weapon-56s`, `d-weapon-66s`, `d-weapon-76s`, `d-boss-intro`, `d-boss-mid`, `d-boss-late`, `d-gameover`, `d-restart`, `d-restart-play` (all `.png`).
- Mobile screenshots (11): `m-00-menu`, `m-01-playing-start`, `m-t5`, `m-t12`, `m-t20`, `m-t28`, `m-t36`, `m-t44`, `m-draft`, `m-pause`, `m-end` (all `.png`).
- Bug-run screenshots (first mobile run, kept as evidence): `bugrun-m-t5`, `bugrun-m-t12`, `bugrun-m-t20`, `bugrun-m-end` (all `.png`).

STATUS: done
FILES: reports/shooter/council-2.md (created); playtest-results/shooter-council2/ (logs and screenshots kept; bot and probe scripts deleted)
API: none (review only, no game files edited)
VERIFIED: desktop run 90 s + boss (API) + death (API) + restart: 0 page errors, avg 139.7 FPS; mobile runs: 0 page errors, avg 130 FPS; all 35 final screenshots opened; probe proved DASH tap clears mouse.down while aim is held
REQUESTS: `ui-hud-engineer`: mobile fire-stop after HUD tap (`shooter.html:1397`, `1412`), boss banner collision (`569`, `502`), mobile hint covering play (`552`); `level-boss-designer` with `narrative-balance-designer`: difficulty and density after wave 2; `combo-events-designer`: combo scoring cap (`shooter.html:2708`); `meta-progression-designer` and `progression-economy-designer`: unlocks, run history and premise line
NOTES: Average 5.9 (POLISH). Biggest single fix is the mobile fire-stop bug. The first desktop freeze was most likely the machine sleeping (Windows Kernel-Power resume at 4:49 PM matches the freeze end); two later runs with a stall watchdog did not stall. Playwright's locator.tap() desynchronises CDP touch ids, so the bot sends all HUD taps through one CDP path.
