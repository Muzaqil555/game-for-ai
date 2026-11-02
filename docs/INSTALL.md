# Install

Three ways to use the studio. Pick the one that matches your tool.

## 1. Claude Code plugin (any project)

Inside Claude Code:

```
/plugin marketplace add Muzaqil555/game-for-ai
/plugin install game-studio@game-for-ai
```

On Claude Code 2.1.275 or later, one step also works:

```
/plugin install game-studio --marketplace Muzaqil555/game-for-ai
```

Then, in the project where you want to make games:

```
/game-studio:studio-init
/game-studio:new-game a neon roguelite where you slice drones with a laser katana
```

`studio-init` copies `AGENTS.md` and the playtest tools into your project, adds `npm run playtest` and `npm run check`, and installs Playwright with Chromium. It never overwrites your files.

| You get | Names |
| :- | :- |
| 28 subagents | `game-studio:game-architect`, `game-studio:playtest-council`, ... (see [`AGENTS.md`](../AGENTS.md)) |
| Commands | `/game-studio:new-game`, `/game-studio:playtest`, `/game-studio:add-feature`, `/game-studio:studio-init` |
| Skills | `universal-game-engine`, `threejs-webgl-game-engine`, `game-plugin-module`, `build-full-game` |

Update later with `/plugin marketplace update game-for-ai`.

## 2. Clone as a template (Claude Code)

```bash
git clone https://github.com/Muzaqil555/game-for-ai.git my-games
```

```bash
cd my-games && npm install && npx playwright install chromium
```

Open the folder in Claude Code. The agents in `.claude/agents/` and the commands `/new-game`, `/playtest` and `/add-feature` load automatically, with no prefix.

## 3. Codex, Cursor and other tools

Clone the repository as in option 2.

- **Codex** reads `AGENTS.md` automatically. Ask: "Build a game: <idea>. Follow AGENTS.md and the build-full-game skill."
- **Cursor** loads `.cursor/rules/game-studio.mdc` (and the legacy `.cursorrules`). Ask the same way.
- **Any other agent** that reads Markdown: point it at `AGENTS.md` and `.agents/skills/build-full-game/SKILL.md`. Tools without subagents play each role in turn, as that skill describes.

## Requirements

- Node.js 18 or later (for the playtest tools)
- About 150 MB of disk space for Playwright's Chromium

## Playtest on CI or without a GPU

```bash
npm run playtest -- index.html --software
```

`--software` uses Chromium's software renderer. The report marks FPS as not representative, and the FPS gate is skipped.
