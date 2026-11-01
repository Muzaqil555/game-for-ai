#!/usr/bin/env bash
# Autonomous 36-Agent Universal Game & Software Studio - Fast Installer
set -e

REPO_URL="https://github.com/Muzaqil555/game-for-ai.git"
TEMP_DIR=$(mktemp -d)

echo "=========================================================="
echo "⚡ Installing Autonomous 36-Agent Studio into current directory..."
echo "=========================================================="

git clone --depth 1 "$REPO_URL" "$TEMP_DIR" >/dev/null 2>&1

cp -r "$TEMP_DIR/.agents" ./
cp "$TEMP_DIR/AGENTS.md" ./
cp "$TEMP_DIR/CLAUDE.md" ./
cp "$TEMP_DIR/.cursorrules" ./
cp "$TEMP_DIR/PROMPTS.md" ./

rm -rf "$TEMP_DIR"

echo "✅ Installation complete!"
echo "🚀 Open this folder in Antigravity, Cursor, or Claude Code, pick a prompt from PROMPTS.md, and start building!"
