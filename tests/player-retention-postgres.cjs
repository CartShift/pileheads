'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {runPlayerRetention}=require('../scripts/player-retention.cjs');
const container=process.env.PG_TEST_CONTAINER;
assert.match(container||'',/^[a-f0-9]{12,64}$/);
const profileRole='pileheads_player_maintenance_access',receiptRole='pileheads_maintenance_access';
function psql(sql,role,database='retention_acceptance'){
 const p=spawnSync('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database],{input:(role?'SET ROLE '+role+';\n':'')+sql+'\n',encoding:'utf8',timeout:30000});
 if(p.error)throw p.error;if(p.status!==0)throw Error(p.stderr||'isolated PostgreSQL failed');return p.stdout.trim();
}
const count=(table,where='true')=>Number(psql('SELECT count(*) FROM '+table+' WHERE '+where+';'));
const run=(scope,role,apply=false)=>runPlayerRetention({args:[scope,...(apply?['--apply']:[])],query:async(sql,args)=>{assert.deepEqual(args,[]);const v=psql(sql+';',role);return [sql.startsWith('SELECT')?{expired:v}:{deleted:v}]},log:()=>{}});
(async()=>{
 psql('CREATE DATABASE retention_acceptance;',null,'postgres');
 for(const path of ['db/player-profiles-v1.sql','db/player-accounts-v1.sql','db/room-round-receipts.sql','db/room-schema-development.sql','db/room-access-roles.sql','db/player-retention-access.sql','db/room-receipt-retention-access.sql'])psql(fs.readFileSync(path,'utf8'));
 psql("INSERT INTO pileheads_accounts(id,provider,provider_subject) VALUES('1c0c6815-e56b-4e6f-a6e3-1b3345c9b986','google','synthetic');");
 psql("INSERT INTO pileheads_guest_profiles(id,token_hash,expires_at) SELECT gen_random_uuid(),lpad(n::text,64,'0'),now()-interval '1 day' FROM generate_series(1,501) n; INSERT INTO pileheads_guest_profiles(id,token_hash) VALUES(gen_random_uuid(),repeat('a',64));");
 psql("INSERT INTO pileheads_account_sessions(token_hash,account_id,expires_at) SELECT lpad(n::text,64,'0'),'1c0c6815-e56b-4e6f-a6e3-1b3345c9b986',now()-interval '1 day' FROM generate_series(1,501) n; INSERT INTO pileheads_account_sessions(token_hash,account_id) VALUES(repeat('a',64),'1c0c6815-e56b-4e6f-a6e3-1b3345c9b986');");
 psql("INSERT INTO pileheads_profile_quota(day,hits) SELECT current_date-n,1 FROM generate_series(8,508) n; INSERT INTO pileheads_profile_quota(day,hits) VALUES(current_date,1),(current_date-7,1);");
 psql("INSERT INTO pileheads_round_receipts(room_instance_id,round_no,rules_version,endgame_rule,player_count,human_count,placements,moves,recorded_at,expires_at) SELECT gen_random_uuid(),1,'pilehead-1.7.0','classic',2,2,ARRAY[1,2]::smallint[],1,now()-interval '100 days',now()-interval '1 day' FROM generate_series(1,501); INSERT INTO pileheads_round_receipts(room_instance_id,round_no,rules_version,endgame_rule,player_count,human_count,placements,moves) VALUES(gen_random_uuid(),1,'pilehead-1.7.0','classic',2,2,ARRAY[1,2]::smallint[],1);");
 const tables=['pileheads_guest_profiles','pileheads_account_sessions','pileheads_profile_quota','pileheads_round_receipts'];
 await run('profiles',profileRole);await run('receipts',receiptRole);
 assert.deepEqual(tables.map(t=>count(t)),[502,502,503,502]);
 await run('profiles',profileRole,true);await run('receipts',receiptRole,true);
 assert.deepEqual(tables.map(t=>count(t)),[2,2,3,2]);
 await run('profiles',profileRole,true);await run('receipts',receiptRole,true);
 assert.deepEqual(tables.map(t=>count(t)),[1,1,2,1]);
 assert.equal(count('pileheads_accounts'),1,'never delete a persistent account during retention');
 assert.equal(count('pileheads_profile_quota','day>=current_date-7'),2);
 for(const table of ['pileheads_guest_profiles','pileheads_account_sessions','pileheads_round_receipts'])assert.equal(count(table,'expires_at>now()'),1);
 await run('profiles',profileRole,true);await run('receipts',receiptRole,true);
 assert.deepEqual(tables.map(t=>count(t)),[1,1,2,1]);
 assert.throws(()=>psql('SELECT provider_subject FROM pileheads_accounts;',profileRole),/permission denied/i);
 assert.throws(()=>psql('DELETE FROM pileheads_accounts;',profileRole),/permission denied/i);
 assert.throws(()=>psql('UPDATE pileheads_guest_profiles SET expires_at=now();',profileRole),/permission denied/i);
 assert.throws(()=>psql('SELECT * FROM pileheads_account_sessions;',receiptRole),/permission denied/i);
 assert.throws(()=>psql('UPDATE pileheads_round_receipts SET expires_at=now();',receiptRole),/permission denied/i);
 console.log('PASS exact player retention SQL: dry run, 500-row bound, active rows, quota cutoff, idempotency, scoped roles and account isolation');
})().catch(e=>{console.error(e.message);process.exitCode=1});
