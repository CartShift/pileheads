'use strict';
// Invite-only pilot. Canonical production requires a separate explicit live flag.
const crypto=require('node:crypto');
const Runtime=require('./runtime-config.cjs');
const {digest}=require('./account-store.cjs');
const {configuration:accountConfiguration}=require('./account-api.cjs');
const {createQueue,SQL:Q}=require('./matchmaking-queue.cjs');
const {createAssignment,SQL:A}=require('./matchmaking-assignment.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const VERSION=/^[A-Za-z0-9_-]{1,32}$/;
const actorSQL='SELECT account_id FROM pileheads_account_sessions WHERE token_hash=$1 AND expires_at>now()';
const quotaSQL="INSERT INTO pilehead_rate_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '10 minutes') ON CONFLICT(bucket) DO UPDATE SET hits=pilehead_rate_limits.hits+1 RETURNING hits";
const terminalSQL=`SELECT r.expires_at<=now() OR r.state->>'tournamentWithdrawal' IS NOT NULL OR (r.status='finished' AND r.state->>'phase'='over' AND r.state->>'round'='3' AND r.state->>'roundLimit'='3') AS terminal,r.expires_at>now() AS recoverable
 FROM pileheads_match_offers o JOIN pilehead_rooms r ON r.code=o.room_code
 JOIN pileheads_account_sessions s ON s.account_id IN(o.account_a,o.account_b)
 WHERE s.token_hash=$1 AND s.expires_at>now() AND o.id=$2::uuid`;
function config(env){
 try{
  const origin=env.PILEHEAD_MATCHMAKING_PREVIEW_ORIGIN,u=new URL(origin);
  const allow=(env.PILEHEAD_MATCHMAKING_PREVIEW_ACCOUNTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const keys=JSON.parse(env.PILEHEAD_MATCHMAKING_SEAT_KEYS||'{}'),activeVersion=env.PILEHEAD_MATCHMAKING_SEAT_KEY_VERSION;
  const live=origin==='https://pileheads.com';
  const allowedEnvironment=live?env.PILEHEAD_MATCHMAKING_LIVE_PILOT_ENABLED==='1'&&accountConfiguration(env).enabled:env.VERCEL_ENV!=='production'&&u.hostname!=='www.pileheads.com'&&env.PILEHEAD_MATCHMAKING_PREVIEW_ENABLED==='1';
  if(!allowedEnvironment||env.PILEHEAD_MATCHMAKING_SCHEMA_READY!=='1'||env.PILEHEAD_HISTORY_SHARED_DATABASE_READY!=='1'||env.PILEHEAD_ACCOUNT_SCHEMA_READY!=='1'||env.PILEHEAD_PLAYER_SCHEMA_READY!=='1'||env.PILEHEAD_ACCOUNT_ENABLED!=='1'||!env.PILEHEAD_DATABASE_URL||!env.PILEHEAD_PLAYER_DATABASE_URL||u.protocol!=='https:'||u.origin!==origin||origin!==env.PILEHEAD_PLAYER_ORIGIN||!allow.length||allow.length>50||!allow.every(a=>UUID.test(a))||!VERSION.test(activeVersion)||!keys||typeof keys!=='object'||Array.isArray(keys)||!TOKEN.test(keys[activeVersion]||'')||Object.keys(keys).length>5)return {enabled:false};
  return {enabled:true,origin,allow:[...new Set(allow)],keys,activeVersion,live};
 }catch{return {enabled:false}}
}
function rawSession(req){
 const h=req.headers.cookie;
 if(typeof h!=='string'||h.length>8192)return null;
 const matches=h.split(';').map(x=>x.trim()).filter(x=>x.startsWith('__Host-pileheads_account='));
 const value=matches.length===1?matches[0].slice('__Host-pileheads_account='.length):null;
 return TOKEN.test(value||'')?value:null;
}
function valid(b){
 if(!b||typeof b!=='object'||Array.isArray(b))return false;
 const n=Object.keys(b).length;
 if(['status','join','recover'].includes(b.action))return n===1;
 if(['accept','release'].includes(b.action))return n===2&&typeof b.offer==='string'&&UUID.test(b.offer);
 if(b.action==='cancel')return n===2&&((typeof b.offer==='string'&&UUID.test(b.offer))||(typeof b.ticket==='string'&&UUID.test(b.ticket)));
 return false;
}
async function body(req){
 if(String(req.headers['content-type']||'').split(';')[0].trim()!=='application/json')return null;
 if(Number(req.headers['content-length'])>1024)return null;
 try{
  let raw;
  if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
  else{const chunks=[];let n=0;for await(const chunk of req){const b=Buffer.from(chunk);n+=b.length;if(n>1024)return null;chunks.push(b)}raw=Buffer.concat(chunks).toString('utf8')}
  if(typeof raw!=='string'||Buffer.byteLength(raw)>1024)return null;
  const b=JSON.parse(raw);return valid(b)?b:null;
 }catch{return null}
}
function createService(query,c){
 // Restricted preview account set is checked both during claim and assignment.
 const claim=Q.claim.replaceAll('q.offer_id IS NULL','q.account_id=ANY($2::uuid[]) AND q.offer_id IS NULL').replace('candidate.account_id<>q.account_id','candidate.account_id=ANY($2::uuid[]) AND candidate.account_id<>q.account_id');
 const assign=A.assign.replace('WHERE o.id=$1::uuid','WHERE o.account_a=ANY($7::uuid[]) AND o.account_b=ANY($7::uuid[]) AND o.id=$1::uuid');
 const q=createQueue((sql,args)=>sql===Q.claim?query(claim,[...args,c.allow]):query(sql,args));
 const a=createAssignment((sql,args)=>sql===A.assign?query(assign,[...args,c.allow]):query(sql,args),c);
 return {
  async authorize(raw){const key=digest(raw);if(!key)return null;const [r]=await query(actorSQL,[key]);const id=r?.account_id;if(typeof id!=='string'||!c.allow.includes(id.toLowerCase()))return null;return id;},
  async quota(id){const bucket=crypto.createHash('sha256').update('quick-play-preview|'+id+'|'+Math.floor(Date.now()/60000)).digest('hex');const [r]=await query(quotaSQL,[bucket]);return Number(r?.hits)<=60;},
  async status(raw){const status=await q.status(raw);if(status.state==='assigned'){const [r]=await query(terminalSQL,[digest(raw),status.offer]);return {...status,canRelease:r?.terminal===true,canRecover:r?.recoverable===true}}return status},
  async tick(raw){
   let s=await q.status(raw);
   if(s.state==='waiting'){await q.claim();s=await q.status(raw)}
   if(s.state==='ready'){await a.assign(s.offer);s=await q.status(raw)}
   if(s.state==='assigned'){const [r]=await query(terminalSQL,[digest(raw),s.offer]);return {...s,canRelease:r?.terminal===true,canRecover:r?.recoverable===true}}
   return s;
  },
  async join(raw){await query(Q.expireOffers,[]);await query(Q.expireWaiting,[]);await q.join(raw);return this.tick(raw)},
  async accept(raw,offer){await q.accept(raw,offer);return this.tick(raw)},
  async cancel(raw,b){await q.cancel(raw,b);return this.status(raw)},
  async recover(raw){return a.recover(raw)},
  async release(raw,offer){await a.release(raw,offer);return this.status(raw)}
 };
}
function createHandler(c,service){
 function reply(res,status,data){res.statusCode=status;res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))}
 return async function handler(req,res){
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return reply(res,405,{ok:false})}
  if(!c.enabled)return reply(res,req.method==='GET'?200:503,{available:false});
  if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return reply(res,403,{ok:false});
  if(req.method==='POST'&&req.headers.origin!==c.origin)return reply(res,403,{ok:false});
  const raw=rawSession(req);
  try{
   const actor=raw?await service.authorize(raw):null;
   if(!actor)return reply(res,req.method==='GET'?200:401,{available:true,authorized:false});
   if(!await service.quota(actor))return reply(res,429,{ok:false});
   if(req.method==='GET')return reply(res,200,{available:true,authorized:true,status:await service.status(raw)});
   const b=await body(req);if(!b)return reply(res,400,{ok:false});
   if(b.action==='recover'){
    const seat=await service.recover(raw);
    return seat?reply(res,200,{available:true,authorized:true,seat}):reply(res,409,{ok:false});
   }
   const status=b.action==='status'?await service.tick(raw):b.action==='join'?await service.join(raw):b.action==='accept'?await service.accept(raw,b.offer):b.action==='cancel'?await service.cancel(raw,b):await service.release(raw,b.offer);
   return reply(res,200,{available:true,authorized:true,status});
  }catch{return reply(res,503,{ok:false})}
 }
}
let db;
const query=(sql,args)=>{db??=require('@neondatabase/serverless').neon(process.env.PILEHEAD_DATABASE_URL);return db.query(sql,args)};
module.exports={config,createService,createHandler,valid,handler:async(req,res)=>{const c=config(await Runtime.load());return createHandler(c,c.enabled?createService(query,c):null)(req,res)}};
