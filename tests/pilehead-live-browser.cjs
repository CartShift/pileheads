'use strict';
// Two independent Chromium contexts against the real Render server, engine,
// authentication and WebSocket hub. Only Neon is replaced by an isolated test DB.
const assert=require('node:assert/strict');
const path=require('node:path');
const {fork}=require('node:child_process');
const {chromium}=require('playwright');
const PORT=43178,BASE='http://127.0.0.1:'+PORT;
async function ready(){
 for(let i=0;i<100;i++){
  try{const r=await fetch(BASE+'/livez');if(r.ok)return}catch{}
  await new Promise(r=>setTimeout(r,180));
 }
 throw Error('Mock Neon STACK service did not start');
}
async function waitLive(page){
 await page.waitForFunction(()=>document.querySelector('[data-live-status]')?.textContent==='Live table',{timeout:16000});
}
async function run(){
 const fixture=path.resolve(__dirname,'fixtures/mock-neon-room.cjs');
 const server=fork(path.resolve(__dirname,'../scripts/render-server.cjs'),[],{
  execArgv:['--require',fixture],env:{...process.env,PORT:String(PORT),
   PILEHEAD_DATABASE_URL:'postgresql://test-only:fake@neon.invalid/stack',
   NODE_ENV:'test',STACK_TEST_WS_HEARTBEAT_MS:'200'},
  stdio:['ignore','pipe','pipe','ipc']
 });
 let logs='',browser,hostContext,guestContext;
 server.stdout.on('data',b=>logs+=b.toString());
 server.stderr.on('data',b=>logs+=b.toString());
 try{
  await ready();
  browser=await chromium.launch({headless:true});
  hostContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  guestContext=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
  const host=await hostContext.newPage(),guest=await guestContext.newPage();
  const errors=[];
  for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
  await host.goto(BASE+'/pilehead/index.html?online=1');
  await host.locator('#online-name').fill('Host');
  await host.locator('[data-do="create"]').click();
  await host.waitForURL(/room=[A-HJ-NP-Z2-9]{8}/);
  const room=new URL(host.url()).searchParams.get('room');
  assert.match(room,/^[A-HJ-NP-Z2-9]{8}$/);
  await guest.goto(host.url());
  await guest.locator('#online-name').fill('Guest');
  await guest.locator('[data-do="join"]').click();
  await guest.locator('.online-lobby').waitFor();
  await host.locator('.online-lobby').waitFor();
  await host.locator('[data-do="ready"]').click();
  await guest.locator('[data-do="ready"]').click();
  await host.waitForFunction(()=>!document.querySelector('[data-do="start"]')?.disabled);
  await host.locator('[data-do="start"]').click();
  await host.locator('.table').waitFor();
  await guest.locator('.table').waitFor();
  await Promise.all([waitLive(host),waitLive(guest)]);
  // Isolate one authenticated WebSocket and leave it connected for five
  // test heartbeats. Browsers respond to server ping with automatic pong.
  const remainsHealthy=await host.evaluate(roomCode=>new Promise(resolve=>{
   const token=localStorage.getItem('pilehead-online-session-'+roomCode);
   const ws=new WebSocket('ws://'+location.host+'/api/pilehead/live');
   let ready=false,closed=false;
   ws.onopen=()=>ws.send(JSON.stringify({type:'auth',code:roomCode,token}));
   ws.onmessage=event=>{try{if(JSON.parse(event.data).type==='ready')ready=true}catch{}};
   ws.onclose=()=>closed=true;
   ws.onerror=()=>closed=true;
   setTimeout(()=>{
    const healthy=ready&&!closed&&ws.readyState===WebSocket.OPEN;
    ws.close();resolve(healthy);
   },1150);
  }),room);
  assert.equal(remainsHealthy,true,'healthy pong responses keep the socket open for 5 cycles');
  await Promise.all([host.locator('.stack-starter-reveal').waitFor({state:'hidden'}),
   guest.locator('.stack-starter-reveal').waitFor({state:'hidden'})]);

  // Room bearer tokens never appear in URLs or the public redacted seat view.
  const guestState=await guest.evaluate(async roomCode=>{
   const bearer=localStorage.getItem('pilehead-online-session-'+roomCode);
   const response=await fetch('/api/pilehead',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+bearer},
    body:JSON.stringify({action:'state',code:roomCode})});
   return{token:bearer,data:await response.json()};
  },room);
  assert.equal(guestState.data.game.players[0].hand,undefined);
  assert.equal(guestState.data.game.players[0].blindSlots,undefined);
  assert.ok(!host.url().includes(guestState.token)&&!guest.url().includes(guestState.token));
  const beforeReaction=guestState.data.revision;

  // A reaction is delivered on the socket and never consumes a turn/revision.
  await guest.locator('[data-do="react"][data-kind="fire"]').click();
  await host.locator('.opponent[data-seat="1"] .stack-reaction-bubble').waitFor();
  const response=await guest.evaluate(async roomCode=>{
   const token=localStorage.getItem('pilehead-online-session-'+roomCode);
   const result=await fetch('/api/pilehead',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({action:'state',code:roomCode})});
   return result.json();
  },room);
  assert.equal(response.revision,beforeReaction,'reactions must not mutate turn revision');
  assert.ok(response.game.reactions?.some(r=>r.seat===1&&r.kind==='fire'));

  // The host's first drawn card was deliberately staged to create a SNAP.
  await host.locator('.hand-area button[data-card]').first().click();
  await host.locator('[data-do="play"]').click();
  await host.locator('.table-actions [data-do="snap"]').waitFor();
  // Despite host SNAP, guest can immediately take the pile and resolve next turn.
  await guest.locator('.table-actions [data-do="take"]').waitFor();
  await guest.locator('.table-actions [data-do="take"]').click();
  await host.locator('.table-actions [data-do="snap"]').waitFor({state:'hidden'});
  assert.ok((await guest.locator('.meta').innerText()).includes('rev'));

  // Reopening an independent browser restores only that seat and the live socket.
  await guest.reload();
  await guest.locator('.table').waitFor();
  await waitLive(guest);

  // Invalid room credentials are rejected instead of joining the broadcast.
  const rejected=await guest.evaluate(roomCode=>new Promise(resolve=>{
   const ws=new WebSocket('ws://'+location.host+'/api/pilehead/live');
   ws.onopen=()=>ws.send(JSON.stringify({type:'auth',code:roomCode,token:'invalid'}));
   ws.onclose=e=>resolve(e.code);
   ws.onerror=()=>{};
  }),room);
  assert.equal(rejected,1008,'websocket handshake must require valid seat credentials');

  // Force a finished mock round to exercise the real, revisioned rematch API.
  const finish=new Promise(resolve=>{
   const handler=message=>{if(message?.type==='finished'&&message.code===room){
    server.off('message',handler);resolve(message);
   }};
   server.on('message',handler);
  });
  server.send({type:'finish',code:room});
  await finish;
  await Promise.all([host.locator('[data-result-root]').waitFor(),
   guest.locator('[data-result-root]').waitFor()]);
  await host.locator('[data-result-root] [data-do="rematch"]').click();
  await Promise.all([host.locator('.online-lobby').waitFor(),guest.locator('.online-lobby').waitFor()]);
  assert.equal(new URL(host.url()).searchParams.get('room'),room,'rematch preserves room');
  assert.deepEqual(errors,[],'two-device browser JavaScript must remain error-free');
  console.log('PASS live STACK: 2 private touch devices, authenticated WS 5-ping survival, reaction without revision, SNAP race, reconnect, rematch');
 }catch(e){console.error(logs.slice(-3000));throw e}
 finally{
  await hostContext?.close().catch(()=>{});
  await guestContext?.close().catch(()=>{});
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
