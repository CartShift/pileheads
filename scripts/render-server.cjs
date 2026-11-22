'use strict';

// Node adapter for the Vercel-compatible STACK multiplayer function.
// Keeps the existing same-origin API, room protocol and Neon database.
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { stat } = require('node:fs/promises');
const roomHandler = require('../api/pilehead.js');
const { attachRealtime } = require('./realtime-hub.cjs');
let liveHub = null;

const root = path.resolve(__dirname, '../vercel-static');
const port = Number(process.env.PORT || 10000);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};

function respond(res, status, data, type = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  res.end(data);
}

async function serveApi(req, res, url) {
  req.query = Object.fromEntries(url.searchParams.entries());
  // Vercel provides res.status().json(); preserve that interface here.
  res.status = function (status) { this.statusCode = status; return this; };
  res.json = function (value) {
    // Only notify peers after the authoritative database response succeeded.
    if(value?.ok&&value.code&&liveHub){
      const action=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)?.action}catch{return null}})():null;
      if(value.reaction)liveHub.pushReaction(value.code,value.reaction);
      else if(['move','swap','ready','start','rematch','advance','dump-target','decline','join','settings'].includes(action))
       liveHub.pushRevision(value.code,Number(value.revision),action==='join');
    }
    this.end(JSON.stringify(value)); return this;
  };

  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString('utf8');
      if (Buffer.byteLength(body) > 4096) {
        respond(res, 413, JSON.stringify({ ok: false, error: 'too_large' }), 'application/json; charset=utf-8');
        return;
      }
    }
    req.body = body; // Existing handler parses and validates it.
  }
  await roomHandler(req, res);
}

async function serveFile(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return respond(res, 405, 'Method Not Allowed');
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return respond(res, 400, 'Bad Request'); }
  if (pathname === '/') pathname = '/index.html';
  // Next.js is statically exported. Map friendly routes to real files;
  // Classic URLs remain untouched, with no catch-all SPA fallback.
  if (pathname === '/play' || pathname === '/play/') pathname = '/play.html';
  else if (pathname === '/stack' || pathname === '/stack/') pathname = '/stack.html';
  if (pathname.includes('\0') || pathname.includes('\\')) return respond(res, 400, 'Bad Request');

  const filename = path.resolve(root, '.' + pathname);
  if (!filename.startsWith(root + path.sep)) return respond(res, 403, 'Forbidden');

  let info;
  try { info = await stat(filename); }
  catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return respond(res, 404, 'Not Found');
    throw e;
  }
  if (!info.isFile()) return respond(res, 404, 'Not Found');

  res.statusCode = 200;
  res.setHeader('Content-Type', contentTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const nextFingerprint = pathname.startsWith('/_next/static/');
  const routePayload = path.extname(filename) === '.txt';
  res.setHeader('Cache-Control', nextFingerprint ? 'public, max-age=31536000, immutable'
    : path.extname(filename) === '.html' || routePayload ? 'no-cache'
    : 'public, max-age=3600');
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filename)
    .on('error', () => { if (!res.headersSent) respond(res, 500, 'Internal Server Error'); else res.destroy(); })
    .pipe(res);
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  res.once('finish', () => {
    const duration = Date.now() - started;
    // Diagnose slow/failing room requests without logging room codes, names, tokens or IPs.
    if (duration > 1000 || res.statusCode >= 500) {
      const route = (req.url || '').split('?')[0] === '/api/pilehead' ? '/api/pilehead' : 'static-or-health';
      console.warn(JSON.stringify({ event: 'stack_http_slow_or_failed', route, status: res.statusCode, durationMs: duration }));
    }
  });
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/livez') respond(res, 200, JSON.stringify({ ok: true, service: 'stack', websocket: Boolean(liveHub) }), 'application/json; charset=utf-8');
    else if (url.pathname === '/readyz') {
      // Existing DB-aware API health check, not just an HTTP process liveness check.
      url.searchParams.set('health', '1');
      await serveApi(req, res, url);
    }
    else if (url.pathname === '/api/pilehead') await serveApi(req, res, url);
    else await serveFile(req, res, url);
  } catch (error) {
    console.error('STACK request error:', error.message);
    if (!res.headersSent) respond(res, 500, 'Internal Server Error');
    else res.destroy();
  }
});
liveHub=attachRealtime(server,roomHandler);
server.listen(port, '0.0.0.0', () => console.log(`STACK listening on port ${port} with WebSocket rooms`));
process.once('SIGTERM',()=>{
 liveHub.shutdown();
 server.close(()=>process.exit(0));
 const limit=setTimeout(()=>process.exit(0),25000);
 limit.unref?.();
});
