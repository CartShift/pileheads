'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {createStore}=require('../api/player.js');
const {createAccountStore,publicAccount,digest:sessionDigest}=require('../scripts/account-store.cjs');
const container=process.env.PG_TEST_CONTAINER;
assert.match(container||'',/^[a-f0-9]{12,64}$/,'disposable CI PostgreSQL container required');
const runtime='pileheads_profile_test_runtime';
function psql(sql,role){
 return new Promise((resolve,reject)=>{
  const p=spawn('docker',['exec','-i',container,'psql','-X','-qAt','-F','\t','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres']);
  let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
  p.on('error',reject);p.on('close',code=>code===0?resolve(out.trim()):reject(Error(err||'isolated PostgreSQL failed')));
  p.stdin.end((role?'SET ROLE '+role+';\n':'')+sql+'\n');
 });
}
const quote=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
const digest=()=>crypto.randomBytes(32).toString('hex');
async function main(){
 await psql(fs.readFileSync('db/player-profiles-v1.sql','utf8'));
 await psql('CREATE ROLE '+runtime+' NOLOGIN; GRANT USAGE ON SCHEMA public TO '+runtime+'; GRANT SELECT,INSERT,UPDATE,DELETE ON pileheads_guest_profiles TO '+runtime+'; GRANT SELECT,INSERT,UPDATE ON pileheads_profile_quota TO '+runtime+';');
 const store=createStore(async(sql,args)=>{
  const text=await psql('PREPARE action AS '+sql+'; EXECUTE action('+args.map(quote).join(',')+');',runtime);
  if(!text)return[];
  return text.split('\n').map(line=>{const [preferred_deck,display_name,expires_at]=line.split('\t');return {preferred_deck,display_name,expires_at}});
 });
 const count=async()=>Number(await psql('SELECT count(*) FROM pileheads_guest_profiles;'));
 const hits=async()=>Number(await psql('SELECT hits FROM pileheads_profile_quota WHERE day=current_date;'));
 const a=digest(),b=digest();
 assert.equal(await store.find(a),null);
 assert.equal((await store.create(crypto.randomUUID(),a)).display_name,'Player');assert.equal(await hits(),1);
 assert.equal(await psql("SELECT expires_at-created_at=interval '90 days' FROM pileheads_guest_profiles WHERE token_hash="+quote(a)+";"),'t');
 await assert.rejects(store.create(crypto.randomUUID(),a),/duplicate key/i);
 assert.equal(await hits(),1,'profile insert failure rolls quota increment back');
 await store.create(crypto.randomUUID(),b);
 assert.equal((await store.preferences(a,'original',"Card Shark's")).display_name,"Card Shark's");
 assert.equal((await store.find(a)).preferred_deck,'original');
 assert.equal((await store.find(b)).display_name,'Player');
 await psql("UPDATE pileheads_guest_profiles SET expires_at=now()-interval '1 second' WHERE token_hash="+quote(a)+";");
 assert.equal(await store.find(a),null);assert.equal(await store.preferences(a,'refined','Expired'),null);
 await store.remove(a);assert.equal(await count(),1);
 await psql('UPDATE pileheads_profile_quota SET hits=249 WHERE day=current_date;');
 const parallel=await Promise.all(Array.from({length:4},()=>store.create(crypto.randomUUID(),digest())));
 assert.equal(parallel.filter(Boolean).length,1);assert.equal(await hits(),250);assert.equal(await count(),2);
 assert.equal(await store.create(crypto.randomUUID(),digest()),null);
 await assert.rejects(psql('DELETE FROM pileheads_profile_quota;',runtime),/permission denied/i);
 await store.remove(b);assert.equal(await count(),1);
 await psql(fs.readFileSync('db/player-accounts-v1.sql','utf8'));
 await psql('GRANT SELECT,INSERT,UPDATE,DELETE ON pileheads_accounts,pileheads_account_sessions TO '+runtime+';');
 const accountStore=createAccountStore(async(sql,args)=>{
  const text=await psql('PREPARE account_action AS '+sql+'; EXECUTE account_action('+args.map(quote).join(',')+');',runtime);
  if(!text)return[];
  return text.split('\n').map(line=>{const [id,display_name,preferred_deck,expires_at]=line.split('\t');return {id,display_name,preferred_deck,expires_at}});
 });
 const identity={provider:'google',subject:'synthetic-subject-1'};
 const first=await accountStore.loginVerifiedIdentity(identity);
 assert.equal(first.account.display_name,'Player');
 const otherDevice=await accountStore.loginVerifiedIdentity(identity);
 assert.equal(otherDevice.account.id,first.account.id,'verified same subject restores account across devices');
 await accountStore.preferences(first.token,{name:'Pile King',deck:'original'});
 assert.equal((await accountStore.find(otherDevice.token)).display_name,'Pile King');
 const rotated=await accountStore.loginVerifiedIdentity(identity,first.token);
 assert.notEqual(rotated.token,first.token);
 assert.equal(await accountStore.find(first.token),null);
 assert.ok(await accountStore.find(otherDevice.token));
 const other=await accountStore.loginVerifiedIdentity({provider:'google',subject:'synthetic-subject-2'});
 assert.notEqual(other.account.id,first.account.id);
 assert.equal((await accountStore.find(other.token)).display_name,'Player');
 // Guest import is an explicit preference copy, never a nickname-based link.
 const guestRaw=crypto.randomBytes(32).toString('base64url'),guestKey=sessionDigest(guestRaw);
 await psql("INSERT INTO pileheads_guest_profiles(id,token_hash,display_name,preferred_deck) VALUES("+quote(crypto.randomUUID())+","+quote(guestKey)+",'Guest Star','characters');");
 assert.equal((await accountStore.importGuestPreferences(rotated.token,guestRaw)).display_name,'Guest Star');
 assert.equal((await accountStore.find(otherDevice.token)).preferred_deck,'characters');
 assert.equal(await psql("SELECT count(*) FROM pileheads_guest_profiles WHERE token_hash="+quote(guestKey)+";"),'1');
 const expired=await accountStore.loginVerifiedIdentity(identity);
 await psql("UPDATE pileheads_account_sessions SET expires_at=now()-interval '1 second' WHERE token_hash="+quote(sessionDigest(expired.token))+";");
 assert.equal(await accountStore.find(expired.token),null);
 assert.equal(await accountStore.preferences(expired.token,{name:'Expired',deck:'refined'}),null);
 assert.equal(await accountStore.remove(expired.token),false);
 assert.equal(publicAccount(await accountStore.find(rotated.token)).id,undefined);
 await accountStore.logout(otherDevice.token);assert.equal(await accountStore.find(otherDevice.token),null);
 assert.equal(await accountStore.remove(rotated.token),true);
 assert.equal(await psql("SELECT count(*) FROM pileheads_account_sessions WHERE account_id="+quote(first.account.id)+";"),'0');
 assert.ok(await accountStore.find(other.token));
 // The real public signup statement must allow a previously registered
 // account to return at capacity and roll back quota on session failures.
 await psql('CREATE ROLE pileheads_player_runtime_access NOLOGIN; GRANT USAGE ON SCHEMA public TO pileheads_player_runtime_access;');
 await psql(fs.readFileSync('db/player-public-signup.sql','utf8'));
 await psql('GRANT pileheads_player_runtime_access TO '+runtime+';');
 const budget=async()=>Number(await psql("SELECT hits FROM pileheads_account_signup_quota WHERE day=(now() AT TIME ZONE 'UTC')::date;"));
 const sign=(subject,previous)=>accountStore.loginVerifiedIdentity({provider:'google',subject},previous,{publicSignup:true});
 assert.ok(await sign('public-new-1'));assert.equal(await budget(),1);
 assert.ok(await sign('public-new-1'));assert.equal(await budget(),1);
 await psql("UPDATE pileheads_account_signup_quota SET hits=249;");
 const attempts=await Promise.allSettled(Array.from({length:4},(_,i)=>sign('public-race-'+i)));
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal(await budget(),250);
 await assert.rejects(sign('public-over-limit'),/session not created/);
 assert.ok(await sign('public-new-1'),'existing account can sign in at ceiling');
 await psql("UPDATE pileheads_account_signup_quota SET hits=249;");
 const collision=createAccountStore(async(sql,args)=>{
  const out=await psql('PREPARE collision_action AS '+sql+'; EXECUTE collision_action('+args.map(quote).join(',')+');',runtime);
  return out?[{}]:[];
 },{token:()=>other.token});
 await assert.rejects(collision.loginVerifiedIdentity({provider:'google',subject:'public-rollback'},undefined,{publicSignup:true}),/duplicate key/i);
 assert.equal(await budget(),249);
 assert.equal(await psql("SELECT count(*) FROM pileheads_accounts WHERE provider_subject='public-rollback';"),'0');
 await assert.rejects(psql('DELETE FROM pileheads_account_signup_quota;',runtime),/permission denied/i);
 console.log('PASS exact public account signup: concurrent daily ceiling, existing sign-in, atomic rollback, least privilege');
 console.log('PASS exact account SQL: verified subject reuse, multi-device restore, session rotation, explicit guest import, expiry, logout and cascading deletion');
 console.log('PASS exact profile SQL: expiry, isolation, escaped nickname, transactional quota rollback, concurrent daily ceiling, least privilege and deletion');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
