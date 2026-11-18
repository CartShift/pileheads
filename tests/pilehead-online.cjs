'use strict';
const assert=require('node:assert/strict');
const Module=require('node:module');
const crypto=require('node:crypto'),originalRandomInt=crypto.randomInt;
let chosenStarter=0;
// Existing API fixtures stay deterministic; a separate scenario verifies
// that the authoritative server can pick a nonzero starting seat.
crypto.randomInt=max=>Math.min(chosenStarter,max-1);
const Engine=require('../dist/pilehead/engine.js');
const rooms=new Map(),members=new Map(),buckets=new Map();
function conflict(){const e=Error('unique key');e.code='23505';throw e}
async function query(sql,args=[]){
 if(sql==='SELECT 1 AS ready')return [{ready:1}];
 if(sql.startsWith('INSERT INTO pilehead_rate_limits')){const n=(buckets.get(args[0])||0)+1;buckets.set(args[0],n);return [{hits:n}]}
 if(sql.startsWith('INSERT INTO pilehead_rooms')){if(rooms.has(args[0]))conflict();
  const r={code:args[0],capacity:args[1],status:'lobby',state:JSON.parse(args[2]),revision:0,expires_at:new Date(Date.now()+86400000)};
  rooms.set(r.code,r);return []}
 if(sql.startsWith('INSERT INTO pilehead_members')&&sql.includes('SELECT')){
  // Regression: Neon/Postgres must resolve both references to room-code parameter $1 as the same type.
  assert.equal((sql.match(/\$1::varchar\(8\)/g)||[]).length,2,'join SQL must cast both room-code references');
  assert.match(sql,/ON CONFLICT \(code,seat\) DO NOTHING/,'simultaneous join should be conflict-safe');
  const [code,name,token,capacity]=args;const current=members.get(code)||[];
  const seat=Array.from({length:capacity},(_,i)=>i).find(i=>!current.some(m=>m.seat===i));
  if(seat===undefined)return [];current.push({seat,display_name:name,token_hash:token});members.set(code,current);
  return [{seat}]
 }
 if(sql.startsWith('INSERT INTO pilehead_members')){const [code,name,token]=args,seat=0;const current=members.get(code)||[];
  if(current.some(x=>x.seat===seat))conflict();current.push({seat,display_name:name,token_hash:token});members.set(code,current);return []}
 if(sql.startsWith('SELECT code,capacity'))return rooms.has(args[0])?[structuredClone(rooms.get(args[0]))]:[];
 if(sql.startsWith('SELECT seat,display_name'))return (members.get(args[0])||[]).map(m=>({seat:m.seat,display_name:m.display_name}));
 if(sql.startsWith('SELECT seat FROM pilehead_members')&&sql.includes('token_hash'))return (members.get(args[0])||[]).filter(x=>x.token_hash===args[1]).map(m=>({seat:m.seat}));
 if(sql.startsWith('SELECT seat FROM pilehead_members'))return (members.get(args[0])||[]).map(m=>({seat:m.seat}));
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
 const unauth=await request({action:'state',code});assert.equal(unauth.status,401);checks++;
 const early=await request({action:'start',code,revision:0},hostToken);
 assert.equal(early.status,409,JSON.stringify(early));checks++;
 const guest=await request({action:'join',code,name:'Guest'});
 assert.equal(guest.status,201);assert.equal(guest.data.me,1);checks++;
 const guestToken=guest.data.session;
 const state=await request({action:'state',code},guestToken);
 assert.equal(state.status,200);
 assert.equal(state.data.game.players[0].hand,undefined);
 assert.equal(state.data.game.players[0].blindSlots,undefined);
 assert.equal(state.data.game.players[1].hand.length,3);
 assert.equal(state.data.game.players[1].blindSlots.length,3);
 assert.equal(state.data.game.seed,undefined);assert.equal(state.data.game.stock,undefined);checks++;
 const cross=await request({action:'state',code:'ABCDEFGH'},guestToken);
 assert.equal(cross.status,404);checks++;
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
 const hybrid=await request({action:'create',humans:2,bots:1,name:'Hybrid Host'});
 assert.equal(hybrid.status,201,JSON.stringify(hybrid));
 const hybridCode=hybrid.data.code,hybridHost=hybrid.data.session;
 assert.deepEqual(hybrid.data.game.botSeats,[2]);
 assert.equal(hybrid.data.game.round,1);
 assert.equal(hybrid.data.humanCount,2);assert.equal(hybrid.data.botCount,1);
 assert.deepEqual(hybrid.data.game.setupReady,[false,false,true]);checks++;
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
 const prematureBot=await request({action:'advance',code:hybridCode,revision:3},hybridHost);
 assert.equal(prematureBot.status,409);assert.equal(prematureBot.data.error,'not_bot_turn');checks++;
 // Put the turn on a bot; server chooses from its hidden hand and commits exactly one move.
 const hybridRecord=rooms.get(hybridCode);
 hybridRecord.state.turn=2;Engine.invariant(hybridRecord.state);
 const botMove=await request({action:'advance',code:hybridCode,revision:3},hybridFriend);
 assert.equal(botMove.status,200,JSON.stringify(botMove));
 assert.equal(botMove.data.game.moves,1);assert.equal(botMove.data.revision,4);
 assert.equal(botMove.data.game.players[2].hand,undefined);
 assert.equal(botMove.data.game.players[0].hand,undefined);
 Engine.invariant(rooms.get(hybridCode).state);checks++;
 const advanceAgainStale=await request({action:'advance',code:hybridCode,revision:3},hybridHost);
 assert.equal(advanceAgainStale.status,409);checks++;
 // Arrange a valid terminal state while conserving the complete 52-card deck.
 const ended=rooms.get(hybridCode),g=ended.state;
 for(const seat of [0,2]){
  const player=g.people[seat];
  g.ashes.push(...player.hand.splice(0),...player.up.splice(0),...player.down.splice(0));
  player.out=true;
 }
 g.finishedOrder=[0,2];g.loser=1;g.phase='over';g.slamOpen=false;
 ended.status='finished';
 Engine.invariant(g);
 const replay=await request({action:'rematch',code:hybridCode,revision:4},hybridFriend);
 assert.equal(replay.status,200,JSON.stringify(replay));
 assert.equal(replay.data.code,hybridCode);
 assert.equal(replay.data.revision,5);
 assert.equal(replay.data.game.phase,'setup');
 assert.equal(replay.data.game.round,2);
 assert.deepEqual(replay.data.game.botSeats,[2]);
 assert.deepEqual(replay.data.game.setupReady,[false,false,true]);
 assert.equal(replay.data.game.starterSeat,0,'first player out gets the next start');
 assert.equal(replay.data.game.starterReason,'winner');checks++;
 assert.equal(replay.data.game.players[2].hand,undefined);checks++;
 const oldTokenStillValid=await request({action:'state',code:hybridCode},hybridHost);
 assert.equal(oldTokenStillValid.status,200);
 assert.equal(oldTokenStillValid.data.game.round,2);
 assert.equal(oldTokenStillValid.data.members.length,2);checks++;
 const staleReplay=await request({action:'rematch',code:hybridCode,revision:4},hybridHost);
 assert.equal(staleReplay.status,409);checks++;
 const tooEarlyReplay=await request({action:'rematch',code:hybridCode,revision:5},hybridFriend);
 assert.equal(tooEarlyReplay.status,409);
 assert.equal(tooEarlyReplay.data.error,'game_not_finished');checks++;
 const soloHybrid=await request({action:'create',humans:1,bots:2,name:'Solo vs bots'});
 assert.equal(soloHybrid.status,201);assert.deepEqual(soloHybrid.data.game.botSeats,[1,2]);checks++;
 const soloReady=await request({action:'ready',code:soloHybrid.data.code,revision:0,ready:true},soloHybrid.data.session);
 assert.equal(soloReady.status,200);
 const soloStart=await request({action:'start',code:soloHybrid.data.code,revision:1},soloHybrid.data.session);
 assert.equal(soloStart.status,200);assert.equal(soloStart.data.game.phase,'play');checks++;
 const tooMany=await request({action:'create',humans:3,bots:3,name:'Invalid'});
 assert.equal(tooMany.status,400);assert.equal(tooMany.data.error,'invalid_capacity');checks++;


 // The freshly drawn matching number has server-enforced priority over other turns.
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
 assert.equal(snapMade.data.game.snapSeat,0);assert.ok(snapMade.data.game.snapUntil>Date.now());checks++;
 const snapOtherMove=Engine.options(rooms.get(snapCode).state,1)[0];assert.ok(snapOtherMove);
 const snapBlocked=await request({action:'move',code:snapCode,revision:4,move:snapOtherMove},snapGuestToken);
 assert.equal(snapBlocked.status,409);assert.equal(snapBlocked.data.error,'snap_window_open');checks++;
 const expiry=rooms.get(snapCode).state.followUp.expiresAt;
 rooms.get(snapCode).state.followUp.expiresAt=Date.now()-10;
 const unlocked=await request({action:'state',code:snapCode},snapGuestToken);
 assert.equal(unlocked.status,200);
 assert.equal(unlocked.data.revision,4,'SNAP expiry must not require database write');
 assert.equal(unlocked.data.game.snapUntil,null);
 assert.equal(unlocked.data.game.snapSeat,null);
 assert.equal(unlocked.data.game.followup.length,0);
 assert.ok(unlocked.data.game.legal.length>0);checks++;
 rooms.get(snapCode).state.followUp.expiresAt=expiry;
 const snapPlayed=await request({action:'move',code:snapCode,revision:4,move:snapMade.data.game.followup[0]},snapHost);
 assert.equal(snapPlayed.status,200,JSON.stringify(snapPlayed));
 assert.equal(snapPlayed.data.game.events.at(-1).type,'followup');
 assert.equal(snapPlayed.data.game.players[1].hand,undefined);checks++;
 const snapAfterMove=Engine.options(rooms.get(snapCode).state,1)[0];
 const snapContinued=await request({action:'move',code:snapCode,revision:5,move:snapAfterMove},snapGuestToken);
 assert.equal(snapContinued.status,200,JSON.stringify(snapContinued));checks++;

 {
 // A live 1.2 room must survive the 1.3 deploy without changing its seat tokens.
 const legacy=await request({action:'create',humans:2,bots:1,name:'Legacy host'});
 const legacyCode=legacy.data.code,legacyToken=legacy.data.session;
 const legacyGuest=await request({action:'join',code:legacyCode,name:'Friend'});
 assert.equal(legacyGuest.status,201);
 const oldRoom=rooms.get(legacyCode);
 oldRoom.state.version='pilehead-1.2.0';
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
 assert.equal(newRound.data.game.starterSeat,0);
 assert.equal(newRound.data.game.starterReason,'winner');checks++;
 assert.equal((await request({action:'state',code:legacyCode},legacyGuest.data.session)).status,200);checks++;
 const unknown=await request({action:'create',humans:2,bots:0,name:'Old unsupported'});
 rooms.get(unknown.data.code).state.version='pilehead-1.1.0';
 const blocked=await request({action:'state',code:unknown.data.code},unknown.data.session);
 assert.equal(blocked.status,409);assert.equal(blocked.data.error,'room_rules_changed');checks++;
 const invalid=await request({action:'create',humans:2,bots:0,name:'Corrupt legacy'});
 const invalidState=rooms.get(invalid.data.code).state;
 invalidState.version='pilehead-1.2.0';
 invalidState.stock[0]=invalidState.stock[1];
 const rejected=await request({action:'state',code:invalid.data.code},invalid.data.session);
 assert.equal(rejected.status,409);assert.equal(rejected.data.error,'room_rules_changed');checks++;
 }
 console.log('PASS PILEHEAD online authoritative API: '+checks+' assertions (privacy, DUMP replay, auth, turns, CAS, room isolation)');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
 crypto.randomInt=originalRandomInt;Module._load=original;if(oldEnv===undefined)delete process.env.PILEHEAD_DATABASE_URL;else process.env.PILEHEAD_DATABASE_URL=oldEnv;
});
