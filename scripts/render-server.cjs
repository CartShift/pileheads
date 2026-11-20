'use strict';

// Node adapter for the Vercel-compatible STACK multiplayer function.
// Keeps the existing same-origin API, room protocol and Neon database.
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { stat } = require('node:fs/promises');
const roomHandler = require('../api/pilehead.js');

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
  '.ico': 'image/x-icon'
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
  res.json = function (value) { this.end(JSON.stringify(value)); return this; };

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
  res.setHeader('Cache-Control', path.extname(filename) === '.html' ? 'no-cache' : 'public, max-age=3600');
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filename)
    .on('error', () => { if (!res.headersSent) respond(res, 500, 'Internal Server Error'); else res.destroy(); })
    .pipe(res);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/pilehead') await serveApi(req, res, url);
    else await serveFile(req, res, url);
  } catch (error) {
    console.error('STACK request error:', error.message);
    if (!res.headersSent) respond(res, 500, 'Internal Server Error');
    else res.destroy();
  }
}).listen(port, '0.0.0.0', () => console.log(`STACK listening on port ${port}`));
