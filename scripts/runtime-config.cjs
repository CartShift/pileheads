'use strict';
const crypto=require('node:crypto');
const ORIGIN='https://pileheads.com',PRIVACY=ORIGIN+'/privacy',VERSION='v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/;
const SQL=`SELECT database_id,privacy_reviewed,guest_profiles,accounts,round_history,private_history,progression,quick_play,pilot_accounts,
 (to_regclass('public.pileheads_guest_profiles') IS NOT NULL AND to_regclass('public.pileheads_profile_quota') IS NOT NULL) AS player_ready,
 (to_regclass('public.pileheads_accounts') IS NOT NULL AND to_regclass('public.pileheads_account_sessions') IS NOT NULL) AS account_ready,
 (to_regclass('public.pileheads_account_signup_quota') IS NOT NULL) AS signup_ready,
 (to_regclass('public.pileheads_round_receipts') IS NOT NULL) AS receipts_ready,
 (to_regclass('public.pileheads_round_consents') IS NOT NULL AND to_regclass('public.pileheads_player_rounds') IS NOT NULL) AS history_ready,
 (to_regclass('public.pileheads_player_progression') IS NOT NULL AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.pileheads_round_consents') AND attname='progression_opt_in' AND NOT attisdropped)) AS progression_ready,
 (to_regclass('public.pileheads_queue_tickets') IS NOT NULL AND to_regclass('public.pileheads_match_blocks') IS NOT NULL AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.pileheads_match_offers') AND attname='room_code' AND NOT attisdropped) AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.pileheads_match_offers') AND attname='seat_key_version' AND NOT attisdropped)) AS matchmaking_ready
 FROM public.pileheads_product_settings WHERE singleton=true`;
const INVITES_SQL='SELECT email_hash FROM public.pileheads_pilot_invites ORDER BY email_hash LIMIT 51';
const managed=e=>e.VERCEL_ENV==='production';
function emailHash(email){return typeof email==='string'?crypto.createHash('sha256').update(email.trim().toLowerCase(),'utf8').digest('hex'):null}
function deriveSeatKey(secret){if(typeof secret!=='string'||secret.length<32)return null;return Buffer.from(crypto.hkdfSync('sha256',Buffer.from(secret),Buffer.from('pileheads-runtime-v1'),Buffer.from('quick-play-seat-signing-v1'),32)).toString('base64url')}
function disabledEnv(e){
 // Deliberately reconstruct, never inherit stale operational flags in production.
 return {VERCEL_ENV:e.VERCEL_ENV,PILEHEAD_DATABASE_URL:e.PILEHEAD_DATABASE_URL,PILEHEAD_PLAYER_DATABASE_URL:e.PILEHEAD_PLAYER_DATABASE_URL,PILEHEAD_GOOGLE_CLIENT_ID:e.PILEHEAD_GOOGLE_CLIENT_ID,PILEHEAD_GOOGLE_CLIENT_SECRET:e.PILEHEAD_GOOGLE_CLIENT_SECRET,PILEHEAD_ACCOUNT_FLOW_SECRET:e.PILEHEAD_ACCOUNT_FLOW_SECRET,PILEHEAD_PLAYER_ORIGIN:ORIGIN};
}
function effective(e,room,player,invites){
 const out=disabledEnv(e),flag=(k,on)=>{if(on)out[k]='1'};
 if(!room||!player||!UUID.test(room.database_id||'')||room.database_id!==player.database_id)return out;
 // Both separately authenticated runtime connections must observe the same schema.
 const ready=k=>room[k]===true&&player[k]===true;
 const on=k=>room[k]===true&&player[k]===true;
 const privacy=on('privacy_reviewed');
 if(privacy)out.PILEHEAD_PLAYER_PRIVACY_URL=PRIVACY;
 const profile=ready('player_ready'),account=profile&&ready('account_ready');
 const receipts=ready('receipts_ready'),history=account&&receipts&&ready('history_ready'),progress=history&&ready('progression_ready');
 const allow=Array.isArray(room.pilot_accounts)&&Array.isArray(player.pilot_accounts)&&room.pilot_accounts.length<=50&&room.pilot_accounts.every(x=>typeof x==='string'&&UUID.test(x))&&JSON.stringify(room.pilot_accounts)===JSON.stringify(player.pilot_accounts)?room.pilot_accounts:[];
 const oauth=Boolean(out.PILEHEAD_GOOGLE_CLIENT_ID&&out.PILEHEAD_GOOGLE_CLIENT_SECRET&&deriveSeatKey(out.PILEHEAD_ACCOUNT_FLOW_SECRET));
 const accountOn=account&&ready('signup_ready')&&privacy&&on('accounts')&&oauth;
 flag('PILEHEAD_PLAYER_SCHEMA_READY',profile);flag('PILEHEAD_ACCOUNT_SCHEMA_READY',account);
 flag('PILEHEAD_HISTORY_SHARED_DATABASE_READY',history||ready('matchmaking_ready'));
 flag('PILEHEAD_ROUND_HISTORY_SCHEMA_READY',receipts);flag('PILEHEAD_PRIVATE_HISTORY_SCHEMA_READY',history);flag('PILEHEAD_PROGRESSION_SCHEMA_READY',progress);
 flag('PILEHEAD_PLAYER_ENABLED',profile&&privacy&&on('guest_profiles'));
 flag('PILEHEAD_ACCOUNT_ENABLED',accountOn);flag('PILEHEAD_ACCOUNT_PUBLIC_BETA_ENABLED',accountOn);
 // Public login only requests openid. The legacy invitation table is not read.
 const receiptOn=receipts&&privacy&&on('round_history'),historyOn=history&&accountOn&&receiptOn&&on('private_history');
 flag('PILEHEAD_ROUND_HISTORY_ENABLED',receiptOn);flag('PILEHEAD_PRIVATE_HISTORY_ENABLED',historyOn);flag('PILEHEAD_PROGRESSION_ENABLED',progress&&historyOn&&on('progression'));
 flag('PILEHEAD_MATCHMAKING_SCHEMA_READY',ready('matchmaking_ready'));
 if(accountOn&&ready('matchmaking_ready')&&on('quick_play')&&allow.length){
  out.PILEHEAD_MATCHMAKING_LIVE_PILOT_ENABLED='1';
  out.PILEHEAD_MATCHMAKING_PREVIEW_ORIGIN=ORIGIN;out.PILEHEAD_MATCHMAKING_PREVIEW_ACCOUNTS=allow.join(',');
  out.PILEHEAD_MATCHMAKING_SEAT_KEYS=JSON.stringify({[VERSION]:deriveSeatKey(out.PILEHEAD_ACCOUNT_FLOW_SECRET)});out.PILEHEAD_MATCHMAKING_SEAT_KEY_VERSION=VERSION;
 }
 return out;
}
// Diagnostics are restricted to fixed categories. Never log a URL, exception
// message, stack, database identifier, credential, email or request header.
function errorCategory(error){
 const code=error?.code;
 if(code==='28P01'||code==='28000')return 'authentication';
 if(code==='42501')return 'permission';
 if(code==='42P01'||code==='42703')return 'schema';
 if(code==='3D000')return 'database';
 if(code==='57014')return 'timeout';
 return 'connection_or_query';
}
function createLoader({env=process.env,roomQuery,playerQuery,now=Date.now,ttl=3000,report=()=>{}}={}){
 let cached=null,expires=0,pending=null,lastReport=null;
 function note(reason){
  if(reason===lastReport)return;
  lastReport=reason;
  try{report(reason)}catch{} // Diagnostics cannot affect gameplay.
 }
 return async function load(){
  if(!managed(env)){
   if(env.NODE_ENV==='production'&&!env.VERCEL_ENV)note('deployment_environment_missing');
   return env;
  }
  if(!env.PILEHEAD_DATABASE_URL||!env.PILEHEAD_PLAYER_DATABASE_URL){
   note(!env.PILEHEAD_DATABASE_URL?'room_url_missing':'player_url_missing');
   return disabledEnv(env);
  }
  if(cached&&now()<expires)return cached;
  if(pending)return pending;
  pending=(async()=>{
   try{
    const [r,p]=await Promise.allSettled([Promise.resolve().then(()=>roomQuery(SQL,[])),Promise.resolve().then(()=>playerQuery(SQL,[]))]);
    if(r.status==='rejected'||p.status==='rejected'){
     note(r.status==='rejected'?'room_'+errorCategory(r.reason):'player_'+errorCategory(p.reason));
     cached=disabledEnv(env);
    }else{
     const room=r.value[0],player=p.value[0];
     if(!room||!player)note('settings_row_missing');
     else if(!UUID.test(room.database_id||'')||room.database_id!==player.database_id)note('database_mismatch');
     cached=effective(env,room,player,[]);
     if(room&&player&&room.database_id===player.database_id){
      if(cached.PILEHEAD_ACCOUNT_SCHEMA_READY!=='1')note('account_schema_not_ready');
      else if(!room.signup_ready||!player.signup_ready)note('signup_schema_not_ready');
      else if(!env.PILEHEAD_GOOGLE_CLIENT_ID||!env.PILEHEAD_GOOGLE_CLIENT_SECRET||!deriveSeatKey(env.PILEHEAD_ACCOUNT_FLOW_SECRET))note('oauth_credentials_missing');
      else note('ready');
     }
    }
   }catch{note('unexpected_configuration_failure');cached=disabledEnv(env)}
   expires=now()+ttl;return cached;
  })();
  try{return await pending}finally{pending=null}
 };
}

let roomDb,playerDb;
const query=(kind,sql,args)=>{
 const neon=require('@neondatabase/serverless').neon;
 if(kind==='room'){roomDb??=neon(process.env.PILEHEAD_DATABASE_URL);return roomDb.query(sql,args)}
 playerDb??=neon(process.env.PILEHEAD_PLAYER_DATABASE_URL);return playerDb.query(sql,args);
};
const load=createLoader({roomQuery:(s,a)=>query('room',s,a),playerQuery:(s,a)=>query('player',s,a),report:reason=>{
 const message=JSON.stringify({event:'pileheads_runtime_readiness',reason});
 if(reason==='ready')console.info(message);else console.warn(message);
}});
module.exports={SQL,INVITES_SQL,ORIGIN,PRIVACY,managed,emailHash,deriveSeatKey,effective,createLoader,load};
