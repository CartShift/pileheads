'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const container=process.env.PG_TEST_CONTAINER;
assert.match(container||'',/^[a-f0-9]{12,64}$/,'disposable CI PostgreSQL container required');
const runtime='pileheads_commerce_test_runtime';
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const uuid=()=>crypto.randomUUID();
function psql(sql,role){
 return new Promise((resolve,reject)=>{
  const p=spawn('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres']);
  let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
  p.on('error',reject);p.on('close',code=>code===0?resolve(out.trim()):reject(Error(err||'isolated PostgreSQL failed')));
  p.stdin.end((role?'SET ROLE '+role+';\n':'')+sql+'\n');
 });
}
async function main(){
 await psql(fs.readFileSync('db/commerce-test-v1.sql','utf8'));
 await psql(fs.readFileSync('db/commerce-test-operations-v1.sql','utf8'));
 await psql('CREATE ROLE '+runtime+' NOLOGIN; GRANT USAGE ON SCHEMA pileheads_commerce_test TO '+runtime+'; GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA pileheads_commerce_test TO '+runtime+'; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pileheads_commerce_test TO '+runtime+';');
 const prefix='pileheads_commerce_test.';
 const order=uuid(),pending=uuid(),event=uuid();
 const run=s=>psql(s,runtime);
 const advance=(id,o,from,to)=>run('SELECT '+prefix+'advance_order('+[id,o,from,to].map(quote).join(',')+');');
 const stock=(id,delta,version,reason='test_receipt')=>run('SELECT '+prefix+'adjust_stock('+[id,delta,version,reason].map(quote).join(',')+');');
 await run('SELECT id FROM '+prefix+'start_order('+quote(order)+',2);');
 await run('SELECT id FROM '+prefix+'start_order('+quote(pending)+',1);');
 assert.equal(await advance(uuid(),pending,'unfulfilled','packed'),'f');
 await run("UPDATE "+prefix+"orders SET state='paid', session_id='cs_test_fixture',payment_id='pi_fixture' WHERE id="+quote(order)+";");
 assert.equal(await advance(uuid(),order,'unfulfilled','shipped'),'f');
 const parallel=await Promise.all([advance(event,order,'unfulfilled','packed'),advance(uuid(),order,'unfulfilled','packed')]);
assert.equal(parallel.filter(x=>x==='t').length,1);
 const first=await run('SELECT id FROM '+prefix+'fulfillment_events WHERE order_id='+quote(order)+';');
 assert.equal(await advance(first,order,'unfulfilled','packed'),'t');
 assert.equal(await advance(uuid(),order,'packed','shipped'),'t');
 assert.equal(await advance(uuid(),order,'packed','shipped'),'f');
 assert.equal(await run('SELECT count(*) FROM '+prefix+'fulfillment_events;'),'2');
 const adjustment=uuid();
 const duplicate=await Promise.all([stock(adjustment,20,0),stock(adjustment,20,0)]);
 assert.deepEqual(duplicate,['t','t']);
 assert.equal(await stock(adjustment,20,1),'f');
 assert.equal(await stock(uuid(),-21,1,'count_correction'),'f');
 const race=await Promise.all([stock(uuid(),-10,1,'count_correction'),stock(uuid(),-12,1,'count_correction')]);
 assert.equal(race.filter(x=>x==='t').length,1);
 assert.equal(await run('SELECT count(*) FROM '+prefix+'stock_events;'),'2');
 assert.equal(await run('SELECT version FROM '+prefix+'stock WHERE singleton;'),'2');
 await assert.rejects(run('DELETE FROM '+prefix+'stock_events;'),/permission denied/i);
 console.log('PASS isolated PostgreSQL commerce operations: paid-only fulfillment, concurrency, retries, audit, stock guards and no-delete access');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
