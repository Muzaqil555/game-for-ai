---
description: Playtest a game in a real browser and get a 9-persona verdict with ranked fixes
argument-hint: [page, e.g. racer.html or games/my-game/index.html] (default index.html)
---

Playtest **${ARGUMENTS:-index.html}** using the studio in `AGENTS.md`.

1. Make sure the project is set up: no `playtest` script in `package.json` → run the `/studio-init` steps; `node_modules/playwright` missing → run `npm install` and `npx playwright install chromium`.
2. Launch `qa-browser-tester` on the page (desktop and mobile runs).
3. When it finishes, launch `playtest-council` on the same page; it reuses the fresh results in `playtest-results/`.
4. Report to the user in this order: PASS/FAIL, FPS (and whether the GPU was real), console errors, the council table and verdict, and the top 5 fixes with owning agent and file.
5. Ask whether to run the fix loop (`bug-fixer`, then playtest again). Do not edit game files before the user says yes.
