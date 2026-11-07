# Contributing

Thanks for helping! New agents, genre skills, games built with the studio, bug reports and ideas are all welcome.

## Setup

```bash
git clone https://github.com/Muzaqil555/game-for-ai
cd game-for-ai
npm install
npm run check          # syntax and agent-definition checks
npm run playtest       # real Chromium playtest: errors, FPS, screenshots
npm start              # serve the demo games locally
```

To try your copy as a Claude Code plugin, see [docs/INSTALL.md](docs/INSTALL.md).

## What to contribute

- **A new agent:** add `.claude/agents/<name>.md`, list it in the `AGENTS.md` roster and in `.claude-plugin/plugin.json`, then run `npm run check`. It fails if one of the three is missing.
- **A genre or engine skill:** add it under `.agents/skills/` and mention which agents should read it.
- **A game made with the studio:** open an issue with a link and the prompt you used. Good ones get featured in the README.
- **A bug in a demo game:** open an issue with the page, what you did and what happened. A screenshot or the console error helps a lot.

## Pull requests

- Keep each PR focused on one change.
- Run `npm run check`, and `npm run playtest -- <page>` for any game you touched. CI runs the same playtest on every push.
- Describe how you checked the change, for example "played two runs of Aetheria, no console errors, 110 FPS".
- No external image or audio assets unless the game's spec allows them: graphics are procedural and sound is Web Audio.

## Conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). Questions are welcome in an issue.
