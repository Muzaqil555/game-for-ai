# Aetheria: playtest council, round 2 (after the full fix pass)

Agent: `playtest-council`. Date: 2026-11-02. Previous round: `reports/aetheria/council.md` (5.4 / 10, POLISH).
Evidence: own Playwright script (`playtest-results/aetheria-council2/`: `run.mjs`, `results.json`, 27 screenshots, script deleted after the run). Chromium with GPU (d3d11), desktop 1280x720 and mobile 375x812 touch (CDP touch events for the joystick, taps for buttons).

## Evidence limits (read first)

- **The bot died early in both runs.** Desktop: the defeat modal reads "Qaçış Vaxtı 0:08" in `d02-weapon4.png`, `d09-shop-open.png`, `d11-mid.png` and `d12-end60.png`. Mobile: "0:09" in `m03-15s.png` and `m06-tracker.png`. The scripted input walks with the mouse held and does not dodge, so this is a weak player, not proof of a balance problem. Still, it is what a new player would see in the first 10 seconds.
- Because of that, most of the planned in-run checks (C, R, J, T, B, Esc pause) ran **behind the defeat modal**. Their screenshots show the modal, not gameplay. I did not count them as passes. `pauseFrozen: true` in `results.json` is not valid evidence either.
- The real defeat path was exercised: forced through `GameEngine.damagePlayer` (invulnerability cleared first), which is the game's own code path. The phoenix talent hook (`talent_tree.js:1426`) and a level-up relic draft (`d13-defeat.png`) both sat in front of the first forced death; a helper closed the draft and retried.
- Desktop FPS: 66.9 avg, but only over 206 frames (the menu window after my reload). Low confidence. Mobile: 78.8 avg, p95 20.7 ms, over the whole mobile session. The user said not to penalise FPS for the battery cap; none of the screenshots show FPS hurting play.
- Mobile pause: `#btn-hud-pause` was never found by the locator, so the HUD pause tap is unverified. The pause icon is visible in `m01-run-start.png`.
- Not reviewed closely: `d00-title.png`, `d03` to `d08`, `d10`, `m00`, `m02`, `m04`, `m05`, `m07`. I used `results.json` state for them. The title-screen score (Story persona) has low confidence.
- 0 page errors and 0 console errors on both runs (`results.json` `errors: []`). 0 horizontal overflow on mobile (`mobile.overflowX: 0`).

## Scores

| # | Persona | Old | New | Loved (evidence) | Hated (evidence, owner) |
| :- | :- | :-: | :-: | :- | :- |
| 1 | Casual newcomer | 6 | 6 | Touch-aware FTUE on phones: "JOYSTİKLƏ HƏRƏKƏT ET" with the "Keç" skip (`m01-run-start.png`). Desktop: the first quest card "WASD İLƏ HƏRƏKƏT ET 1/6" is one clear step (`d01-run-start.png`). | The player is dead in about 8 s (`d02`, `m03`), so the first-minute tutorial never gets to finish. The desktop start screen has five objective surfaces at once (`d01`). (`game-engine-developer`, `onboarding-designer`) |
| 2 | Hardcore gamer | 5 | 5 | Death now costs something: the defeat card shows kills, time, combo rank, the penalty `-25 Qızıl` in red, and "Davam Et (-25 Qızıl)" (`d12-end60.png`, `m03-15s.png`). Continue restores full HP (`results.json` `afterContinue.hp 106`). | Dies in 8 to 9 s of play, which reads as unfair (`d02`, `m03`). The companion label never updates (`ui.js:165` is the only reference to `companion-name-badge`), so the HUD still says "Alov Simurqu" after C (`d01`, `results.json` `companionCycle`). (`game-engine-developer`, `ui-hud-engineer`) |
| 3 | UI critic | 4 | 6 | Mobile HUD fits. Hotbar sits at x 8 to 367 px of 375 (`results.json` `hotbarRect`), zero overflow. Touch buttons carry labels: Hücum, Sıçra, Sehr, Nova, Qiyamət, Yoldaş, Əlaqə (`m01-run-start.png`). Defeat card is clean and readable at 375 px (`m03-15s.png`). | Desktop HUD is still busy: the quest panel "AKTİV TAPŞIRIQLAR - HAMISI" is fully expanded, plus the region banner, the mission card, the "3x HIT" card and the FTUE card (`d01-run-start.png`). The canvas prompt "[F] ... ilə danış" sits above the touch buttons (`m01`). (`ui-hud-engineer`, `onboarding-designer`) |
| 4 | Impatient stress tester | 6 | 7 | 0 page errors and 0 console errors on both runs. The forced death and Continue, Ana Menyu and the defeat card all work without errors. Save survives a reload. | The shop stays open over the main menu: `d16-menu-after-defeat.png` shows `modal-shop` on top after "Ana Menyuya Qayıt". `d14-after-continue.png` shows it after Continue. Most likely cause: the B key handler has no game-over guard (`engine.js:305`), and the modal is not closed in `goToMenu` (`engine.js:587`). (`game-engine-developer`, `ui-hud-engineer`) |
| 5 | Explorer | 6 | 7 | Progress persists. Bought Damage Lv1 for 100 gold: gold 296 to 196 and `upgrades.damage 0 to 1`. After New Game the save is intact (196 gold, Damage 1). After a full page reload it is still there: `p04-after-reload.png` shows "Qızıl: 196" and "Səviyyə 1" on Qılınc Gücü. | The companion label does not change, so C looks dead (`d01`). Talent tree, J panel and shop could not be exercised in-run (defeat modal). (`companion-ultimate-designer`, `ui-hud-engineer`) |
| 6 | Story / RPG fan | 5 | 6 | The defeat copy gives stakes: "Ruhun hələ də qəhrəmanın bədəninə qayıda bilər, amma kölgələr bu qaçışın qızılından pay alacaq." (`m03-15s.png`). The guide NPC "Qoca Müdrik Orion" and region names are visible (`d01`). | The title screen was not reviewed closely, so the dev-speak fix (`fix-ui.md` item 4) is unconfirmed. Death comes before any story beat lands. (`narrative-balance-designer`) |
| 7 | Streamer | 6 | 6 | Clear big banners ("ZÜMRÜD QƏDİM MEŞƏSİ", `d01`) and the defeat card reads on stream. | An 8-second death on stream is dead air. The desktop HUD is still dense (`d01`). Boss, arena and victory not captured. (`game-engine-developer`, `ui-hud-engineer`) |
| 8 | Completionist | 6 | 7 | Progress survives New Game and reload (see 5). The defeat card lists the run's souls and the run's gold, and the quest list shows counts (`d01`: "0/3", "Təhlükə 0/3"). | Quest tracker on desktop is always expanded (`d01`), which takes space. Long-term goals are still hard to see on the phone (`m06-tracker.png`, collapsed line only). (`ui-hud-engineer`) |
| 9 | Teen action gamer | 5 | 4 | Touch layout is compact and labelled: all seven buttons fit (`m01`). Hit feedback is strong (`3x HIT`, `d01`). | Dies at 8 to 9 s in both runs (`d02`, `m03`). The 30 s mobile run became about 9 s of play, then 20 s behind the defeat modal. This is the worst outcome of the round, and the 5.4 round said the same ("died within 12 s idle"). (`game-engine-developer`, `narrative-balance-designer`) |

**Old average:** 49 / 9 = 5.4. **New average:** 54 / 9 = **6.0 / 10. Verdict: POLISH** (5 to 7). No score is 3 or lower, but SHIP needs 7 or more, and the early death blocks that.

Confidence: medium-low. Three reasons: (1) the bot died early, so the in-run mechanics (C, R, J, T, B, Esc pause, companion cycle) are untested; (2) mobile pause could not be tapped; (3) the title screen was not reviewed closely. Both defeat-path and persistence results are solid.

## What got better (vs round 1)

- **Death has consequences and the defeat screen is reachable.** It was dead code in round 1 (`showGameOver` only on victory). Now it shows the stats table, the penalty row, and both choices, and works on desktop and mobile (`d12-end60.png`, `m03-15s.png`). Continue gives back full HP and takes 25% of run gold.
- **New Game keeps progress.** Round 1 wiped gold and upgrades. Now they survive New Game and a reload (`p03`, `p04`, `results.json` `persist`).
- **Mobile layout fits 375 px.** Zero horizontal overflow. Seven labelled touch buttons, two-row hotbar, no clipped labels (`m01`). Round 1 had the bars cut off at both edges.
- **Touch FTUE wording.** "JOYSTİKLƏ HƏRƏKƏT ET" with a "Keç" skip on phones (`m01`) instead of "WASD".
- **Quest tracker on phones.** One line above the weapon bar (`m01`, `m06`), tappable to expand.
- **Pause freezes the world on blur or hidden tab** (`fix-core.md` item 4, code path only, not re-verified in this round).

## Top 5 remaining fixes

Ranked by how many personas each one helps.

| Rank | Fix | Personas | Owner and file |
| :- | :- | :- | :- |
| 1 | **Stop the 8 to 9 second death.** Both runs died with no dodging. Check the first-minute spawn and damage: what hits the player right after spawn, and whether the first region's early enemies or hazards are too aggressive. Target: survive 30 s of untrained input | Hardcore, Casual, Teen, Streamer, Story | `game-engine-developer` (`engine.js:1811` `spawnInitialEnemies`, `engine.js:2719` `damagePlayer`), `narrative-balance-designer` (`src/content.js` early-region numbers) |
| 2 | **Modals stay open across game over and menu.** The B key opens the shop during the defeat screen, and it stays on top of the main menu. Guard B and Tab on `isGameOver`, and close all modals in `goToMenu` | Stress, Explorer, UI, Completionist | `game-engine-developer` (`engine.js:305` B/Tab handler, `engine.js:587` `goToMenu`), `ui-hud-engineer` (`src/ui.js` `toggleShopModal`) |
| 3 | **Companion label never updates.** `companion-name-badge` is only read (`ui.js:165`), so the HUD keeps showing the first companion. Write the active name when `setActiveCompanion` runs, and emit an event so the HUD can update | Hardcore, Explorer, Casual, Streamer | `ui-hud-engineer` (`src/ui.js:165` and the companion slot), `companion-ultimate-designer` (`src/companions_ultimates.js:244` `cycleCompanion`) |
| 4 | **Desktop HUD clutter in the first minute.** Quest panel fully expanded on desktop (`d01`), plus the region banner, mission card, "3x HIT" card and FTUE card. Collapse the quest panel to one line by default, as on phones, and hide the mission card until the first objective is done | UI, Casual, Streamer, Completionist | `ui-hud-engineer` (`index.html` quest tracker CSS), `onboarding-designer` (`src/daily_trials.js` FTUE card, mission card placement) |
| 5 | **Mobile canvas overlap.** The region banner covers the top HUD for several seconds, and the "[F] ... ilə danış" prompt sits above the touch buttons (`m01`). Also make `#btn-hud-pause` findable and tappable in the mobile layout so pause can be verified | UI, Teen, Casual, Stress | `game-engine-developer` (`engine.js` ~2988 interact prompt, `engine.js` region banner in `events_arena.js`), `ui-hud-engineer` (`index.html` mobile block, pause button) |

## Notes for the CEO

- The next round needs a real in-run check: either a bot that dodges, or a debug hook that gives temporary invulnerability (test-only, not shipped). Without it the C, R, J, T, B, Esc and mobile-pause checks stay unverified.
- The round-1 fix list is mostly done: defeat, persistence, touch labels, FTUE wording and the quest tracker all moved. The remaining gap is early-game survival, which the fix pass did not touch.

```
STATUS: done
FILES: reports/aetheria/council-2.md (written); playtest-results/aetheria-council2/ (results.json, 27 screenshots; run.mjs deleted after the run)
API: none (review only; no game files edited)
VERIFIED: own Playwright run, desktop 1280x720 (defeat, Continue, Ana Menyu, buy and persistence across New Game and reload) and mobile 375x812 touch (30 s session); 0 page errors, 0 console errors; 0 horizontal overflow on mobile
REQUESTS: game-engine-developer: early-game death (engine.js:1811, 2719); B/Tab guard and goToMenu modal reset (engine.js:305, 587). ui-hud-engineer: companion badge (ui.js:165), desktop quest panel default, mobile pause id. companion-ultimate-designer: companions_ultimates.js:244 event on cycle. onboarding-designer: FTUE and mission card placement (daily_trials.js). narrative-balance-designer: early-region tuning (content.js)
NOTES: council average 6.0 (old 5.4), verdict POLISH. Confidence medium-low: bot died at 8 to 9 s, so in-run C, R, J, T, B, Esc and mobile pause were not validly tested. Desktop FPS from 206 frames only. Title screen not closely reviewed.
```
