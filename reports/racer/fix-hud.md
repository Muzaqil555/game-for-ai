# Apex Pursuit 3D: HUD fix (ui-hud-engineer)

Files edited: `src/racer_hud.js`, `src/racer_hud.css` only. Every new overlay (alert stack, toast, pause button, pause menu, run summary) is created by `NeonHUD.init()` with `textContent`, so **racer.html needs no new markup, only calls**. Screenshots: `playtest-results/racer-hud/` (desktop 1280x720, mobile 375x812, mobile 360x640; temporary harness deleted).

## What changed
1. Touch layout: steering is bottom-left, the pedals are a 2x2 CSS grid bottom-right (NOS / E-BRAKE over BRAKE / GAS), pause button bottom-centre. No negative margins. Measured at 375x812 and 360x640: zero overlapping control rects, every centre/left/right-edge hit-test returns the control itself, all targets >= 48 px (steer 58, round 56, pedals 64 wide), CDP touch on steer-right centre and right edge gives `steer: 1` and `handbrake: false`. Safe-area insets applied.
2. Mobile HUD: the instrument cluster is lifted above the controls (`padding-bottom` = controls height) so GAS no longer covers the speed digits; mirror is on its own row (no CHASE/AUDIO overlap); credits sit above CHASE/AUDIO (44 px tall); `[SHIFT]` hint hidden on touch so NITRO is not clipped; header is single line (<= 900 px: title ellipsised, non-active nav links hidden; <= 700 px: nav links hidden).
3. Drift panel shown on phones as a one-line pill (G-force and attitude lines hidden).
4. Alert queue (below). 5. Heat meter + banner (below). 6. Run summary. 7. Pause indicator. 
8. Mirror text 11 px (strings shortened: `PATROL CLOSING . 107 m`, `REAR CLEAR`, `GPS SCANNING`); `_renderTick` bound once (`this._tick`); empty catches replaced by a one-time `console.warn`; all per-frame text/style writes are now diffed; numbers use `en-US` grouping (fixes "$1.600" looking like a decimal).
9. Touch pause button (hidden on non-touch) calling `onPause`; pause menu has Resume / Restart / Garage.
Also: touch layer follows resize and first-touch instead of being decided once; all held controls release on blur / tab hidden / pause / summary; steering tracks left and right independently; `prefers-reduced-motion` disables animations; visible `:focus-visible` outlines; `touch-action: none` on `#three-canvas`.

## API (`window.NeonHUD`)
- `pushAlert({text, kind, amount?, sub?, duration?})`. kinds: `busted`, `evaded`, `takedown`, `heat-up`, `heat-down`, `chopper` (big banner lane); `spike`, `near-miss`, `info` (small toast lane under the banner). `amount` renders as `+$1,500`. One alert per lane at a time, flow layout so lanes never overlap. Newest wins if the current one has been visible >= 600 ms and has priority <= the new one (busted > takedown > evaded > heat-up > chopper > spike > heat-down > near-miss); otherwise it queues (max 3, stale after 5 s, weakest dropped). Identical consecutive alerts merge into `x2` with summed amount.
- `triggerTakedownBanner(title, subtitle)` still works (routed into the same queue; a title containing "BUSTED" is styled as busted).
- `update({... heatLevel, heatPercent, heatName?})`: `heatPercent` (0-100 inside the level) drives a continuous meter, tag reads `HEAT 2 . 45%`. A change of `heatLevel` auto-fires a `heat-up` / `heat-down` banner with the tier name (`heatName`, or built-in names LOCAL PATROL ... MAXIMUM ESCALATION).
- `showSummary({duration (s), takedowns, peakHeat, driftScore, creditsEarned, bestScore, reason: 'busted'|'ended', newBest?, onRunAgain?, onGarage?})`, `hideSummary()`. Focus goes to "Run again"; keys: Enter/Space on focused button, R = run again, Esc = garage, Tab/arrows toggle; while open, keydown is swallowed (keyup still passes).
- `setCallbacks({onRunAgain(), onGarage(), onPause(wantPaused:boolean)})`. Per-call `onRunAgain`/`onGarage` in `showSummary` override these.
- `setPaused(bool)`: shows/hides the PAUSED menu, flips the pause button icon/aria, releases touch inputs, moves focus to Resume and restores it afterwards.
- `reset()`: clears alerts, summary, pause and heat tracking. Call when a run starts.

## racer.html: ready-to-paste calls (game-engine-developer)
Wiring once, after `NeonHUD.init(...)` (line ~1293):
```js
NeonHUD.setCallbacks({
  onPause: (want) => { setPausedState(want); NeonHUD.setPaused(want); }, // your pause logic; also call from Esc/P
  onRunAgain: () => launchRace(),                                       // restart with the current car
  onGarage: () => showGarage()                                          // reopen #garage-modal
});
```
In `launchRace()` after `pursuitAI` is created: `NeonHUD.reset();` (replace the `triggerTakedownBanner('PURSUIT ACTIVE', ...)` line if desired by `NeonHUD.pushAlert({kind:'info', text:'Pursuit active', sub:'Highway sector online'})`).
Events:
```js
NeonHUD.pushAlert({kind:'near-miss', text:'Near miss', amount:150});
NeonHUD.pushAlert({kind:'evaded',   text:'Pursuit evaded', amount: reward});
NeonHUD.pushAlert({kind:'spike',    text:'Spike strip hit', sub:'Tires damaged'});
NeonHUD.pushAlert({kind:'chopper',  text:'Chopper lock', sub:'Break line of sight'});
NeonHUD.pushAlert({kind:'takedown', text: unit.name + ' down', amount: paid});
NeonHUD.pushAlert({kind:'busted',   text:'Busted'});
NeonHUD.showSummary({duration, takedowns, peakHeat, driftScore: score, creditsEarned, bestScore, reason:'busted'});
```
Heat: keep passing `heatLevel`, `heatPercent` and add `heatName: pursuitAI.heatConfig && pursuitAI.heatConfig.name` (optional). Banner for level changes is automatic: do not also push heat banners yourself.

## REQUESTS
- game-engine-developer: wire the calls above; pass the real `heatPercent` (0-100 within the level, not 0-1); while paused or summary open, stop the sim (HUD only shows the UI); optional `mobile` garage fixes from QA #5 (garage hint "PRESS SPACE OR ENTER", modal under header) are in racer.html's inline CSS, not mine.
- game-engine-developer: add a visible link back to the other games for phones (header nav is hidden <= 700 px by CSS to keep one line); the garage is a natural place.
- game-engine-developer: the inline `style="..."` on `#g-force-tag` / `#chassis-attitude-tag` uses 9.5 px text; bump or move to classes if desired.

STATUS: done
FILES: src/racer_hud.js, src/racer_hud.css, reports/racer/fix-hud.md, playtest-results/racer-hud/*.png
API: NeonHUD.pushAlert / showSummary / hideSummary / setPaused / setCallbacks / reset (see above)
VERIFIED: node --check; npm run check (24 scripts, 28 agents); harness on racer.html at 1280x720, 375x812, 360x640 with 0 console errors/warnings, 0 control overlaps, real CDP touch on steer-right OK, alert queue order verified, summary keyboard flow and callbacks verified; screenshots reviewed
REQUESTS: game-engine-developer (wire-up, pause logic, nav link, garage mobile fixes)
NOTES: on 360x640 transient alerts can cover the drift pill; the harness could not exercise real in-game events, so alert call sites await wiring; `:has()` is used for the touch padding (with a <= 900 px fallback)
