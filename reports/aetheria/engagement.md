# Aetheria engagement review

Agent: `engagement-psychologist`. Date: 2026-11-02. Review only: no game files edited, no browser playthrough. Pacing numbers come from code. The new-game wipe in finding 3 was confirmed by running the real `src/progression.js` in Node with a stubbed `localStorage`.

## Core loop timing
- Tutorial: 6 action-gated steps, skippable with `[H]`, no reward for steps.
- First reward: a kill gives 14 gold and 22 XP (`engine.js:2691-2692`). Level 2 needs 100 XP, about 5 kills. The first region quest pays +80 gold, +40 XP.
- Action-to-reward gap in combat: under 5 s. Gaps over 30 s in the first 5 minutes are unconfirmed and need a timed run.
- A run ends only on victory at the region-3 portal (`engine.js:1907-1912`). Death respawns in place after 2.5 s (`engine.js:2644-2650`, `709-725`). Arena never enters `game_over` (`events_arena.js:101`, `1027`).

## Feedback
Good: kills, perfect dodge (`events_arena.js:371-410`), ultimate not charged, level-up, daily claim, chest opening.
Weak: companion cycle `[C]` has no SFX (`engine.js:772-786`). Talent purchase and quest-complete sounds are unconfirmed.

## Goals and mastery
Short, mid and long goals exist (tutorial counter, region quests, 3 regions). Mastery exists (combo D to SSS, perfect dodge, rank bar, arena best wave). But finding 3 means shop and upgrade progress does not carry between runs, so long-term goals are not reachable in practice. The arena record is never shown at the end of a run.

## Ending a session
Victory modal (`ui.js:1261-1268`) shows region, kills and gold only. Death shows a 5 s toast with soul stones (`talent_tree.js:1368-1374`), then respawns. There is no summary and no natural stopping point.

## First 60 seconds
On the first frame of a run (desktop) a new player sees about 12 HUD clusters: player card, 3 currency chips, minimap with 4 buttons, a quest tracker with 5 quests, region card, tutorial card, zone banner, 4 weapon slots and an 11-key hotbar. That is 15 labelled keys before any input. "Davam Et" (Continue) shows even without a save. On mobile (375x812) there are 9 touch controls, and the daily-trials panel overflows the right edge. Verdict: overwhelming.

## Dark-pattern check: FAIL

| # | Pattern | Result | Evidence | Severity |
| :- | :- | :- | :- | :- |
| 1 | Loss-aversion login streak | Found | `daily_trials.js:435-441`: a missed day resets the streak to day 1; day 7 pays 600 gold + 25 crystals (`254-262`) | High |
| 2 | Hidden streak cliff | Found | `progression.js:770, 787-790`: claiming more than 48 h after the last claim silently resets a second, separate streak; no UI warning (`ui.js:324-341`) | High |
| 3 | Silent destruction of progress | Found (bug) | `engine.js:409-412` calls `GameProgression.resetSave()` on every New Game; `progression.js:354-363` deletes the save. Node run: gold 5,195 → 50, upgrades 4 → 0, skins and daily claim lost, no confirmation | High |
| 4–9 | Fake scarcity, pay/wait walls, paid loot boxes, guilt messaging, near-miss manipulation, notifications | None found | | Pass |
| 10 | Daily trials reset with no visible time | Found | Rotates at local midnight, no reset time shown | Low |

Also: `index.html:10-12` loads Google Fonts from a CDN, which contradicts the zero-external-assets default.

## Top 5 recommendations

1. **Keep meta-progress across New Game.** Very high impact, low effort. `progression-economy-designer` (`src/progression.js`: split `resetSave()` into a per-run reset and a persistent save) and `game-engine-developer` (`src/engine.js:409-412`). A full reset belongs behind a confirmed "Reset all progress" setting. Acceptance: buy an upgrade, claim the daily, start New Game; all of it survives.
2. **Remove streak punishments.** High impact, low effort. Merge the two streak systems (`progression.js` and `daily_trials.js`) into one with a grace day; a missed day pauses the ladder instead of resetting it.
3. **Progressive disclosure in the first minute.** High impact, medium effort. `ui-hud-engineer`: start with movement, attack, dash and HP/XP; reveal the weapon bar after the first kill, the quest tracker after the tutorial, and M/T/J/F/B after the first level-up; one active quest with the rest collapsed; hide "Davam Et" without a save; fix the mobile daily panel overflow.
4. **Give every run a real end.** High impact, medium effort. `game-engine-developer` (run-end path on death, arena `game_over`), `ui-hud-engineer` (end card: kills, time, best combo rank, soul stones earned, arena best wave, next goal), `meta-progression-designer` (death notice content).
5. **Make the talent goal legible.** Medium impact, low effort. `meta-progression-designer` (`src/talent_tree.js`): the full tree costs 4,590 soul stones; show "X / next unlock" progress, and tune from playtest data.

Smaller: companion-cycle SFX, a reset-time label on daily trials, remove the CDN font.

## Process notes
- Five files call `localStorage` directly (`daily_trials.js`, `events_arena.js`, `missions_campaign.js`, `progression.js`, `talent_tree.js`); the studio rule says persistence goes through one module.
- `GAME_SPEC.md` is still the V2.0 spec; its file list and agent names predate the V4 modules.
