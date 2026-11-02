#!/usr/bin/env node
// Automated playtest: serves the repo, opens a game page in Chromium, starts a run,
// drives random input, and records console errors, failed requests, FPS and screenshots.
//
//   npm run playtest -- racer.html --seconds 20 [--mobile] [--headed] [--software] [--min-fps 55]
//
// Output: playtest-results/<page>/report.json + start.png, mid.png, end.png
// Exit code 1 when the page throws, logs console errors, has failed local requests,
// or (with --min-fps) runs below the threshold.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const opts = { page: 'index.html', seconds: 20, mobile: false, headed: false, software: false, minFps: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seconds') opts.seconds = Number(argv[++i]);
    else if (a === '--min-fps') opts.minFps = Number(argv[++i]);
    else if (a === '--mobile') opts.mobile = true;
    else if (a === '--software') opts.software = true;
    else if (a === '--headed') opts.headed = true;
    else if (!a.startsWith('--')) opts.page = a;
  }
  return opts;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm',
};

function serve(root) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.normalize(path.join(root, urlPath === '/' ? '/index.html' : urlPath));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      // Browsers request /favicon.ico on their own; a game without one is not broken.
      if (err && urlPath === '/favicon.ico') { res.writeHead(204).end(); return; }
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Runs in the page before any game script: once `recording` is set, stores every frame time.
function installFrameProbe() {
  const probe = { recording: false, frames: [] };
  Object.defineProperty(window, '__playtest', { value: probe, writable: false });
  const tick = (t) => { if (probe.recording) probe.frames.push(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

// Headless Chromium renders WebGL in software (~10 FPS for 3D games). Use the real GPU where we can.
function launchOptions(opts) {
  if (opts.software) return { headless: !opts.headed };
  const angle = { win32: 'd3d11', darwin: 'metal' }[process.platform];
  return {
    headless: !opts.headed,
    channel: 'chromium',
    args: ['--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', ...(angle ? [`--use-angle=${angle}`] : [])],
  };
}

const START_LABEL = /\b(play|start|launch|begin|ignite|new game|new run|commence|continue)\b|başla|oyna|yeni/i;
const KEYS = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Shift', 'j', 'k', 'e', 'q', '1', '2', '3'];

async function clickStart(page) {
  for (const el of await page.locator('button, [role=button], a, .btn, .button').all()) {
    try {
      if (!(await el.isVisible())) continue;
      const text = (await el.innerText()).trim();
      if (START_LABEL.test(text)) { await el.click({ timeout: 2000 }); return `clicked "${text.slice(0, 40)}"`; }
    } catch { /* element detached or covered: try the next one */ }
  }
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  return 'no start button found; pressed Enter and Space';
}

function frameStats(ts) {
  if (ts.length < 2) return { avgFps: 0, p95FrameMs: null, worstFrameMs: null, frames: ts.length };
  const deltas = ts.slice(1).map((t, i) => t - ts[i]).sort((x, y) => x - y);
  const span = ts[ts.length - 1] - ts[0];
  return {
    avgFps: Math.round(((ts.length - 1) / span) * 1000 * 10) / 10,
    p95FrameMs: Math.round(deltas[Math.floor(deltas.length * 0.95)] * 10) / 10,
    worstFrameMs: Math.round(deltas[deltas.length - 1] * 10) / 10,
    frames: ts.length,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(path.join(ROOT, opts.page))) {
    console.error(`playtest: ${opts.page} not found in ${ROOT}`);
    process.exit(2);
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('playtest: Playwright is not installed. Run: npm install && npx playwright install chromium');
    process.exit(2);
  }

  const outDir = path.join(ROOT, 'playtest-results', path.basename(opts.page, path.extname(opts.page)) + (opts.mobile ? '-mobile' : ''));
  fs.mkdirSync(outDir, { recursive: true });

  const server = await serve(ROOT);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(launchOptions(opts));
  const context = await browser.newContext(opts.mobile
    ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.addInitScript(installFrameProbe);

  const errors = [];
  const warnings = [];
  const failedRequests = [];
  page.on('pageerror', (e) => errors.push({ type: 'uncaught', message: e.message, stack: e.stack }));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push({ type: 'console.error', message: m.text(), location: m.location() });
    else if (m.type() === 'warning') warnings.push(m.text());
  });
  page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), reason: r.failure()?.errorText }));
  page.on('response', (r) => { if (r.status() >= 400) failedRequests.push({ url: r.url(), status: r.status() }); });

  const started = Date.now();
  await page.goto(`${origin}/${opts.page}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'start.png') });

  const startAction = await clickStart(page);
  await page.waitForTimeout(800);
  const box = { w: opts.mobile ? 375 : 1280, h: opts.mobile ? 812 : 720 };
  await page.mouse.click(box.w / 2, box.h / 2).catch(() => {});
  await page.evaluate(() => { window.__playtest.recording = true; });

  // Input storm: random held keys plus mouse aim and clicks, like an impatient player.
  const endAt = Date.now() + opts.seconds * 1000;
  let midShot = false;
  while (Date.now() < endAt) {
    const key = KEYS[Math.floor(Math.random() * KEYS.length)];
    await page.keyboard.down(key);
    await page.mouse.move(Math.random() * box.w, Math.random() * box.h);
    if (Math.random() < 0.3) await page.mouse.click(Math.random() * box.w, Math.random() * box.h).catch(() => {});
    await page.waitForTimeout(100 + Math.random() * 300);
    await page.keyboard.up(key);
    if (!midShot && Date.now() > endAt - (opts.seconds * 1000) / 2) {
      await page.screenshot({ path: path.join(outDir, 'mid.png') });
      midShot = true;
    }
  }
  await page.screenshot({ path: path.join(outDir, 'end.png') });

  const probe = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      frames: window.__playtest.frames,
      gameState: window.GameCore?.state ?? window.game?.state ?? null,
      title: document.title,
      renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
    };
  });
  const fps = frameStats(probe.frames);
  const softwareGpu = /swiftshader|llvmpipe|software/i.test(probe.renderer);
  await browser.close();
  server.close();

  const localFailures = failedRequests.filter((r) => r.url.startsWith(origin));
  const report = {
    page: opts.page,
    title: probe.title,
    viewport: opts.mobile ? 'mobile 375x812' : 'desktop 1280x720',
    durationSec: Math.round((Date.now() - started) / 1000),
    startAction,
    gameState: probe.gameState,
    renderer: probe.renderer,
    fps,
    fpsRepresentative: !softwareGpu,
    errors,
    warnings: [...new Set(warnings)].slice(0, 20),
    failedRequests,
    screenshots: ['start.png', 'mid.png', 'end.png'].map((f) => path.relative(ROOT, path.join(outDir, f)).replaceAll('\\', '/')),
    pass: errors.length === 0 && localFailures.length === 0 && (softwareGpu || fps.avgFps >= opts.minFps),
  };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

  const mark = report.pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${opts.page}  ${report.viewport}`);
  console.log(`  start: ${startAction}`);
  console.log(`  gpu: ${probe.renderer}${softwareGpu ? '  (software: FPS not representative, not gated)' : ''}`);
  console.log(`  fps: avg ${fps.avgFps}, p95 frame ${fps.p95FrameMs} ms, worst ${fps.worstFrameMs} ms${!softwareGpu && fps.avgFps < 55 ? '  (below 55 target)' : ''}`);
  console.log(`  errors: ${errors.length}, failed requests: ${failedRequests.length} (${localFailures.length} local), warnings: ${report.warnings.length}`);
  for (const e of errors.slice(0, 5)) console.log(`   - ${e.type}: ${e.message.split('\n')[0]}`);
  console.log(`  report: ${path.relative(ROOT, path.join(outDir, 'report.json'))}`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
