'use strict';
const assert=require('node:assert/strict');
const Module=require('node:module');
const crypto=require('node:crypto'),originalRandomInt=crypto.randomInt;
let chosenStarter=0,shuffleCalls=0;
// Existing API fixtures stay deterministic; a separate scenario verifies
// that the authoritative server can pick a nonzero starting seat.
crypto.randomInt=(...args)=>{if(args.length===1)return Math.min(chosenStarter,args[0]-1);shuffleCalls++;return originalRandomInt(...args)};
const Engine=require('../dist/pilehead/engine.js');
const rooms=new Map(),members=new Map(),buckets=new Map();
let joinContentionOnce=false,authenticatedReads=0,legacyAuthReads=0;
// Convert synthetic new-room fixtures into true pre-v1.6 52-card games.
// Preserve all dealt slots by replacing each extra BURN with a stock card.
function restoreLegacySkips(g){
 if(!g.omitSkip)return;
 g.stock.push(...Engine.deck(g.version).filter(c=>c.action==='skip'));
 g.omitSkip=false;
}
function oldDeck(g,version){
 restoreLegacySkips(g);
 const zones=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 for(const id of [52,53]){
  const zone=zones.find(z=>z.some(c=>c.id===id));
  assert.ok(zone,'extra BURN '+id+' exists');
  const i=zone.findIndex(c=>c.id===id);
  if(zone===g.stock)zone.splice(i,1);
  else{
   const stockIndex=g.stock.findIndex(c=>c.id<52);
   assert.ok(stockIndex>=0,'legacy replacement stock card exists');
   zone[i]=g.stock.splice(stockIndex,1)[0];
  }
 }
 g.version=version;
 Engine.invariant(g);
 return g;
}
function conflict(){const e=Error('unique key');e.code='23505';throw e}
async function query(sql,args=[]){
 if(sql==='SELECT 1 AS ready')return [{ready:1}];
 if(sql.startsWith('INSERT INTO pilehead_rate_limits')){const n=(buckets.get(args[0])||0)+1;buckets.set(args[0],n);return [{hits:n}]}
 if(sql.startsWith('INSERT INTO pilehead_rooms')){if(rooms.has(args[0]))conflict();
  const r={code:args[0],capacity:args[1],status:'lobby',state:JSON.parse(args[2]),revision:0,expires_at:new Date(Date.now()+86400000)};
  rooms.set(r.code,r);return []}
 if(sql.startsWith('INSERT INTO pilehead_members')&&sql.includes('SELECT')){
  if(joinContentionOnce){joinContentionOnce=false;return []}
  // Regression: Neon/Postgres must resolve both references to room-code parameter $1 as the same type.
  assert.equal((sql.match(/\$1::varchar\(8\)/g)||[]).length,2,'join SQL must cast both room-code references');
  assert.match(sql,/ON CONFLICT \(code,seat\) DO NOTHING/,'simultaneous join should be conflict-safe');
  const [code,name,token,capacity]=args;const current=members.get(code)||[];
  const seat=Array.from({length:capacity},(_,i)=>i).find(i=>!current.some(m=>m.seat===i));
  if(seat===undefined)return [];current.push({seat,display_name:name,token_hash:token,last_seen_at:new Date(),is_away:false});members.set(code,current);
  return [{seat}]
 }
 if(sql.startsWith('INSERT INTO pilehead_members')){const [code,name,token]=args,seat=0;const current=members.get(code)||[];
  if(current.some(x=>x.seat===seat))conflict();current.push({seat,display_name:name,token_hash:token,last_seen_at:new Date(),is_away:false});members.set(code,current);return []}
 if(sql.startsWith('SELECT r.code,r.capacity')){
  authenticatedReads++;
  const r=rooms.get(args[0]);if(!r)return[];
  const member=(members.get(args[0])||[]).find(m=>m.token_hash===args[1]);
  return[{...structuredClone(r),authenticated_seat:member?.seat??null}];
 }
 if(sql.startsWith('SELECT code,capacity'))return rooms.has(args[0])?[structuredClone(rooms.get(args[0]))]:[];
 if(sql.startsWith("SELECT code,revision,state->'reactionEvents'")){
   return (args[0]||[]).filter(code=>rooms.has(code)).map(code=>{
    const r=rooms.get(code);
    return {code,revision:r.revision,reaction_events:r.state.reactionEvents||[],expires_at:r.expires_at};
   });
  }
  if(sql.startsWith("SELECT revision,state->'reactionEvents'")){
  const r=rooms.get(args[0]);return r?[{revision:r.revision,reaction_events:r.state.reactionEvents||[],expires_at:r.expires_at}]:[];
 }
 if(sql.startsWith('SELECT seat,display_name'))return (members.get(args[0])||[]).map(m=>({
  seat:m.seat,display_name:m.display_name,last_seen_at:m.last_seen_at,is_away:m.is_away
 }));
 if(sql.startsWith('UPDATE pilehead_members SET last_seen_at')){
  const [code,seat,away]=args,member=(members.get(code)||[]).find(m=>m.seat===seat);
  assert.ok(member,'presence writes require a joined player');
  member.last_seen_at=new Date();member.is_away=away===true;return [];
 }
 if(sql.startsWith('SELECT seat FROM pilehead_members')&&sql.includes('token_hash')){legacyAuthReads++;return (members.get(args[0])||[]).filter(x=>x.token_hash===args[1]).map(m=>({seat:m.seat}));}
 if(sql.startsWith('SELECT seat FROM pilehead_members'))return (members.get(args[0])||[]).map(m=>({seat:m.seat}));
 if(sql.startsWith('UPDATE pilehead_rooms')&&sql.includes("state=jsonb_set(state,'{reactionEvents}'")){
  const [code,payload]=args,r=rooms.get(code);
  if(!r)return [];
  r.state.reactionEvents=[...(r.state.reactionEvents||[]),JSON.parse(payload)].slice(-24);
  return [{code}];
 }
 if(sql.startsWith('UPDATE pilehead_rooms')){const [state,status,code,rev]=args,r=rooms.get(code);
  if(!r||r.revision!==rev)return [];
  r.state=JSON.parse(state);r.status=status;r.revision++;return [structuredClone(r)]}
 throw Error('Unknown test SQL: '+sql.slice(0,85));
}
const original=Module._load;Module._load=function(spec,...args){
 if(spec==='@neondatabase/serverless')return {neon:()=>({query})};
 return original.call(this,spec,...args);
};
const oldEnv=process.env.PILEHEAD_DATABASE_URL;
process.env.PILEHEAD_DATABASE_URL='postgresql://mock:password@neon.invalid/playtest';
const handler=require('../api/pilehead.js');
async function request(body,session,headers={},method='POST',queryParams={}){
 const req={method,query:queryParams,headers:{host:'example.com',origin:'https://example.com','content-type':'application/json',
  ...(session?{authorization:'Bearer '+session}:{}),...headers},body,socket:{remoteAddress:'127.0.0.1'}};
 const res={statusCode:200,status(n){this.statusCode=n;return this},setHeader(){return this},json(v){return {status:this.statusCode,data:v}}};
 return handler(req,res);
}
async function run(){
 let checks=0;
 const health=await request(null,null,{},'GET',{health:'1'});
 assert.equal(health.status,200);assert.equal(health.data.ok,true);checks++;
 const host=await request({action:'create',capacity:2,name:'Host'});
 assert.equal(host.status,201);const {code,session:hostToken}=host.data;assert.match(code,/^[A-HJ-NP-Z2-9]{8}$/);
 assert.equal(host.data.me,0);assert.equal(host.data.game.phase,'setup');checks++;
 assert.equal(shuffleCalls,51,'online two-player deal uses independent secure draws');
 Engine.invariant(rooms.get(code).state);
 assert.equal(rooms.get(code).state.stock.length,34);checks++;
 const oversized=await request({action:'state',code,padding:'x'.repeat(4096)},hostToken);
 assert.equal(oversized.status,413);checks++;
 const oversizedRaw=await request(JSON.stringify({action:'state',code})+' '.repeat(4096),hostToken);
 assert.equal(oversizedRaw.status,413);checks++;
 const wrongType=await request({action:'state',code},hostToken,{'content-type':'application/jsonp'});
 assert.equal(wrongType.status,415);checks++;
 const unauth=await request({action:'state',code});assert.equal(unauth.status,401);checks++;
 const early=await request({action:'start',code,revision:0},hostToken);
 assert.equal(early.status,409,JSON.stringify(early));checks++;
 const guest=await request({action:'join',code,name:'Guest'});
 assert.equal(guest.status,201);assert.equal(guest.data.me,1);checks++;
 const guestToken=guest.data.session;
 assert.equal(guest.data.members.find(m=>m.seat===0).presence,'online');checks++;
 const away=await request({action:'presence',code,away:true},guestToken);
 assert.equal(away.status,200);
 assert.equal(rooms.get(code).revision,0,'presence must not advance room revision');
 const awayView=await request({action:'state',code},hostToken);
 assert.equal(awayView.data.members.find(m=>m.seat===1).presence,'away');checks++;
 const guestMember=members.get(code).find(m=>m.seat===1);
 guestMember.last_seen_at=new Date(Date.now()-30000);
 const offlineView=await request({action:'state',code},hostToken);
 assert.equal(offlineView.data.members.find(m=>m.seat===1).presence,'offline');checks++;
 const heart=await request({action:'state',code,heartbeat:true},guestToken);
 assert.equal(heart.status,200);
 assert.equal(heart.data.members.find(m=>m.seat===1).presence,'online');
 assert.equal(rooms.get(code).revision,0);checks++;
 const beforeAuthReads=authenticatedReads;
 const state=await request({action:'state',code},guestToken);
 assert.equal(authenticatedReads-beforeAuthReads,1,'state loads room and seat in one query');
 assert.equal(legacyAuthReads,0,'no separate token lookup');
 const wrongSeat=await request({action:'state',code},'x'.repeat(43));
 assert.equal(wrongSeat.status,403);
 assert.equal(wrongSeat.data.game,undefined,'invalid seat receives no state');
 assert.equal(state.status,200);
 assert.equal(state.data.game.players[0].hand,undefined);
 assert.equal(state.data.game.players[0].blindSlots,undefined);
 assert.equal(state.data.game.players[1].hand.length,3);
 assert.equal(state.data.game.players[1].blindSlots.length,3);
 assert.equal(state.data.game.seed,undefined);assert.equal(state.data.game.stock,undefined);checks++;
 const cross=await request({action:'state',code:'ABCDEFGH'},guestToken);
 assert.equal(cross.status,404);checks++;
 const quotaKey=crypto.createHash('sha256').update(['seat-write',code,1,Math.floor(Date.now()/60000)].join(':')).digest('hex');
 buckets.set(quotaKey,300);
 const throttled=await request({action:'presence',code,away:true},guestToken);
 assert.equal(throttled.status,429);assert.equal(rooms.get(code).revision,0);checks++;
 buckets.delete(quotaKey);
 const startGuest=await request({action:'start',code,revision:0},guestToken);assert.equal(startGuest.status,403);checks++;
 // Both players explicitly finish choosing their three face-up cards.
 const hostReady=await request({action:'ready',code,revision:0,ready:true},hostToken);
 assert.equal(hostReady.status,200);assert.equal(hostReady.data.game.setupReady[0],true);checks++;
 const premature=await request({action:'start',code,revision:1},hostToken);
 assert.equal(premature.status,409);checks++;
 const guestReady=await request({action:'ready',code,revision:1,ready:true},guestToken);
 assert.equal(guestReady.status,200);assert.equal(guestReady.data.game.setupReady[1],true);checks++;
 const start=await request({action:'start',code,revision:2},hostToken);
 assert.equal(start.status,200);assert.equal(start.data.game.phase,'play');checks++;
 // Social reactions are authenticated, redacted and never consume a move revision.
 const reactionRevision=rooms.get(code).revision;
 const reaction=await request({action:'react',code,kind:'fire'},guestToken);
 assert.equal(reaction.status,200,JSON.stringify(reaction));
 assert.equal(reaction.data.reaction.seat,1);
 assert.equal(reaction.data.reaction.kind,'fire');
 assert.equal(rooms.get(code).revision,reactionRevision);
 const reacted=await request({action:'state',code},hostToken);
 assert.ok(reacted.data.game.reactions.some(r=>r.id===reaction.data.reaction.id));
 const synced=await handler.realtimeSnapshot(code);
 assert.equal(synced.revision,reactionRevision);
 assert.equal(synced.reactions.length,1);
 const batch=await handler.realtimeSnapshots([code,'ABCDEFGH']);
  assert.equal(batch.length,1);assert.equal(batch[0].code,code);
  assert.equal(batch[0].revision,reactionRevision);
  assert.equal(batch[0].reactions[0].id,reaction.data.reaction.id);checks++;
  const wsSeat=await handler.realtimeAuth(code,hostToken);
 assert.equal(wsSeat.seat,0);
 assert.deepEqual(wsSeat.reactions.map(r=>r.id),[reaction.data.reaction.id]);
 const invalidReaction=await request({action:'react',code,kind:'script'},guestToken);
 assert.equal(invalidReaction.status,400);
 assert.equal((await request({action:'react',code,kind:'fire'})).status,401);
 checks++;
 assert.equal(start.data.game.starterSeat,0);
 assert.equal(start.data.game.starterReason,'draw');
 assert.ok(start.data.game.startedAt>0);
 chosenStarter=1;
 const lottery=await request({action:'create',humans:2,bots:0,name:'Lottery host'});
 const lotteryFriend=await request({action:'join',code:lottery.data.code,name:'Lottery guest'});
 assert.equal(lottery.data.game.starterSeat,1);
 assert.equal((await request({action:'ready',code:lottery.data.code,revision:0,ready:true},lottery.data.session)).status,200);
 assert.equal((await request({action:'ready',code:lottery.data.code,revision:1,ready:true},lotteryFriend.data.session)).status,200);
 const firstTurn=await request({action:'start',code:lottery.data.code,revision:2},lottery.data.session);
 assert.equal(firstTurn.status,200);
 assert.equal(firstTurn.data.game.turn,1);assert.equal(firstTurn.data.game.starterSeat,1);checks++;
 chosenStarter=0;

 // A voluntary pickup is valid on a normal turn even with playable cards.
 // This is a separate room to keep the original turn/CAS fixtures intact.
 const strategy=await request({action:'create',humans:2,bots:0,name:'Strategy host'});
 const strategyCode=strategy.data.code,strategyToken=strategy.data.session;
 const strategyFriend=await request({action:'join',code:strategyCode,name:'Strategy friend'});
 assert.equal((await request({action:'ready',code:strategyCode,revision:0,ready:true},strategyToken)).status,200);
 assert.equal((await request({action:'ready',code:strategyCode,revision:1,ready:true},strategyFriend.data.session)).status,200);
 assert.equal((await request({action:'start',code:strategyCode,revision:2},strategyToken)).status,200);
 const strategyRoom=rooms.get(strategyCode),strategyGame=strategyRoom.state;
 strategyGame.pile.push(strategyGame.stock.pop());strategyGame.limit={type:'min',value:1};
 Engine.invariant(strategyGame);
 const strategicView=await request({action:'state',code:strategyCode},strategyToken);
 assert.equal(strategicView.status,200);
 assert.ok(strategicView.data.game.legal.some(o=>o.type==='play'));
 assert.ok(strategicView.data.game.legal.some(o=>o.type==='take'));checks++;
 const handBefore=strategyGame.people[0].hand.length;
 const strategicTake=await request({action:'move',code:strategyCode,revision:3,move:{type:'take'}},strategyToken);
 assert.equal(strategicTake.status,200,JSON.stringify(strategicTake));
 assert.equal(strategicTake.data.game.turn,1);
 assert.equal(strategicTake.data.game.pile.length,0);
 assert.equal(strategyRoom.state.people[0].hand.length,handBefore+1);
 assert.equal(strategyRoom.state.people[0].pickups,1);
 assert.equal(strategyRoom.state.limit,null);
 Engine.invariant(strategyRoom.state);checks++;
 const repeatStrategicTake=await request({action:'move',code:strategyCode,revision:4,move:{type:'take'}},strategyToken);
 assert.equal(repeatStrategicTake.status,400);
 assert.equal(repeatStrategicTake.data.error,'illegal_move');checks++;
 const wrong=await request({action:'move',code,revision:3,move:{type:'take'}},guestToken);
 assert.equal(wrong.status,400);checks++;
 const illegal=await request({action:'move',code,revision:3,move:{type:'play',source:'hand',ids:[999]}},hostToken);
 assert.equal(illegal.status,400);checks++;
 const current=await request({action:'state',code},hostToken);
 const legal=current.data.game.legal[0];assert.ok(legal);
 const move=await request({action:'move',code,revision:current.data.revision,move:legal},hostToken);
 assert.equal(move.status,200);assert.equal(move.data.revision,4);checks++;
 const stale=await request({action:'move',code,revision:3,move:legal},hostToken);
 assert.equal(stale.status,409);checks++;

 // Force a deterministic DUMP action into the active player's hand without changing card ownership.
 const seeded=rooms.get(code).state,actor=seeded.turn,receiver=(actor+1)%2;
 // This fixture explicitly stages a DUMP; a randomly matched draw may have
 // opened the unrelated, time-limited SNAP invitation on the preceding turn.
 seeded.followUp=null;
 const zones=[seeded.stock,seeded.pile,seeded.ashes,...seeded.people.flatMap(p=>[p.hand,p.up,p.down])];
 const source=zones.find(z=>z.some(c=>c.action==='dump'));assert.ok(source);
 const ix=source.findIndex(c=>c.action==='dump'),dump=source[ix],prior=seeded.people[actor].hand[0];
 assert.ok(prior);source[ix]=prior;seeded.people[actor].hand[0]=dump;Engine.invariant(seeded);
 // Keep this original test on the no-counter branch regardless of the random deal.
 const spare=seeded.people[receiver].hand.find(c=>c.action==='dump');
 if(spare){seeded.people[receiver].hand=seeded.people[receiver].hand.filter(c=>c.id!==spare.id);seeded.stock.push(spare)}
 Engine.invariant(seeded);
 const receiverBefore=seeded.people[receiver].hand.length,pileBefore=seeded.pile.length;
 const actorToken=actor===0?hostToken:guestToken;
 const dumped=await request({action:'move',code,revision:rooms.get(code).revision,
  move:{type:'play',source:'hand',ids:[dump.id]}},actorToken);
 assert.equal(dumped.status,200,JSON.stringify(dumped));
 assert.equal(dumped.data.game.turn,actor);assert.equal(dumped.data.game.pile.length,0);
 const publicLast=dumped.data.game.events.at(-1);
 assert.equal(publicLast.action,'dump');
 assert.equal(publicLast.target,receiver);assert.equal(publicLast.takenCount,pileBefore);
 assert.equal(rooms.get(code).state.people[receiver].hand.length,receiverBefore+pileBefore);
 assert.ok(rooms.get(code).state.ashes.some(c=>c.id===dump.id),'DUMP must be burned');
 assert.ok(!rooms.get(code).state.people[receiver].hand.some(c=>c.id===dump.id));
 assert.equal(dumped.data.game.players[receiver].hand,undefined);
 Engine.invariant(rooms.get(code).state);checks++;

 // Regression: two real human sessions, both explicit recipient choices, server-owned decision.
 for(const counter of [true,false]){
  const created=await request({action:'create',humans:2,bots:0,name:'Dump attacker'});
  assert.equal(created.status,201);
  const c=created.data.code,a=created.data.session;
  const joined=await request({action:'join',code:c,name:'Dump defender'});
  assert.equal(joined.status,201);const b=joined.data.session;
  assert.equal((await request({action:'ready',code:c,revision:0,ready:true},a)).status,200);
  assert.equal((await request({action:'ready',code:c,revision:1,ready:true},b)).status,200);
  assert.equal((await request({action:'start',code:c,revision:2},a)).status,200);
  const g=rooms.get(c).state,zones=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
  const place=(dest,id)=>{const z=zones.find(x=>x.some(card=>card.id===id)),i=z.findIndex(card=>card.id===id);
   [dest[0],z[i]]=[z[i],dest[0]]};
  place(g.people[0].hand,50);place(g.people[1].hand,51);
  const pi=g.stock.findIndex(card=>card.kind==='number');
  const transferred=g.stock.splice(pi,1)[0];g.pile.push(transferred);Engine.invariant(g);
  const attack=await request({action:'move',code:c,revision:3,move:{type:'play',source:'hand',ids:[50]}},a);
  assert.equal(attack.status,200,JSON.stringify(attack));
  assert.deepEqual(attack.data.game.pendingCounter,{seat:1,attacker:0,count:1});
  assert.deepEqual(attack.data.game.legal,[]);assert.equal(attack.data.game.players[1].hand,undefined);
  const view=await request({action:'state',code:c},b);
  assert.equal(view.status,200);assert.equal(view.data.game.turn,1);
  assert.deepEqual(view.data.game.legal,[{type:'counter-dump',source:'hand',ids:[51]},{type:'counter-pass'}]);
  assert.ok(view.data.game.players[1].hand.some(card=>card.id===transferred.id));
  const wrong=await request({action:'move',code:c,revision:4,move:{type:'counter-pass'}},a);
  assert.equal(wrong.status,400);
  const blocked=await request({action:'move',code:c,revision:4,move:{type:'take'}},b);
  assert.equal(blocked.status,400);
  const forged=await request({action:'move',code:c,revision:4,move:{type:'counter-dump',source:'hand',ids:[50]}},b);
  assert.equal(forged.status,400);
  const decision=view.data.game.legal[counter?0:1];
  const response=await request({action:'move',code:c,revision:4,move:decision},b);
  assert.equal(response.status,200,JSON.stringify(response));assert.equal(response.data.game.pendingCounter,null);
  assert.equal(response.data.game.turn,counter?1:0);
  const final=rooms.get(c).state;
  assert.ok(final.people[counter?0:1].hand.some(card=>card.id===transferred.id));
  assert.ok(final.ashes.some(card=>card.id===50));
  assert.equal(final.ashes.some(card=>card.id===51),counter);
  assert.equal(final.people[1].hand.some(card=>card.id===51),!counter);
  const replay=await request({action:'move',code:c,revision:4,move:decision},b);
  assert.equal(replay.status,409);Engine.invariant(final);checks++;
 }

 // In three-player online games, the actor chooses any active opponent, not the next seat.
 const choiceRoom=await request({action:'create',humans:1,bots:2,name:'Chooser'});
 assert.equal(choiceRoom.status,201);
 const choiceCode=choiceRoom.data.code,choiceToken=choiceRoom.data.session;
 const choiceReady=await request({action:'ready',code:choiceCode,revision:0,ready:true},choiceToken);
 assert.equal(choiceReady.status,200);
 const choiceStart=await request({action:'start',code:choiceCode,revision:1},choiceToken);
 assert.equal(choiceStart.status,200);
 const cg=rooms.get(choiceCode).state;
 const available=[cg.stock,cg.pile,cg.ashes,...cg.people.flatMap(p=>[p.hand,p.up,p.down])];
 const dsrc=available.find(z=>z.some(c=>c.action==='dump')),di=dsrc.findIndex(c=>c.action==='dump');
 const dc=dsrc[di],replaced=cg.people[0].hand[0];
 dsrc[di]=replaced;cg.people[0].hand[0]=dc;
 const pi=cg.stock.findIndex(c=>c.kind==='number');
 cg.pile.push(cg.stock.splice(pi,1)[0]);
 Engine.invariant(cg);
 const missing=await request({action:'move',code:choiceCode,revision:2,
  move:{type:'play',source:'hand',ids:[dc.id]}},choiceToken);
 assert.equal(missing.status,400,'multiple opponents require choosing DUMP target');
 const ownTarget=await request({action:'move',code:choiceCode,revision:2,
  move:{type:'play',source:'hand',ids:[dc.id],target:0}},choiceToken);
 assert.equal(ownTarget.status,400,'cannot dump onto yourself');
 const otherDump=cg.people[2].hand.find(c=>c.action==='dump');
 if(otherDump){cg.people[2].hand=cg.people[2].hand.filter(c=>c.id!==otherDump.id);cg.stock.push(otherDump)}
 Engine.invariant(cg);
 const chosenBefore=cg.people[2].hand.length,unselectedBefore=cg.people[1].hand.length;
 const chosen=await request({action:'move',code:choiceCode,revision:2,
  move:{type:'play',source:'hand',ids:[dc.id],target:2}},choiceToken);
 assert.equal(chosen.status,200,JSON.stringify(chosen));
 assert.equal(chosen.data.game.events.at(-1).target,2);
 assert.equal(chosen.data.game.turn,0);
 const chosenGame=rooms.get(choiceCode).state;
 assert.equal(chosenGame.people[2].hand.length,chosenBefore+1);
 assert.equal(chosenGame.people[1].hand.length,unselectedBefore);
 Engine.invariant(chosenGame);checks++;

 // A face-down DUMP is revealed before choosing a victim; other moves are blocked meanwhile.
 const blindAreas=[chosenGame.stock,chosenGame.pile,chosenGame.ashes,...chosenGame.people.flatMap(p=>[p.hand,p.up,p.down])];
 const secondSource=blindAreas.find(z=>z.some(c=>c.action==='dump')),secondIndex=secondSource.findIndex(c=>c.action==='dump');
 const secondDump=secondSource[secondIndex],blindOriginal=chosenGame.people[0].down[0];
 secondSource[secondIndex]=blindOriginal;chosenGame.people[0].down[0]=secondDump;
 chosenGame.ashes.push(...chosenGame.people[0].hand.splice(0),...chosenGame.people[0].up.splice(0),...chosenGame.stock.splice(0));
 const numbered=chosenGame.ashes.findIndex(c=>c.kind==='number');
 chosenGame.pile.push(chosenGame.ashes.splice(numbered,1)[0]);
 Engine.invariant(cg);
 const blind=await request({action:'move',code:choiceCode,revision:3,
  move:{type:'play',source:'down',index:0}},choiceToken);
 assert.equal(blind.status,200,JSON.stringify(blind));
 assert.equal(blind.data.game.pendingDump.seat,0);
 assert.equal(blind.data.game.blindReveal.seat,0);
 assert.equal(blind.data.game.blindReveal.card.action,'dump');
 assert.equal(blind.data.game.blindReveal.card.id,undefined,'never expose flipped card identity');
 const anotherView=await request({action:'state',code:choiceCode},choiceToken);
 assert.equal(anotherView.data.game.blindReveal.card.action,'dump');checks++;
 const blocked=await request({action:'move',code:choiceCode,revision:4,
  move:{type:'take'}},choiceToken);
 assert.equal(blocked.status,400);
 const badRecipient=await request({action:'dump-target',code:choiceCode,revision:4,target:0},choiceToken);
 assert.equal(badRecipient.status,400);
 const resolved=await request({action:'dump-target',code:choiceCode,revision:4,target:2},choiceToken);
 assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(resolved.data.game.pendingDump,null);
 assert.equal(resolved.data.game.events.at(-1).target,2);
 assert.equal(resolved.data.game.events.at(-1).takenCount,1);
 Engine.invariant(rooms.get(choiceCode).state);checks++;

 const other=await request({action:'create',capacity:2,name:'Other'});
 const forbidden=await request({action:'state',code:other.data.code},hostToken);
 assert.equal(forbidden.status,403);checks++;
 const game=rooms.get(code).state;assert.equal(Engine.invariant(game),true);checks++;

 // Hybrid room: two people and one bot share the table; bots never receive a session.
 const hybrid=await request({action:'create',humans:2,bots:1,name:'Hybrid Host',roundLimit:3});
 assert.equal(hybrid.status,201,JSON.stringify(hybrid));
 const hybridCode=hybrid.data.code,hybridHost=hybrid.data.session;
 assert.deepEqual(hybrid.data.game.botSeats,[2]);
 assert.equal(hybrid.data.game.round,1);
 assert.equal(hybrid.data.game.roundLimit,3);
 assert.equal(hybrid.data.humanCount,2);assert.equal(hybrid.data.botCount,1);
 assert.deepEqual(hybrid.data.game.setupReady,[false,false,true]);checks++;
 joinContentionOnce=true; // Simulate another join claiming the previously free seat.
 const second=await request({action:'join',code:hybridCode,name:'Hybrid Friend'});
 assert.equal(second.status,201);assert.equal(second.data.me,1);
 const hybridFriend=second.data.session;
 const noThirdSeat=await request({action:'join',code:hybridCode,name:'Intruder'});
 assert.equal(noThirdSeat.status,409);assert.equal(noThirdSeat.data.error,'full');checks++;
 assert.equal(second.data.game.players[2].hand,undefined,'bot hand remains secret');
 assert.equal(second.data.game.players[0].hand,undefined,'other human hand remains secret');checks++;
 const hybridReady0=await request({action:'ready',code:hybridCode,revision:0,ready:true},hybridHost);
 const hybridReady1=await request({action:'ready',code:hybridCode,revision:1,ready:true},hybridFriend);
 assert.equal(hybridReady0.status,200);assert.equal(hybridReady1.status,200);checks++;
 const hybridStart=await request({action:'start',code:hybridCode,revision:2},hybridHost);
 assert.equal(hybridStart.status,200);assert.equal(hybridStart.data.game.phase,'play');checks++;
 // A ready bot SLAM reports public eligibility without leaking a hidden card.
 const staged=rooms.get(hybridCode).state,backup=structuredClone(staged);
 const regions=[staged.stock,staged.pile,staged.ashes,...staged.people.flatMap(p=>[p.hand,p.up,p.down])];
 const eightIds=Engine.deck().filter(c=>c.rank===8).map(c=>c.id);
 const relocate=(dest,id)=>{const from=regions.find(z=>z.some(c=>c.id===id));const idx=from.findIndex(c=>c.id===id);dest.push(from.splice(idx,1)[0])};
 staged.stock.push(...staged.people[2].hand.splice(0));
 for(const id of eightIds)relocate(staged.people[2].hand,id);
 relocate(staged.pile,Engine.deck().find(c=>c.rank===3).id);
 staged.turn=0;staged.slamOpen=false;Engine.invariant(staged);
 const botThreat=await request({action:'state',code:hybridCode},hybridHost);
 assert.equal(botThreat.data.game.botSlamReady,true);
 assert.equal(botThreat.data.game.players[2].hand,undefined);
 assert.equal(botThreat.data.game.players[2].handCount,4);
 rooms.get(hybridCode).state=backup;checks++;
 const prematureBot=await request({action:'advance',code:hybridCode,revision:3},hybridHost);
 assert.equal(prematureBot.status,409);assert.equal(prematureBot.data.error,'not_bot_turn');checks++;
 // Put the turn on a bot; server chooses from its hidden hand and commits exactly one move.
 const hybridRecord=rooms.get(hybridCode);
 hybridRecord.state.turn=2;Engine.invariant(hybridRecord.state);
 const botMove=await request({action:'advance',code:hybridCode,revision:3},hybridFriend);
 assert.equal(botMove.status,200,JSON.stringify(botMove));
 assert.equal(botMove.data.game.moves,1);assert.equal(botMove.data.revision,4);
 assert.equal(botMove.data.game.players[2].hand,undefined);
 assert.equal(typeof botMove.data.game.botSlamReady,'boolean');
 assert.equal(botMove.data.game.players[0].hand,undefined);
 Engine.invariant(rooms.get(hybridCode).state);checks++;
 const advanceAgainStale=await request({action:'advance',code:hybridCode,revision:3},hybridHost);
 assert.equal(advanceAgainStale.status,409);checks++;
 // Arrange a valid terminal state while conserving all 54 cards.
 const ended=rooms.get(hybridCode),g=ended.state;
 for(const seat of [0,2]){
  const player=g.people[seat];
  g.ashes.push(...player.hand.splice(0),...player.up.splice(0),...player.down.splice(0));
  player.out=true;
 }
 g.finishedOrder=[0,2];g.loser=1;g.phase='over';g.slamOpen=false;
 ended.status='finished';
 Engine.invariant(g);
 const vote=await request({action:'rematch',code:hybridCode,revision:4},hybridFriend);
 assert.equal(vote.status,200);assert.equal(vote.data.game.phase,'over');assert.deepEqual(vote.data.game.rematchReady,[false,true]);
 const cancel=await request({action:'rematch-ready',ready:false,code:hybridCode,revision:5},hybridFriend);
 assert.equal(cancel.status,200);assert.deepEqual(cancel.data.game.rematchReady,[false,false]);
 const hostVote=await request({action:'rematch-ready',ready:true,code:hybridCode,revision:6},hybridHost);
 assert.equal(hostVote.status,200);assert.equal(hostVote.data.game.phase,'over');
 const replay=await request({action:'rematch',code:hybridCode,revision:7},hybridFriend);
 assert.equal(replay.status,200,JSON.stringify(replay));
 assert.equal(replay.data.code,hybridCode);
 assert.equal(replay.data.revision,8);assert.deepEqual(replay.data.game.rematchReady,[false,false]);
 assert.equal(replay.data.game.phase,'setup');
 assert.equal(replay.data.game.round,2);
 assert.equal(replay.data.game.roundLimit,3);
 assert.equal(replay.data.game.standings.completedRounds,1);
 assert.deepEqual(replay.data.game.standings.seats.map(x=>x.points),[2,0,1]);
 assert.deepEqual(replay.data.game.botSeats,[2]);
 assert.deepEqual(replay.data.game.setupReady,[false,false,true]);
 assert.equal(replay.data.game.starterSeat,0,'first player out gets the next start');
 assert.equal(replay.data.game.starterReason,'winner');checks++;
 assert.equal(replay.data.game.players[2].hand,undefined);checks++;
 const oldTokenStillValid=await request({action:'state',code:hybridCode},hybridHost);
 assert.equal(oldTokenStillValid.status,200);
 assert.equal(oldTokenStillValid.data.game.round,2);
 assert.deepEqual(oldTokenStillValid.data.game.standings,replay.data.game.standings);
 assert.equal(oldTokenStillValid.data.members.length,2);checks++;
 const staleReplay=await request({action:'rematch',code:hybridCode,revision:4},hybridHost);
 assert.equal(staleReplay.status,409);checks++;
 const tooEarlyReplay=await request({action:'rematch',code:hybridCode,revision:8},hybridFriend);
 assert.equal(tooEarlyReplay.status,409);
 assert.equal(tooEarlyReplay.data.error,'game_not_finished');checks++;
 // Finish the next round through a real authenticated move and verify CAS persists the score before rematch.
 const finalGame=rooms.get(hybridCode).state;
 const pool=[...finalGame.stock.splice(0),...finalGame.pile.splice(0),...finalGame.ashes.splice(0),...finalGame.people.flatMap(p=>[...p.hand.splice(0),...p.up.splice(0),...p.down.splice(0)])];
 const takeNumber=()=>pool.splice(pool.findIndex(c=>c.kind==='number'),1)[0];
 finalGame.people[0].hand.push(takeNumber());finalGame.people[1].hand.push(takeNumber());
 finalGame.ashes.push(...pool);finalGame.people[2].out=true;finalGame.finishedOrder=[2];finalGame.phase='play';finalGame.turn=1;finalGame.limit=null;finalGame.slamOpen=false;finalGame.loser=null;
 rooms.get(hybridCode).status='playing';Engine.invariant(finalGame);
 const terminalCommand={action:'move',code:hybridCode,revision:8,move:{type:'play',source:'hand',ids:[finalGame.people[1].hand[0].id]}};
 const terminal=await request(terminalCommand,hybridFriend);
 assert.equal(terminal.status,200,JSON.stringify(terminal));assert.equal(terminal.data.game.phase,'over');
 assert.equal(terminal.data.game.standings.completedRounds,2);assert.deepEqual(terminal.data.game.standings.seats.map(x=>x.points),[2,1,3]);
 assert.equal(rooms.get(hybridCode).state.roomStandings.completedRounds,2);
 assert.equal((await request(terminalCommand,hybridFriend)).status,409);
 const nextVote=await request({action:'rematch',code:hybridCode,revision:9},hybridHost);
 assert.equal(nextVote.data.game.phase,'over');
 const third=await request({action:'rematch',code:hybridCode,revision:10},hybridFriend);
 assert.equal(third.status,200);assert.equal(third.data.game.round,3);
 assert.equal(third.data.game.roundLimit,3);
 assert.deepEqual(third.data.game.standings,terminal.data.game.standings);checks++;
 const soloHybrid=await request({action:'create',humans:1,bots:2,name:'Solo vs bots'});
 assert.equal(soloHybrid.status,201);assert.deepEqual(soloHybrid.data.game.botSeats,[1,2]);checks++;
 const soloReady=await request({action:'ready',code:soloHybrid.data.code,revision:0,ready:true},soloHybrid.data.session);
 assert.equal(soloReady.status,200);
 const soloStart=await request({action:'start',code:soloHybrid.data.code,revision:1},soloHybrid.data.session);
 assert.equal(soloStart.status,200);assert.equal(soloStart.data.game.phase,'play');checks++;
 const tooMany=await request({action:'create',humans:3,bots:3,name:'Invalid'});
 assert.equal(tooMany.status,400);assert.equal(tooMany.data.error,'invalid_capacity');checks++;


 // SNAP is a genuine race: the next player can act without waiting.
 const snapRoom=await request({action:'create',humans:2,bots:0,name:'Snap host'});
 const snapCode=snapRoom.data.code,snapHost=snapRoom.data.session;
 const snapGuest=await request({action:'join',code:snapCode,name:'Snap guest'});
 const snapGuestToken=snapGuest.data.session;
 assert.equal((await request({action:'ready',code:snapCode,revision:0,ready:true},snapHost)).status,200);
 assert.equal((await request({action:'ready',code:snapCode,revision:1,ready:true},snapGuestToken)).status,200);
 assert.equal((await request({action:'start',code:snapCode,revision:2},snapHost)).status,200);
 const snapGame=rooms.get(snapCode).state,snapRank=5,snapIDs=Engine.deck().filter(c=>c.rank===snapRank).slice(0,2).map(c=>c.id);
 const snapZones=[snapGame.stock,snapGame.pile,snapGame.ashes,...snapGame.people.flatMap(p=>[p.hand,p.up,p.down])];
 const placeSnap=(a,i,id)=>{const b=snapZones.find(z=>z.some(c=>c.id===id)),j=b.findIndex(c=>c.id===id),old=a[i];a[i]=b[j];b[j]=old};
 placeSnap(snapGame.people[0].hand,0,snapIDs[0]);placeSnap(snapGame.stock,snapGame.stock.length-1,snapIDs[1]);
 Engine.invariant(snapGame);
 const snapMade=await request({action:'move',code:snapCode,revision:3,move:{type:'play',source:'hand',ids:[snapIDs[0]]}},snapHost);
 assert.equal(snapMade.status,200,JSON.stringify(snapMade));
 assert.equal(snapMade.data.game.snapUntil,undefined);
 assert.equal(snapMade.data.game.snapSeat,undefined);
 assert.equal(snapMade.data.game.followup.length,1);
 assert.ok(snapMade.data.game.legal.length===0,'actor has no normal turn after drawing');
 const guestCanAct=await request({action:'state',code:snapCode},snapGuestToken);
 assert.ok(guestCanAct.data.game.legal.length,'other player can act immediately during SNAP opportunity');checks++;
 // No artificial time limit: stale legacy deadline has no effect.
 rooms.get(snapCode).state.followUp.expiresAt=Date.now()-60000;
 const snapPlayed=await request({action:'move',code:snapCode,revision:4,move:snapMade.data.game.followup[0]},snapHost);
 assert.equal(snapPlayed.status,200,JSON.stringify(snapPlayed));
 assert.equal(snapPlayed.data.game.events.at(-1).type,'followup');
 assert.equal(snapPlayed.data.game.players[1].hand,undefined);
 assert.equal(snapPlayed.data.game.turn,1,'SNAP does not steal the next turn');checks++;
 const snapAfterMove=Engine.options(rooms.get(snapCode).state,1)[0];
 const snapContinued=await request({action:'move',code:snapCode,revision:5,move:snapAfterMove},snapGuestToken);
 assert.equal(snapContinued.status,200,JSON.stringify(snapContinued));checks++;

 // If the next player gets their move committed first, SNAP is lost immediately.
 const raceRoom=await request({action:'create',humans:2,bots:0,name:'Race host'});
 const raceCode=raceRoom.data.code,raceHost=raceRoom.data.session;
 const raceGuest=await request({action:'join',code:raceCode,name:'Race guest'});
 assert.equal((await request({action:'ready',code:raceCode,revision:0,ready:true},raceHost)).status,200);
 assert.equal((await request({action:'ready',code:raceCode,revision:1,ready:true},raceGuest.data.session)).status,200);
 assert.equal((await request({action:'start',code:raceCode,revision:2},raceHost)).status,200);
 const raceGame=rooms.get(raceCode).state;
 const raceZones=[raceGame.stock,raceGame.pile,raceGame.ashes,...raceGame.people.flatMap(p=>[p.hand,p.up,p.down])];
 const reposition=(dest,i,id)=>{
  const zone=raceZones.find(z=>z.some(c=>c.id===id)),j=zone.findIndex(c=>c.id===id),old=dest[i];
  dest[i]=zone[j];zone[j]=old;
 };
 const raceIDs=Engine.deck().filter(c=>c.kind==='number'&&c.rank===6).slice(0,2).map(c=>c.id);
 reposition(raceGame.people[0].hand,0,raceIDs[0]);
 reposition(raceGame.stock,raceGame.stock.length-1,raceIDs[1]);
 Engine.invariant(raceGame);
 const raceOpen=await request({action:'move',code:raceCode,revision:3,move:{type:'play',source:'hand',ids:[raceIDs[0]]}},raceHost);
 assert.equal(raceOpen.status,200);
 assert.equal(raceOpen.data.game.followup.length,1);
 const raceMove=Engine.options(rooms.get(raceCode).state,1)[0];
 const guestWins=await request({action:'move',code:raceCode,revision:4,move:raceMove},raceGuest.data.session);
 assert.equal(guestWins.status,200,JSON.stringify(guestWins));
 assert.notEqual(rooms.get(raceCode).state.followUp?.seat,0,'next action ends the previous actor’s SNAP, even if the next action opens its own');
 const outdatedSnap=await request({action:'move',code:raceCode,revision:4,move:raceOpen.data.game.followup[0]},raceHost);
 assert.equal(outdatedSnap.status,409,'concurrent SNAP must respect revision race');
 const tooLateSnap=await request({action:'move',code:raceCode,revision:5,move:raceOpen.data.game.followup[0]},raceHost);
 assert.equal(tooLateSnap.status,400,'SNAP cannot be played after the next action');checks++;

 {
 // In-progress rooms from v1.3 remain readable after the v1.4 deploy.
 const previous=await request({action:'create',humans:2,bots:0,name:'Previous release'});
 oldDeck(rooms.get(previous.data.code).state,'pilehead-1.3.0');
 const previousRead=await request({action:'state',code:previous.data.code},previous.data.session);
 assert.equal(previousRead.status,200);
 assert.equal(previousRead.data.game.rulesVersion,'pilehead-1.3.0');checks++;
 // A live 1.2 room must survive the v1.4 deploy without changing its seat tokens.
 const legacy=await request({action:'create',humans:2,bots:1,name:'Legacy host'});
 const legacyCode=legacy.data.code,legacyToken=legacy.data.session;
 const legacyGuest=await request({action:'join',code:legacyCode,name:'Friend'});
 assert.equal(legacyGuest.status,201);
 const oldRoom=rooms.get(legacyCode);
 oldDeck(oldRoom.state,'pilehead-1.2.0');
 const readOld=await request({action:'state',code:legacyCode},legacyToken);
 assert.equal(readOld.status,200,JSON.stringify(readOld));
 assert.equal(readOld.data.game.rulesVersion,'pilehead-1.2.0');
 assert.equal(readOld.data.game.players[1].hand,undefined);checks++;
 assert.equal((await request({action:'ready',code:legacyCode,revision:0,ready:true},legacyToken)).status,200);
 assert.equal((await request({action:'ready',code:legacyCode,revision:1,ready:true},legacyGuest.data.session)).status,200);
 assert.equal((await request({action:'start',code:legacyCode,revision:2},legacyToken)).status,200);checks++;
 const legacyGame=oldRoom.state,legacyHand=legacyGame.people[0].hand;
 const legacyZones=[legacyGame.stock,legacyGame.pile,legacyGame.ashes,
  ...legacyGame.people.flatMap(p=>[p.hand,p.up,p.down])];
 const dumpZone=legacyZones.find(z=>z.some(c=>c.action==='dump'));
 const dumpIndex=dumpZone.findIndex(c=>c.action==='dump');
 [legacyHand[0],dumpZone[dumpIndex]]=[dumpZone[dumpIndex],legacyHand[0]];
 legacyGame.pile.push(legacyGame.stock.pop());
 Engine.invariant(legacyGame);
 const recipientBefore=legacyGame.people[1].hand.length;
 const oldMove=await request({
  action:'move',code:legacyCode,revision:3,
  move:{type:'play',source:'hand',ids:[legacyHand[0].id],target:2}
 },legacyToken);
 assert.equal(oldMove.status,200,JSON.stringify(oldMove));
 assert.equal(oldMove.data.game.events.at(-1).target,1);
 assert.equal(oldRoom.state.people[1].hand.length,recipientBefore+1);
 assert.equal(oldRoom.state.version,'pilehead-1.2.0');
 assert.equal(Engine.invariant(oldRoom.state),true);checks++;
 const ended=oldRoom.state;
 for(const seat of [0,2]){
  const p=ended.people[seat];
  ended.ashes.push(...p.hand.splice(0),...p.up.splice(0),...p.down.splice(0));p.out=true;
 }
 ended.finishedOrder=[0,2];ended.loser=1;ended.phase='over';ended.slamOpen=false;
 ended.followUp=null;oldRoom.status='finished';Engine.invariant(ended);
 const newRound=await request({action:'rematch',code:legacyCode,revision:4},legacyToken);
 assert.equal(newRound.status,200,JSON.stringify(newRound));
 assert.equal(newRound.data.game.rulesVersion,Engine.VERSION);
 assert.equal(newRound.data.game.round,2);
 assert.equal(newRound.data.game.standings.completedRounds,1);
 assert.deepEqual(newRound.data.game.standings.seats.map(x=>x.points),[2,0,1]);
 assert.equal(newRound.data.game.starterSeat,0);
 assert.equal(newRound.data.game.starterReason,'winner');checks++;
 assert.equal((await request({action:'state',code:legacyCode},legacyGuest.data.session)).status,200);checks++;

 const old14=await request({action:'create',humans:2,bots:0,name:'Previous v1.4 room'});
 oldDeck(rooms.get(old14.data.code).state,'pilehead-1.4.0');
 const read14=await request({action:'state',code:old14.data.code},old14.data.session);
 assert.equal(read14.status,200);
 assert.equal(read14.data.game.rulesVersion,'pilehead-1.4.0');checks++;
 // v1.4 and v1.5 share the same 52 physical cards. Reuse the room to
 // avoid consuming an additional room-creation quota in this API test.
 const old15=old14;
 // A v1.6 54-card room continues with classic pickups, not Final Duel.
 // Begin an independent testing quota window: legacy scenarios do not share users.
 buckets.clear();
 const old16=await request({action:'create',humans:2,bots:0,name:'Old 54-card host'});
 restoreLegacySkips(rooms.get(old16.data.code).state);
 rooms.get(old16.data.code).state.version='pilehead-1.6.0';
 delete rooms.get(old16.data.code).state.endgameRule;
 const read16=await request({action:'state',code:old16.data.code},old16.data.session);
 assert.equal(read16.status,200,JSON.stringify(read16));
 assert.equal(read16.data.game.rulesVersion,'pilehead-1.6.0');
 assert.equal(read16.data.game.endgameRule,'classic');
 Engine.invariant(rooms.get(old16.data.code).state);checks++;
 rooms.get(old15.data.code).state.version='pilehead-1.5.0';
 const read15=await request({action:'state',code:old15.data.code},old15.data.session);
 assert.equal(read15.status,200,JSON.stringify(read15));
 assert.equal(read15.data.game.rulesVersion,'pilehead-1.5.0');
 assert.equal(Engine.count(rooms.get(old15.data.code).state),52);checks++;
 const unknown=await request({action:'create',humans:2,bots:0,name:'Old unsupported'});
 rooms.get(unknown.data.code).state.version='pilehead-1.1.0';
 const blocked=await request({action:'state',code:unknown.data.code},unknown.data.session);
 assert.equal(blocked.status,409);assert.equal(blocked.data.error,'room_rules_changed');checks++;
 const invalid=await request({action:'create',humans:2,bots:0,name:'Corrupt legacy'});
 const invalidState=rooms.get(invalid.data.code).state;
 oldDeck(invalidState,'pilehead-1.2.0');
 invalidState.stock[0]=invalidState.stock[1];
 const rejected=await request({action:'state',code:invalid.data.code},invalid.data.session);
 assert.equal(rejected.status,409);assert.equal(rejected.data.error,'room_rules_changed');checks++;
 }
 // Fixed-round tournaments are opt-in and retain the same roster, settings and score.
 const invalidTournament=await request({action:'create',humans:1,bots:1,name:'Invalid format',roundLimit:4});
 assert.equal(invalidTournament.status,400);assert.equal(invalidTournament.data.error,'invalid_round_limit');
 // Continue the real three-round hybrid tournament created above.
 const tour=rooms.get(hybridCode);
 const tournamentView=await request({action:'state',code:hybridCode},hybridHost);
 assert.equal(tournamentView.data.game.roundLimit,3);
 const locked=await request({action:'settings',code:hybridCode,revision:11,endgameRule:'final-duel'},hybridHost);
 assert.equal(locked.status,409);assert.equal(locked.data.error,'tournament_rules_locked');
 const final=tour.state;
 for(const seat of [1,2]){const p=final.people[seat];final.ashes.push(...p.hand.splice(0),...p.up.splice(0),...p.down.splice(0));p.out=true;}
 final.phase='over';final.finishedOrder=[1,2];final.loser=0;final.slamOpen=false;tour.status='finished';
 Engine.invariant(final);
 const podium=await request({action:'state',code:hybridCode},hybridFriend);
 assert.equal(podium.status,200);assert.equal(podium.data.game.standings.completedRounds,3);
 const noExtraRound=await request({action:'rematch',code:hybridCode,revision:11},hybridHost);
 assert.equal(noExtraRound.status,409);assert.equal(noExtraRound.data.error,'tournament_complete');checks++;
 // Explicit withdrawal never produces a fake completed round, even when the room had scores.
 const finishedWithdrawal=await request({action:'withdraw-tournament',confirm:true,code:hybridCode,revision:11},hybridHost);
 assert.equal(finishedWithdrawal.status,409);assert.equal(finishedWithdrawal.data.error,'tournament_complete');
 buckets.clear();
 const abandoned=await request({action:'create',humans:1,bots:1,name:'Withdraw test',roundLimit:3});
 assert.equal(abandoned.status,201);
 const ac=abandoned.data.code,at=abandoned.data.session;
 const missingConfirm=await request({action:'withdraw-tournament',code:ac,revision:0},at);
 assert.equal(missingConfirm.status,400);
 assert.equal((await request({action:'ready',code:ac,revision:0,ready:true},at)).status,200);
 assert.equal((await request({action:'start',code:ac,revision:1},at)).status,200);
 const withdrawal=await request({action:'withdraw-tournament',confirm:true,code:ac,revision:2},at);
 assert.equal(withdrawal.status,200);assert.deepEqual(withdrawal.data.game.tournamentWithdrawal,{seat:0});
 assert.equal(withdrawal.data.game.phase,'play');assert.equal(withdrawal.data.game.standings.completedRounds,0);
 assert.deepEqual(withdrawal.data.game.legal,[]);assert.deepEqual(withdrawal.data.game.slam,[]);
 assert.equal((await request({action:'advance',code:ac,revision:3},at)).data.error,'tournament_withdrawn');
 assert.equal((await request({action:'join',code:ac,name:'New player'})).data.error,'tournament_withdrawn');
 assert.deepEqual((await request({action:'state',code:ac},at)).data.game.tournamentWithdrawal,{seat:0});
 checks++;
 console.log('PASS PILEHEAD online authoritative API: '+checks+' assertions (privacy, DUMP replay, auth, turns, CAS, room isolation)');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
 crypto.randomInt=originalRandomInt;Module._load=original;if(oldEnv===undefined)delete process.env.PILEHEAD_DATABASE_URL;else process.env.PILEHEAD_DATABASE_URL=oldEnv;
});
