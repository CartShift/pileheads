#!/usr/bin/env node
// Public-release smoke test. Read-only by default; --rooms opts into two temporary test seats.
import assert from 'node:assert/strict';

const base=(process.env.PILEHEAD_BASE_URL||'https://spark-card-game.vercel.app').replace(/\/+$/,'');
const createRooms=process.argv.includes('--rooms');
const timeout=Number(process.env.PILEHEAD_SMOKE_TIMEOUT_MS||15000);
let checks=0;

async function call(path,init={}){
  let response;
  try{
    response=await fetch(base+path,{...init,redirect:'manual',signal:AbortSignal.timeout(timeout)});
  }catch(e){throw Error('Cannot reach '+path+': '+e.message)}
  if(response.status>=300&&response.status<400){
    throw Error(path+' redirects to '+response.headers.get('location')+'; check deployment protection and public alias');
  }
  if(response.status===401||response.status===403){
    throw Error(path+' is not publicly accessible (HTTP '+response.status+'); check Vercel SSO/deployment protection');
  }
  return response;
}

async function post(body,session,expected=200){
  const response=await call('/api/pilehead',{method:'POST',headers:{
    'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})
  },body:JSON.stringify(body)});
  let json;try{json=await response.json()}catch{throw Error('API returned invalid JSON: '+response.status)}
  assert.equal(response.status,expected,'Unexpected HTTP '+response.status+': '+JSON.stringify(json));
  return json;
}

async function check(label,run){
  await run();checks++;console.log('PASS '+label);
}

try{
  await check('Public game HTML and scripts',async()=>{
    const response=await call('/pilehead/index.html?online=1');
    assert.equal(response.status,200,'Game page returned '+response.status);
    const html=await response.text();
    assert.match(html,/PILEHEAD/i);
    assert.match(html,/src="online\.js"/);
    const csp=response.headers.get('content-security-policy')||'';
    assert.match(csp,/script-src 'self'/,'Missing game page Content-Security-Policy');
    assert.match(csp,/frame-ancestors 'none'/,'Missing clickjacking protection');
  });

  await check('Room API and database health',async()=>{
    const response=await call('/api/pilehead?health=1');
    let body;try{body=await response.json()}catch{throw Error('Health endpoint did not return JSON')}
    assert.equal(response.status,200,'Health endpoint returned '+response.status+': '+JSON.stringify(body));
    assert.equal(body.ok,true,'Room database is not ready');
  });

  if(createRooms){
    console.log('Creating one temporary two-seat room (expires after 24 hours).');
    const host=await post({action:'create',name:'Release QA Host',capacity:2},null,201);
    assert.match(host.code,/^[A-HJ-NP-Z2-9]{8}$/);
    assert.ok(host.session);
    const guest=await post({action:'join',code:host.code,name:'Release QA Guest'},null,201);
    assert.ok(guest.session&&guest.session!==host.session);

    await check('Seat isolation and hidden card privacy',async()=>{
      const state=await post({action:'state',code:host.code},guest.session);
      assert.equal(state.me,1);
      assert.equal(state.game.players[0].hand,undefined);
      assert.equal(state.game.players[0].blindSlots,undefined);
      assert.equal(state.game.players[1].hand.length,3);
      assert.equal(state.game.players[1].blindSlots.length,3);
      assert.equal(state.game.seed,undefined);
      assert.equal(state.game.stock,undefined);
    });

    let started;
    await check('Two-player lobby and host start',async()=>{
      started=await post({action:'start',code:host.code,revision:host.revision},host.session);
      assert.equal(started.game.phase,'play');
      assert.equal(started.game.turn,0);
      assert.ok(started.game.legal.length);
    });

    await check('Out-of-turn move rejected',async()=>{
      const response=await post({action:'move',code:host.code,revision:started.revision,
        move:{type:'take'}},guest.session,400);
      assert.equal(response.ok,false);
    });

    await check('Authoritative move and stale revision protection',async()=>{
      const move=started.game.legal[0];
      const updated=await post({action:'move',code:host.code,revision:started.revision,move},host.session);
      assert.equal(updated.revision,started.revision+1);
      const stale=await post({action:'move',code:host.code,revision:started.revision,move},host.session,409);
      assert.equal(stale.error,'stale_revision');
    });
  }
  console.log('PASS '+checks+' release smoke checks on '+base+(createRooms?' (including room write test)':' (read-only)'));
}catch(e){
  console.error('RELEASE BLOCKED: '+e.message);
  process.exitCode=1;
}
