#!/usr/bin/env node
// Repository checks: `node --check` on every script in src/ and tools/, and validation of
// every subagent in .claude/agents/ against the roster in AGENTS.md.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.error(`FAIL ${msg}`); };

// 1. Syntax
const scripts = ['src', 'tools'].flatMap((dir) => {
  const abs = path.join(ROOT, dir);
  return fs.existsSync(abs)
    ? fs.readdirSync(abs).filter((f) => /\.(m?js|cjs)$/.test(f)).map((f) => path.join(abs, f))
    : [];
});
for (const file of scripts) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    fail(`${path.relative(ROOT, file)}\n${e.stderr.toString()}`);
  }
}
console.log(`syntax: ${scripts.length} scripts checked`);

// 2. Agents
const MODELS = new Set(['opus', 'sonnet', 'haiku', 'inherit']);
const agentDir = path.join(ROOT, '.claude', 'agents');
const agentFiles = fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'));
const roster = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
const rosterNames = new Set([...roster.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]));

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
  if (!text.includes('AGENTS.md')) fail(`${file}: must point to the Studio rules in AGENTS.md`);
}
for (const name of rosterNames) {
  if (!agentFiles.includes(`${name}.md`)) fail(`AGENTS.md lists "${name}" but .claude/agents/${name}.md does not exist`);
}
console.log(`agents: ${agentFiles.length} files, ${rosterNames.size} in roster`);

process.exit(failed ? 1 : 0);
