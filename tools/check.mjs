#!/usr/bin/env node
// Repository checks:
//   1. `node --check` on every script under src/, tools/ and games/
//   2. when this is the studio repo itself: every subagent in .claude/agents/ is valid,
//      listed in the AGENTS.md roster, and listed in .claude-plugin/plugin.json
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.error(`FAIL ${msg}`); };

// 1. Syntax
function scripts(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name.startsWith('.') ? [] : scripts(abs);
    return /\.(m?js|cjs)$/.test(e.name) ? [abs] : [];
  });
}
const files = ['src', 'tools', 'games'].flatMap((d) => scripts(path.join(ROOT, d)));
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    fail(`${path.relative(ROOT, file)}\n${e.stderr.toString()}`);
  }
}
console.log(`syntax: ${files.length} scripts checked`);

// 2. Agents (only in the studio repository)
const agentDir = path.join(ROOT, '.claude', 'agents');
const pluginFile = path.join(ROOT, '.claude-plugin', 'plugin.json');
if (fs.existsSync(agentDir) && fs.existsSync(pluginFile)) {
  const MODELS = new Set(['opus', 'sonnet', 'haiku', 'inherit']);
  const agentFiles = fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'));
  const roster = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  const rosterNames = new Set([...roster.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]));
  const pluginAgents = new Set(JSON.parse(fs.readFileSync(pluginFile, 'utf8')).agents.map((p) => path.basename(p)));

  for (const file of agentFiles) {
    const text = fs.readFileSync(path.join(agentDir, file), 'utf8').replace(/\r\n/g, '\n');
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fm) { fail(`${file}: missing frontmatter`); continue; }
    const field = (k) => fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1].trim();
    const name = field('name');
    const expected = file.replace(/\.md$/, '');
    if (name !== expected) fail(`${file}: name "${name}" must equal file name "${expected}"`);
    if (!field('description') || field('description').length < 60) fail(`${file}: description missing or too short to route on`);
    if (field('model') && !MODELS.has(field('model'))) fail(`${file}: unknown model "${field('model')}"`);
    if (!rosterNames.has(name)) fail(`${file}: not listed in the AGENTS.md roster`);
    if (!pluginAgents.has(file)) fail(`${file}: not listed in .claude-plugin/plugin.json "agents"`);
    if (!text.includes('${CLAUDE_PLUGIN_ROOT}/AGENTS.md')) fail(`${file}: must point to the Studio rules, with the plugin fallback path`);
  }
  for (const name of rosterNames) {
    if (!agentFiles.includes(`${name}.md`)) fail(`AGENTS.md lists "${name}" but .claude/agents/${name}.md does not exist`);
  }
  for (const file of pluginAgents) {
    if (!agentFiles.includes(file)) fail(`plugin.json lists ${file} but it does not exist`);
  }
  console.log(`agents: ${agentFiles.length} files, ${rosterNames.size} in roster, ${pluginAgents.size} in plugin.json`);
}

process.exit(failed ? 1 : 0);
