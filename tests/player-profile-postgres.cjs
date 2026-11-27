'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {createStore}=require('../api/player.js');
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
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
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
 console.log('PASS exact profile SQL: expiry, isolation, escaped nickname, transactional quota rollback, concurrent daily ceiling, least privilege and deletion');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
