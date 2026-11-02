# Apex Pursuit 3D: playtest council, round 2

Agent: `playtest-council`. Date: 2026-11-02. Scope: `racer.html`, `src/racer_*.js`, `src/vehicle_physics.js` after the fix pass (ai, physics, audio, hud, integration). Previous round: `reports/racer/council.md` (4.8 / 10, REWORK).

Evidence (all in `playtest-results/racer-council2/`):
- Desktop 1280x720, Chromium with GPU, one scripted run of about 150 s with the interceptor (`desktop-telemetry.json`, screenshots `desktop-01` to `desktop-18`). Then phantom and cyber_drifter, short runs. Frame rate 65 FPS (battery power cap, not penalised). 0 console errors, 0 page errors.
- Mobile 375x812 touch (CDP touch), partial: `mobile-01` to `mobile-07`. The run stopped at the pause step, so no mobile telemetry file exists (`mobile-run.log`).
- Bust attempt (`bust-telemetry.json`, `bust-01-chase.png`): one targeted attempt. Not reached.

Confidence: medium. Desktop drive, steering, nitro, grind, Esc pause and resume are verified. Busted, the run summary, "Run again" and restart are NOT verified. Mobile pause and resume are NOT verified. The cars phantom and cyber_drifter were only partly checked (their garage screenshots were not reviewed in detail).

Script note: my first desktop bot compared the AI's normalised cop `x` (-1..1) with `laneX`, which is in metres (rail 14.45 m). That is a bug in the test script, not in the game. It made the bot steer the wrong way and stopped cops from reaching the car. The second attempt corrected the units, but it still produced no cop contact, so busted did not fire.

## Scores: old vs new

| # | Persona | Old | New | Loved (evidence) | Hated (evidence) |
| :- | :- | :-: | :-: | :- | :- |
| 1 | Casual newcomer | 6 | 7 | Garage cards now show measured stats (300/320/360 km/h, 2.2/2.0/1.9 s) and one IGNITE button (`mobile-03-garage.png`, `desktop-01-garage.png`). The HUD names the state: "PURSUIT STATUS", "HEAT 1 · 14%", "PATROL CLOSING · 32 m" (`desktop-05-drift.png`). | Still no explicit goal such as "escape" or "reach X"; the only instruction is the pursuit status text. |
| 2 | Hardcore gamer | 4 | 6 | Guardrail is now a scrape, not a stop: 205 km/h at the rail, 153 km/h 1.8 s later (`desktop-telemetry.json`, `grind-start` to `grind-1.8s`). The old wall dropped 180 to 13 km/h in 0.5 s. Esc pause works (`desktop-10-paused.png`). | Drift readout shows "1° SLIP" with 1,617 points while Space is held (`desktop-05-drift.png`). Either the slip readout or the drift entry is wrong; I could not confirm which from one frame. |
| 3 | UI critic | 5 | 7 | Mobile header is one line, the GAS pedal no longer covers the speed digits, and the mirror text is legible (`mobile-07-paused.png`, `mobile-02-games-menu.png`). Desktop cockpit is clean, with the GAMES dropdown and CHASE/AUDIO well separated (`desktop-05-drift.png`). | "PURSUIT STATUS" title wraps to two lines and "HIGHWAY PATROL FREQUEN..." is truncated on mobile (`mobile-07-paused.png`). The GPS radar and gauge stack tightly on the mobile mid-screen. |
| 4 | Impatient stress tester | 6 | 7 | Esc now pauses and resumes without losing the run: state `paused` at 287 km/h, then `running` at 282 km/h with the score intact (`desktop-telemetry.json`, `paused-1s`, `resumed`). Zero errors across the full run. | Touch pause button "II" did not open the pause menu in the CDP touch test (`mobile-07-paused.png` shows the game still running at 217 km/h). Restart and "Run again" not verified. |
| 5 | Explorer | 4 | 5 | Three cars with separate garage cards; CHASE/HOOD/DRONE cameras; GAMES menu lists the three games (`mobile-02-games-menu.png`). | Nothing new appears within one run. Restart from the summary was never reached, so I cannot say whether the BEST SCORE card refreshes. |
| 6 | Story / RPG fan | 3 | 4 | The pursuit framing is visible: "HIGHWAY PATROL FREQUENCY MONITOR ACTIVE" and heat tier names (`desktop-05-drift.png`). | No character, premise or stakes beyond "don't get caught". |
| 7 | Streamer | 6 | 7 | Spectacle is readable on desktop: 207 km/h, drift score banner, nitro, PATROL CLOSING alert (`desktop-02-straight.png`, `desktop-05-drift.png`). | A long dull stretch: about 25 s of stopped or crawling car with no cop contact while heat climbed 1 to 2 (`desktop-telemetry.json`, `stopped` entries). |
| 8 | Completionist | 3 | 4 | Money is now paid: run credits go 0 to 200 at the grind and to 400 later (`desktop-telemetry.json`). The old "evaded" reward was never paid. | No upgrade garage or long-term progress; BEST SCORE and career bounty only. |
| 9 | Teen action gamer | 6 | 7 | Fast start: 0 to 207 km/h in about 8 s on desktop; 146 to 217 km/h on mobile with gas held (`mobile-04-steer-left.png`, `mobile-07-paused.png`). No wall stop. | Dead time while stopped (see 7). The mobile pause control does not respond (see 4). |

**Old average: 4.8 / 10. New average: 6.0 / 10** (sum 54 / 9). Lowest new score: 4 (Story, Completionist). No persona at 3 or below.

**Verdict: POLISH** (average 5 to 7). SHIP is not met: average below 7. Confidence medium.

## What got better

- Wall handling: scrape instead of full stop (desktop grind 205 to 153 km/h in 1.8 s, versus 180 to 13 km/h in 0.5 s before).
- Esc pauses the run instead of resetting it (desktop pause and resume verified).
- Money: credits are paid during the run (0 to 200 to 400).
- Mobile HUD: single-line header, pedals no longer cover the speedometer, games dropdown reachable.
- Garage cards show stats that match the measured physics.
- Zero console or page errors in the desktop run.

## Top 5 remaining fixes

| Rank | Fix | Personas | Owner | File |
| :-: | :- | :-: | :- | :- |
| 1 | Make the pursuit reach a bust in the first minutes: heat climbs too slowly (level 2 only after about 85 s in the desktop run) and no cop closes in when the car stops. Add an end state a casual player will see. Verify busted, summary and "Run again" in play. | 1, 4, 7, 9 | `enemy-ai-engineer` | `src/racer_ai.js` (heat escalation, cop approach when the player is slow) |
| 2 | Touch pause "II" does not open the pause menu on touch (`mobile-07-paused.png`). Check the pointer and touch handler for the pause button and verify on a real device or with CDP. | 4, 9 | `ui-hud-engineer` | `src/racer_hud.js` (pause button, around line 782, and `attachPointerEvents`) |
| 3 | Drift readout shows 1° slip with Space held (`desktop-05-drift.png`). Confirm the drift entry and the slip readout agree, and that score scales with slip. | 2, 7 | `physics-game-feel-engineer` | `src/vehicle_physics.js` (drift entry and sustain) |
| 4 | Mobile status card: the title wraps and the traffic-patrol line is truncated (`mobile-07-paused.png`). Give the title one line and show the frequency text in full or drop it. | 3 | `ui-hud-engineer` | `src/racer_hud.css` (pursuit status card, mobile breakpoints) |
| 5 | Give a goal and a reason to replay: an objective line (for example "escape the patrol" or a target score) and a visible progress record between runs. Add a permanent unlock or upgrade path. | 4, 6, 8 | `narrative-balance-designer`, `progression-economy-designer` | `src/racer_hud.js` (objective text), `src/racer_ai.js` (escape condition) |

## Not verified (limitations)

- Busted, the BUSTED summary, "Run again" and restart from the summary: not reached in this round. Heat stayed at level 1 to 2 and no cop reached the car while stopped. The stop lasted about 25 s.
- Restart from the pause menu: the script reached the step, but the run was not in a verified restart state, so no claim is made.
- Mobile: steer, gas, NOS and handbrake pressed states were checked in screenshots and by the on-screen car speed. The pause button and resume were not verified, and no mobile telemetry was saved.
- Phantom and cyber_drifter short runs were captured but not reviewed frame by frame.

STATUS: done (verdict POLISH, medium confidence; busted and restart unverified)
FILES: `reports/racer/council-2.md` (this file). Evidence: `playtest-results/racer-council2/` (screenshots, `desktop-telemetry.json`, `bust-telemetry.json`, `mobile-run.log`). Scripts deleted.
API: none (review only; no game files edited)
VERIFIED: desktop drive 0 errors, Esc pause and resume, grind speed loss, credits paid; mobile steer, gas, NOS, games menu. Not verified: busted, summary, restart, mobile pause.
REQUESTS: `enemy-ai-engineer` (busted path and heat pace), `ui-hud-engineer` (touch pause, status card), `physics-game-feel-engineer` (drift readout), `narrative-balance-designer` and `progression-economy-designer` (goal and progression)
NOTES: Council average 6.0 (old 4.8). Confidence medium. The first bot used mismatched units (normalised cop x vs metres laneX); this was a test-script bug, not a game bug. Re-run the bust path once the heat pace is changed.
