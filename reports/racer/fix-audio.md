# Apex Pursuit 3D: audio fixes (`src/racer_audio.js`)

Agent: `audio-designer`. Date: 2026-11-02. Only `src/racer_audio.js` was edited. `window.RacerAudio` is the instance (class `window.NeonVelocityAudio`).

## What changed

| # | Item | Fix |
| :- | :- | :- |
| 1 | Departing sirens | Deleted from the map immediately; `_retireSiren()` fades, schedules `stop()` on osc/lfo, and one `setTimeout` disconnects osc, lfo, lfoDepth, dopplerGain, filter, panner, gain |
| 2 | `stopAllSirens()` | Retires every siren (0.12 s fade, stop, disconnect) before `clear()` |
| 3 | Nitro | Nodes live in one `session` object; stop captures it in a local and nulls `nitro.session`, so a re-press builds a new loop and the old one is stopped/disconnected independently |
| 4 | Engine silent | `startEngine()` is idempotent, resumes a suspended context, returns `this`. `updateEngine`/`updateEngineRPM` also auto-start on the first frame once the context is `running`, unless `stopEngine()` was called |
| 5 | Doppler | `dopplerGain` now in the chain (`filter -> panner -> dopplerGain -> gain`). Pitch shift via `osc.detune` (cents from the Doppler ratio), loudness swell via `dopplerGain` |
| 6 | Cues | New: `heat_deescalation`, `pursuit_evaded`, `busted`, `spike_hit`; `near_miss` and `takedown` already existed. `heat_escalation` now detects a drop (`data.direction === 'down'` or heat lower than last seen) and plays the soft falling `playHeatDown()` instead of the EMP |
| 7 | Empty catches | All 5 now `console.warn` once per key (`_warnOnce`) |
| 8 | Mixer | `setMuted`, `setVolume`, persisted in `localStorage['apex_pursuit_audio_settings']` inside try/catch, loaded in the constructor |

## Public API

```
init()                       create/resume context (called by first gesture automatically)
startEngine()                idempotent; plays starter impulse once
stopEngine()                 fade out; blocks auto-start until startEngine()
updateEngineRPM(rpm, gear, throttle, isNitro)   per frame (racer.html already does this)
updatePoliceSirenField(cruisers)  per frame; cruisers = [{ id, distance, relSpeed?, side?, xOffset?, mode? }]
stopAllSirens()              call on game over / restart
updateTireScreech(slip, speedKmh)
playNitro(bool) / startNitro() / stopNitro()    idempotent; call on nitro edge, not per frame
startMusic() / stopMusic() / setMusicIntensity(1..3)
playTakedown() playCrash(sev) playMetalScrape(sev) playSpikeStrip() playNearMiss() playEMP() playMiniTurbo()
playHeatDown() playPursuitEvaded() playBusted()
handleAICue(cue, data)       cues: takedown, heavy_crash, traffic_crash, metal_scrape, tire_blowout, spike_drop,
                             spike_hit, near_miss, spike_evasion, heat_escalation, heat_deescalation,
                             pursuit_evaded, busted, rhino_horn, chopper_enter, spotlight_lock,
                             roadblock_alert, pit_warning, mini_turbo
setMuted(bool) -> bool   toggleMute() -> bool   setVolume(0..1) (= setMasterVolume)   getVolume()
setMusicVolume / setSFXVolume / setEngineVolume
```

Doppler/pan inputs: `relSpeed` (m/s, positive = closing) and `side` (-1..1) are optional. If omitted, relSpeed is derived from the change in `distance` between frames and side from `xOffset / 12`. The current racer.html payload (`id, distance, xOffset`) therefore already gives Doppler and panning.

## REQUESTS (for `game-engine-developer`, racer.html)

1. Race start (after the start click, next to `RacerAudio.init()` at ~L1283): `window.RacerAudio.startEngine(); window.RacerAudio.startMusic();`. Engine also auto-starts from the existing `updateEngineRPM` call, so this only adds the ignition sound.
2. Nitro edge (where `nitroWanted` changes, not per frame): `if (nitroWanted && !prevNitro) RacerAudio.playNitro(true); else if (!nitroWanted && prevNitro) RacerAudio.playNitro(false); prevNitro = nitroWanted;` Also call `playNitro(false)` at game over.
3. Game over / restart / garage: `RacerAudio.stopAllSirens(); RacerAudio.playNitro(false); RacerAudio.stopEngine();`
4. Callbacks: `onPursuitEvaded: () => RacerAudio.handleAICue('pursuit_evaded')`; busted: `RacerAudio.handleAICue('busted')`; spike hit already calls `playSpikeStrip()`. `onHeatChange` can stay as is (de-escalation auto-detected); the AI's own `onAudioEvent` is dead until `racer_ai._dispatch` reads `onAudioEvent` (owner: `enemy-ai-engineer`), so `pursuit_evaded` and `near_miss` need the racer.html callbacks above until then.
5. Optional: add `relSpeed` and `side` to `copsForAudio`. Empty `catch` at `racer.html:1700-1702` is the HTML owner's.
6. Mute button: `RacerAudio.toggleMute()` already works; on load, label it from `RacerAudio.isMuted` since mute is now persisted.

## Verification

- `node --check src/racer_audio.js`: pass. `npm run check`: pass (24 scripts, 28 agents).
- Headless Chromium probe (deleted afterwards), counting live (not disconnected) nodes via wrapped `create*`/`disconnect`: baseline 30 persistent engine/tire/bus nodes. 20 sirens: 170 live (30 + 20 x 7); after all depart: 30; after `stopAllSirens()`: 30; after 40 rapid nitro on/off pairs plus double-press: 30. Map size 20 -> 0. Console warnings/errors: 0. Persisted value written: `{"masterVolume":0.85,"muted":true}`.
- Not covered: audible listening test; the older one-shot SFX (crash, takedown, etc.) still rely on garbage collection after `stop()` rather than explicit `disconnect()`.
