# Aetheria core fixes (bug-fixer)

Owned files edited: `src/engine.js`, `src/ui.js`, `src/progression.js`, `src/companions_ultimates.js`, `src/weapons_relics.js`, `src/missions_campaign.js`, `src/events_arena.js`. Nothing else touched. Proof: a Playwright probe (GPU Chromium, local static server) ran 30 checks, all PASS; the script was deleted, screenshots are in `playtest-results/aetheria-fix/`.

## Fix list

| # | Issue | Root cause | Fix (file:line) | Proof |
|---|-------|-----------|-----------------|-------|
| 1 | New Game wiped gold, upgrades, skins, achievements, daily claim | `startNewGame` called `resetSave()` which deleted the whole save | `progression.js:355` new `resetRun()` (level, xp, region only); `:370` `resetSave()` now delegates to it; `:377` explicit `resetAllProgress()` full wipe, called by nothing; `engine.js` startNewGame calls `resetRun` | Seeded save (gold 1000, upgrades, achievement, daily claim, streak 3): after New Game gold 1350 (>=1000), upgrades, achievement, `lastDailyClaim`, streak identical; level 1, region 0 |
| 2 | Streak reset after 48 h | `streakBreakMs` branch set streak to 1 | `progression.js:829` always `(streak % 7) + 1`; branch removed | Streak 4, last claim 10 days ago: claim gives day 5 |
| 3 | Key multi-dispatch (C x3, M x2, F x2, 1-4 x3, R) | Listeners in engine, ui, companions, missions, relics | Engine is the single path (`engine.js:271` block for 1-4/C/R/M, F gated). Removed: companions `_handleKeyDown` + its listener, missions keydown listener, relics `_bindInputListeners`, ui Esc/B/1-4/R/C handler (ui keeps dialogue advance only). Touch ult/comp/nova no longer dispatch twice or thrice (`ui.js` touch handler: `onTouchAction` only) | Wrapped counters: one C = 1 `cycleCompanion` call and phoenix to dragon; one M = 1 bounty call; one `3` = 1 `switchWeapon` |
| 4 | Esc / pause desync | Engine and ui both toggled pause; menu Esc unpaused the sim | New `inMenu` flag; `engine.js:570` single `handleEscape` (closes top panel via `GameUI.closeTopPanel` `ui.js:563`, else toggles pause); `pauseGame/resumeGame` now own the pause modal so flag and modal cannot differ; `goToMenu` `:587`; `_autoPause` `:560` on `blur` and `visibilitychange` | Esc in menu: paused, world time stays 0 after 1.5 s. Shop open + Esc: shop closes, game keeps running. Esc pauses with modal. Shop over pause + Esc: flag equals modal. Esc resumes. Blur and hidden-tab both pause with modal |
| 5 | One thrown error froze the loop | rAF scheduled at the end of `gameLoop` | `engine.js:1217` `gameLoop` wraps `_frame` in try/catch/finally; each distinct error logged once with `console.error`; rAF in `finally` | VFX update forced to throw: time kept advancing after restore; exactly 1 log line |
| 6 | dt clamp 0.1 | AGENTS rule 5 says 0.05 | `engine.js:1233` `Math.max(0, Math.min(0.05, ...))` | 1 s stall advanced the world 0.067 s |
| 7 | Max HP upgrade had no effect | `baseMaxHp` cached once; per-frame `_applyPluginMaxHp` overwrote the progression value | `syncProgressionStats` now sets `player.baseMaxHp` from progression and re-applies plugin bonus | Buy maxHp: player.maxHp 106 to 136 = computed 136 (`07-maxhp-run.png`) |
| 8 | Companion and rage carried into New Game | `init()` returned early after first call | `companions_ultimates.js:205` `resetRun()` (rage 50, phoenix, ultimate, particles); `init()` calls it every time | Rage 100 + wolf, back to menu, New Game: rage 54, phoenix |
| 9 | Arena flag stayed after menu; run state leaks | `endArenaMode` only on New Game | `events_arena.js:1282` `resetRun` (arena off, wave counters, combo, `highestCombo`); `engine.js` `goToMenu` and run starts call it; `_beginRun` also clears cooldown timers, held keys, pause modal | Arena, Esc, main menu: `isArenaMode` true then false |
| 10 | Death had no consequence; defeat screen unreachable | Death called `respawnPlayer` directly | `engine.js:628` `handlePlayerDefeat` sets `isGameOver` and opens `showGameOver(false, summary)`; `:657` `continueAfterDefeat` takes 25% of run gold (`progression.js:407` `loseGold`, never below 0, never touches upgrades/level) then respawns; "Ana Menyuya Qayıt" goes to `goToMenu`. `ui.js:1224` summary: region, kills, time, best combo rank (`events_arena.js:1295`), gold, soul stones (`GameTalents.getRunEarnedSouls`), penalty. Victory screen now receives real gold | 200 run gold: summary shows kills 7, time, rank S, 200 gold, -50; Continue: gold 150 to 100, hp full, upgrades intact; second death then menu works (`10-defeat-summary.png`, `10-back-to-menu.png`) |
| 11 | "Davam Et" with no save | Button always shown | `progression.js:419` `hasContinuableRun()`; `ui.js:598` `refreshContinueButton` (init and `showMenu`) | Fresh storage: display none; seeded save: visible (`11-fresh-menu.png`) |
| 12 | Companion cycle silent | Only the module's own cue, drowned out | `engine.js:883` plays `relic` SFX | Code path only (audio not asserted) |
| QA 15 | Daily reward claimed from menu invisible | Notification lives in the hidden HUD; also showed total gold as reward | `ui.js` button label now shows `+gold, +crystals`; uses `rewardGold/rewardCrystals` | Code review only |
| QA 14, 2, 3, 1 | Esc cases | Covered by fix 4 | | see fix 4 |

## Verification
- `npm run check`: 24 scripts, 28 agents OK.
- `npm run playtest -- index.html --seconds 20`: 0 errors, 0 failed requests (several runs). `--mobile`: 0 errors.
- FPS: 59 to 84 desktop avg and 44 to 68 mobile across five runs, with about 46 Chromium processes alive from other agents' playtests. The earlier ~104 FPS baseline could not be reproduced under that load. My per-frame change is a try/finally only; rerun on a quiet machine to confirm.

## Not done
- QA #11 shop-header gold desync (ui.js renderShopContent): not reproduced from code, left alone.
- Streak ladder in `daily_trials.js` (separate system, onboarding-designer's file) still resets after a missed day.

```
STATUS: done
FILES: src/engine.js, src/ui.js, src/progression.js, src/companions_ultimates.js, src/weapons_relics.js, src/missions_campaign.js, src/events_arena.js, reports/aetheria/fix-core.md, playtest-results/aetheria-fix/*.png
API: GameProgression.resetRun(), resetAllProgress() (never auto-called), loseGold(n), hasContinuableRun(); GameCompanions.resetRun(); GameEvents.resetRun(worldState), getBestComboRank(); GameEngine.handleEscape(), goToMenu(), handlePlayerDefeat(), continueAfterDefeat(), inMenu flag; GameUI.closeTopPanel(), isPauseModalOpen(), refreshContinueButton(), showGameOver(isVictory, {kills, gold, timeSec, regionName, bestRank, souls, penalty, canContinue}); GameRelics/GameCompanions/GameMissions no longer bind keyboard listeners
VERIFIED: npm run check OK; playtest desktop and mobile 0 errors; Playwright probe 30/30 checks pass for fixes 1-11 (script deleted)
REQUESTS: ui-hud-engineer (index.html CSS): style the defeat summary rows if wanted; the Continue button is hidden via inline display:none. onboarding-designer: daily_trials.js streak still resets after a missed day; its J panel Esc is now closed through GameUI.closeTopPanel, no change needed there
NOTES: Gold now persists across New Game by design (level/xp/region are the per-run state). Penalty is 25% of stats.goldCollected, capped at current gold; tune in engine.js handlePlayerDefeat. FPS numbers were taken under heavy machine load.
```
