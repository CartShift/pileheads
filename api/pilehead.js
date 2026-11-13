'use strict';
/* PILEHEAD public room API. Server is authoritative and hands are seat-private. */
const crypto=require('node:crypto'),E=require('../dist/pilehead/engine.js');let client;
function db(){if(!process.env.PILEHEAD_DATABASE_URL)throw error(503,'online_not_configured');return client||(client=require('@neondatabase/serverless').neon(process.env.PILEHEAD_DATABASE_URL))}
function query(s,args=[]){return db().query(s,args)}
function error(status,code){return Object.assign(Error(code),{status,code})}
function fail(status,code){throw error(status,code)}
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const secret=()=>crypto.randomBytes(32).toString('base64url');
function code(x){if(typeof x!=='string'||!/^[A-HJ-NP-Z2-9]{8}$/.test(x.toUpperCase()))fail(400,'invalid_code');return x.toUpperCase()}
function makeCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.randomBytes(8),n=>a[n%a.length]).join('')}
function name(v){const x=typeof v==='string'?v.trim().replace(/[\u0000-\u001f\u007f<>]/g,'').slice(0,24):'';if(!x)fail(400,'name_required');return x}
async function load(id){const r=await query('SELECT code,capacity,revision,status,state,expires_at FROM pilehead_rooms WHERE code=$1',[id]);if(!r[0])fail(404,'room_not_found');if(new Date(r[0].expires_at)<=new Date())fail(410,'room_expired');return r[0]}
async function quota(req,action,max){const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'?').split(',')[0].slice(0,100);
 const key=h([action,Math.floor(Date.now()/3600000),ip,process.env.PILEHEAD_DATABASE_URL].join('|'));
 const rows=await query("INSERT INTO pilehead_rate_limits(bucket,hits,expires_at) VALUES ($1,1,now()+interval '2 hours') ON CONFLICT(bucket) DO UPDATE SET hits=pilehead_rate_limits.hits+1 RETURNING hits",[key]);
 if(rows[0].hits>max)fail(429,'rate_limited')}
function redacted(g,seat){return{phase:g.phase,turn:g.turn,moves:g.moves,stockCount:g.stock.length,
 pile:g.pile,ashesCount:g.ashes.length,limit:g.limit,slamOpen:g.slamOpen,loser:g.loser,finishedOrder:g.finishedOrder,
 players:g.people.map((p,i)=>({seat:i,out:p.out,up:p.up,handCount:p.hand.length,downCount:p.down.length,pickups:p.pickups,
 ...(i===seat?{hand:p.hand,blindSlots:p.down.map((_,j)=>j)}:{})})),
 events:g.events.slice(-24).map(({type,seat,reason,count,burned,rank,action})=>({type,seat,reason,count,burned,rank,action})),
 legal:g.phase==='play'&&g.turn===seat?E.options(g,seat).map(m=>m.source==='down'?{type:'play',source:'down',index:g.people[seat].down.findIndex(c=>c.id===m.ids[0])}:m):[],
 slam:g.phase==='play'?E.slamOptions(g,seat):[]
}}
async function view(r,seat){const members=await query('SELECT seat,display_name FROM pilehead_members WHERE code=$1 ORDER BY seat',[r.code]);
 return {ok:true,code:r.code,revision:r.revision,capacity:r.capacity,status:r.status,expiresAt:r.expires_at,me:seat,host:seat===0,
 members:members.map(m=>({seat:m.seat,name:m.display_name})),game:redacted(r.state,seat)}}
async function auth(r,req){const match=/^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(req.headers.authorization||'');if(!match)fail(401,'session_required');
 const rows=await query('SELECT seat FROM pilehead_members WHERE code=$1 AND token_hash=$2',[r.code,h(match[1])]);if(!rows.length)fail(403,'not_member');return Number(rows[0].seat)}
async function create(req,b){await quota(req,'create',15);const cap=Number(b.capacity),nick=name(b.name);if(!Number.isInteger(cap)||cap<2||cap>5)fail(400,'invalid_capacity');
 const t=secret(),seed=crypto.randomBytes(4).readUInt32BE(0);
 for(let tries=0;tries<4;tries++){const id=makeCode(),game=E.create({players:cap,seed});
  try{await query("INSERT INTO pilehead_rooms(code,capacity,status,state) VALUES($1,$2,'lobby',$3::jsonb)",[id,cap,JSON.stringify(game)]);
   await query('INSERT INTO pilehead_members(code,seat,display_name,token_hash) VALUES($1,0,$2,$3)',[id,nick,h(t)]);
   return {...await view(await load(id),0),session:t};
  }catch(e){if(e.code==='23505')continue;throw e}}
 fail(503,'room_create_failed')}
async function join(req,b){await quota(req,'join',60);const id=code(b.code),nick=name(b.name),t=secret(),r=await load(id);
 if(r.status!=='lobby')fail(409,'already_started');
 const rows=await query('INSERT INTO pilehead_members(code,seat,display_name,token_hash) SELECT $1,x,$2,$3 FROM generate_series(0,$4::integer-1) x WHERE NOT EXISTS(SELECT 1 FROM pilehead_members m WHERE m.code=$1 AND m.seat=x) ORDER BY x LIMIT 1 RETURNING seat',[id,nick,h(t),r.capacity]);
 if(!rows.length)fail(409,'full');return {...await view(r,Number(rows[0].seat)),session:t}}
async function mutation(r,seat,b){if(!Number.isInteger(b.revision)||b.revision!==r.revision)fail(409,'stale_revision');
 const g=structuredClone(r.state);
 if(b.action==='swap'){if(g.phase!=='setup')fail(409,'already_started');if(!Number.isInteger(b.handId)||!Number.isInteger(b.upId))fail(400,'bad_swap');try{E.swap(g,seat,b.handId,b.upId)}catch{fail(400,'illegal_swap')}}
 else if(b.action==='start'){if(seat!==0)fail(403,'host_only');if(g.phase!=='setup')fail(409,'already_started');
  const m=await query('SELECT seat FROM pilehead_members WHERE code=$1 ORDER BY seat',[r.code]);
  if(m.length!==r.capacity||m.some((p,i)=>p.seat!==i))fail(409,'waiting_for_players');E.start(g)}
 else if(b.action==='move'){if(g.phase!=='play')fail(409,'not_started');const m=b.move;
  if(!m||typeof m!=='object'||Array.isArray(m))fail(400,'bad_move');
  if(m.type==='take'){try{E.move(g,seat,{type:'take'})}catch{fail(400,'illegal_move')}}
  else if(m.type==='slam'||m.type==='play'){const source=E.stage(g,seat);if(m.source!==source)fail(400,'wrong_layer');let ids;
   if(source==='down'){if(m.type==='slam'||!Number.isInteger(m.index)||m.index<0||m.index>=g.people[seat].down.length)fail(400,'bad_blind_slot');ids=[g.people[seat].down[m.index].id]}
   else{if(!Array.isArray(m.ids)||m.ids.length<1||m.ids.length>4||!m.ids.every(Number.isInteger))fail(400,'bad_cards');ids=m.ids}
   try{E.move(g,seat,{type:m.type,source,ids})}catch{fail(400,'illegal_move')}}else fail(400,'bad_move')}
 else fail(400,'unknown_action');
 E.invariant(g);const status=g.phase==='over'?'finished':g.phase==='play'?'playing':'lobby';
 const rows=await query('UPDATE pilehead_rooms SET state=$1::jsonb,status=$2,revision=revision+1,updated_at=now() WHERE code=$3 AND revision=$4 AND expires_at>now() RETURNING code,capacity,revision,status,state,expires_at',[JSON.stringify(g),status,r.code,r.revision]);
 if(!rows.length)fail(409,'stale_revision');return view(rows[0],seat)}
module.exports=async function handler(req,res){const send=(status,data)=>{res.status(status);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.json(data)};
 try{if(req.method!=='POST')return send(405,{ok:false,error:'method_not_allowed'});
  if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin).host}catch{fail(403,'bad_origin')}
   if(origin!==String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim())fail(403,'bad_origin')}
  if(Number(req.headers['content-length']||0)>4096)fail(413,'too_large');
  if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'json_required');
  let b=req.body;if(typeof b==='string'){try{b=JSON.parse(b)}catch{fail(400,'bad_json')}}if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'bad_json');
  db();if(b.action==='create')return send(201,await create(req,b));if(b.action==='join')return send(201,await join(req,b));
  const r=await load(code(b.code)),seat=await auth(r,req);
  if(b.action==='state')return send(200,await view(r,seat));
  return send(200,await mutation(r,seat,b))
 }catch(e){if(e.status)return send(e.status,{ok:false,error:e.code});if(e.code==='23505')return send(409,{ok:false,error:'room_conflict_retry'});
  console.error('PILEHEAD backend error:',e.message);return send(503,{ok:false,error:'service_unavailable'})}}
