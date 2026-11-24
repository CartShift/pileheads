'use strict';
const crypto=require('node:crypto');
const COOKIE='__Host-stack_guest';
const TTL=90*24*60*60;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const DECKS=new Set(['characters','original']);
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
function validAction(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))return false;
  const keys=Object.keys(input);
  if(input.action==='create'||input.action==='delete')return keys.length===1;
  return input.action==='preferences'&&keys.length===2&&DECKS.has(input.deck);
}
function publicProfile(row) {
  return row?{kind:'guest',deck:row.preferred_deck,expiresAt:row.expires_at}:null;
}
function createStore(query) {
  return {
    find:async digest=>(await query('SELECT preferred_deck, expires_at FROM stack_guest_players WHERE token_hash=$1 AND expires_at>now()',[digest]))[0]||null,
    create:async (id,digest)=>(await query("INSERT INTO stack_guest_players(id,token_hash) VALUES($1,$2) RETURNING preferred_deck,expires_at",[id,digest]))[0],
    preferences:async (digest,deck)=>(await query('UPDATE stack_guest_players SET preferred_deck=$2 WHERE token_hash=$1 AND expires_at>now() RETURNING preferred_deck,expires_at',[digest,deck]))[0]||null,
    remove:async digest=>{await query('DELETE FROM stack_guest_players WHERE token_hash=$1',[digest]);}
  };
}
function createHandler({enabled,origin,store,allowRead=limiter(300),allowWrite=limiter(90),allowCreate=limiter(30)}) {
  const available=Boolean(enabled&&origin);
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
        return reply(res,200,{enabled:true,profile:publicProfile(row)});
      }
      if(String(req.headers['content-type']||'').split(';')[0].trim()!=='application/json')return reply(res,415,{ok:false});
      if(Number(req.headers['content-length'])>512)return reply(res,413,{ok:false});
      const chunks=[];let bytes=0;
      for await(const chunk of req){const b=Buffer.from(chunk);bytes+=b.length;if(bytes>512)return reply(res,413,{ok:false});chunks.push(b);}
      let body;
      try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply(res,400,{ok:false});}
      if(!validAction(body))return reply(res,400,{ok:false});
      if(body.action==='create'){
        const existing=digest?await store.find(digest):null;
        if(existing)return reply(res,200,{enabled:true,profile:publicProfile(existing)});
        if(!allowCreate())return reply(res,429,{ok:false});
        const fresh=crypto.randomBytes(32).toString('base64url');
        const row=await store.create(crypto.randomUUID(),hash(fresh));
        if(!row)throw Error('create_failed');
        setCookie(res,fresh);
        return reply(res,201,{enabled:true,profile:publicProfile(row)});
      }
      if(body.action==='delete'){
        if(digest)await store.remove(digest);
        setCookie(res,'',0);
        return reply(res,200,{enabled:true,profile:null});
      }
      if(!digest)return reply(res,401,{ok:false});
      const row=await store.preferences(digest,body.deck);
      if(!row){setCookie(res,'',0);return reply(res,401,{ok:false});}
      return reply(res,200,{enabled:true,profile:publicProfile(row)});
    }catch{return reply(res,503,{ok:false});}
  };
}
let db;
const store=createStore((sql,args)=>{
  db??=require('@neondatabase/serverless').neon(process.env.PILEHEAD_DATABASE_URL);
  return db.query(sql,args);
});
const origin=process.env.STACK_PLAYER_ORIGIN;
const handler=createHandler({enabled:process.env.STACK_PLAYER_ENABLED==='true'&&Boolean(process.env.PILEHEAD_DATABASE_URL)&&/^https:\/\/[^/?#]+$/.test(origin||''),origin,store});
module.exports={handler,createHandler,createStore,cookieToken,validAction,hash,limiter,COOKIE,TTL};
