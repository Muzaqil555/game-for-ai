---
name: build-full-game
description: End-to-end pipeline for building a complete, playtested browser game from a one-line idea with the studio's subagents. Use when the user asks to make, build or create a game ("make me a game where...", "oyun yarat", "oyun düzəlt") and no /new-game command is available in the host.
---

# Build a full game

The studio, its roster and its rules are defined in [`AGENTS.md`](../../../AGENTS.md). This skill is the same pipeline as the `/new-game` command, for hosts without slash commands (Codex, Cursor, Antigravity).

## Pipeline

1. **Folder:** build in `games/<kebab-case-title>/` so existing games stay untouched.
2. **Research (optional):** `genre-researcher` when the genre or a referenced game is unfamiliar.
3. **Spec:** `game-architect` writes `GAME_SPEC.md`: one owner per file, every module's `window.GameX` API, load order, acceptance criteria and the team to launch.
4. **Build, in parallel:** launch only the builders the spec lists, all in one message. Typical small game: `game-engine-developer`, `physics-game-feel-engineer`, `art-director`, `audio-designer`, `ui-hud-engineer`, `enemy-ai-engineer`, `narrative-balance-designer`.
5. **Integrate:** `game-engine-developer` until `npm run playtest -- games/<title>/index.html` boots with 0 errors.
6. **Audit:** `security-auditor`, then `performance-optimizer` (one writer at a time).
7. **Playtest:** `qa-browser-tester`, then `playtest-council`.
8. **Fix loop:** `bug-fixer` on the top issues, then playtest again. At most 2 rounds.
9. **Deliver:** how to play (`npm start`, open `/games/<title>/`), council score, FPS, and the next 3 improvements.

## Gates

| After | Must be true |
| :- | :- |
| Spec | Every file has exactly one owner; every called method is defined |
| Build | `npm run check` passes |
| Integrate | Game boots and starts a run with 0 console errors |
| Playtest | 0 errors, average FPS ≥ 55 on a real GPU, council average ≥ 7/10 |

## Hosts without subagents

If the host cannot spawn subagents, play each role yourself in the same order: read the agent's file in `.claude/agents/<name>.md`, do that job, write its report, then move to the next. Keep the file-ownership rule even when working alone; it keeps changes reviewable.
