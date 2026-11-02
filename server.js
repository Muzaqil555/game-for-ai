/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ (V2.0 — AAA Mega-Edition)
 * Sürətli, Sıfır-Bloklanma Lokal HTTP Oyun Serveri (Port 8080)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    // Serve only files inside ROOT, and never dot-files or dot-folders (.git, .claude, ...).
    const safePath = path.normalize(path.join(ROOT, pathname));
    const rel = path.relative(ROOT, safePath);
    if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some((part) => part.startsWith('.'))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + pathname);
        return;
      }

      // Only game asset types are served; notes, configs and sources like .md stay private.
      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext];
      if (!contentType) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });

      const stream = fs.createReadStream(safePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
      });
      stream.pipe(res);
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
  }
});

// Local only: other devices on the network cannot reach the repository.
// If the port is busy, try the next ones instead of killing whatever holds it.
// `node server.js --open` opens the browser on the port actually used.
let port = PORT;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < PORT + 10) {
    port += 1;
    server.listen(port, '127.0.0.1');
  } else {
    console.error(err.message);
    process.exit(1);
  }
});
server.on('listening', () => {
  const url = `http://localhost:${port}/index.html`;
  console.log(`⚔️ [Aetheria Server] Oyun serveri aktivdir: ${url}`);
  if (process.argv.includes('--open')) {
    const opener = { win32: ['cmd', ['/c', 'start', '', url]], darwin: ['open', [url]] }[process.platform] || ['xdg-open', [url]];
    require('child_process').spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).unref();
  }
});
server.listen(port, '127.0.0.1');
