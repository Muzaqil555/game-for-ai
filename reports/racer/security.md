# Apex Pursuit 3D: security and robustness audit

Agent: `security-auditor`. Date: 2026-11-02. Nothing exploitable found. One high-severity GPU memory leak. Measured in headless Chromium with renderer/WebGL hooks: 10 restarts, 30 car-card clicks, a 20 s run at heat 5, a corrupted save, a 40 px tall viewport. 0 console errors; `geometry.dispose()` called 0 times; scene children and window listeners stayed flat.

| # | Severity | File:line | Problem | Minimal fix | Owner |
| :- | :- | :- | :- | :- | :- |
| 1 | High | `racer.html:998-1065` | Each cop mesh creates new geometries, materials and a `PointLight`; removed with `scene.remove` only. Geometries 192 → 240 in 20 s at heat 5 | Traverse and dispose before removal, or share geometries/materials per car type, or pool meshes | `game-engine-developer` |
| 2 | Medium | `racer.html:815-956` | `create3DPlayerVehicle` never disposes the old car: 30 card clicks took geometries 169 → 529, buffers 674 → 2114; ~12 geometries per restart | Dispose the old group, or build geometries once and swap colour | `game-engine-developer` |
| 3 | Medium (perf) | `racer.html:1000, 1024, 1058` | Adding/removing siren `PointLight`s changes light count and recompiles shaders (programs 12 → 16): stutter on spawn | Fixed pool of siren lights, or emissive meshes | `performance-optimizer` |
| 4 | Medium | `racer.html:14-20` | 7 CDN scripts pinned but without `integrity`; no CSP | Add `integrity` + `crossorigin="anonymous"` (hashes below), or vendor the files | `game-engine-developer` |
| 5 | Medium | `racer.html:1106-1107` (writes 1248, 1397, 1669) | Corrupted `neon_velocity_credits` shows `$NaN` and later saves `"NaN"`; blocked storage throws at 1106 and stops the setup script; best score written every drift frame | `safeGet/safeSet` with try/catch and `Number.isFinite(n) && n >= 0`; save best score at run end | `game-engine-developer` → `backend-persistence-engineer` |
| 6 | Low | `racer_audio.js:825-836` | Departing siren schedules a new `setTimeout` every frame for 350 ms; only `gain` disconnected | Delete from map at once, one timeout, disconnect all nodes | `audio-designer` |
| 7 | Low | `racer_audio.js:924-930` | `stopAllSirens()` clears without stopping oscillators (no caller yet) | Stop and disconnect before `clear()` | `audio-designer` |
| 8 | Low | `racer_audio.js:1448-1460` | Delayed nitro stop reads current node refs, so it stops the new sound (no caller yet) | Capture refs in locals before `setTimeout` | `audio-designer` |
| 9 | Low | `racer_ai.js:277, 1123-1124` | `spikesPassedIds` grows per strip until restart | Remove id on cull (`_cullOffscreenEntities`, 1322) | `enemy-ai-engineer` |
| 10 | Low | `racer.html:481, 520-523` | `H = innerHeight - 44` can be ≤ 0 → infinite/negative aspect | `Math.max(1, …)` | `game-engine-developer` |
| 11 | Low | `racer.html:1700-1702`; `racer_audio.js:207, 223, 710, 833, 1459`; `racer_hud.js:763, 774` | Empty `catch` blocks (Studio rule 6) | `console.warn` once | owners of each file |
| 12 | Low (perf) | `racer_hud.js:99, 260` | `_renderTick.bind(this)` every frame | Bind once in `init` | `ui-hud-engineer` |

Clean: no injection sinks (all text via `textContent`), no secrets, no listener growth, no leftover scene objects, spark pool fixed at 300, no NaN paths beyond #10.

Gameplay bugs noticed: `RacerAudio.startEngine()` is never called, so the engine is silent; `connectToAI` sets `aiDirector.onAudioEvent` but `_dispatch` reads `this.options`, so AI cues never play; `dopplerGain` never connected; ESC opens the garage without pausing; the start button restarts mid-run.

## SRI hashes (computed 2026-11-02; verify before shipping)

```
three.min.js                 sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu
EffectComposer.js            sha384-GkidzTYmQg24v13sa3xhBBbvOLbVLO1QxfyKLdOWweQqNqS/iWwUst2T1fER2Xrg
RenderPass.js                sha384-2EpLreWSFuZsk4hcSplXLhlHd/wzvDNF907bTGIXSXM0SlhJNzy4YK0DhBFvkFEs
ShaderPass.js                sha384-I3lsvPeDJYFrEAzn/TA0yhc/SCYKwpyfyq8lKzHYKohu43H9f7xc/Q9ZWgSVUDl3
CopyShader.js                sha384-nhO9toQuMo5osCuA0l+YFpSqscZWxDu251Bnho2gD3kSPv1neEwHg0LyEmrA+mPj
LuminosityHighPassShader.js  sha384-mY+ii969jnDCI2HjRHftH2NZVkIO5ZGUkcnGCg3oVJ3kVstWQXwerYWBg+nbUG4R
UnrealBloomPass.js           sha384-aVQ2QnWkoxhOefDB0YZB64OPVzujvccydpcC7UqMDJUK0ChwA382zOHmrWHGDRRa
```
