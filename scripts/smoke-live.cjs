#!/usr/bin/env node
'use strict';
// Run from the repository root after npm ci:
// node scripts/smoke-live.cjs https://YOUR-STAGED-DEPLOYMENT.vercel.app
// For protected staging only, configure VERCEL_AUTOMATION_BYPASS_SECRET
// in the local/CI environment. Never pass it in arguments or commit it.
// Creates one disposable room in the target database; room expires normally.
const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const { WebSocket } = require('ws');
const base = new URL(process.argv[2] || '');
assert.equal(base.protocol, 'https:', 'Use an HTTPS deployment URL');
assert.equal(base.pathname, '/', 'Supply the deployment origin only');
assert(!base.username && !base.password && !base.search && !base.hash);
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = bypass ? {'x-vercel-protection-bypass': bypass} : {};
const sockets = new Set();
const api = new URL('/api/pilehead', base);
async function request(action, data = {}, token) {
  const response = await fetch(api, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: {...headers, 'Content-Type': 'application/json',
      ...(token ? {Authorization: 'Bearer ' + token} : {})},
    body: JSON.stringify({action, ...data})
  });
  assert([200, 201].includes(response.status), action + ' HTTP ' + response.status);
  const body = await response.json();
  assert.equal(body.ok, true, action + ' failed');
  return body;
}
function connect(code, token) {
  const url = new URL('/api/pilehead/live', base);
  url.protocol = 'wss:';
  const ws = new WebSocket(url, {origin: base.origin, headers, handshakeTimeout: 15000});
  sockets.add(ws);
  const messages = [];
  let ended = false;
  ws.on('message', data => {
    try { messages.push({packet: JSON.parse(data.toString()), receivedAt: performance.now()}); } catch { ended = true; }
  });
  ws.on('error', () => { ended = true; });
  ws.on('close', () => { ended = true; sockets.delete(ws); });
  ws.on('open', () => ws.send(JSON.stringify({type: 'auth', code, token})));
  async function wait(predicate) {
    const until = Date.now() + 20000;
    while (Date.now() < until) {
      const index = messages.findIndex(entry => predicate(entry.packet));
      if (index >= 0) { const entry=messages.splice(index,1)[0]; return {...entry.packet, receivedAt:entry.receivedAt}; }
      assert(!ended, 'WebSocket closed before expected event');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out waiting for WebSocket event');
  }
  return {ws, wait};
}
function privacy(state) {
  assert(Array.isArray(state.game.players[state.me].hand), 'Own hand missing');
  for (const p of state.game.players) {
    if (p.seat !== state.me) {
      assert(!Object.hasOwn(p, 'hand'), 'Opponent hand leaked');
      assert(!Object.hasOwn(p, 'blindSlots'), 'Opponent blind slots leaked');
    } else assert(Array.isArray(p.blindSlots)&&p.blindSlots.every((slot,i)=>slot===i),'Own blind slots must be indexes only');
  }
}
async function main() {
  const health = await fetch(new URL('/api/pilehead?health=1', base), {
    headers, redirect: 'error', signal: AbortSignal.timeout(15000)
  });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  console.log('PASS database health');
  const a = await request('create', {name:'Smoke Host', humans:2, bots:0});
  const b = await request('join', {name:'Smoke Guest', code:a.code});
  assert.equal(b.me, 1);
  const state = player => request('state', {code:a.code, heartbeat:true}, player.session);
  const mutate = (player, revision, action, extra = {}) =>
    request(action, {code:a.code, revision, ...extra}, player.session);
  const sa = connect(a.code, a.session), sb = connect(a.code, b.session);
  await Promise.all([sa.wait(m => m.type === 'ready'), sb.wait(m => m.type === 'ready')]);
  console.log('PASS room creation, join, authenticated WebSockets');
  const initial = await Promise.all([state(a), state(b)]);
  initial.forEach(privacy);
  assert.equal(initial[0].members.length, 2);
  let current = await mutate(a, initial[0].revision, 'ready', {ready:true});
  current = await mutate(b, current.revision, 'ready', {ready:true});
  current = await mutate(a, current.revision, 'start');
  assert.equal(current.game.phase, 'play');
  await Promise.all([sa.wait(m => m.type === 'invalidate' && m.revision >= current.revision),
    sb.wait(m => m.type === 'invalidate' && m.revision >= current.revision)]);
  console.log('PASS private hands and synchronized start');
  const count=Number(process.env.SMOKE_MOVE_SAMPLES || 1);
  assert(Number.isSafeInteger(count)&&count>=1&&count<=30,'SMOKE_MOVE_SAMPLES must be 1–30');
  const samples=[];
  let after=current, views=await Promise.all([state(a),state(b)]);
  const clients=[a,b],live=[sa,sb];
  for(let i=0;i<count&&views[0].game.phase==='play';i++){
    const g=views[0].game;
    const seat=g.pendingDump?.seat??g.pendingCounter?.seat??g.turn;
    const actor=clients[seat],before=views[seat];
    const action=g.pendingDump?'dump-target':'move';
    const move=before.game.legal.find(m=>m.type==='play'||m.type==='counter-dump')||before.game.legal[0];
    assert(action==='dump-target'||move,'No supported legal move');
    const extra=action==='dump-target'?{target:1-seat}:{move};
    const began=performance.now();
    after=await mutate(actor,before.revision,action,extra);
    const ackAt=performance.now();
    assert.equal(after.revision,before.revision+1,'One command commits exactly one revision');
    live[seat].ws.send(JSON.stringify({type:'sync-hint'}));
    const signals=await Promise.all(live.map(socket=>socket.wait(m=>m.type==='invalidate'&&m.revision>=after.revision)));
    views=await Promise.all([state(a),state(b)]);
    const syncedAt=performance.now();
    assert(views.every(s=>s.revision===after.revision),'Both clients must converge to the committed revision');
    views.forEach(privacy);
    // Compare public projection without reading or logging private cards.
    const publicGame=({game})=>({turn:game.turn,phase:game.phase,moves:game.moves,
      stockCount:game.stockCount,ashesCount:game.ashesCount,pile:game.pile,limit:game.limit,
      pendingDump:game.pendingDump,pendingCounter:game.pendingCounter,finishedOrder:game.finishedOrder,loser:game.loser,
      players:game.players.map(({seat,out,up,handCount,downCount})=>({seat,out,up,handCount,downCount}))});
    assert(JSON.stringify(publicGame(views[0]))===JSON.stringify(publicGame(views[1])),
      'Public game projection diverged');
    const sample={commandAckMs:Math.round(ackAt-began),
      rivalInvalidationMs:Math.round(signals[1-seat].receivedAt-began),
      bothSnapshotsMs:Math.round(syncedAt-began)};
    samples.push(sample);
    console.log(JSON.stringify({event:'multiplayer_latency_sample',sample:i+1,...sample}));
  }
  assert(samples.length>0,'Expected at least one move sample');
  const distribution=key=>{
    const sorted=samples.map(s=>s[key]).sort((a,b)=>a-b);
    return {p50:sorted[Math.ceil(sorted.length*.5)-1],p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};
  };
  console.log('PASS gameplay moves and both clients converge');
  console.log(JSON.stringify({event:'multiplayer_latency_summary',samples:samples.length,requested:count,
    commandAckMs:distribution('commandAckMs'),rivalInvalidationMs:distribution('rivalInvalidationMs'),
    bothSnapshotsMs:distribution('bothSnapshotsMs'),
    note:'Single sequential room; runner location unverified; snapshots include 100ms wait-loop scheduling and presence reads.'}));
  sa.ws.send(JSON.stringify({type:'react',kind:'gg'}));
  await sb.wait(m => m.type === 'reaction' && m.reaction?.kind === 'gg' && m.reaction?.seat === 0);
  console.log('PASS realtime reaction');
  sb.ws.close();
  const reconnected = connect(a.code, b.session);
  const ready = await reconnected.wait(m => m.type === 'ready');
  assert.equal(ready.revision, after.revision);
  const restored = await state(b);
  privacy(restored);
  assert.equal(restored.revision, after.revision);
  console.log('PASS reconnect and retained seat');
}
main().catch(error => {
  // Avoid logging request headers, tokens or response bodies.
  console.error('LIVE SMOKE FAILED:', error.message);
  process.exitCode = 1;
}).finally(() => { for (const socket of sockets) socket.terminate(); });
