# Apex Pursuit 3D: playtest council

Agent: `playtest-council`. Date: 2026-11-02. Evidence: harness runs `playtest-results/racer/`, `racer-mobile/`; a scripted 40 s desktop drive and 15 s mobile drive with telemetry and frames in `playtest-results/racer-council/` (`council-run-log.json`, `desktop-*.png`, `mobile-*.png`, `probe-barrier-contact.png`). 0 console errors in every run. Top speed observed: 195 km/h at 7 s (desktop), 224 km/h at 9 s (mobile); the garage card claims 340 km/h. Barrier probe: 180 → 13 km/h in about 0.5 s with 20 contact impulses. The racer's contract is `ARCADE_SPEC.md` §2 and `PHYSICS_SPEC.md` (`GAME_SPEC.md` describes Aetheria).

## Scores

| # | Persona | Score | Loved | Hated |
| :- | :- | :-: | :- | :- |
| 1 | Casual newcomer | 6 | Controls strip and one launch button; "PURSUIT ACTIVE" and "TAKEDOWN!" banners teach the loop | No goal or stakes; ESC opens the garage over the live race and the car keeps moving (`racer.html:1204, 1217`) |
| 2 | Hardcore gamer | 4 | Responsive steering, live slip readout (41° at 2.0x) | Guardrail contact kills speed, 180 → 13 km/h in 0.5 s (`racer.html:1547-1554`, `vehicle_physics.js:727-746`) |
| 3 | UI critic | 5 | Clean desktop cockpit | Mobile header wraps to three lines (`racer.html:27-33`); GAS pedal covers the speed digits (`racer_hud.css:801, 874-890`); 9 px mirror text (`racer_hud.css:274`) |
| 4 | Impatient stress tester | 6 | No errors; restart works | ESC + start click mid-run silently resets score 5,322 → 0 (`racer.html:1224, 1229`); on mobile, stray taps hit the header links |
| 5 | Explorer | 4 | Three distinct cars; CHASE/HOOD/DRONE cameras on C | Nothing new after one run; garage BEST SCORE never refreshes (`racer.html:1108`) |
| 6 | Story / RPG fan | 3 | Heat tier names have flavour | No premise, character or goal |
| 7 | Streamer | 6 | Takedown banner with bounty; FOV punch on nitro | Car spins at 4 km/h with 41° slip while drift score ticks up; dull stretches at 60 km/h |
| 8 | Completionist | 3 | Career bounty and best score persist | No progression; the Upgrade Garage promised in `ARCADE_SPEC.md:783` does not exist; "PURSUIT EVADED +$X" is never paid (`racer_ai.js:383-386`) |
| 9 | Teen action gamer | 6 | 0 → 195 km/h in 7 s; ram takedown in 15 s | A wall is a full stop; no busted state; drift panel hidden on phones (`racer_hud.css:874-877`) |

**Average 4.8 / 10. Verdict: REWORK** (two personas at 3). Confidence high on desktop, medium on mobile (mouse on pedals, no real touch).

## Top 10 fixes

| Rank | Fix | Personas | Owner | File |
| :-: | :- | :-: | :- | :- |
| 1 | Replace per-frame full-impulse wall friction with a dt-scaled, capped scrape | 4 | `physics-game-feel-engineer`, `game-engine-developer` | `vehicle_physics.js:727-746`, `racer.html:1547-1554` |
| 2 | ESC pauses the run (or garage hidden while racing); guard `launchRace` with `!isPlaying` | 4 | `game-engine-developer`, `ui-hud-engineer` | `racer.html:1204-1231` |
| 3 | Mobile HUD: wrap-proof header, GAS/BRAKE off the dial, CHASE/AUDIO off the mirror, NITRO label not clipped | 4 | `ui-hud-engineer` | `racer_hud.css:849-912`, `racer.html:27-33` |
| 4 | A goal and an end state (objective text, busted/escaped result); visible heat escalation in the first minute | 4 | `enemy-ai-engineer`, `narrative-balance-designer` | `racer_ai.js:29-100, 378`, `racer.html` loop |
| 5 | Gate drift sustain and scoring on speed (`minDriftSpeed` 35 km/h exists) | 3 | `physics-game-feel-engineer`, `game-engine-developer` | `vehicle_physics.js:484-500`, `racer.html:1663-1668` |
| 6 | Wire `onPursuitEvaded` so the reward is paid and shown | 3 | `game-engine-developer` | `racer.html:1240-1282`, `racer_ai.js:383-386` |
| 7 | Build the promised upgrade garage with saved progress | 3 | `progression-economy-designer`, `backend-persistence-engineer` | new module, `ARCADE_SPEC.md:783` |
| 8 | Reconcile garage stats with physics (Interceptor card 340 vs `baseTopSpeed` 310; Phantom 365 vs 360; spec 300/320/360; "ACCELERATION 2.5s" has no source) | 3 | `ui-hud-engineer`, `narrative-balance-designer` | `racer.html:413, 435, 437`, `vehicle_physics.js:1157, 1165` |
| 9 | Show the drift panel on phones | 2 | `ui-hud-engineer` | `racer_hud.css:874-877` |
| 10 | Fix AI distance units: `playerZ` advances 18 units per metre (`racer.html:1539`), so the "2.2 km" roadblock interval is about 122 m and the 450 escape radius about 25 m (code-derived) | 3 | `enemy-ai-engineer` | `racer_ai.js:207-210, 378, 426` |
