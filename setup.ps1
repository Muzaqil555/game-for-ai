# Game Studio installer for Windows: copies the studio's agents, commands, skills and
# playtest tools into the current directory. Existing files are never overwritten.
# Claude Code users can install the plugin instead:
#   /plugin install game-studio --marketplace Muzaqil555/game-for-ai
$repoUrl = "https://github.com/Muzaqil555/game-for-ai.git"
$tempPath = Join-Path $env:TEMP ("game-studio-" + [System.Guid]::NewGuid().ToString("N"))

Write-Host "Installing Game Studio into $(Get-Location)"
git clone --quiet --depth 1 $repoUrl $tempPath
if (-not (Test-Path $tempPath)) {
    Write-Host "Could not clone $repoUrl. Check your internet connection and that git is installed." -ForegroundColor Red
    return
}

try {
    $paths = @("AGENTS.md", "CLAUDE.md", "PROMPTS.md", ".cursorrules", ".cursor\rules", ".claude\agents",
               ".claude\commands", ".agents\skills", "tools\playtest.mjs", "tools\check.mjs")
    foreach ($p in $paths) {
        $src = Join-Path $tempPath $p
        $files = if (Test-Path $src -PathType Container) { Get-ChildItem $src -Recurse -File } else { Get-Item $src }
        foreach ($f in $files) {
            $rel = $f.FullName.Substring($tempPath.Length + 1)
            if (Test-Path $rel) { Write-Host "  skip (exists): $rel" -ForegroundColor DarkYellow; continue }
            $dir = Split-Path $rel -Parent
            if ($dir) { New-Item -ItemType Directory -Force $dir | Out-Null }
            Copy-Item $f.FullName $rel
            Write-Host "  added: $rel"
        }
    }

    if (Get-Command node -ErrorAction SilentlyContinue) {
        if (-not (Test-Path package.json)) {
            Set-Content -Encoding utf8 package.json ("{ `"name`": `"" + (Split-Path -Leaf (Get-Location)) + "`", `"private`": true }")
        }
        node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8').replace(/^﻿/,''));p.scripts={playtest:'node tools/playtest.mjs',check:'node tools/check.mjs',...p.scripts};fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
        Write-Host "  package.json: added playtest and check scripts (existing scripts kept)"
    }
} finally {
    Remove-Item -Path $tempPath -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Done. Next:" -ForegroundColor Green
Write-Host "  npm install --save-dev playwright; npx playwright install chromium"
Write-Host "  Open this folder in Claude Code and run: /new-game <your idea>"
Write-Host "  (Codex, Cursor, Antigravity: ask them to follow AGENTS.md)"
