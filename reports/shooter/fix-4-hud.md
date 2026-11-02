# Void Nova fix-4: HUD, menus, touch, feedback sounds

Only `shooter.html` (plus this report and screenshots in `playtest-results/shooter-fix4/`) was changed. No enemy, boss or weapon numbers touched. One 1-line hook in engine `update()` (analog stick added to `moveX/moveY`) and `render()` (`shakeScale`).

## What changed
| # | Item | Result |
| :- | :- | :- |
| 1 | Touch controls | Left floating joystick (analog, dead zone, base follows the thumb), right side hold = aim at the touch point and fire (tracked by touch id, multi-touch safe). DASH/EMP fire on `pointerdown`. Weapon slots tap-switch. Controls and hint appear only after `(pointer: coarse)` or a first real touch; hidden on desktop (verified `display:none`). |
| 2 | Mobile layout | `@media` for <=700 px wide and <=500 px tall. Nav collapses to 4 icon buttons (44 px), HUD cards compact, combo meter moved into the left column (no overlap), weapon bar full width at the bottom, DASH/EMP stacked above it on the right, safe-area insets, `touch-action: none`, no horizontal scroll. |
| 3 | Wave progress | HUD row "ENEMIES LEFT n" plus progress bar from `getWaveProgress()`; becomes "BOSS HULL n%" with a red bar on boss waves. Gold arrows with distance at the screen edge for the last 5 enemies when off screen. |
| 4 | Styling | `#pause-modal` (resume, sound, screen-shake toggle, boon list, controls), game-over run summary (wave, score, kills, best combo, time, boons, NEW RECORD, "PLAY AGAIN" focused), `#boon-reroll`, `.badge-common`. Boon draft cards are real buttons with `[1] [2] [3]` hints, stacked rows on phones (fits 360x640 without scrolling). Boon levels shown as small chips under the combo meter. |
| 5 | Canvas cues | Spawn chevrons: bigger, dark outline pass, pushed out of HUD rectangles. Boss immune shell: translucent disc, outlined ring, dashed outer ring. Teleport: filled footprint, dashed landing ring, shrinking ring, cross. |
| 6 | Menu | Controls legend (keyboard + touch, Esc/P pause, M mute, crit and chain-arc legend). Enter/Space starts. |
| 7 | Sounds | Cues `hurt`, `shield`, `boon`, `wave`, `tier`, `crit`, `chain` on the existing Web Audio engine, per-cue gap plus low-priority dropping. Mute (HUD button, pause menu, `M`) persisted in `voidnova_muted_v1` with try/catch; music scheduler skips node building while muted. |

Extras: keyboard 1-3 / R in the boon draft, Esc/P/Space fixes (Space no longer clicks a focused HUD button), screen-shake toggle (`voidnova_shake_v1`, defaults off under reduced-motion), `prefers-reduced-motion` rules, `aria-live` on banner and run summary, low-hull card pulse, DASH/EMP dimmed while unavailable, HUD writes diffed (`setHudText/Width/Class`), no dynamic `innerHTML`.

## Evidence
- `npm run playtest -- shooter.html --seconds 15`: PASS, 0 errors (avg 64.7 FPS, vsync-capped here).
- `--mobile`: PASS, 0 errors.
- Playwright real touch (CDP touch events, 375x812, `hasTouch`): left drag moved the ship 724-924 px, hold on the right set `mouse.down` and spawned 26 bullets, release cleared both; weapon slot tap switched to slot 4; DASH tap dashed; tapping boon card 2 picked it (wave 1 -> 2, chip shown); pause/resume by tap; game-over summary shown; no horizontal scroll at 375 and 360.
- HUD shows "ENEMIES LEFT 26/27" and "BOSS HULL 100%". 360x640 layout: no overlaps (only parent/child), DASH/EMP 62 px, tools 44 px, slots 82x58.
- Desktop: Enter starts, M mutes and persists, 1-3 picks in the draft, touch UI hidden.
- Screenshots: `playtest-results/shooter-fix4/` (d1280-*, m375-*, m360-*). Probe script deleted.

## Not verified / caveats
- Sounds were not auditioned by ear (headless); levels follow the existing engine's.
- Straggler arrows and teleport ring were not captured in a screenshot (code path only).
- Real-device touch (iOS Safari safe-area) untested.

REQUESTS: level-boss-designer: the "ENEMIES LEFT" count includes pending spawns and grows with asteroid splits, so the bar can step back slightly. game-engine-developer: the movement block still normalises thrust, so the analog stick gives direction only, not magnitude.
NOTES: Version of the HUD labels shortened (HULL INTEGRITY, THREAT LEVEL) so cards fit 360 px.
