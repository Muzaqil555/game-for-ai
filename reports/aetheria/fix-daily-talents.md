# Aetheria: daily trials and talent tree fixes

Files: `src/daily_trials.js`, `src/talent_tree.js` (nothing else touched).

## daily_trials.js

| # | Item | Result |
| :- | :- | :- |
| 1 | Corrupted save freezes the game (security #1, #5) | Fixed. Saved trials are rebuilt from today's seeded definitions. Only `progress` is read from storage (finite, clamped to [0,target]); `completed` is derived from it. Title, target and rewards always come from the template table. Unknown ids, non-objects, wrong lengths and bad JSON are healed and re-saved. `getSummary` and all loops skip empty entries. `renderHUD` and the panel use `try/finally`, so the canvas save/restore stack stays balanced and a draw error warns once instead of killing the loop. |
| 2 | Streak punishment | Fixed. A missed day no longer resets to day 1. The ladder pauses and resumes where it was. A day reached but not yet claimed is also kept (previously a load without a run skipped it). The panel shows "Növbəti mükafat: Gün N" in neutral wording, "Fasilə oldu: pillə Gün N-də saxlanıldı" after a gap, and "Yeni sınaqlar: yerli vaxtla 00:00 (X saat Y dəq sonra)". |
| 3 | Mobile panel | Panel width is `min(430, w-24)`, centered under 560 px. The 7-day strip is computed from the width (all 7 days visible at 375 px). Trial cards use a taller layout on narrow screens. Text is ellipsized. If the height is too small the panel scales down. |
| 4 | Touch-aware FTUE | Touch wording ("JOYSTİKLƏ HƏRƏKƏT ET", "⚔ DÜYMƏSİNƏ TOXUN", "💨 İLƏ YAYIN", "SİLAH LÖVHƏSİNƏ TOXUN", "☄️ ...") is shown when `(pointer: coarse)` matches or a touch event was seen. A mouse pointer switches back. The skip button is tappable on touch (pointerdown hit test) and labelled "Keç". |
| 5 | Card position on 375x812 | On compact/touch layouts the card sits at `max(258, 0.31h)`, clear of the joystick, the action cluster, the weapon bar and the hotbar (DOM layers cover the canvas bottom; the old h-232 position was hidden behind them). Desktop keeps h-232. |

## talent_tree.js

| # | Item | Result |
| :- | :- | :- |
| 6 | Load hardening | Stats: only the 3 known keys, each as a clamped non-negative integer. Soul Stones are capped at 999,999,999 on load, on gain and on refund. Talent ids are checked with `hasOwnProperty` (load and `upgradeTalent`). |
| 7 | Legible goal | The header shows "Növbəti açılış: <talent> — X / cost 💠 • Ağacın qalanı: N 💠". It shows "Bütün istedadlar açılıb!" when nothing is left. |
| 8 | Respec | The native `confirm()` was the cause (auto-dismissed in automation, easy to miss). It is replaced by an in-modal two-step confirm: first click turns the button into "Təsdiqlə: +N 💠" with a "Ləğv et" button (auto-disarms after 6 s and on close); second click refunds every spent soul stone and shows "↺ N 💠 geri qaytarıldı". |

## Evidence (screenshots in `playtest-results/aetheria-daily/`)

- Corrupted saves, with `aetheria_daily_trialsDate` set to today and `trialsData` set to `null`, `[null]`, `{bad`, and a forged array (target 0, rewards 99,999,999, string progress, wrong ids): no page errors. The Shop modal opened. New Game ran: `worldState.time` advanced (about 2.6 s to 4.2 s). The forged rewards were replaced by table values (350/12, 250/7, 220/6). Screenshots `shop-*.png` and `play-*.png`.
- Mobile 375x812: `mobile-panel.png` shows days 1-7 inside the panel. `mobile-tutorial.png` shows the joystick wording, the card clear of the controls, and the "Keç" button.
- Talents: souls 300, bought 1 talent (285), clicked Sıfırla (button became "Təsdiqlə: +15 💠"), clicked again, souls back to 300. Hardened load: souls `"1234...30 digits"` shows 999999999; `constructor`/`toString` talent ids ignored.
- Streak (Node, mocked storage): day 4 claimed, 5 days missed, streak is 5 on return.
- `npm run check`: PASS. `npm run playtest -- index.html --seconds 12`: PASS, 0 errors. `--mobile`: PASS, 0 errors. FPS 43-44 on this run, while other agents were running in parallel; not caused by these files (canvas drawing is a few dozen calls per frame).

## REQUESTS

- ui-hud-engineer (`index.html` / `src/ui.js`): the daily panel is canvas-drawn and sits under the DOM HUD (player card, currency chips, hotbar), so those cards overlap it on phones. Hide or dim the DOM HUD while `GameDaily.getSummary().isPanelOpen` (`ui.js` already has `_isDailyOpen`), or give the canvas panel a higher layer. Same for the tutorial card (the combo toast can cover it briefly).
- game-engine-developer (`src/engine.js:312`): pressing Esc in the Shop raised `this.handleEscape is not a function` once in an earlier probe run (not reproduced on later runs; likely concurrent edits). Worth a re-check.
- ui-hud-engineer: talent card footers are still clipped at 1280x720 (QA #7). The new progress line adds one header line.
- progression-economy-designer: the second streak system in `progression.js` still resets after 48 h (engagement #2). Merge it with this paused ladder.

## Notes

- Tuning knobs: `STREAK_REWARDS`, `TRIAL_TEMPLATES`, `MAX_SOULS`.
- Both modules still call `localStorage` directly (studio rule says via `GameSave`); not changed here.
- Respec does not retroactively lower a live `maxHp` from Iron Skin in the current run; it applies at the next run.
