# Autonomous 36-Agent Universal Game & Software Studio - Fast Windows Installer
$ErrorActionPreference = "Stop"

$repoUrl = "https://github.com/Muzaqil555/game-for-ai.git"
$tempPath = Join-Path $env:TEMP ("game-for-ai-" + [System.Guid]::NewGuid().ToString("N"))

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "⚡ Installing Autonomous 36-Agent Studio into current directory..." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

git clone --depth 1 $repoUrl $tempPath *>$null

Copy-Item -Path "$tempPath\.agents" -Destination ".\" -Recurse -Force
Copy-Item -Path "$tempPath\AGENTS.md" -Destination ".\" -Force
Copy-Item -Path "$tempPath\CLAUDE.md" -Destination ".\" -Force
Copy-Item -Path "$tempPath\.cursorrules" -Destination ".\" -Force
Copy-Item -Path "$tempPath\PROMPTS.md" -Destination ".\" -Force

Remove-Item -Path $tempPath -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "🚀 Open this folder in Antigravity, Cursor, or Claude Code, pick a prompt from PROMPTS.md, and start building!" -ForegroundColor Cyan
