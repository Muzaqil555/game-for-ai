# Aetheria UI fix pass (index.html only)

Agent: `ui-hud-engineer`. All changes are CSS/markup in `index.html` (one override block at the end of `<style>` plus text edits). Arcade bar and `--arcade-h` kept. No .js touched.

## What changed
1. **Mobile HUD (375x812):** hotbar and weapon bar no longer scaled or clipped. Hotbar is `width:max-content; max-width:100vw-16px; flex-wrap` (2 rows of 6/5 on phones, one row on desktop); weapon bar shows the name of the active weapon only on phones. Measured: 0 slots outside the viewport, no horizontal scroll.
2. **Touch controls:** 7 buttons now carry labels (Hücum, Sıçra, Sehr, Nova, Qiyamət, Yoldaş, Əlaqə). Buttons are 54 px (attack 72 px). The cluster is a compact 2-row block (about 150 px tall, 250 px wide), joystick 104 px, safe-area insets applied. The cluster is clear of the hotbar and weapon bar.
3. **Font size >= 11 px:** `.bar-label`, `.minimap-compass-n`, `.skill-label`, `.skill-hotkey-badge`, `.weapon-key`, `.rage-badge-text`, `.companion-badge-text`, `.relic-badge-lvl`, rarity tag are 0.6875rem (11 px). Ellipsis removed from the companion name ("Alov Simurq" shows in full). Check: no HUD leaf text under 11 px at either size.
4. **Title:** badge now "Kölgələr oyanır • Qəhrəman, sən hazırsan?"; footer "Qədim rünlər səni gözləyir. Yolun işıqlı olsun, döyüşçü." `.menu-content` has top padding below the arcade bar and scrolls if short.
5. **Phone quest tracker:** one line (first quest title, ellipsis), above the weapon bar, instead of hidden.
6. **Talent cards (DOM, from talent_tree.js styles):** overridden from `index.html` with `#talent-tree-modal` selectors (`grid-auto-rows:max-content`, card `overflow:visible`, tighter spacing below 760 px height). At 1280x720 all 4 cards have the cost and "Öyrən" button inside the card (was 4/4 clipped, now 0/4). The grid scrolls as a whole, as intended.
7. **First-minute clutter (CSS only):** quest tracker shows only the first quest, the rest opens on hover/focus ("hamısı" hint); utility slots M/T/J/F/B are 62% opacity until hover; hotbar panel background is more transparent. Nothing removed.
8. **Azerbaijani labels:** Dash -> Sıçra, Arcane -> Sehr, Ultimate -> Qiyamət, LMB -> Klik, Space -> Boşluq.

## Screenshots (playtest-results/aetheria-ui/)
- Before: `before-desktop-run.png`, `before-mobile-run.png`, `before-desktop-talents.png`, `before-desktop-title.png`, `before-mobile-title.png`
- After: `after3-desktop-run.png`, `after3-mobile-run.png`, `after3-desktop-talents.png`, `after3-desktop-title.png`, `after3-mobile-title.png` (`after1`/`after2` are intermediate)

## Verification
- `npm run playtest -- index.html --seconds 15`: PASS, 0 errors, fps avg 51.4 (other agents were running playtests at the same time; earlier runs were about 104).
- `--mobile`: PASS, 0 errors, fps avg 63.8.

## REQUESTS
- `onboarding-designer` (`src/daily_trials.js`): the FTUE banner and the mission/bounty panels are drawn on the canvas at the bottom of the screen. On phones (width < 600) they sit under the hotbar and touch buttons (see `after3-mobile-run.png`, "Qoca Müdrik ... danış" behind the buttons). Move them to the top strip below the currency pills, or above y = innerHeight - 380, when touch is active. Also the daily panel width `Math.min(430, w-24)`.
- `ui-hud-engineer` JS (`src/ui.js`): optional, add a click toggle on the quest tracker title for touch (CSS-only expansion needs hover/focus). Hide "Davam Et" when no save exists.
- The combo HUD (`.combo-hud-container`) is large on phones and covers the world centre-left; a smaller phone size would need a JS-free CSS tweak in a later pass.
