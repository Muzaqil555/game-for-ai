---
description: Add a new system or feature to an existing game without breaking it
argument-hint: <page> <feature, e.g. "shooter.html a co-op drone companion">
---

Add this to an existing game using the studio in `AGENTS.md`: **$ARGUMENTS**

1. Identify the target page and read its code structure. If it is modular (`src/*.js` with `window.Game*` globals), follow `.agents/skills/game-plugin-module/SKILL.md` and add the feature as a new module file. If it is a single HTML file, keep edits in clearly marked sections.
2. Launch `game-architect` to extend that game's `GAME_SPEC.md` (create one describing the current game if it has none): the new file, its owner, its API, the hooks it uses, and acceptance criteria. Existing APIs must stay compatible.
3. Launch the specialist that owns the feature (pick from the roster in `AGENTS.md`), plus `ui-hud-engineer` only if the feature needs UI.
4. Run `npm run playtest -- <page>` before and after; the feature is done only if errors stay at 0 and FPS does not drop more than 10%.
5. Launch `playtest-council` for a quick verdict on the feature, then report the result, FPS before/after and any follow-ups to the user.
