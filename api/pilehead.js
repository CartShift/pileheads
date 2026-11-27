'use strict';
/* PILEHEAD public room API. Server is authoritative and hands are seat-private. */
const crypto=require('node:crypto'),E=require('../packages/game-engine');
const Standings=require('../scripts/room-standings.cjs');let client;
function db(){if(!process.env.PILEHEAD_DATABASE_URL)throw error(503,'online_not_configured');return client||(client=require('@neondatabase/serverless').neon(process.env.PILEHEAD_DATABASE_URL))}
function query(s,args=[]){return db().query(s,args)}
function error(status,code){return Object.assign(Error(code),{status,code})}
function fail(status,code){throw error(status,code)}
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const REACTION_TYPES=new Set(['fire','wow','laugh','ouch','gg']);
const recentReactions=g=>(Array.isArray(g?.reactionEvents)?g.reactionEvents:[])
 .filter(x=>x&&typeof x.id==='string'&&REACTION_TYPES.has(x.kind)&&
  Number.isInteger(x.seat)&&Number.isFinite(x.at)&&Date.now()-x.at<20000);

const secret=()=>crypto.randomBytes(32).toString('base64url');
function code(x){if(typeof x!=='string'||!/^[A-HJ-NP-Z2-9]{8}$/.test(x.toUpperCase()))fail(400,'invalid_code');return x.toUpperCase()}
function makeCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.randomBytes(8),n=>a[n%a.length]).join('')}
function name(v){const x=typeof v==='string'?v.trim().replace(/[\u0000-\u001f\u007f<>]/g,'').slice(0,24):'';if(!x)fail(400,'name_required');return x}
// Preserve active 52-card rounds from 1.2–1.5 and 54-card v1.6 rounds after v1.7.
// Validate old card identities and conservation before accepting saved room state.
function compatibleLegacy(g){
 if(!['pilehead-1.2.0','pilehead-1.3.0','pilehead-1.4.0','pilehead-1.5.0','pilehead-1.6.0'].includes(g?.version))return false;
 try{
  E.invariant(g);
  if(!['setup','play','over'].includes(g.phase)||g.people.length<2||g.people.length>5)return false;
  const expected=E.deck(g.version),cards=[...g.stock,...g.pile,...g.ashes,
   ...g.people.flatMap(p=>[...p.hand,...p.up,...p.down])];
  return cards.every(c=>{const reference=expected[c.id];
   return reference&&c.kind===reference.kind&&c.rank===reference.rank&&c.action===reference.action});
 }catch{return false}
}
async function load(id){const r=await query('SELECT code,capacity,revision,status,state,expires_at FROM pilehead_rooms WHERE code=$1',[id]);if(!r[0])fail(404,'room_not_found');if(new Date(r[0].expires_at)<=new Date())fail(410,'room_expired');
 if(r[0].state?.version!==E.VERSION&&!compatibleLegacy(r[0].state))fail(409,'room_rules_changed');
 return r[0]}
async function quota(req,action,max){const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'?').split(',')[0].slice(0,100);
 const key=h([action,Math.floor(Date.now()/3600000),ip,process.env.PILEHEAD_DATABASE_URL].join('|'));
 const rows=await query("INSERT INTO pilehead_rate_limits(bucket,hits,expires_at) VALUES ($1,1,now()+interval '2 hours') ON CONFLICT(bucket) DO UPDATE SET hits=pilehead_rate_limits.hits+1 RETURNING hits",[key]);
 if(rows[0].hits>max)fail(429,'rate_limited')}
function humanCount(g){return Number.isInteger(g.humanCount)?g.humanCount:g.people.length}
function botSeats(g){return Array.isArray(g.botSeats)?g.botSeats:[]}
const tournamentLimits=new Set([3,5,10]);
function tournamentLimit(g){return tournamentLimits.has(g.roundLimit)?g.roundLimit:null}
function freshGame({players,humans,bots,round=1,starterSeat=null,endgameRule='classic',roundLimit=null}){
 const seed=crypto.randomBytes(4).readUInt32BE(0);
 const game=E.create({players,seed,endgameRule});
 game.humanCount=humans;
 game.botSeats=Array.from({length:bots},(_,i)=>humans+i);
 game.round=round;
 game.roundLimit=roundLimit;
 game.rematchReady=Array.from({length:humans},()=>false);
 Standings.record(game);
 // Pick the first starter once, on the server; the clients only animate the
 // already-authoritative result. Subsequent rounds use the prior winner.
 game.starterSeat=starterSeat===null?crypto.randomInt(players):starterSeat;
 game.starterReason=starterSeat===null?'draw':'winner';
 game.setupReady=Array.from({length:players},(_,i)=>i>=humans);
 for(const seat of game.botSeats)E.autoSetup(game,seat);
 E.invariant(game);
 return game;
}
function redacted(g,seat){return{phase:g.phase,turn:g.turn,moves:g.moves,stockCount:g.stock.length,
  rulesVersion:g.version,
  endgameRule:g.version===E.VERSION&&g.endgameRule==='final-duel'?'final-duel':'classic',
   omitSkip:g.omitSkip===true,
 round:g.round||1,humanCount:humanCount(g),botSeats:botSeats(g),
 standings:Standings.publicStandings(g),
 roundLimit:tournamentLimit(g),
 rematchReady:Array.from({length:humanCount(g)},(_,i)=>g.rematchReady?.[i]===true),
 starterSeat:g.starterSeat??0,starterReason:g.starterReason||'draw',startedAt:g.startedAt||null,
 blindReveal:g.blindReveal?.expiresAt>Date.now()?g.blindReveal:null,
 botFollowupReady:botSeats(g).some(bot=>E.followUpOptions(g,bot).length>0),
  // Public boolean only, not a disclosure of bot rank or private card IDs.
  botSlamReady:botSeats(g).some(bot=>E.slamOptions(g,bot).length>0),
 pile:g.pile,ashesCount:g.ashes.length,limit:g.limit,slamOpen:g.slamOpen,pendingDump:g.pendingDump?{seat:g.pendingDump.seat}:null,pendingCounter:g.pendingCounter?{seat:g.pendingCounter.seat,attacker:g.pendingCounter.attacker,count:g.pendingCounter.ids.length}:null,setupReady:g.setupReady||g.people.map(()=>false),loser:g.loser,finishedOrder:g.finishedOrder,
 reactions:recentReactions(g),
 players:g.people.map((p,i)=>({seat:i,out:p.out,up:p.up,handCount:p.hand.length,downCount:p.down.length,pickups:p.pickups,
 ...(i===seat?{hand:p.hand,blindSlots:p.down.map((_,j)=>j)}:{})})),
 events:g.events.slice(-24).map(({type,seat,source,reason,count,burned,burnedCount,rank,action,target,takenCount,erodedCount,drawnCount,bridgeCount,move})=>({type,seat,source,reason,count,burned,burnedCount,rank,action,target,takenCount,erodedCount,drawnCount,bridgeCount,move})),
 legal:g.phase==='play'&&g.turn===seat?E.options(g,seat).map(m=>m.source==='down'?{type:'play',source:'down',index:g.people[seat].down.findIndex(c=>c.id===m.ids[0])}:m):[],
 slam:g.phase==='play'?E.slamOptions(g,seat):[],
 followup:g.phase==='play'?E.followUpOptions(g,seat):[]
}}
async function view(r,seat){const members=await query('SELECT seat,display_name,last_seen_at,is_away FROM pilehead_members WHERE code=$1 ORDER BY seat',[r.code]);
 return {ok:true,code:r.code,revision:r.revision,capacity:r.capacity,
 humanCount:humanCount(r.state),botCount:botSeats(r.state).length,
 status:r.status,expiresAt:r.expires_at,me:seat,host:seat===0,
 members:members.map(m=>({seat:m.seat,name:m.display_name,
  presence:Date.now()-new Date(m.last_seen_at).getTime()>25000?'offline':m.is_away?'away':'online'})),
 game:redacted(r.state,seat)}}
async function auth(r,req){const match=/^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(req.headers.authorization||'');if(!match)fail(401,'session_required');
 const rows=await query('SELECT seat FROM pilehead_members WHERE code=$1 AND token_hash=$2',[r.code,h(match[1])]);if(!rows.length)fail(403,'not_member');return Number(rows[0].seat)}
async function create(req,b){
 await quota(req,'create',15);
 const nick=name(b.name);
 // Older clients can still send only 'capacity'.
 const humans=b.humans===undefined?Number(b.capacity):Number(b.humans);
 const bots=b.bots===undefined?0:Number(b.bots);
 const cap=humans+bots;
 if(!Number.isInteger(humans)||!Number.isInteger(bots)||humans<1||bots<0||cap<2||cap>5)fail(400,'invalid_capacity');
 const endgameRule=b.endgameRule===undefined?'classic':b.endgameRule;
 if(endgameRule!=='classic'&&endgameRule!=='final-duel')fail(400,'invalid_endgame_rule');
 const roundLimit=b.roundLimit===undefined?null:b.roundLimit;
 if(roundLimit!==null&&!tournamentLimits.has(roundLimit))fail(400,'invalid_round_limit');
 const t=secret();
 for(let tries=0;tries<4;tries++){const id=makeCode(),game=freshGame({players:cap,humans,bots,endgameRule,roundLimit});
  try{await query("INSERT INTO pilehead_rooms(code,capacity,status,state) VALUES($1,$2,'lobby',$3::jsonb)",[id,cap,JSON.stringify(game)]);
   await query('INSERT INTO pilehead_members(code,seat,display_name,token_hash) VALUES($1,0,$2,$3)',[id,nick,h(t)]);
   return {...await view(await load(id),0),session:t};
  }catch(e){if(e.code==='23505')continue;throw e}}
 fail(503,'room_create_failed')}
async function join(req,b){await quota(req,'join',60);const id=code(b.code),nick=name(b.name),t=secret(),r=await load(id);
 if(r.status!=='lobby')fail(409,'already_started');
 // Contended ON CONFLICT DO NOTHING can miss a different free seat; retry.
 for(let attempt=0;attempt<4;attempt++){
  const rows=await query('INSERT INTO pilehead_members(code,seat,display_name,token_hash) SELECT $1::varchar(8),x,$2,$3 FROM generate_series(0,$4::integer-1) x WHERE NOT EXISTS(SELECT 1 FROM pilehead_members m WHERE m.code=$1::varchar(8) AND m.seat=x) ORDER BY x LIMIT 1 ON CONFLICT (code,seat) DO NOTHING RETURNING seat',[id,nick,h(t),humanCount(r.state)]);
  if(rows.length)return {...await view(r,Number(rows[0].seat)),session:t};
 }
 fail(409,'full')}
async function mutation(r,seat,b){if(!Number.isInteger(b.revision)||b.revision!==r.revision)fail(409,'stale_revision');
 const g=structuredClone(r.state);
 g.setupReady??=g.people.map(()=>false);
 if(b.action==='swap'){if(g.phase!=='setup')fail(409,'already_started');if(g.setupReady[seat])fail(409,'unready_to_swap');
  if(!Number.isInteger(b.handId)||!Number.isInteger(b.upId))fail(400,'bad_swap');try{E.swap(g,seat,b.handId,b.upId)}catch{fail(400,'illegal_swap')}}
 else if(b.action==='settings'){
  if(seat!==0)fail(403,'host_only');
  if(g.phase!=='setup')fail(409,'already_started');
  if(tournamentLimit(g)!==null)fail(409,'tournament_rules_locked');
  if(b.endgameRule!=='classic'&&b.endgameRule!=='final-duel')fail(400,'invalid_endgame_rule');
  g.endgameRule=b.endgameRule;
 }
 else if(b.action==='ready'){if(g.phase!=='setup')fail(409,'already_started');
  if(typeof b.ready!=='boolean')fail(400,'bad_ready');g.setupReady[seat]=b.ready}
 else if(b.action==='start'){
  if(seat!==0)fail(403,'host_only');
  if(g.phase!=='setup')fail(409,'already_started');
  const m=await query('SELECT seat FROM pilehead_members WHERE code=$1 ORDER BY seat',[r.code]);
  if(m.length!==humanCount(g)||m.some((p,i)=>p.seat!==i)||!g.setupReady.every(Boolean))fail(409,'waiting_for_players');
  E.start(g);
 }
 else if(b.action==='decline'){
  if(g.phase!=='play'||g.followUp?.seat!==seat)fail(409,'no_snap_available');
  g.followUp=null;
 }
 else if(b.action==='rematch'||b.action==='rematch-ready'){
  if(g.phase!=='over')fail(409,'game_not_finished');
  if(tournamentLimit(g)!==null&&(g.round||1)>=tournamentLimit(g))fail(409,'tournament_complete');
  // Fixed tournaments require every human to explicitly opt in. Endless rooms retain legacy behavior.
  if(b.action==='rematch-ready'&&!tournamentLimit(g))fail(400,'not_tournament');
  if(tournamentLimit(g)){
   if(b.action==='rematch-ready'&&typeof b.ready!=='boolean')fail(400,'bad_ready');
   g.rematchReady=Array.from({length:humanCount(g)},(_,i)=>g.rematchReady?.[i]===true);
   g.rematchReady[seat]=b.action==='rematch'||b.ready;
  }
  if(!tournamentLimit(g)||g.rematchReady.every(Boolean)){
  // In STACK the first player to get rid of their cards wins this round,
  // whereas the final player still holding cards is the PILEHEAD.
  const winner=g.finishedOrder?.[0];
  const standings=Standings.record(g);
  const next=freshGame({players:g.people.length,humans:humanCount(g),bots:botSeats(g).length,
   round:(g.round||1)+1,starterSeat:Number.isInteger(winner)?winner:null,
   endgameRule:g.endgameRule==='final-duel'?'final-duel':'classic',roundLimit:tournamentLimit(g)});
  next.roomStandings=standings;
  Object.assign(g,next);
  }
 }
 else if(b.action==='advance'){
  if(g.phase!=='play')fail(409,'not_started');
  const bots=botSeats(g);
  const followBot=bots.find(bot=>E.followUpOptions(g,bot).length);
  const slammer=bots.find(bot=>E.slamOptions(g,bot).length);
  if(g.pendingDump){
   if(!bots.includes(g.pendingDump.seat))fail(409,'dump_target_pending');
   E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat));
  }
  else if(followBot!==undefined)E.move(g,followBot,E.followUpOptions(g,followBot)[0]);
  else if(slammer!==undefined)E.move(g,slammer,E.slamOptions(g,slammer)[0]);
  else if(bots.includes(g.turn))E.move(g,g.turn,E.choose(g,g.turn,['greedy','saver','random'][g.turn%3]));
  else fail(409,'not_bot_turn');
 }
 else if(b.action==='dump-target'){
  if(g.phase!=='play'||g.pendingDump?.seat!==seat)fail(409,'dump_target_not_pending');
  try{E.resolveDump(g,seat,b.target)}catch{fail(400,'invalid_dump_target')}
 }
 else if(b.action==='move'){if(g.phase!=='play')fail(409,'not_started');const m=b.move;
  if(!m||typeof m!=='object'||Array.isArray(m))fail(400,'bad_move');
  if(m.type==='counter-dump'||m.type==='counter-pass'){try{E.move(g,seat,{type:m.type,source:m.source,ids:m.ids})}catch{fail(400,'illegal_counter')}}
   else if(m.type==='take'){try{E.move(g,seat,{type:'take'})}catch{fail(400,'illegal_move')}}
  else if(m.type==='slam'||m.type==='play'||m.type==='followup'){const source=E.stage(g,seat);if(m.source!==source)fail(400,'wrong_layer');let ids;
   if(source==='down'){if(m.type==='slam'||m.type==='followup'||!Number.isInteger(m.index)||m.index<0||m.index>=g.people[seat].down.length)fail(400,'bad_blind_slot');ids=[g.people[seat].down[m.index].id]}
   else{if(!Array.isArray(m.ids)||m.ids.length<1||m.ids.length>4||!m.ids.every(Number.isInteger))fail(400,'bad_cards');ids=m.ids}
   try{E.move(g,seat,{type:m.type,source,ids,target:m.target})}catch{fail(400,'illegal_move')}}else fail(400,'bad_move');
 }
 else fail(400,'unknown_action');
 E.invariant(g);
 Standings.record(g); // finalized once in the same revision-checked room update
  // Online clients use the recent 24 events; bound persisted history to avoid JSONB growth.
  if(g.events.length>96)g.events.splice(0,g.events.length-96);
  const status=g.phase==='over'?'finished':g.phase==='play'?'playing':'lobby';
 const rows=await query(`UPDATE pilehead_rooms SET state=jsonb_set($1::jsonb,'{reactionEvents}',COALESCE(pilehead_rooms.state->'reactionEvents','[]'::jsonb)),status=$2,revision=revision+1,updated_at=now() WHERE code=$3 AND revision=$4 AND expires_at>now() RETURNING code,capacity,revision,status,state,expires_at`,[JSON.stringify(g),status,r.code,r.revision]);
 if(!rows.length)fail(409,'stale_revision');return view(rows[0],seat)}
// Ephemeral reactions live in bounded room JSON rather than adding a schema
// migration. SQL appends atomically without changing the gameplay revision.
async function realtimeReact(room,seat,kind){
 if(!REACTION_TYPES.has(kind))fail(400,'invalid_reaction');
 const id=code(room),r=await load(id);
 if(r.state.phase==='setup')fail(409,'not_started');
 if(!Number.isInteger(seat)||seat<0||seat>=humanCount(r.state))fail(403,'not_member');
 const bucket=h(['react',id,seat,Math.floor(Date.now()/10000)].join(':'));
 const hits=await query("INSERT INTO pilehead_rate_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '10 minutes') ON CONFLICT(bucket) DO UPDATE SET hits=pilehead_rate_limits.hits+1 RETURNING hits",[bucket]);
 if(Number(hits[0]?.hits)>4)fail(429,'rate_limited');
 const reaction={id:crypto.randomUUID(),seat,kind,at:Date.now()};
 const rows=await query(`UPDATE pilehead_rooms SET
 state=jsonb_set(state,'{reactionEvents}',
 (SELECT COALESCE(jsonb_agg(event ORDER BY ord),'[]'::jsonb) FROM
 (SELECT event,ord FROM jsonb_array_elements(COALESCE(pilehead_rooms.state->'reactionEvents','[]'::jsonb) || $2::jsonb)
  WITH ORDINALITY AS x(event,ord) ORDER BY ord DESC LIMIT 24) recent)),
 updated_at=now() WHERE code=$1 AND expires_at>now() RETURNING code`,[id,JSON.stringify(reaction)]);
 if(!rows.length)fail(410,'room_expired');
 return reaction;
}
module.exports=async function handler(req,res){const send=(status,data)=>{res.status(status);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.json(data)};
 try{if(req.method==='GET'&&req.query?.health==='1'){
  const rows=await query('SELECT 1 AS ready');return send(200,{ok:rows[0]?.ready===1,service:'pilehead-rooms'});
 }
 // Keep Classic same-origin, and allow exactly one explicitly configured
  // Next.js frontend origin. No wildcard CORS and no browser credentials.
  if(req.headers.origin){
   let parsed;try{parsed=new URL(req.headers.origin)}catch{fail(403,'bad_origin')}
   const ownHost=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
   const trusted=String(process.env.STACK_WEB_ORIGIN||'').trim().replace(/[/]$/,'');
   const external=Boolean(trusted&&parsed.origin===trusted);
   if(parsed.host!==ownHost&&!external)fail(403,'bad_origin');
   if(external){
    res.setHeader('Access-Control-Allow-Origin',trusted);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
   }
  }
  if(req.method==='OPTIONS'){res.status(204);return res.end()}
  if(req.method!=='POST')return send(405,{ok:false,error:'method_not_allowed'});
  if(Number(req.headers['content-length']||0)>4096)fail(413,'too_large');
  if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'json_required');
  let b=req.body;if(typeof b==='string'){try{b=JSON.parse(b)}catch{fail(400,'bad_json')}}if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'bad_json');
  db();if(b.action==='create')return send(201,await create(req,b));if(b.action==='join')return send(201,await join(req,b));
  const r=await load(code(b.code)),seat=await auth(r,req);
  if(b.action==='presence'){
   if(typeof b.away!=='boolean')fail(400,'bad_presence');
   await query('UPDATE pilehead_members SET last_seen_at=now(),is_away=$3 WHERE code=$1 AND seat=$2',
    [r.code,seat,b.away]);
   return send(200,{ok:true});
  }
  if(b.action==='react')return send(200,{ok:true,code:r.code,reaction:await realtimeReact(r.code,seat,b.kind)});
  if(b.action==='state'){
   if(b.heartbeat===true)await query('UPDATE pilehead_members SET last_seen_at=now(),is_away=false WHERE code=$1 AND seat=$2',[r.code,seat]);
   return send(200,await view(r,seat));
  }
  return send(200,await mutation(r,seat,b))
 }catch(e){if(e.status)return send(e.status,{ok:false,error:e.code});if(e.code==='23505')return send(409,{ok:false,error:'room_conflict_retry'});
  console.error('PILEHEAD backend request failed');return send(503,{ok:false,error:'service_unavailable'})}}

module.exports.realtimeAuth=async function realtimeAuth(room,token){
 const r=await load(code(room));
 const seat=await auth(r,{headers:{authorization:'Bearer '+token}});
 await query('UPDATE pilehead_members SET last_seen_at=now(),is_away=false WHERE code=$1 AND seat=$2',[r.code,seat]);
 return{code:r.code,seat,revision:Number(r.revision),reactions:recentReactions(r.state)};
};
module.exports.realtimeSnapshot=async function realtimeSnapshot(room){
 // Lightweight cross-instance check; do not transfer the hidden game state.
 const rows=await query("SELECT revision,state->'reactionEvents' AS reaction_events,expires_at FROM pilehead_rooms WHERE code=$1",[code(room)]);
 if(!rows.length)fail(404,'room_not_found');
 if(new Date(rows[0].expires_at)<=new Date())fail(410,'room_expired');
 return{revision:Number(rows[0].revision),reactions:recentReactions({reactionEvents:rows[0].reaction_events})};
};
// Batch public-only revision reads to avoid one database query per live room.
module.exports.realtimeSnapshots=async function realtimeSnapshots(codes){
 if(!Array.isArray(codes)||!codes.length)return[];
 if(codes.length>100)fail(400,'too_many_rooms');
 const ids=[...new Set(codes)];
 const rows=await query("SELECT code,revision,state->'reactionEvents' AS reaction_events,expires_at FROM pilehead_rooms WHERE code=ANY($1::varchar(8)[])",[ids]);
 return rows.map(row=>({code:row.code,revision:Number(row.revision),
  expired:new Date(row.expires_at)<=new Date(),
  reactions:recentReactions({reactionEvents:row.reaction_events})}));
};
module.exports.realtimeReact=realtimeReact;
