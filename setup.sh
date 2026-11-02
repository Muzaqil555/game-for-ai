#!/usr/bin/env bash
# Game Studio installer: copies the studio's agents, commands, skills and playtest tools
# into the current directory. Existing files are never overwritten.
# Claude Code users can install the plugin instead:
#   /plugin install game-studio --marketplace Muzaqil555/game-for-ai
set -e

REPO_URL="https://github.com/Muzaqil555/game-for-ai.git"
TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'game-studio')
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Installing Game Studio into $(pwd)"
git clone --quiet --depth 1 "$REPO_URL" "$TEMP_DIR"

skipped=0
copy_tree() { # copy every file under $1, skipping files that already exist
  (cd "$TEMP_DIR" && find "$1" -type f) | while read -r f; do
    if [ -e "$f" ]; then echo "  skip (exists): $f"; else mkdir -p "$(dirname "$f")"; cp "$TEMP_DIR/$f" "$f"; echo "  added: $f"; fi
  done
}
for path in AGENTS.md CLAUDE.md PROMPTS.md .cursorrules .cursor/rules .claude/agents .claude/commands .agents/skills tools/playtest.mjs tools/check.mjs; do
  copy_tree "$path"
done

if command -v node >/dev/null 2>&1; then
  [ -f package.json ] || echo "{ \"name\": \"$(basename "$(pwd)")\", \"private\": true }" > package.json
  node -e '
    const fs = require("fs"); const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
    p.scripts = { playtest: "node tools/playtest.mjs", check: "node tools/check.mjs", ...p.scripts };
    fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");'
  echo "  package.json: added playtest and check scripts (existing scripts kept)"
fi

echo
echo "Done. Next:"
echo "  npm install --save-dev playwright && npx playwright install chromium"
echo "  Open this folder in Claude Code and run: /new-game <your idea>"
echo "  (Codex, Cursor, Antigravity: ask them to follow AGENTS.md)"
