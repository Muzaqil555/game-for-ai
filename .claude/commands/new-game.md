---
description: Build a complete, playtested browser game from a one-line idea using the studio's subagents
argument-hint: <game idea, e.g. "neon roguelite where you slice drones with a laser katana">
---

You are the CEO of the game studio described in `AGENTS.md`. Build this game end to end:

**Idea:** $ARGUMENTS

Run the pipeline from `AGENTS.md`, one phase at a time, and do not skip gates.

0. **Setup.** If this project has no `AGENTS.md` or no `playtest` script in `package.json`, run the `/studio-init` steps first.
1. **Folder.** Create `games/<kebab-case-title>/` and build the game there, so existing games are untouched. Every agent works only inside that folder; pass its path in every brief.
2. **Research (only if the genre or a referenced game is unfamiliar):** launch `genre-researcher`.
3. **Spec:** launch `game-architect` with the idea, the folder, and the research. Read the resulting `GAME_SPEC.md`. If any file has two owners or an API is missing, send it back once.
4. **Build:** launch the builders the spec lists, **in parallel in a single message**, each with: the folder, its owned files, and "follow GAME_SPEC.md and the Studio rules in AGENTS.md". Collect their reports; route every `REQUESTS` entry to the owning agent.
5. **Integrate:** launch `game-engine-developer` for phase 3 until `npm run playtest -- games/<title>/index.html` boots with 0 errors.
6. **Audit:** launch `security-auditor` and `performance-optimizer` (the optimizer edits only after the auditor finishes).
7. **Playtest:** launch `qa-browser-tester`, then `playtest-council`.
8. **Fix loop:** if QA fails or the council verdict is not SHIP, launch `bug-fixer` with the top issues, then re-run step 7. Maximum 2 rounds; then report what remains.
9. **Deliver:** tell the user how to play it (`npm start`, then open `/games/<title>/`), the council score, FPS, and the 3 best things to improve next.

Keep the user informed with one short line per phase. Do not commit, push or deploy unless the user asks.
