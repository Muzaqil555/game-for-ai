---
description: Set up the current project for the game studio - copies AGENTS.md and the playtest tools, adds npm scripts, installs Playwright
---

Set up this project so the game-studio agents can work here.

**Studio files:** `${CLAUDE_PLUGIN_ROOT}`

If the line above still shows a literal `${CLAUDE_PLUGIN_ROOT}` placeholder instead of a folder path, you are running inside the studio repository itself: check that `AGENTS.md` and `tools/playtest.mjs` exist, tell the user the project is already set up, and stop.

Otherwise:

1. **Copy, never overwrite.** From the studio folder into the project root, copy `AGENTS.md`, `tools/playtest.mjs` and `tools/check.mjs`. If a destination file already exists and differs, keep it, and tell the user which files you skipped.
2. **npm scripts.** If there is no `package.json`, create one with `{ "name": "<folder-name>", "private": true }`. Add the scripts `"playtest": "node tools/playtest.mjs"` and `"check": "node tools/check.mjs"` when they are missing; keep every existing script.
3. **Dependencies.** Run `npm install --save-dev playwright`, then `npx playwright install chromium`.
4. **Ignore output.** Append `playtest-results/` and `node_modules/` to `.gitignore` if they are not already listed.
5. **Smoke test.** If the project has an `index.html`, run `npm run playtest -- index.html --seconds 5` and report the result line.
6. **Tell the user** what was added and the next step: `/new-game <idea>` to build a game, or `/playtest <page>` to test an existing one.

Do not commit anything.
