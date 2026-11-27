'use strict';
// Private persistence service. NEVER expose loginVerifiedIdentity as an HTTP
// action. Only a verified provider adapter may supply provider + subject.
const crypto=require('node:crypto');
const {normalizeName}=require('../api/player.js');
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const DECKS=new Set(['refined','characters','original']);
const digest=token=>typeof token==='string'&&TOKEN.test(token)?crypto.createHash('sha256').update(token).digest('hex'):null;
function validateIdentity(identity){
 if(identity?.provider!=='google'||typeof identity.subject!=='string'||!/^[\x21-\x7e]{1,255}$/.test(identity.subject))throw Error('invalid verified identity');
 return identity.subject;
}
function preferences(input){
 const name=normalizeName(input?.name);
 if(!name||/[<>]/.test(name)||!DECKS.has(input?.deck))throw Error('invalid preferences');
 return {name,deck:input.deck};
}
function publicAccount(row){
 return row?{kind:'account',name:row.display_name,deck:row.preferred_deck,expiresAt:row.expires_at}:null;
}
const SQL={
 login:`WITH account AS (
 INSERT INTO pileheads_accounts(id,provider,provider_subject)
 VALUES($1,'google',$2) ON CONFLICT(provider,provider_subject) DO UPDATE SET provider_subject=EXCLUDED.provider_subject
 RETURNING id,display_name,preferred_deck
 ), opened AS (
 INSERT INTO pileheads_account_sessions(token_hash,account_id)
 SELECT $3,id FROM account RETURNING account_id,expires_at
 ), revoked AS (
 DELETE FROM pileheads_account_sessions s USING opened
 WHERE s.token_hash=$4::text AND s.token_hash<>$3 RETURNING s.account_id
 )
 SELECT account.id,account.display_name,account.preferred_deck,opened.expires_at FROM account JOIN opened ON opened.account_id=account.id`,
 find:`SELECT a.id,a.display_name,a.preferred_deck,s.expires_at FROM pileheads_account_sessions s
 JOIN pileheads_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
 preferences:`UPDATE pileheads_accounts a SET display_name=$2,preferred_deck=$3
 FROM pileheads_account_sessions s WHERE s.token_hash=$1 AND s.account_id=a.id AND s.expires_at>now()
 RETURNING a.id,a.display_name,a.preferred_deck,s.expires_at`,
 importGuest:`UPDATE pileheads_accounts a SET display_name=g.display_name,preferred_deck=g.preferred_deck
 FROM pileheads_account_sessions s,pileheads_guest_profiles g
 WHERE s.token_hash=$1 AND s.account_id=a.id AND s.expires_at>now() AND g.token_hash=$2 AND g.expires_at>now()
 RETURNING a.id,a.display_name,a.preferred_deck,s.expires_at`,
 logout:'DELETE FROM pileheads_account_sessions WHERE token_hash=$1',
 remove:`DELETE FROM pileheads_accounts a USING pileheads_account_sessions s
 WHERE s.token_hash=$1 AND s.account_id=a.id AND s.expires_at>now() RETURNING a.id`
};
function createAccountStore(query,{uuid=crypto.randomUUID,token=()=>crypto.randomBytes(32).toString('base64url')}={}){
 return {
  async loginVerifiedIdentity(identity,previousToken){
   const subject=validateIdentity(identity),fresh=token(),freshDigest=digest(fresh),oldDigest=digest(previousToken);
   if(!freshDigest||freshDigest===oldDigest)throw Error('session rotation failed');
   const [account]=await query(SQL.login,[uuid(),subject,freshDigest,oldDigest]);
   if(!account)throw Error('account session not created');
   // The future server adapter must put token in an HttpOnly Secure cookie,
   // never return it in JSON, logs, URLs, telemetry or localStorage.
   return {token:fresh,account};
  },
  async find(raw){
   const key=digest(raw);if(!key)return null;
   return (await query(SQL.find,[key]))[0]||null;
  },
  async preferences(raw,input){
   const key=digest(raw);if(!key)return null;
   const {name,deck}=preferences(input);
   return (await query(SQL.preferences,[key,name,deck]))[0]||null;
  },
  async importGuestPreferences(raw,guestRaw){
   const key=digest(raw),guestKey=digest(guestRaw);
   if(!key||!guestKey)return null;
   return (await query(SQL.importGuest,[key,guestKey]))[0]||null;
  },
  async logout(raw){const key=digest(raw);if(key)await query(SQL.logout,[key])},
  async remove(raw){const key=digest(raw);return key?Boolean((await query(SQL.remove,[key])).length):false}
 };
}
module.exports={createAccountStore,publicAccount,validateIdentity,preferences,digest,SQL};
