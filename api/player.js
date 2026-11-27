'use strict';
const crypto=require('node:crypto');
const Runtime=require('../scripts/runtime-config.cjs');
const COOKIE='__Host-pileheads_guest';
const TTL=90*24*60*60;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const DECKS=new Set(['refined','characters','original']);
const hash=token=>crypto.createHash('sha256').update(token).digest('hex');
function cookieToken(header) {
  if(typeof header!=='string'||header.length>8192)return null;
  const values=header.split(';').map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+'='));
  if(values.length!==1)return null;
  const token=values[0].slice(COOKIE.length+1);
  return TOKEN.test(token)?token:null;
}
function setCookie(res,token,maxAge=TTL) {
  res.setHeader('Set-Cookie',COOKIE+'='+token+'; Path=/; Max-Age='+maxAge+'; HttpOnly; Secure; SameSite=Strict');
}
function reply(res,status,value) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(value));
}
function limiter(max,now=Date.now) {
  let window=-1,count=0;
  return ()=>{const minute=Math.floor(now()/60000);if(minute!==window){window=minute;count=0;}return ++count<=max;};
}
function normalizeName(value) {
  if(typeof value!=='string')return null;
  const name=value.normalize('NFC').trim();
  return name.length>=1&&name.length<=24&&!/[<>\p{C}\p{Zl}\p{Zp}]/u.test(name)?name:null;
}
function validAction(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))return false;
  const keys=Object.keys(input);
  if(input.action==='create'||input.action==='delete')return keys.length===1;
  return input.action==='preferences'&&keys.length===3&&DECKS.has(input.deck)&&normalizeName(input.name)!==null;
}
function publicProfile(row) {
  return row?{kind:'guest',deck:row.preferred_deck,name:row.display_name,expiresAt:row.expires_at}:null;
}
function createStore(query) {
  return {
    find:async digest=>(await query('SELECT preferred_deck, display_name, expires_at FROM pileheads_guest_profiles WHERE token_hash=$1 AND expires_at>now()',[digest]))[0]||null,
    create:async (id,digest)=>(await query("WITH quota AS (INSERT INTO pileheads_profile_quota(day,hits) VALUES(current_date,1) ON CONFLICT(day) DO UPDATE SET hits=pileheads_profile_quota.hits+1 WHERE pileheads_profile_quota.hits<250 RETURNING hits) INSERT INTO pileheads_guest_profiles(id,token_hash) SELECT $1,$2 FROM quota RETURNING preferred_deck,display_name,expires_at",[id,digest]))[0]||null,
    preferences:async (digest,deck,name)=>(await query('UPDATE pileheads_guest_profiles SET preferred_deck=$2,display_name=$3 WHERE token_hash=$1 AND expires_at>now() RETURNING preferred_deck,display_name,expires_at',[digest,deck,name]))[0]||null,
    remove:async digest=>{await query('DELETE FROM pileheads_guest_profiles WHERE token_hash=$1',[digest]);}
  };
}
function createHandler({enabled,configured=enabled,origin,privacyUrl=null,store,allowRead=limiter(300),allowWrite=limiter(90),allowCreate=limiter(30)}) {
  const available=Boolean(configured&&origin);
  return async(req,res)=>{
    const method=req.method;
    if(method!=='GET'&&method!=='POST'){res.setHeader('Allow','GET, POST');return reply(res,405,{ok:false});}
    if(!available)return reply(res,method==='GET'?200:503,{enabled:false,profile:null});
    if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'&&req.headers['sec-fetch-site']!=='none')return reply(res,403,{ok:false});
    if(method==='POST'&&req.headers.origin!==origin)return reply(res,403,{ok:false});
    if(method==='GET'?!allowRead():!allowWrite())return reply(res,429,{ok:false});
    const token=cookieToken(req.headers.cookie);
    const digest=token?hash(token):null;
    try{
      if(method==='GET'){
        const row=digest?await store.find(digest):null;
        if(token&&!row)setCookie(res,'',0);
        return reply(res,200,{enabled:Boolean(enabled),privacyUrl,profile:publicProfile(row)});
      }
      if(String(req.headers['content-type']||'').split(';')[0].trim()!=='application/json')return reply(res,415,{ok:false});
      if(Number(req.headers['content-length'])>512)return reply(res,413,{ok:false});
      let raw;
      if(req.body!==undefined){
        try{raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);}catch{return reply(res,400,{ok:false});}
      }else{
        const chunks=[];let bytes=0;
        for await(const chunk of req){const b=Buffer.from(chunk);bytes+=b.length;if(bytes>512)return reply(res,413,{ok:false});chunks.push(b);}
        raw=Buffer.concat(chunks).toString('utf8');
      }
      if(typeof raw!=='string')return reply(res,400,{ok:false});
      if(Buffer.byteLength(raw)>512)return reply(res,413,{ok:false});
      let body;
      try{body=JSON.parse(raw);}catch{return reply(res,400,{ok:false});}
      if(!validAction(body))return reply(res,400,{ok:false});
      if(body.action==='create'){
        if(!enabled)return reply(res,503,{ok:false});
        const existing=digest?await store.find(digest):null;
        if(existing)return reply(res,200,{enabled:Boolean(enabled),privacyUrl,profile:publicProfile(existing)});
        if(!allowCreate())return reply(res,429,{ok:false});
        const fresh=crypto.randomBytes(32).toString('base64url');
        const row=await store.create(crypto.randomUUID(),hash(fresh));
        if(!row)return reply(res,429,{ok:false});
        setCookie(res,fresh);
        return reply(res,201,{enabled:true,privacyUrl,profile:publicProfile(row)});
      }
      if(body.action==='delete'){
        if(digest)await store.remove(digest);
        setCookie(res,'',0);
        return reply(res,200,{enabled:Boolean(enabled),privacyUrl,profile:null});
      }
      if(!enabled)return reply(res,503,{ok:false});
      if(!digest)return reply(res,401,{ok:false});
      const row=await store.preferences(digest,body.deck,normalizeName(body.name));
      if(!row){setCookie(res,'',0);return reply(res,401,{ok:false});}
      return reply(res,200,{enabled:true,privacyUrl,profile:publicProfile(row)});
    }catch{return reply(res,503,{ok:false});}
  };
}
let db;
const store=createStore((sql,args)=>{
  db??=require('@neondatabase/serverless').neon(process.env.PILEHEAD_PLAYER_DATABASE_URL);
  return db.query(sql,args);
});
function configuration(env){
  const origin=env.PILEHEAD_PLAYER_ORIGIN;
  let validOrigin=false,privacyUrl=null;
  try{const u=new URL(origin);validOrigin=u.protocol==='https:'&&u.origin===origin&&!u.username&&!u.password;}catch{}
  try{const u=new URL(env.PILEHEAD_PLAYER_PRIVACY_URL);if(u.origin===origin&&u.pathname!=='/'&&!u.search&&!u.hash&&!u.username&&!u.password)privacyUrl=u.href;}catch{}
  const configured=validOrigin&&Boolean(env.PILEHEAD_PLAYER_DATABASE_URL)&&env.PILEHEAD_PLAYER_SCHEMA_READY==='1';
  return{configured,enabled:configured&&Boolean(privacyUrl)&&env.PILEHEAD_PLAYER_ENABLED==='1',origin,privacyUrl};
}
const rates={allowRead:limiter(300),allowWrite:limiter(90),allowCreate:limiter(30)};
const handler=async(req,res)=>createHandler({...configuration(await Runtime.load()),store,...rates})(req,res);
module.exports=handler;
Object.assign(module.exports,{handler,createHandler,createStore,cookieToken,validAction,normalizeName,hash,limiter,COOKIE,TTL,configuration});
