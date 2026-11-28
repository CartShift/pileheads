/* PWA foundation: no application or user data is cached. */
"use strict";
const offline = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PILEHEADS – Offline</title><style>body{background:#086879;color:#fff4d7;font:1rem system-ui;max-width:28rem;margin:15vh auto;padding:1.5rem}h1{font-size:2rem}a{display:inline-block;background:#f6c32c;color:#172421;padding:14px 22px;border-radius:12px;font-weight:bold}</style><main><h1>PILEHEADS</h1><h2>You’re offline.</h2><p>Reconnect to open the game or rejoin your table. Offline matches are not available yet.</p><a href="/play">Try again</a></main></html>';
// No skipWaiting, clients.claim, background sync, Cache Storage or automatic reload.
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.mode !== "navigate" ||
      url.origin !== self.location.origin ||
      !["/","/play","/play/"].includes(url.pathname) || url.search) return;
  event.respondWith(fetch(request).catch(() => new Response(offline, {
    status:503, headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}
  })));
});
