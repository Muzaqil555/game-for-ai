# Apex Pursuit 3D engagement review

Agent: `engagement-psychologist`. Date: 2026-11-02. Scope: `racer.html`, `src/racer_ai.js`, `src/racer_hud.js`, `src/racer_audio.js`, `src/vehicle_physics.js`, and the evidence in `playtest-results/racer*/`. No playtest was run. Timings are estimates from code constants.

**Summary:** the chase starts quickly, but a run never ends, part of the rewards never reach the player, and there is no strong reason to play a second run.

## Core loop timing

| Event | Time | Basis |
| :- | :- | :- |
| Chase starts | ≈ 0 s (first cruiser 150–180 m behind on frame 1) | `racer_ai.js` `lastSpawnTime = -10`, `policeSpawnDistanceBehind = -140` |
| HEAT 1→2 | ≈ 83 s at ≤ 240 km/h; ≈ 28 s at 300 km/h; ≈ 16 s at 300 km/h drifting | base 0.012/s, speed term above 240 km/h, +0.025/s drifting |
| HEAT 1→5 | ≈ 5.5 min at 200 km/h; ≈ 1 min at 300 km/h drifting | heat only builds with a cop within 450 m |
| First credited reward | est. 10–30 s after spawn (first qualifying cruiser contact) | `_resolveCollisions` and the 3D resolver |
| Spike evasion (+$500) | needs HEAT 3 (≈ 166 s at base rate); roadblocks every 2.2 km | `roadblockInterval: 2200` |

HEAT 1→2 and 2→3 take about 83 s each at base rate with no reward, and the heat meter does not move between levels: over 30 s with no visible progress, twice in the first 5 minutes.

## Feedback audit

| Action | Sound | Visual | Number | Verdict |
| :- | :- | :- | :- | :- |
| Drift | yes | panel, skid marks | drift score | OK |
| Nitro on | no (`playNitro` has no caller) | bar, FOV punch | no | silent |
| Mini-turbo | no | no (`neon:miniturbo` has no listener) | no | silent and invisible |
| Cruiser takedown | yes | banner, hit-stop, shake | credits | OK, but wrong payout/label on the AI path |
| Spike strip hit | yes | banner "SPEED CAPPED AT 75 KM/H" | no | **misleading**: no cap applied, no spike drawn |
| Spike evaded | yes | banner | +$500 credited | OK |
| Near miss (+$150) | no | no (alert never rendered) | not credited | **silent, invisible, unpaid** |
| Civilian crash | no | no (traffic never drawn) | no | no effect (speed change applied to a temporary object) |
| HEAT up | EMP + music | HUD tag and stars | HEAT n | partial |
| Pursuit evaded | plays the *escalation* cue | HUD number only | +$500–12,000 announced, not credited | **misleading, unpaid** |
| Chopper spotlight lock | no | no (alert dropped) | no | silent |

## Goals and mastery
- No visible short-term target. The heat meter is broken: `racer.html` passes `pursuitAI.heatPercent`, which does not exist, so the HUD falls back to `heatLevel × 20%` and jumps in steps. No finish line (`trackLength` unchecked), no unlocks, no upgrades.
- Visible mastery: drift multiplier and score. Not skill-gated: any contact while Shift is held counts as a takedown, and takedowns refill nitro to 100%.
- Frame-rate dependent scoring: the drift score is rounded every frame (`racer.html` ~L1666), so at 144 Hz small slip angles score 0.

## Ending a session
- **No run end**: the player has no HP; nothing ends a run.
- **No summary** of duration, takedowns, peak heat or credits.
- **ESC does not pause**: it opens the garage overlay while `animate()` keeps updating, so heat builds and cops close in behind the menu.
- Restart resets score and heat with no summary.

## Run 2 and progression
Credits (`localStorage` `neon_velocity_credits`) accumulate with nothing to spend them on; the upgrade tree in `ARCADE_SPEC.md` §2.5 is not implemented. All cars are unlocked from the start. Best score is drift-only. Evidence: the 25 s playtest ended at HEAT 1, $0, drift 757.

## Dark-pattern check
No intentional dark patterns (no scarcity, streaks, near-miss teasing, pay/wait walls or guilt messaging). Two high-severity defects behave like deceptive UI: rewards and effects announced but not delivered, and a menu that does not pause the chase.

## Top 5 recommendations

1. **Fix reward and feedback wiring** (very high impact, low effort).
   - `game-engine-developer`, `racer.html`: `startGame` callbacks (~L1239–1275) are missing `onPursuitEvaded`, `onAudioEvent`, `onScreenShake`; the `pursuitAI.update` call (~L1636) passes `nitroActive` but not `isNitro` or `driftAngle`; `aiOutput.alerts` and `blowoutSpeedCap` are ignored (apply the cap or drop the banner).
   - `enemy-ai-engineer`, `src/racer_ai.js`: `_dispatch` (L1749) reads only `options`, so the `connectToAI` audio hook is dead; near-miss (L1161) and evasion (L384) add to `totalCreditsEarned`, which nothing reads; the takedown check (L1028–1032) reads player fields that are never passed; the reward (L1055) uses undefined `event.bounty`, so it always pays $1,500 and says "CRUISER". One resolver, one payout path.
   - `ui-hud-engineer`, `src/racer_hud.js`: render an alert queue from the AI alerts.
   - `audio-designer`, `src/racer_audio.js`: separate de-escalation cue.
   - Acceptance: scripted test shows each takedown, near miss and evasion changes credits by the announced amount and shows its alert.
2. **True heat progress and heat-up banners** (high impact, very low effort): expose `heatPercent = heatProgress * 100` in `racer_ai.js`; banner with `HEAT_CONFIG[n].name` in `racer_hud.js`.
3. **Run end, summary and pause** (very high impact, medium effort): `racer.html` state machine `idle | running | paused | ended`, ESC pauses the simulation, END RUN button; summary panel (duration, takedowns, peak heat, drift score, credits this run, best) with "Run again" and "Garage". Optional fail state: busted after being pinned at HEAT 5 for N seconds; banked credits never reduced.
4. **A sink for credits and a reason for run 2** (high impact, medium effort): garage upgrades from `ARCADE_SPEC.md` §2.5 (`progression-economy-designer`), unlocks at milestones (`meta-progression-designer`), versioned save (`backend-persistence-engineer`), stat hooks (`physics-game-feel-engineer`).
5. **Make skill legible** (medium-high impact, low-medium effort): wire mini-turbo and nitro feedback; float drift score; nitro-only contact is not a takedown; named bonuses for drift-ram and wall-pin takedowns; `art-director` draws traffic and spike strips, which are simulated but never rendered.

## Keep
HEAT tier names and taglines, cruiser catch-up pressure, takedown feedback, per-car drift multipliers.

## Lower severity
Best score updated only on drift ticks; drift heat uses a constant 0.5 rad fallback; cops culled silently at 350 m (visible pop); escaping HEAT 2+ may require out-running the cops' top speed (hypothesis).
