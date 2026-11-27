'use strict';
const crypto=require('node:crypto');
const {validateIdentity}=require('./account-store.cjs');
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const random=()=>crypto.randomBytes(32).toString('base64url');
function safeEqual(a,b){return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b))}
function sign(body,secret){return crypto.createHmac('sha256',secret).update(body).digest('base64url')}
function createFlow(secret,now=Date.now()){
 const flow={state:random(),verifier:random(),nonce:random(),created:now};
 const body=[flow.state,flow.verifier,flow.nonce,flow.created].join('.');
 return {flow,cookie:body+'.'+sign(body,secret)};
}
function readFlow(cookie,secret,now=Date.now()){
 if(typeof cookie!=='string'||cookie.length>300)return null;
 const parts=cookie.split('.');if(parts.length!==5||!parts.slice(0,3).every(x=>TOKEN.test(x))||!/^\d{13}$/.test(parts[3])||!TOKEN.test(parts[4]))return null;
 const body=parts.slice(0,4).join('.');
 if(!safeEqual(parts[4],sign(body,secret)))return null;
 const [state,verifier,nonce,t]=parts,created=Number(t);
 return created<=now&&now-created<=600000?{state,verifier,nonce,created}:null;
}
function authorizationUrl(config,flow){
 const params=new URLSearchParams({client_id:config.clientId,redirect_uri:config.origin+'/api/account/callback',response_type:'code',scope:'openid',state:flow.state,nonce:flow.nonce,code_challenge:crypto.createHash('sha256').update(flow.verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});
 return 'https://accounts.google.com/o/oauth2/v2/auth?'+params;
}
let remoteKeys;
async function verifyIdToken(idToken,{clientId,nonce,keys,now=Date.now()}){
 if(typeof idToken!=='string'||idToken.length>12000)throw Error('invalid identity token');
 const jose=await import('jose');
 const jwks=keys??(remoteKeys??=jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:8000}));
 const {payload}=await jose.jwtVerify(idToken,jwks,{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,algorithms:['RS256'],requiredClaims:['sub','iat','exp','nonce'],maxTokenAge:'10m',clockTolerance:60,currentDate:new Date(now)});
 const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
 if(!safeEqual(payload.nonce,nonce)||(aud.length>1&&payload.azp!==clientId)||(payload.azp!==undefined&&payload.azp!==clientId))throw Error('invalid identity claims');
 const identity={provider:'google',subject:payload.sub};validateIdentity(identity);return identity;
}
async function exchangeGoogle(config,code,flow,request=fetch){
 const response=await request('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.origin+'/api/account/callback',grant_type:'authorization_code',code_verifier:flow.verifier})});
 if(!response.ok)throw Error('identity exchange failed');
 const data=await response.json();
 return verifyIdToken(data.id_token,{clientId:config.clientId,nonce:flow.nonce});
}
module.exports={safeEqual,createFlow,readFlow,authorizationUrl,verifyIdToken,exchangeGoogle};
