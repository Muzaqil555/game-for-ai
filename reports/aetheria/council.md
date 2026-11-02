# Aetheria: playtest council

Agent: `playtest-council`. Date: 2026-11-02. Evidence: `playtest-results/index/`, `playtest-results/index-mobile/` (report.json, start/mid/end.png), plus probe screenshots `playtest-results/aetheria-council/mobile-clean-12s.png` and `desktop-35s.png`. A Playwright probe confirmed the companion triple dispatch (fix 1).

## Scores

| # | Persona | Score | Loved | Hated (owner) |
| :- | :- | :-: | :- | :- |
| 1 | Casual newcomer | 6 | Clear 7-button title menu; step-by-step FTUE banners (`daily_trials.js:268-281`) | FTUE says "WASD" on mobile; desktop mid-run shows four objective surfaces at once (`onboarding-designer`, `ui-hud-engineer`) |
| 2 | Hardcore gamer | 5 | 104 FPS avg, p95 20.9 ms; four weapons on 1-4 and a real dash | Death costs nothing: full-HP respawn (`engine.js:2646-2652`); `showGameOver` only called on victory (`engine.js:1911`), so the defeat screen (`ui.js:1252`) is unreachable; `C` does nothing (`game-engine-developer`, `companion-ultimate-designer`) |
| 3 | UI critic | 4 | Clean menu hierarchy; readable shop cards | Mobile weapon and ability bars cut off at both edges; ability labels 9–10 px (`index.html:834, 844, 989, 1021`); daily panel fixed at 430 px overflows phones (`daily_trials.js:961-963`) (`ui-hud-engineer`, `onboarding-designer`) |
| 4 | Impatient stress tester | 6 | 0 console/page errors; resize and mashing did not break it | No pause on blur/`visibilitychange`; dt clamp is 0.1 (`engine.js:1112`), the studio rule is 0.05 (`game-engine-developer`) |
| 5 | Explorer | 6 | Weapons, companions, talent tree, armour shop, arena, daily streak | `[C]` shows a label but the companion never changes (`companion-ultimate-designer`, `game-engine-developer`, `ui-hud-engineer`) |
| 6 | Story / RPG fan | 5 | Named regions and bosses (Sylvanos, Kryos, Malakor); NPC guide "Qoca Müdrik Orion" | Title shows dev-speak: "36 Agent Mega-Edition V4.0" (`index.html:2025`), "Aetheria Engine V4.0 • 36-Agent Autonomous Studio Architecture" (`:2054`); badge clipped under the arcade bar; no stakes because death has no consequence (`ui-hud-engineer`, `narrative-balance-designer`) |
| 7 | Streamer | 6 | Big event banners ("QIZIL XƏZİNƏ QOBLİNİ PEYDA OLDU!"), damage numbers | Busy desktop HUD; mobile not stream-friendly; boss/arena/victory not captured (`ui-hud-engineer`) |
| 8 | Completionist | 6 | 7-day streak, progress bars ("Toxunulmaz Kölgə 21/60"), talent tiers | Daily panel cut off on phones (days 6–7 hidden); quest tracker hidden on phones (`index.html:1967-1975`); streak resets after one missed day (`daily_trials.js:441`) (`onboarding-designer`, `progression-economy-designer`) |
| 9 | Teen action gamer | 5 | One click into combat; strong hit juice | Died within 12 s idle at spawn on mobile; "YENİDƏN DOĞUŞ!" banner covers the hero card; touch icons unlabeled and on top of the FTUE banner (`ui-hud-engineer`) |

**Average 5.4 / 10. Verdict: POLISH.** Confidence medium: mobile was emulated on a desktop GPU; boss, arena, victory and a 60 s run were not captured; `gameState` is null in the playtest report.

## Top 10 fixes

| Rank | Fix | Personas | Owner and file |
| :- | :- | :- | :- |
| 1 | **Key triple dispatch.** One `C` press calls `cycleCompanion` three times (phoenix → dragon → wolf → phoenix), so it never changes. Keep one handler; route `Digit1-4` and `R` through one path too | Hardcore, Explorer, Stress, UI | `companion-ultimate-designer` (`companions_ultimates.js:218-231`), `game-engine-developer` (`engine.js:269-285`), `ui-hud-engineer` (`ui.js:584-606`) |
| 2 | **Fit the mobile HUD in 375 px** (weapon and ability bars cut off) | UI, Casual, Teen, Stress | `ui-hud-engineer` (`index.html` mobile block ~1822-1830, `.hud-bottom-center`) |
| 3 | **Touch-aware, less cluttered FTUE**: "tap/joystick" copy on touch; one objective surface in the first minute | Casual, UI, Teen, Streamer | `onboarding-designer` (`daily_trials.js:268-281`), `ui-hud-engineer` |
| 4 | **Death has a consequence; defeat screen reachable** via `showGameOver(false)` | Hardcore, Teen, Story, Streamer | `game-engine-developer` (`engine.js:2646-2652`), `ui-hud-engineer` (`ui.js:1233`), `progression-economy-designer` |
| 5 | **Remove dev-speak from the title; unclip the badge** under the arcade bar | Story, Casual, UI, Streamer | `ui-hud-engineer` (`index.html:2025, 2054`, `.menu-content`), copy by `narrative-balance-designer` |
| 6 | **Readable, non-overlapping touch controls** with labels | Casual, Teen, Hardcore, Stress | `ui-hud-engineer` (`index.html:2296-2306`, touch CSS 1846-1950) |
| 7 | **Responsive daily panel**: `Math.min(430, w - 24)` or DOM | UI, Completionist, Casual | `onboarding-designer` (`daily_trials.js:961-963`) |
| 8 | **HUD text ≥ 11 px**; stop truncating "Alov Simu..." | UI, Streamer, Completionist | `ui-hud-engineer` (`index.html:834, 844, 989, 1021, 399`) |
| 9 | **One-line quest tracker on phones** | Completionist, Story, Casual | `ui-hud-engineer` (`index.html:1967-1975`) |
| 10 | **dt clamp 0.05 and pause on blur** | Stress, Hardcore | `game-engine-developer` (`engine.js:1112`) |

Also: HUD labels mix English and Azerbaijani (DASH, ARCANE, NOVA, ULTIMATE, LMB); `GAME_SPEC.md` says V2.0/25 agents while the UI says V4.0/36 agents; the playtest has no state hook (`gameState: null`).
