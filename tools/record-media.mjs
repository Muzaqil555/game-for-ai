#!/usr/bin/env node
// Records short gameplay clips of the demo games and converts them to README GIFs.
// Needs ffmpeg on PATH.   node tools/record-media.mjs [page ...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'media');
const TMP = path.join(ROOT, 'playtest-results', 'media-tmp');

// Each script: how to start the game and what to do during the clip.
const GAMES = {
  'index.html': {
    gif: 'aetheria.gif', start: /yeni mac/i,
    async play(page, ms) {
      const keys = ['d', 's', 'a', 'w'];
      for (let t = 0, i = 0; t < ms; t += 600, i++) {
        await page.keyboard.down(keys[i % 4]);
        await page.mouse.click(640 + 200 * Math.cos(i), 360 + 150 * Math.sin(i));
        if (i % 3 === 2) await page.keyboard.press('Space');
        await page.waitForTimeout(600);
        await page.keyboard.up(keys[i % 4]);
      }
    },
  },
  'racer.html': {
    gif: 'racer.gif', start: /ignite/i,
    async play(page, ms) {
      await page.keyboard.down('w');
      for (let t = 0, i = 0; t < ms; t += 900, i++) {
        const steer = i % 2 ? 'a' : 'd';
        if (i === 2) await page.keyboard.down('Shift');
        await page.keyboard.down(steer);
        await page.waitForTimeout(450);
        await page.keyboard.up(steer);
        await page.waitForTimeout(450);
      }
    },
  },
  'shooter.html': {
    gif: 'shooter.gif', start: /launch/i,
    async play(page, ms) {
      const keys = ['w', 'd', 's', 'a'];
      await page.mouse.move(640, 200);
      await page.mouse.down();
      for (let t = 0, i = 0; t < ms; t += 500, i++) {
        await page.keyboard.down(keys[i % 4]);
        await page.mouse.move(640 + 400 * Math.cos(i * 0.9), 360 + 250 * Math.sin(i * 0.9), { steps: 5 });
        await page.waitForTimeout(500);
        await page.keyboard.up(keys[i % 4]);
      }
      await page.mouse.up();
    },
  },
};

function serve() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.normalize(path.join(ROOT, p === '/' ? '/index.html' : p));
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(p === '/favicon.ico' ? 204 : 404).end();
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }).end(data);
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

const pages = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(GAMES);
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(TMP, { recursive: true, force: true });
const server = await serve();
const angle = { win32: 'd3d11', darwin: 'metal' }[process.platform];
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--enable-gpu', '--ignore-gpu-blocklist', ...(angle ? [`--use-angle=${angle}`] : [])],
});

for (const name of pages) {
  const game = GAMES[name];
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: TMP, size: { width: 1280, height: 720 } } });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/${name}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: game.start }).first().click();
  const clipStart = (Date.now() - started) / 1000 + 1.0;
  await page.waitForTimeout(1000);
  await game.play(page, 7000);
  const video = page.video();
  await context.close();
  const webm = await video.path();
  const gif = path.join(OUT, game.gif);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', clipStart.toFixed(2), '-t', '6', '-i', webm, '-vf',
    'fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    gif]);
  console.log(`${name} -> ${path.relative(ROOT, gif)} (${Math.round(fs.statSync(gif).size / 1024)} KB)`);
}

await browser.close();
server.close();
fs.rmSync(TMP, { recursive: true, force: true });
