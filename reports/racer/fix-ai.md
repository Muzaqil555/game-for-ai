# Apex Pursuit 3D: AI fixes (`src/racer_ai.js`)

Owner: enemy-ai-engineer. Only `src/racer_ai.js` was edited. `racer.html` is unchanged and still works (playtest 10 s: 0 errors, 110 FPS), but most fixes only take effect after the wiring below.

## What was fixed

| # | Item | Result |
| :- | :- | :- |
| 1 | `_dispatch` dead hook | Calls `options.<name>` and the `ai.<name>` property (both if both exist). `racer_audio.connectToAI` now works. |
| 2 | One takedown resolver | `_resolveCopContact` is the only place a takedown is decided. Bounty comes from the unit (cruiser 800, interceptor 1500). Nitro alone never qualifies. Named bonuses: DRIFT RAM +500, WALL PIN +400 (stack). Heavy units (rhino, roadblock cars) are crashes, never takedowns. |
| 3 | Pay what you announce | Every reward goes through `_pay()` which fires `onCredits` and builds the alert from the same number. Near miss (+200, spec value), spike evasion (+500, matches the old banner), heat shaken / pursuit evaded (spec table), takedowns. `totalCreditsEarned` is no longer a dead counter. |
| 4 | `heatPercent` | `ai.heatPercent` (0..100) is set every frame and returned in the frame object. The meter drains while escaping. |
| 5 | Units | All distance tunables are metres, converted with `M()` (18 world units per metre). Previously thresholds such as the 150 m spawn were 8 m, rhino spawned 53 m ahead, cruiser catch-up logic worked in 1.7 m. Spec values now hold: cruiser spawns 150 m behind, roadblock every 2.2 km, escape radius 300 m. |
| 6 | Fail state | Busted: heat >= 2, speed < 25 km/h, a live cop within 9 m (along road) and 4.5 m (across) for 3 s. A warning alert and `bust_warning` cue fire on the first frame, `bustedProgress` (0..1) is exposed, `onBusted` fires once, then `update()` stops simulating until `reset()`. Evasion now ends the pursuit: heat drops one level per 7 s with no live cop within 300 m, and `onPursuitEvaded` fires when it reaches 0 (heat 0 is "CLEAR"; dispatch re-escalates to 1 after the player is loud again, so the run continues). |
| 7 | Heat events | `onHeatChange(level, name, info)` on every change, `info.direction` is `'up'` or `'down'`. Audio cues `heat_escalation` / `heat_deescalation`. |
| 8 | Cop pinning player (QA #4) | A cop ahead in the player's lane speeds up to player speed +15 and swings out (never brakes in front of the player). Contact that is not a takedown only separates the cop, and after 0.5 s of continuous contact the cop disengages for 2.5 s (behind: brakes and opens a gap, ahead: accelerates away). Test: full throttle into a 80 km/h cop in lane resolves as a ram takedown, speed never drops. |
| 9 | Cull | `spikesPassedIds` entries deleted on cull. Cops fade (`cop.fade` 1..0) from 350 m to 450 m behind; wrecks fade 5-7 s after the crash. Culling no longer pops visible cars. |

Other corrections found on the way: per-frame lateral steering is now dt-scaled; rhino hit applies once (1.5 s cooldown) instead of every frame; rhino spawns 320 m ahead (about 3 s warning plus horn plus alert); roadblock cars no longer fill the heat's `maxPolice` slots; chopper beam lags are compensated so a lock is possible at speed; spike strips were 0.25 m deep, now 4.5 m; the PIT warning alert is raised at the start of the 1-2 s flank (the windup), not at the hit; cruisers now have a windup (0.9 s, `cop.telegraph` 1 to 0), attack (0.5 s), recover (1.8 s) cycle so they are readable and punishable; roadblock spawn rate and rhino spawn rate no longer depend on frame rate; civilian traffic can be switched off (`trafficEnabled`).

## Units (read this)

- Z (player.z, cop.z, spike.z): world units, 18 per metre (matches `racer.html` `playerZ += speedMs * dt * 18`).
- Distance options: metres. Speeds: km/h (1 km/h = 5 units/s).
- X: normalised road -1..+1. `roadHalfWidthM` (default 16 = `ROAD_WIDTH / 2`) converts to metres.
- `driftAngle`: radians.

## API

```js
const ai = new window.NeonPursuitAI(options);
ai.update(dt, player) -> frame
ai.reportContact(copId, playerState) -> {kind, takedown, crash, speedScale, lateralPush, shake} | null
ai.reset()
window.NeonRacerAI = { NeonPursuitAI, HEAT_CONFIG, ARCHETYPES, UNITS_PER_METER }
```

`player` for `update`: `{ x, z, speed, isDrifting, driftAngle, isNitro, isInvulnerable?, phaseShift? }` (`nitroActive` accepted as alias of `isNitro`).

`frame` (returned by `update`): `hitStopActive, blowoutActive, blowoutSpeedCap (80 or null), cameraShake, alerts (live array), takedownOccurred, spikeEvasionOccurred, heatLevel, heatPercent, busted, bustedProgress, playerSpeedScale (multiply player speed by it, 1 = no crash), playerLateralPush (add to normalised x)`.

Readable state: `heatLevel (0..5), heatPercent, bustedProgress, busted, peakHeat, totalTakedowns, sessionCredits, policeUnits[], trafficUnits[], spikeStrips[], roadblocks[], chopper, activeAlerts[]`. Per cop: `id, type, name, x, z, vz, speed (km/h), state, telegraph (0..1 windup, art hook), fade (0..1 opacity), isWrecked, wreckAngle, strobeState, bounty`.

### Options (all metres / seconds / km/h)

`roadHalfWidthM 16, policeSpawnDistanceBehind 150, policeSpawnDistanceAhead 260, rhinoSpawnDistanceAhead 320, roadblockInterval 2200, escapeRadius 300, escapeTime 7, cullBehind 450, fadeStart 350, cullAhead 700, hitStopDuration 0.08, bustedSpeedKmh 25, bustedContactRadius 9, bustedTime 3, bustedMinHeat 2, takedownRelSpeedKmh 45, driftRamBonus 500, wallPinBonus 400, nearMissReward 200, spikeEvasionReward 500, trafficEnabled true, maxTrafficCount 16`.

### Callbacks

Pass in options or assign as properties. Both are called if both exist.

| Callback | Signature | Notes |
| :- | :- | :- |
| `onAudioEvent` | `(cue, data)` | `data.cue === cue`. Cues: `siren_spawn, cop_windup, pit_warning, takedown, metal_scrape, heavy_crash, traffic_crash, tire_blowout, spike_drop, spike_evasion, near_miss, heat_escalation, heat_deescalation, pursuit_evaded, bust_warning, busted, roadblock_alert, rhino_horn, chopper_enter, spotlight_lock` |
| `onAlert` | `({text, kind, color, duration})` | `kind`: `info, warning, credits, takedown, heat_up, evaded, crash, busted`. Every alert is also in `frame.alerts`. |
| `onCredits` | `(amount, reason, {total})` | THE only payout path. `reason`: `takedown_ram, takedown_drift_ram, takedown_wall_pin, near_miss, spike_evasion, heat_cleared, pursuit_evaded`. Add `amount` to the wallet here and nowhere else. |
| `onPursuitEvaded` | `(bounty, info)` | Heat reached 0. Already paid through `onCredits`: use for banner/music only. |
| `onTakedown` | `(event)` | `{copId, unit, copType, name, kind ('ram'/'drift_ram'/'wall_pin'), labels, base, bonus, bounty, reward, relSpeed, nitroRefill: 1}`. `bounty` is the total ALREADY paid via `onCredits`. Use for banner, nitro refill, hit-stop, shake. Do not add credits here. |
| `onHeatChange` | `(level, name, {direction, previous, config, color, tagline})` | `direction` `'up'` or `'down'`. |
| `onBusted` | `({heat, peakHeat, takedowns, credits, time})` | Once per run. |
| `onSpikeBlowout` | `({duration, maxSpeed: 80})` | Cap is 80 km/h (racer.html banner says 75). |
| `onSpikeEvasion` / `onSpotlightLock` / `onScreenShake` | `({...})` | Informational. `onSpikeEvasion` credits are paid by `onCredits`. |

## Verification

- `node --check src/racer_ai.js`: ok. `npm run check`: ok (24 scripts, 28 agents).
- Headless Node test with a mock player (test files deleted afterwards), all PASS: cruiser takedown pays 800 and interceptor 1500, each with a matching alert; nitro-only contact does not take down; drift ram 800+500; wall pin 800+400; rhino is a crash with no payout; one payout across 30 contact frames; near miss pays exactly the announced $200; busted fires once at 3.0 s and does not fire while moving; heatPercent takes 600 distinct values in 10 s; evasion pays 1200 then 500, emits two `down` heat events and one `onPursuitEvaded(500)`; heat up emits `onHeatChange(2, 'STATE PURSUIT')`; cop-in-lane no longer pins (min speed 200 km/h); `spikesPassedIds` cleaned; cop at 400 m fades 0.51 instead of popping; options-form and property-form `onAudioEvent` both fire; 300 cops cost 0.42 ms per `update`.
- 5 randomised 10-minute fuzz runs: no NaN, no exception.
- `npm run playtest -- racer.html --seconds 10`: PASS, 0 errors, avg 110.8 FPS.

## Known limits

- The AI contact box uses a 0.35 m margin so it still sees contact after the physics solver separates the cars. Until `racer.html` routes contacts through `reportContact`, the solver's own takedown branch still pays separately (double path).
- Traffic is simulated but not rendered in `racer.html` yet; it still pays near misses and slows the player. Set `trafficEnabled: false` until it is drawn.
- Heat 0 (CLEAR) is new: HUD code must accept `heatLevel` 0.
