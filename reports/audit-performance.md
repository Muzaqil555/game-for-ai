# Performance audit: Aetheria (index.html)

Machine: RTX 4050 laptop, D3D11 (ANGLE), headless Chromium via `npm run playtest -- index.html --seconds 20`.
The display runs at 144 Hz, so frame times land on multiples of 6.9 ms (14, 21, 28, 35, 42, 49 ms).

## Before / after (official playtest, 20 s, random input)

| | avg FPS | p95 frame | worst frame | errors |
| :- | :- | :- | :- | :- |
| Before (6 runs) | 40.6, 41.7, 42.4, 46.3, 58.7, 79.0 | 27.7 to 55.5 ms | 76 to 889 ms | 0 |
| After (9 runs) | 87.9, 89.0, 93.2, 103.2, 106.3, 107.8, 108.8, 108.8, 110.6 | 14 to 21 ms | 62 to 104 ms | 0 |

Spread: before 40 to 79 FPS (the machine state also drifted between runs), after 88 to 111 FPS.
`npm run check` passes (24 scripts, 28 agents).

## Finding: what actually made it slow

The per-frame JavaScript is cheap (about 4 ms: E.render 1.3 to 3 ms, update 0.4 to 0.9 ms). Canvas draw-call
counts are high (about 1300 per frame, 600 of them background tiles), but stubbing out the background, obstacles,
props or lighting one at a time changed nothing measurable. A frame-time breakdown by input key found the culprit:

| Input (12 to 15 s, otherwise idle) | avg FPS |
| :- | :- |
| movement keys only | 120 to 131 |
| Space/Shift, q/e, j, k | 103 to 131 |
| **keys 1/2/3 (weapon switch)** | **54 to 56** |

Pressing 1/2/3 spawns floating labels such as "sword-emoji Aether Qilinci" (engine.js:751, weapons_relics.js:414).
They are drawn with `strokeText` + `fillText` containing an emoji under the camera transform (fractional translate,
zoom, shake). That path re-rasterises the colour glyph every frame. A handful of labels cost roughly 8 ms per frame.
With `spawnFloatingText` stubbed out the same input scenario ran at 113 to 126 FPS, so the label is the whole cost.

## Changes

1. **src/vfx.js (new helper near line 53, use at the floating text loop, about line 2517): emoji floating texts are
   cached as sprites.** Text containing emoji is rendered once (outline + fill) into a small canvas keyed by
   text/colour/size/baseline and blitted with `globalAlpha`. Text without emoji (damage numbers) is untouched.
   Cache is capped at 160 entries.
   - Weapon-switch scenario: 54, 57, 54 FPS before, 115, 123, 122 FPS after.
   - Official playtest: 40 to 79 FPS before, 88 to 111 FPS after.
   - Visual difference: during the fade, the outline no longer shows through the semi-transparent fill (the sprite is
     composited as one image at the fade alpha). Not noticeable at 16 to 23 px.
2. **src/ui.js (helpers near line 18, applied in `updateHUD` and its sub-functions, about lines 1238 to 2070):
   dirty-checked DOM writes.** `textContent`, `style.*`, `title` and class toggles on the HUD now skip the write when
   the value is unchanged (`setText`, `setStyle`, `setTitle`, `setCls`). Before, about 20 HUD elements were mutated
   every frame (578 mutations each over 8 s), which re-rasterised the HUD panels that sit on `backdrop-filter`.
   - Mutations: about 20 elements x 578 per 8 s before, only values that really change (mana bar, active cooldowns,
     combo bar) after.
   - Trace: DOM raster tasks 4883 per 8 s before, about 2300 after.
   - Interleaved A/B in the random scenario (4 rounds): 87.7 avg FPS before, 91.3 after. This is inside the noise,
     so treat it as a small, risk-free gain, not a proven big one. Behaviour and look are identical.

## Tried and reverted (did not help, per the rules)

- Cached glow sprites instead of `shadowBlur` on projectiles and dash trails (vfx.js `_renderProjectile`,
  `_renderDashTrail`): 106.8 avg FPS with and without, so reverted. Disabling every `shadowBlur` gives about +8%, but
  that changes the look.
- Pre-warming the emoji font and the `drawImage` pipeline at `GameVFX.init`: the first-use spikes did not move, so
  removed.
- Stripping emoji from the elite name label (elite_affixes.js:1039, world space): no measurable gain.
- Disabling `backdrop-filter` (6 HUD panels) and CSS animations in A/B runs: inconsistent, within noise once the
  weapon-switch cost was gone. Not changed, because it would alter the visuals.

## Heap

120 s random-input run: JS heap oscillates between 6 and 11 MB with no upward trend (sawtooth GC). Not run for the
full 5 minutes.

## Remaining risks

- **Worst frame is still 62 to 104 ms in the playtest, above the 50 ms goal.** Causes seen in traces: GPU-bound
  frames where the canvas flush (`RasterCHROMIUM` inside `Commit`) waits 20 to 40 ms, and one-off first-use spikes
  (first emoji label sprite 1 to 5 ms each, first open of the daily-trials panel with `J` about 22 ms,
  `renderLightingAndPostFX` 12 to 20 ms when several new sprites are created in one frame). Without the playtest's own
  two screenshots (the probe keeps recording during them) the worst frames I measured were 41 to 62 ms, but this was
  not consistent across runs.
- Emoji in canvas text is still drawn directly in the HUD every frame (missions card, daily-trials panel, talent
  button, loot banner) and in a few world-space labels (events_arena.js:1482/1505/1508, missions_campaign.js:1454
  to 1557, elite_affixes.js:857/957/1039). Only the stroked floating text was proven to be expensive; filled emoji
  text in these places did not show up as a cost in my runs.
- Results are very sensitive to machine state (the same code ranged 56 to 120 FPS across runs on this laptop). Use
  interleaved A/B runs when comparing.
- Background tiles issue about 600 canvas calls per frame. They are static and could be cached in chunk canvases, but
  removing them entirely showed no gain, so it was left alone.
- Not done: the other modules (audio, AI director, progression) were not profiled beyond the per-call timings above.
