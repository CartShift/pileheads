"use strict";
const assert = require("node:assert/strict");
const handler = require("../api/pilehead.js");

async function preflight(origin, trusted) {
  if (trusted === undefined) delete process.env.STACK_WEB_ORIGIN;
  else process.env.STACK_WEB_ORIGIN = trusted;
  const headers = {};
  const res = {
    statusCode: 200,
    setHeader(key, value) { headers[key.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    end() { return { status: this.statusCode, headers }; },
    json(body) { return { status: this.statusCode, headers, body }; }
  };
  return handler({
    method: "OPTIONS",
    headers: { origin, host: "stack-api.example", "access-control-request-method": "POST" },
    query: {}
  }, res);
}

(async () => {
  const old = process.env.STACK_WEB_ORIGIN;
  try {
    let r = await preflight("https://next.example", "https://next.example/");
    assert.equal(r.status, 204);
    assert.equal(r.headers["access-control-allow-origin"], "https://next.example");
    assert.equal(r.headers.vary, "Origin");
    assert.match(r.headers["access-control-allow-headers"], /Authorization/);
    r = await preflight("https://evil.example", "https://next.example");
    assert.equal(r.status, 403);
    assert.equal(r.headers["access-control-allow-origin"], undefined);
    r = await preflight("https://next.example.evil", "https://next.example");
    assert.equal(r.status, 403);
    r = await preflight("https://next.example", undefined);
    assert.equal(r.status, 403);
    r = await preflight("https://stack-api.example", undefined);
    assert.equal(r.status, 204);
    console.log("Next.js cross-origin preflight security: passed");
  } finally {
    if (old === undefined) delete process.env.STACK_WEB_ORIGIN;
    else process.env.STACK_WEB_ORIGIN = old;
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
