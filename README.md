# ⚡ Autonomous 36-Agent Studio & Multi-Agent Swarm Framework

> **A production-ready, zero-conflict multi-agent orchestration architecture for autonomous software and game development.** Compatible with **Google Antigravity**, **Cursor**, **Claude Code**, **OpenAI Codex**, and any LLM agent runtime supporting agent skills and subagents.

---

## 🌍 Overview (Haqqında)

This repository contains the architecture, prompts, and skills for an **autonomous 36-agent development studio**. It coordinates **1 CEO Agent**, **26 specialized engineering, design, architecture, and psychology agents**, and **9 diverse user testing personas** who run in parallel to conceptualize, architect, code, test, and refine complex software and games from scratch.

Unlike single-agent prompts that fail from context pollution and merge conflicts, this framework uses **zero-conflict modular contracts** (`.agents/skills/game-plugin-module`), allowing 5 to 10+ subagents to write and execute code simultaneously without race conditions.

---

## 🏛️ Studio Architecture

```
                                    👑 Agent 4: CEO (Lead Coordinator)
                                                  │
         ┌───────────────────────────────┬────────┴───────────────────────────────┬───────────────────────────────┐
         ▼                               ▼                                       ▼                               ▼
  Core Engineering              Creative & Audio                        Advanced Mechanics               Quality & Player Council
• Game Developer (#6)          • Art Director (#13)                    • Physics & Juice (#20)          • Security Specialist (#5)
• AI Specialist (#1)           • Audio Designer (#12)                  • Level & Bosses (#21)           • 120 FPS Optimizer (#15)
• Backend Specialist (#2)      • Narrative & Balance (#14)             • Weapons & Relics (#23)         • QA Browser Tester (#22)
• Frontend Specialist (#3)     • Monetization & Retention (#19)        • Companions & Ult (#24)         • 9-Persona User Council
• DevOps & Deployer (#16)      • Market Researcher (#18)               • Style Combo & Arena (#25)        (Casual, Hardcore, Critic,
• Auto Bug Fixer (#17)         • Tech Stack Planner (#26)              • Missions & Bounties (#27)         Streamer, Explorer, etc.)
                                                                       • Dopamine Psychologist (#28)
                                                                       • Loot & Synergies (#33)
                                                                       • Talent Tree Meta (#34)
                                                                       • Elite Affixes & Hazards (#35)
                                                                       • Onboarding & Daily (#36)
```

---

## 📋 The 36 Agent Roster

### 1. Executive, Engineering, Creative & Psychology Team (Agents 1–6, 12–28, 33–36)

| № | Agent Identifier | Specialized Role | Recommended Model | Instruction File |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `ai_specialist` | **AI Specialist** — State machines, dynamic difficulty adjustment, enemy combat AI | `flash` | [`.agents/agents/1_ai_specialist.md`](.agents/agents/1_ai_specialist.md) |
| **2** | `backend_specialist` | **Backend Specialist** — Server runtime, APIs, persistent state, leaderboards | `flash` | [`.agents/agents/2_backend_specialist.md`](.agents/agents/2_backend_specialist.md) |
| **3** | `frontend_specialist` | **Frontend Specialist** — Glassmorphism UI/UX, HUD, modals, touch controls | `flash` | [`.agents/agents/3_frontend_specialist.md`](.agents/agents/3_frontend_specialist.md) |
| **4** | `ceo` | **CEO (Lead Coordinator)** — Multi-agent orchestrator, parallel task dispatcher | `inherit` / `pro` | [`.agents/agents/4_ceo.md`](.agents/agents/4_ceo.md) |
| **5** | `security_specialist` | **Security Specialist** — Code audits, input validation, memory leak prevention | `inherit` / `pro` | [`.agents/agents/5_security_specialist.md`](.agents/agents/5_security_specialist.md) |
| **6** | `game_developer` | **Core Engine Developer** — 60–120 FPS game loop, physics engine, entity cycles | `flash` | [`.agents/agents/6_game_developer.md`](.agents/agents/6_game_developer.md) |
| **12** | `audio_designer` | **Audio & SFX Designer** — Procedural Web Audio API sound synthesis & BGM | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **13** | `art_director` | **VFX & Asset Artist** — Procedural particle systems, lighting, screen shaders | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **14** | `game_writer` | **Writer & Balance Designer** — Lore, campaign stages, economy balancing | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **15** | `performance_optimizer` | **FPS & Performance Engineer** — Garbage collection reduction, 120 FPS profiling | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **16** | `devops_deployer` | **DevOps & Packaging** — Local HTTP daemons, asset bundling, cloud deployment | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **17** | `bug_fixer` | **Autonomous Bug Fixer** — Rapid patch pipeline based on test console reports | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **18** | `market_researcher` | **Market & Competitor Analyst** — Genre trends, player expectation benchmarks | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **19** | `monetization_expert` | **Retention & Economy Expert** — Progression sinks, cosmetics, achievement loops | `flash` | [`.agents/agents/12_19_studio_specialists.md`](.agents/agents/12_19_studio_specialists.md) |
| **20** | `physics_juice_specialist` | **Physics & "Game Feel" Specialist** — Screen-shake, hit-stop, slow-mo, knockback | `flash` | [`.agents/agents/20_22_game_power_agents.md`](.agents/agents/20_22_game_power_agents.md) |
| **21** | `level_boss_designer` | **Levels & Boss Architect** — Regional maps, phased epic boss fights | `flash` | [`.agents/agents/20_22_game_power_agents.md`](.agents/agents/20_22_game_power_agents.md) |
| **22** | `qa_browser_tester` | **Browser QA Auto-Tester** — Headless/browser verification, zero-error validation | `flash` | [`.agents/agents/20_22_game_power_agents.md`](.agents/agents/20_22_game_power_agents.md) |
| **23** | `weapon_relic_specialist` | **Arsenal & Roguelike Relics** — Hot-swappable weapon arsenals and draft relics | `flash` | [`.agents/agents/23_25_addiction_specialists.md`](.agents/agents/23_25_addiction_specialists.md) |
| **24** | `companion_mount_specialist` | **Companions & Ultimates** — AI companion spirits and devastating screen ultimates | `flash` | [`.agents/agents/23_25_addiction_specialists.md`](.agents/agents/23_25_addiction_specialists.md) |
| **25** | `world_events_arena_specialist` | **Style Combos & Arena Mode** — DMC/Hades style ranks, perfect dodge, endless arena | `flash` | [`.agents/agents/23_25_addiction_specialists.md`](.agents/agents/23_25_addiction_specialists.md) |
| **26** | `tech_stack_architect_planner` | **Master Architect & Planner** — Tech stack discovery, MCP selection, work-breakdown | `flash` / `pro` | [`.agents/agents/26_tech_stack_planner.md`](.agents/agents/26_tech_stack_planner.md) |
| **27** | `mission_campaign_specialist` | **Campaign & Bounty Architect** — Timed hunt bounties, defense zones, GPS guidance | `flash` | [`.agents/agents/27_32_mission_and_user_council.md`](.agents/agents/27_32_mission_and_user_council.md) |
| **28** | `dopamine_addiction_psychologist` | **Game Psychology & Dopamine Loops** — Zeigarnik effect, kill-streak pacing, hunter rank | `flash` | [`.agents/agents/27_32_mission_and_user_council.md`](.agents/agents/27_32_mission_and_user_council.md) |
| **33** | `loot_synergy_specialist` | **Loot Beams & Evolution Synergies** — Diablo-style beams, 8 legendary affixes, evolutions | `flash` | [`.agents/agents/33_36_v4_expansion_agents.md`](.agents/agents/33_36_v4_expansion_agents.md) |
| **34** | `meta_progression_specialist` | **Ancient Talent Tree & Meta-Progression** — Permanent Soul Stones currency & Phoenix soul | `flash` | [`.agents/agents/33_36_v4_expansion_agents.md`](.agents/agents/33_36_v4_expansion_agents.md) |
| **35** | `elite_enemy_specialist` | **Elite Affixes & Regional Hazards** — 8 tactical champion modifiers & environmental traps | `flash` | [`.agents/agents/33_36_v4_expansion_agents.md`](.agents/agents/33_36_v4_expansion_agents.md) |
| **36** | `onboarding_daily_specialist` | **Contextual FTUE & Daily Trials** — 6-step in-game onboarding guide & 7-day streaks | `flash` | [`.agents/agents/33_36_v4_expansion_agents.md`](.agents/agents/33_36_v4_expansion_agents.md) |

---

### 2. The 9-Persona User Testing Council (Agents 7–11, 29–32)

Whenever a feature or build is complete, the testing council reviews it from 9 distinct user psychological viewpoints:

| № | Agent Identifier | Player Persona & Focus | Instruction File |
| :--- | :--- | :--- | :--- |
| **7** | `user_casual` | **Casual Player** — Simplicity, instant readability, zero steep learning curve | [`.agents/agents/7_11_user_testers.md`](.agents/agents/7_11_user_testers.md) |
| **8** | `user_hardcore_gamer` | **Hardcore Power User** — High frame rates, tight control responsiveness, skill ceiling | [`.agents/agents/7_11_user_testers.md`](.agents/agents/7_11_user_testers.md) |
| **9** | `user_ui_critic` | **Visual & UX Critic** — Color palette balance, typography, animations, padding | [`.agents/agents/7_11_user_testers.md`](.agents/agents/7_11_user_testers.md) |
| **10** | `user_impatient` | **Impatient Bug Hunter** — Fast clicking, rapid input stress-testing, latency checks | [`.agents/agents/7_11_user_testers.md`](.agents/agents/7_11_user_testers.md) |
| **11** | `user_explorer` | **Deep Feature Explorer** — Tests every modal, obscure hotkey, and edge-case behavior | [`.agents/agents/7_11_user_testers.md`](.agents/agents/7_11_user_testers.md) |
| **29** | `user_story_rpg_fan` | **Story & Campaign Fan (#6)** — Lore depth, meaningful quests, world immersion | [`.agents/agents/27_32_mission_and_user_council.md`](.agents/agents/27_32_mission_and_user_council.md) |
| **30** | `user_streamer_influencer` | **Streamer & Creator (#7)** — Screen presence, clip-worthy moments, high-risk shrines | [`.agents/agents/27_32_mission_and_user_council.md`](.agents/agents/27_32_mission_and_user_council.md) |
| **31** | `user_completionist_grinder` | **Completionist & Hunter (#8)** — 100% completion, hunter ranks, stat min-maxing | [`.agents/agents/27_32_mission_and_user_council.md`](.agents/agents/27_32_mission_and_user_council.md) |
| **32** | `user_teen_action_gamer` | **Fast-Action Fan (#9)** — Zero downtime, rapid combo chaining, high intensity | [`.agents/agents/27_32_mission_and_user_council.md`](.agents/agents/27_32_mission_and_user_council.md) |

---

## 🛠️ Reusable Agent Skills (`.agents/skills/`)

### 1. `universal-game-engine`
- **Location:** [`.agents/skills/universal-game-engine/SKILL.md`](.agents/skills/universal-game-engine/SKILL.md)
- **Purpose:** Universal genre-agnostic autonomous game creation pipeline for ANY game (2D Platformer, Top-Down Shooter, Tower Defense, Puzzle, Retro Racing, Roguelite RPG, 3D WebGL). Defines 7 genre matrices, physics equations (gravity, coyote time, jump buffering, 360° ballistics), procedural Canvas/SVG asset generation, and procedural Web Audio synthesizers (jump, laser, explosion, chiptune).

### 2. `build-full-game`
- **Location:** [`.agents/skills/build-full-game/SKILL.md`](.agents/skills/build-full-game/SKILL.md)
- **Purpose:** Full autonomous production pipeline. When activated with a single prompt like *"build a complete game"*, it triggers Agent 26 to plan the architecture, spins up subagents in parallel waves, runs browser QA, queries user testers, and deploys.

### 3. `game-plugin-module`
- **Location:** [`.agents/skills/game-plugin-module/SKILL.md`](.agents/skills/game-plugin-module/SKILL.md)
- **Purpose:** Zero-conflict parallel module contract. Dictates how any agent adds new systems (loot, talents, bosses, hazards) as self-contained plugin modules (`window.GamePlugins = window.GamePlugins || []`) without touching or conflicting with other files.

---

## ⚡ Autonomous 5-Phase Parallel Swarm Protocol

When ANY user requests ANY game or application, the studio executes this ironclad pipeline:

```
                            USER PROMPT: "Create [Any Game / Feature]"
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [PHASE 1: IMMUTABLE CONTRACT]                                 [PHASE 2: ZERO-CONFLICT SWARM]
   Agent 26 & CEO generate GAME_SPEC.md:                        6–8 Subagents build in parallel:
   • Genre Matrix & Core Rules                                  • Agent 6  ➔ src/engine.js (Loop & State)
   • Global State: window.GameCore                              • Agent 20 ➔ src/physics.js (Kinematics)
   • Strict File Ownership Table                                • Agent 13 ➔ src/render.js (Graphics)
   (No agent touches another's file!)                           • Agent 12 ➔ src/audio.js (Web Audio)
                                                                • Agent 3  ➔ src/ui.js & index.html (HUD)
                                                                • Agent 1  ➔ src/ai.js (Enemy FSM)
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [PHASE 3: QA & SELF-HEALING]                                  [PHASE 4: 9-TESTER COUNCIL]
   • Agent 22 verifies 0 console errors.                        9 distinct user personas audit:
   • Agent 15 profiles 60–120 FPS.                              • Hardcore: Skill ceiling & latency
   • Agent 17 auto-patches any issues.                          • Casual: Instant clarity & onboarding
                                                                • UI Critic: Aesthetic balance
                                                │
                                                ▼
                                    🏆 PLAYABLE GAME DELIVERED!
```

---

## 🚀 How to Use in Your Projects

1. **Clone or Copy:** Copy `AGENTS.md` and the `.agents/` folder into the root of your project:
   ```bash
   cp AGENTS.md /path/to/your/project/
   cp -r .agents /path/to/your/project/
   ```
2. **Open in Your AI Assistant:** Open the folder in **Google Antigravity**, **Cursor**, **Claude Code**, or any agent runner that reads `AGENTS.md` and agent instructions.
3. **Execute:** The AI assistant will automatically adopt the **Agent 4: CEO** role, reference the 35 subagents and skills, and execute your projects with full parallel division of labor!

---

## 📄 License

This framework is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute it for both commercial and personal AI agent projects.

*Created by [Muzaqil](https://github.com/Muzaqil555) — 2026*
