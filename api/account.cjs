'use strict';
const crypto=require('node:crypto');
const {serveBonus}=require('./founder-bonus.cjs');
const {hash,limiter,cookieToken:guestToken}=require('./player.cjs');
const SESSION='__Host-stack_account',FLOW='__Host-stack_oauth';
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const DECKS=new Set(['characters','original']);
const PRODUCT='founder-supporter';
const random=()=>crypto.randomBytes(32).toString('base64url');
function cookie(header,name){
 if(typeof header!=='string'||header.length>8192)return null;
 const matches=header.split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
 return matches.length===1?matches[0].slice(name.length+1):null;
}
function setCookie(res,name,value,age,sameSite='Strict'){
 const next=name+'='+value+'; Path=/; Max-Age='+age+'; Secure; HttpOnly; SameSite='+sameSite;
 const existing=res.getHeader('Set-Cookie');
 res.setHeader('Set-Cookie',existing?[].concat(existing,next):next);
}
function secure(res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Content-Type-Options','nosniff');
}
function reply(res,status,body){secure(res);res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));}
function redirect(res,path){secure(res);res.statusCode=303;res.setHeader('Location',path);res.end();}
function makeFlow(now=Date.now()){
 return {state:random(),verifier:random(),nonce:random(),created:now};
}
function readFlow(value,now=Date.now()){
 if(typeof value!=='string')return null;
 const parts=value.split('.');
 if(parts.length!==4||!parts.slice(0,3).every(x=>TOKEN.test(x))||!/^\d{13}$/.test(parts[3]))return null;
 const [state,verifier,nonce,time]=parts,created=Number(time);
 return created<=now&&now-created<=600000?{state,verifier,nonce,created}:null;
}
function authUrl({clientId,origin},flow){
 const params=new URLSearchParams({client_id:clientId,redirect_uri:origin+'/api/account/callback',response_type:'code',scope:'openid',state:flow.state,nonce:flow.nonce,code_challenge:crypto.createHash('sha256').update(flow.verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});
 return 'https://accounts.google.com/o/oauth2/v2/auth?'+params;
}
function claimsFromToken(token,keys,{clientId,nonce,now=Date.now()}){
 if(typeof token!=='string'||token.length>12000)throw Error('invalid_id_token');
 const parts=token.split('.');
 if(parts.length!==3)throw Error('invalid_id_token');
 const header=JSON.parse(Buffer.from(parts[0],'base64url').toString());
 if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('invalid_algorithm');
 const key=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'));
 if(!key||!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('invalid_signature');
 const c=JSON.parse(Buffer.from(parts[1],'base64url').toString()),seconds=Math.floor(now/1000);
 const aud=Array.isArray(c.aud)?c.aud:[c.aud];
 if(!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||!aud.includes(clientId)||(aud.length>1&&c.azp!==clientId)||(c.azp!==undefined&&c.azp!==clientId)||c.nonce!==nonce||!Number.isFinite(c.exp)||c.exp<=seconds||!Number.isFinite(c.iat)||c.iat>seconds+60||c.iat<seconds-600||typeof c.sub!=='string'||!c.sub||c.sub.length>255)throw Error('invalid_claims');
 return c.sub;
}
async function exchangeGoogle(config,code,flow,request=fetch){
 const response=await request('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.origin+'/api/account/callback',grant_type:'authorization_code',code_verifier:flow.verifier})});
 if(!response.ok)throw Error('token_exchange_failed');
 const tokens=await response.json();
 const certs=await request('https://www.googleapis.com/oauth2/v3/certs',{redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!certs.ok)throw Error('keys_unavailable');
 const keys=await certs.json();
 return claimsFromToken(tokens.id_token,keys.keys,{clientId:config.clientId,nonce:flow.nonce});
}
function createStore(query){
 return {
  login:async(subject,digest)=>(await query("WITH account AS (INSERT INTO stack_accounts(id,google_subject) VALUES($1,$2) ON CONFLICT(google_subject) DO UPDATE SET google_subject=EXCLUDED.google_subject RETURNING id), session AS (INSERT INTO stack_account_sessions(token_hash,account_id) SELECT $3,id FROM account RETURNING account_id) SELECT account_id FROM session",[crypto.randomUUID(),subject,digest]))[0],
  find:async digest=>(await query("SELECT a.id,a.preferred_deck FROM stack_account_sessions s JOIN stack_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()",[digest]))[0]||null,
  logout:async digest=>query("DELETE FROM stack_account_sessions WHERE token_hash=$1",[digest]),
  preference:async(id,deck)=>query("UPDATE stack_accounts SET preferred_deck=$2 WHERE id=$1",[id,deck]),
  importGuest:async(id,digest)=>query("UPDATE stack_accounts a SET preferred_deck=g.preferred_deck FROM stack_guest_players g WHERE a.id=$1 AND g.token_hash=$2 AND g.expires_at>now() RETURNING a.id",[id,digest]),
  owned:async id=>(await query("SELECT product_id FROM stack_entitlements WHERE account_id=$1 AND revoked_at IS NULL UNION SELECT 'sandbox-supporter' WHERE EXISTS(SELECT 1 FROM stack_test_orders o WHERE o.account_id=$1 AND o.paid_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM stack_test_refunds r WHERE r.payment_intent=o.payment_intent)) ORDER BY product_id",[id])).map(r=>r.product_id),
  redeem:async(id,digest)=>(await query("SELECT product_id FROM stack_redeem_code($1,$2)",[id,digest]))[0]||null,
  remove:async id=>query("DELETE FROM stack_accounts WHERE id=$1",[id])
 };
}
function validAction(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const n=Object.keys(input).length;
 if(['login','logout','import_guest','delete'].includes(input.action))return n===1;
 if(input.action==='preferences')return n===2&&DECKS.has(input.deck);
 if(input.action==='redeem')return n===2&&typeof input.code==='string'&&/^[A-Za-z0-9_-]{32}$/.test(input.code);
 return false;
}
function createHandler({config,store,exchange=exchangeGoogle,allow=limiter(240),allowLogin=limiter(30),allowRedeem=limiter(30)}){
 const enabled=Boolean(config.enabled&&config.origin&&config.clientId&&config.clientSecret);
 const profile=async row=>row?{kind:'account',deck:row.preferred_deck,owned:await store.owned(row.id),supportId:row.id}:null;
 return async(req,res,url)=>{
  if(!enabled)return reply(res,req.method==='GET'?200:503,{enabled:false,profile:null});
  if(!allow())return reply(res,429,{ok:false});
  const raw=cookie(req.headers.cookie,SESSION),digest=raw&&TOKEN.test(raw)?hash(raw):null;
  try{
   if(url.pathname==='/api/account/callback'){
    if(req.method!=='GET')return reply(res,405,{ok:false});
    const flow=readFlow(cookie(req.headers.cookie,FLOW)),state=url.searchParams.get('state'),code=url.searchParams.get('code');
    setCookie(res,FLOW,'',0,'Lax');
    if(!flow||state!==flow.state||!code||code.length>2048||url.searchParams.has('error')||!allowLogin())return redirect(res,'/account?login=failed');
    const subject=await exchange(config,code,flow),fresh=random();
    await store.login(subject,hash(fresh));
    if(digest)await store.logout(digest);
    setCookie(res,SESSION,fresh,30*86400);
    return redirect(res,'/account');
   }
   if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(res,405,{ok:false});}
   if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return reply(res,403,{ok:false});
   if(url.pathname==='/api/account/bonus')return await serveBonus(req,res,{row:digest?await store.find(digest):null,owned:store.owned,reply,secure});
   if(req.method==='GET'){
    const row=digest?await store.find(digest):null;
    if(raw&&!row)setCookie(res,SESSION,'',0);
    return reply(res,200,{enabled:true,profile:await profile(row)});
   }
   if(req.headers.origin!==config.origin)return reply(res,403,{ok:false});
   if(String(req.headers['content-type']||'').split(';')[0].trim()!=='application/json')return reply(res,415,{ok:false});
   if(Number(req.headers['content-length'])>1024)return reply(res,413,{ok:false});
   const chunks=[];let size=0;
   for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>1024)return reply(res,413,{ok:false});chunks.push(b);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return reply(res,400,{ok:false});}
   if(!validAction(body))return reply(res,400,{ok:false});
   if(body.action==='login'){
    if(!allowLogin())return reply(res,429,{ok:false});
    const flow=makeFlow();
    setCookie(res,FLOW,[flow.state,flow.verifier,flow.nonce,flow.created].join('.'),600,'Lax');
    return reply(res,200,{url:authUrl(config,flow)});
   }
   const row=digest?await store.find(digest):null;
   if(!row)return reply(res,401,{ok:false});
   if(body.action==='logout'||body.action==='delete'){
    if(body.action==='delete')await store.remove(row.id);else await store.logout(digest);
    setCookie(res,SESSION,'',0);return reply(res,200,{enabled:true,profile:null});
   }
   if(body.action==='preferences'){await store.preference(row.id,body.deck);row.preferred_deck=body.deck;}
   if(body.action==='import_guest'){
    const guest=guestToken(req.headers.cookie);
    if(!guest||!(await store.importGuest(row.id,hash(guest))).length)return reply(res,409,{ok:false});
    const fresh=await store.find(digest);if(!fresh)return reply(res,401,{ok:false});
    row.preferred_deck=fresh.preferred_deck;
   }
   if(body.action==='redeem'){
    if(!allowRedeem())return reply(res,429,{ok:false});
    if(!await store.redeem(row.id,hash(body.code)))return reply(res,409,{ok:false});
   }
   return reply(res,200,{enabled:true,profile:await profile(row)});
  }catch{
   if(url.pathname==='/api/account/callback')return redirect(res,'/account?login=failed');
   return reply(res,503,{ok:false});
  }
 };
}
let db;
const store=createStore((sql,args)=>{db??=require('@neondatabase/serverless').neon(process.env.PILEHEAD_DATABASE_URL);return db.query(sql,args);});
const origin=process.env.STACK_PLAYER_ORIGIN;
const config={enabled:process.env.STACK_ACCOUNT_ENABLED==='true'&&Boolean(process.env.PILEHEAD_DATABASE_URL)&&/^https:\/\/[^/?#]+$/.test(origin||''),origin,clientId:process.env.STACK_GOOGLE_CLIENT_ID,clientSecret:process.env.STACK_GOOGLE_CLIENT_SECRET};
const handler=createHandler({config,store});
module.exports={handler,createHandler,createStore,validAction,claimsFromToken,makeFlow,readFlow,authUrl,exchangeGoogle,PRODUCT,SESSION,FLOW};
