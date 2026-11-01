#!/usr/bin/env bash
# Autonomous 37-Agent Universal Game & Software Studio - Fast Installer
set -e

REPO_URL="https://github.com/Muzaqil555/game-for-ai.git"
TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'game-studio')

echo "=========================================================="
echo "⚡ Installing Autonomous 37-Agent Studio into current directory..."
echo "=========================================================="

git clone --quiet --depth 1 "$REPO_URL" "$TEMP_DIR"

cp -r "$TEMP_DIR/.agents" ./
cp "$TEMP_DIR/AGENTS.md" ./
cp "$TEMP_DIR/CLAUDE.md" ./
cp "$TEMP_DIR/.cursorrules" ./
cp "$TEMP_DIR/PROMPTS.md" ./

rm -rf "$TEMP_DIR"

echo "✅ Installation complete!"
echo "🚀 Open this folder in Antigravity, Cursor, or Claude Code, pick a prompt from PROMPTS.md, and start building!"
