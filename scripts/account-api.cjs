'use strict';
const {limiter,cookieToken:guestToken}=require('../api/player.js');
const {createAccountStore,publicAccount,preferences}=require('./account-store.cjs');
const OIDC=require('./google-oidc.cjs');
const SESSION='__Host-pileheads_account',FLOW='__Host-pileheads_oauth',TTL=30*86400;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
function cookie(header,name){
 if(typeof header!=='string'||header.length>8192)return null;
 const values=header.split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
 return values.length===1?values[0].slice(name.length+1):null;
}
function setCookie(res,name,value,age){
 const next=name+'='+value+'; Path=/; Max-Age='+age+'; Secure; HttpOnly; SameSite=Lax';
 const existing=res.getHeader('Set-Cookie');
 res.setHeader('Set-Cookie',existing?[].concat(existing,next):next);
}
function headers(res){res.setHeader('Cache-Control','no-store, private');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff')}
function reply(res,status,data){headers(res);res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))}
function redirect(res,path){headers(res);res.statusCode=303;res.setHeader('Location',path);res.end()}
function validAction(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const n=Object.keys(input).length;
 if(['login','logout','import_guest'].includes(input.action))return n===1;
 if(input.action==='delete')return n===2&&input.confirm===true;
 if(input.action==='preferences'&&n===3){try{preferences(input);return true}catch{return false}}
 return false;
}
async function body(req){
 if(String(req.headers['content-type']||'').split(';')[0].trim()!=='application/json')return {status:415};
 if(Number(req.headers['content-length'])>1024)return {status:413};
 let raw;
 try{
  if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
  else{const chunks=[];let n=0;for await(const chunk of req){const b=Buffer.from(chunk);n+=b.length;if(n>1024)return {status:413};chunks.push(b)}raw=Buffer.concat(chunks).toString('utf8')}
  if(typeof raw!=='string')return {status:400};
  if(Buffer.byteLength(raw)>1024)return {status:413};
  const value=JSON.parse(raw);return validAction(value)?{value}:{status:400};
 }catch{return {status:400}}
}
function configuration(env){
 const origin=env.PILEHEAD_PLAYER_ORIGIN;
 let validOrigin=false,privacyUrl=null;
 try{const u=new URL(origin);validOrigin=u.protocol==='https:'&&u.origin===origin&&!u.username&&!u.password}catch{}
 try{const u=new URL(env.PILEHEAD_PLAYER_PRIVACY_URL);if(u.origin===origin&&u.pathname!=='/'&&!u.search&&!u.hash&&!u.username&&!u.password)privacyUrl=u.href}catch{}
 const configured=validOrigin&&Boolean(env.PILEHEAD_PLAYER_DATABASE_URL)&&env.PILEHEAD_PLAYER_SCHEMA_READY==='1'&&env.PILEHEAD_ACCOUNT_SCHEMA_READY==='1';
 const clientId=env.PILEHEAD_GOOGLE_CLIENT_ID,clientSecret=env.PILEHEAD_GOOGLE_CLIENT_SECRET,flowSecret=env.PILEHEAD_ACCOUNT_FLOW_SECRET;
 const enabled=configured&&Boolean(privacyUrl)&&env.PILEHEAD_ACCOUNT_ENABLED==='1'&&Boolean(clientId&&clientSecret&&flowSecret?.length>=32);
 return {configured,enabled,origin,privacyUrl,clientId,clientSecret,flowSecret};
}
function createHandlers({config,store,exchange=OIDC.exchangeGoogle,allowRead=limiter(300),allowWrite=limiter(90),allowLogin=limiter(30),now=Date.now}){
 const result=row=>({enabled:Boolean(config.enabled),privacyUrl:config.privacyUrl??null,profile:publicAccount(row)});
 const session=req=>{const value=cookie(req.headers.cookie,SESSION);return TOKEN.test(value||'')?value:null};
 async function api(req,res){
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return reply(res,405,{ok:false})}
  if(!config.configured)return reply(res,req.method==='GET'?200:503,result(null));
  if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return reply(res,403,{ok:false});
  if(req.method==='POST'&&req.headers.origin!==config.origin)return reply(res,403,{ok:false});
  if(req.method==='GET'?!allowRead():!allowWrite())return reply(res,429,{ok:false});
  const raw=session(req);
  try{
   if(req.method==='GET'){
    const row=raw?await store.find(raw):null;
    if(raw&&!row)setCookie(res,SESSION,'',0);
    return reply(res,200,result(row));
   }
   const parsed=await body(req);if(parsed.status)return reply(res,parsed.status,{ok:false});
   const b=parsed.value;
   if(b.action==='login'){
    if(!config.enabled)return reply(res,503,{ok:false});
    if(!allowLogin())return reply(res,429,{ok:false});
    const {flow,cookie:encoded}=OIDC.createFlow(config.flowSecret,now());
    setCookie(res,FLOW,encoded,600);
    return reply(res,200,{url:OIDC.authorizationUrl(config,flow)});
   }
   if(!raw)return reply(res,401,{ok:false});
   if(b.action==='logout'){
    await store.logout(raw);setCookie(res,SESSION,'',0);return reply(res,200,result(null));
   }
   if(b.action==='delete'){
    if(!await store.remove(raw)){setCookie(res,SESSION,'',0);return reply(res,401,{ok:false})}
    setCookie(res,SESSION,'',0);return reply(res,200,result(null));
   }
   if(!config.enabled)return reply(res,503,{ok:false});
   if(b.action==='preferences'){
    const row=await store.preferences(raw,b);if(!row)return reply(res,401,{ok:false});return reply(res,200,result(row));
   }
   if(b.action==='import_guest'){
    const guest=guestToken(req.headers.cookie);
    const row=guest?await store.importGuestPreferences(raw,guest):null;
    if(!row)return reply(res,409,{ok:false});return reply(res,200,result(row));
   }
   return reply(res,400,{ok:false});
  }catch{return reply(res,503,{ok:false})}
 }
 async function callback(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(res,405,{ok:false})}
  setCookie(res,FLOW,'',0);
  if(!config.enabled)return redirect(res,'/profile?login=unavailable');
  try{
   const url=new URL(req.url,config.origin);
   const one=key=>url.searchParams.getAll(key).length===1?url.searchParams.get(key):null;
   const flow=OIDC.readFlow(cookie(req.headers.cookie,FLOW),config.flowSecret,now()),code=one('code'),state=one('state'),issuer=url.searchParams.getAll('iss');
   if(!flow||!OIDC.safeEqual(state,flow.state)||!code||code.length>2048||url.searchParams.has('error')||issuer.length>1||(issuer.length===1&&issuer[0]!=='https://accounts.google.com')||!allowLogin())
    return redirect(res,'/profile?login=failed');
   const identity=await exchange(config,code,flow);
   const opened=await store.loginVerifiedIdentity(identity,session(req));
   setCookie(res,SESSION,opened.token,TTL);
   return redirect(res,'/profile');
  }catch{return redirect(res,'/profile?login=failed')}
 }
 return {api,callback};
}
let db;
const store=createAccountStore((sql,args)=>{db??=require('@neondatabase/serverless').neon(process.env.PILEHEAD_PLAYER_DATABASE_URL);return db.query(sql,args)});
const handlers=createHandlers({config:configuration(process.env),store});
module.exports={...handlers,createHandlers,configuration,validAction,SESSION,FLOW};
