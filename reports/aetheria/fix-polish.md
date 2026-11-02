# Aetheria polish pass

Files: `index.html`, `src/ui.js`, `src/daily_trials.js` (nothing else). Kept: dirty-checked HUD helpers, run-summary defeat screen, Esc/pause logic, save validation, streak pause, touch FTUE wording.

| # | Item | Result |
| :- | :- | :- |
| 1 | Canvas cards behind DOM hotbar/touch buttons | FTUE card (`daily_trials.js`): on touch/compact it now stays above the topmost of `.weapons-panel`, `.hud-bottom-center`, `#quest-tracker` (DOM rects, cached 250 ms). Mission/bounty card (`missions_campaign.js`, not my file): `ui.js` wraps `_renderTopRightMissionCard` once; on touch with width <= 600 it is skipped (the quest tracker lists the same mission and expands on tap), on wider touch screens it is translated above the weapon bar. Desktop unchanged. 360x640: added an icon-only 46 px hotbar so the weapon bar, tracker and FTUE card stack without overlapping the controls. |
| 2 | Hide DOM HUD while the daily panel is open | `_syncPanelState` also sets `daily-open` on `#game-hud` (hero card, currencies fade out; touch controls dim to 18% and stop capturing taps). The existing `panel-open` class is reused for the rest. |
| 3 | Quest tracker toggle | `#quest-tracker` is `role=button tabindex=0 aria-expanded`; tap/click, Enter and Space toggle `.expanded`. After a pointer tap it blurs, so Space stays free for the game. Verified: keyboard on/off and tap. Expanded list is capped (30vh, scrolls). Phone line shows a chevron. |
| 4 | Defeat summary styling | Rows with dividers, gold values, red dashed penalty row (`stat-row stat-penalty`), tabular numbers; compact card capped to the viewport with scrolling body (Continue/Menu buttons were being clipped at 1280x720 and 375x812, now visible); subtitle hidden when height < 760. Checked at 1280x720, 375x812, 360x640. |
| 5 | Combo HUD on phones | <= 600 px: small pill (rank + hits + 64 px timer, multiplier text hidden) parked just above the quest tracker, no scale bump. |
| 6 | QA #11 shop header gold | Not reproduced: 7 purchases in a row, header, `GameProgression.state.gold` and HUD matched every time. Added a cheap diffed header refresh in `_syncPanelState` while the shop is open as a safeguard. |

## Verified
- `npm run check` OK; `node --check` on both JS files OK.
- `npm run playtest -- index.html --seconds 15`: PASS, 0 errors, 0 failed requests (FPS 41.7, machine loaded by other agents). `--mobile`: PASS, 0 errors (FPS 40.7).
- Playwright probe (deleted): 375x812, 360x640, 1280x720 and 768x1024 touch. Screenshots in `playtest-results/aetheria-polish/` (`a-*` = after, `base-*` = before): `*-ftue`, `*-combo`, `*-tracker-collapsed/expanded`, `*-daily`, `*-defeat`, `a-tablet`, `shop`.

## Not done / remaining
- Engine canvas interact prompt ("[F] ... ilə danış", `engine.js` ~line 2988, y = height - 110) still sits behind the touch buttons on phones. Owner: game-engine-developer, move it above `height - 380` when touch. The DOM interact prompt already exists.
- Talent card footers at 1280x720 (QA #7) were not re-touched here.
- The region/event banner (`events_arena.js` `_renderBannerHUD`, y = 115) covers the hero card on phones for a few seconds; owner events-arena.
- At 360x640 the FTUE card still touches the canvas "[T] Istedadlar" chip (talent_tree.js) by a few pixels; both are canvas-drawn.
