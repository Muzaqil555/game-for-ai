# Game Studio Agents

A 37-role game studio for AI coding tools: **1 CEO** (your main session), **27 specialist subagents** and a **9-persona playtest council**. Give it one sentence; it plans, builds in parallel without file conflicts, playtests in a real browser and fixes what it finds.

Works with Claude Code (native subagents in `.claude/agents/`), Codex and Cursor (read this file), and Antigravity. Azerbaijani original: [`docs/az/AGENTS.md`](docs/az/AGENTS.md).

---

## How a game gets made

| Phase | Who | Output | Gate to pass |
| :- | :- | :- | :- |
| 0. Research *(optional)* | `genre-researcher`, `skill-scout` | `reports/research.md`, new skills | CEO picks a direction |
| 1. Spec | `game-architect` | `GAME_SPEC.md` | Every file has exactly one owner |
| 2. Build *(parallel)* | builders chosen by the spec | their owned files | `node --check` passes on each file |
| 3. Integrate | `game-engine-developer` | wired `index.html` / engine | `npm run playtest` loads with 0 errors |
| 4. Audit | `security-auditor`, `performance-optimizer` | `reports/audit-*.md` | No open *critical* findings |
| 5. Playtest | `qa-browser-tester`, `playtest-council`, `engagement-psychologist` | `reports/playtest-*.md` | 0 console errors, ≥ 55 FPS, council avg ≥ 7/10 |
| 6. Fix loop | `bug-fixer` (one writer at a time) | patches | Re-run phase 5; max 2 rounds |
| 7. Ship | `devops-deployer` | local run command, optional deploy | Player can open it in one step |

**Scale to the request.** A small arcade game needs the architect, 4–6 builders, QA and the council. Never launch all 27 specialists for a game that does not need them: each subagent costs a full context.

**Parallel only when files are disjoint.** Phase 2 runs in parallel because the spec gives every file one owner. Phases 4–6 edit shared files, so they run one writer at a time.

---

## Roster

### Plan and research
| Agent | Model | Does | Default files |
| :- | :- | :- | :- |
| `game-architect` | opus | Picks genre template and stack, writes the `GAME_SPEC.md` ownership contract and APIs | `GAME_SPEC.md` |
| `genre-researcher` | haiku | Studies the best games in the genre; lists must-have mechanics and a differentiator | `reports/research.md` |
| `skill-scout` | sonnet | Finds plugins, MCP servers or skills that raise quality; writes a new skill if none exists | `.agents/skills/<name>/SKILL.md` |

### Build: core
| Agent | Model | Does | Default files |
| :- | :- | :- | :- |
| `game-engine-developer` | sonnet | Game loop, fixed timestep, scene/state machine, entity registry, input, module wiring | `src/engine.js` → `window.GameCore` |
| `physics-game-feel-engineer` | sonnet | Movement, collision, rigid bodies, hit-stop, screen shake, knockback, coyote time | `src/physics.js` → `window.GamePhysics` |
| `art-director` | sonnet | Procedural Canvas/SVG/Three.js visuals, palettes, particles, post-processing | `src/render.js` → `window.GameRender` |
| `audio-designer` | sonnet | Procedural Web Audio SFX and adaptive music, mixer, mute | `src/audio.js` → `window.GameAudio` |
| `ui-hud-engineer` | sonnet | `index.html`, menus, HUD, pause, settings, touch controls, accessibility | `index.html`, `src/ui.js`, `src/ui.css` → `window.GameUI` |
| `enemy-ai-engineer` | sonnet | Enemy state machines, steering, pathfinding, spawn director, boss phases logic | `src/ai.js` → `window.GameAI` |
| `backend-persistence-engineer` | sonnet | Versioned save data, settings, leaderboards; the only code that touches `localStorage` | `src/save.js` → `window.GameSave` |

### Build: content and systems
| Agent | Model | Does | Default files |
| :- | :- | :- | :- |
| `narrative-balance-designer` | sonnet | Story beats, stat tables, difficulty curve, all tunable numbers in one place | `src/content.js` → `window.GameContent` |
| `level-boss-designer` | sonnet | Levels, hazards, wave scripts, multi-phase boss encounters | `src/levels.js` → `window.GameLevels` |
| `weapons-upgrades-designer` | sonnet | Weapons, upgrade/boon cards, build variety | `src/weapons.js` → `window.GameWeapons` |
| `companion-ultimate-designer` | sonnet | Pets/companions, ultimate abilities, charge meters | `src/companions.js` → `window.GameCompanions` |
| `combo-events-designer` | sonnet | Style/combo meter, perfect dodge, world events, endless mode | `src/events.js` → `window.GameEvents` |
| `mission-campaign-designer` | sonnet | Mission chains, bounties, objective markers | `src/missions.js` → `window.GameMissions` |
| `loot-synergy-designer` | sonnet | Rarity tiers, affixes, loot beams, item synergies | `src/loot.js` → `window.GameLoot` |
| `elite-enemy-designer` | sonnet | Elite affixes, champion packs, regional hazards | `src/elites.js` → `window.GameElites` |
| `meta-progression-designer` | sonnet | Permanent currency, talent tree, unlocks between runs | `src/talents.js` → `window.GameTalents` |
| `progression-economy-designer` | sonnet | In-run economy, shop, achievements, daily rewards | `src/progression.js` → `window.GameProgression` |
| `onboarding-designer` | sonnet | First-time tutorial that never blocks play, daily challenges | `src/onboarding.js` → `window.GameOnboarding` |

### Quality
| Agent | Model | Does | Edits |
| :- | :- | :- | :- |
| `security-auditor` | opus | XSS, unsafe `eval`/`innerHTML`, secrets, leaks, unbounded growth | report only |
| `performance-optimizer` | sonnet | Profiles frame time, pooling, GC, draw calls; fixes hot paths | any file, phase 4 only, serialized |
| `qa-browser-tester` | sonnet | Runs the real game in Chromium, input smoke test, errors, FPS, screenshots | report only |
| `bug-fixer` | sonnet | Fixes reported issues with the smallest change, then re-verifies | any file, phase 6 only, serialized |
| `playtest-council` | haiku | 9 player personas score the build from playtest evidence | report only |
| `engagement-psychologist` | haiku | Reviews the core loop, reward pacing and "one more run" pull, without dark patterns | report only |
| `devops-deployer` | haiku | Local server, `package.json` scripts, CI smoke test, GitHub Pages / Cloudflare deploy | `server.js`, `package.json`, `.github/` |

The **CEO** is not a subagent: it is the main session, defined in [`CLAUDE.md`](CLAUDE.md).

### The 9 playtest personas (inside `playtest-council`)
Casual newcomer · Hardcore gamer · UI critic · Impatient stress tester · Explorer · Story/RPG fan · Streamer · Completionist · Teen action gamer.

---

## Studio rules (every agent)

1. **Read `GAME_SPEC.md` first.** It names your files, the global object you expose and the APIs you may call. No spec → stop and report `BLOCKED: no GAME_SPEC.md` (only `game-architect` may write one).
2. **Write only your owned files.** Need a change in someone else's file? Put it under `REQUESTS` in your report; the CEO routes it.
3. **One global per module.** Expose exactly the `window.GameX` object named in the spec. Talk to other modules only through their documented methods, and guard optional ones (`window.GameAudio?.play?.('hit')`).
4. **Zero external assets by default.** Graphics are procedural (Canvas 2D, SVG or Three.js); audio is procedural Web Audio. CDN libraries are allowed only when the spec lists them, pinned to an exact version.
5. **Frame-rate independent.** All motion uses `dt` in seconds, clamped (`Math.min(dt, 0.05)`). No allocation inside per-frame loops for bullets/particles: pool them.
6. **No silent failure.** Never swallow errors with an empty `catch`. Missing optional module → degrade gracefully and log once with `console.warn`.
7. **Verify before reporting.** At minimum `node --check <file>` for every JS file you touched. Builders also run `npm run playtest` when an `index.html` exists. No `playtest` script in `package.json`? The project has not been set up: report `BLOCKED: run /studio-init`.
8. **Stay in the project folder.** Never read or write outside the repository.
9. **Ethical engagement.** Make games fun, not compulsive: no fake scarcity, no punishing streak loss, no pay-to-skip pressure.

## Report format (every agent ends with this)

```
STATUS: done | partial | blocked
FILES: <files created or changed>
API: <window.GameX methods added or changed, with signatures>
VERIFIED: <commands run and their result>
REQUESTS: <changes needed in files you do not own, or "none">
NOTES: <risks, follow-ups, tuning knobs>
```

---

## Skills

| Skill | Use for |
| :- | :- |
| [`universal-game-engine`](.agents/skills/universal-game-engine/SKILL.md) | Genre templates, physics constants, procedural audio/visual recipes |
| [`threejs-webgl-game-engine`](.agents/skills/threejs-webgl-game-engine/SKILL.md) | 3D games: Three.js, PBR, bloom, chase camera |
| [`game-plugin-module`](.agents/skills/game-plugin-module/SKILL.md) | Adding a system to an existing game as a `window.GamePlugins` module |
| [`build-full-game`](.agents/skills/build-full-game/SKILL.md) | The end-to-end pipeline as a single skill |

## Renamed agents (v4 → v5)

`ai_specialist` → `enemy-ai-engineer` · `backend_specialist` → `backend-persistence-engineer` · `frontend_specialist` → `ui-hud-engineer` · `security_specialist` → `security-auditor` · `game_developer` → `game-engine-developer` · `game_writer` → `narrative-balance-designer` · `market_researcher` → `genre-researcher` · `monetization_expert` → `progression-economy-designer` · `physics_juice_specialist` → `physics-game-feel-engineer` · `weapon_relic_specialist` → `weapons-upgrades-designer` · `companion_mount_specialist` → `companion-ultimate-designer` · `world_events_arena_specialist` → `combo-events-designer` · `tech_stack_architect_planner` → `game-architect` · `mission_campaign_specialist` → `mission-campaign-designer` · `dopamine_addiction_psychologist` → `engagement-psychologist` · `loot_synergy_specialist` → `loot-synergy-designer` · `meta_progression_specialist` → `meta-progression-designer` · `elite_enemy_specialist` → `elite-enemy-designer` · `onboarding_daily_specialist` → `onboarding-designer` · `marketplace_mcp_skill_scout` → `skill-scout` · `user_*` (9 testers) → `playtest-council`
