'use strict';
// Manual, expiry-only maintenance. Never imported by a public handler or run on deploy.
const plans=Object.freeze({
 profiles:[
  {name:'guestProfiles',table:'public.pileheads_guest_profiles',key:['id'],expired:'expires_at<=now()',order:'expires_at,id'},
  {name:'accountSessions',table:'public.pileheads_account_sessions',key:['token_hash'],expired:'expires_at<=now()',order:'expires_at,token_hash'},
  {name:'oldQuotaDays',table:'public.pileheads_profile_quota',key:['day'],expired:'day<current_date-7',order:'day'}
 ],
 receipts:[
  {name:'roundReceipts',table:'public.pileheads_round_receipts',key:['room_instance_id','round_no'],expired:'expires_at<=now()',order:'expires_at,room_instance_id,round_no'}
 ]
});
function parse(args){
 if(!Object.hasOwn(plans,args[0])||args.length>2||(args.length===2&&args[1]!=='--apply'))throw Error('Usage: node scripts/player-retention.cjs profiles|receipts [--apply]');
 return {scope:args[0],apply:args.length===2};
}
function statements(plan){
 const keys=plan.key.join(','),match=plan.key.map(k=>'r.'+k+'=c.'+k).join(' AND ');
 return {
  count:`SELECT count(*) AS expired FROM ${plan.table} WHERE ${plan.expired}`,
  remove:`WITH candidates AS (SELECT ${keys} FROM ${plan.table} WHERE ${plan.expired} ORDER BY ${plan.order} LIMIT 500), removed AS (DELETE FROM ${plan.table} r USING candidates c WHERE ${match} AND r.${plan.expired} RETURNING 1) SELECT count(*) AS deleted FROM removed`
 };
}
async function runPlayerRetention({query,args=[],log=console.log}){
 const {scope,apply}=parse(args),operations=plans[scope],expired={};
 for(const plan of operations){const [row]=await query(statements(plan).count,[]);expired[plan.name]=row.expired}
 log(JSON.stringify({scope,mode:apply?'apply':'dry-run',expired}));
 if(!apply)return;
 const deleted={};
 for(const plan of operations){const [row]=await query(statements(plan).remove,[]);deleted[plan.name]=row.deleted}
 log(JSON.stringify({scope,deleted}));
}
async function main(){
 const args=process.argv.slice(2),{scope}=parse(args);
 const url=scope==='profiles'?process.env.PILEHEAD_PLAYER_MAINTENANCE_DATABASE_URL:process.env.PILEHEAD_MAINTENANCE_DATABASE_URL;
 if(!url)throw Error('Missing dedicated maintenance database connection');
 const sql=require('@neondatabase/serverless').neon(url);
 await runPlayerRetention({args,query:(q,p)=>sql.query(q,p)});
}
module.exports={runPlayerRetention};
if(require.main===module)main().catch(()=>{console.error('Player data maintenance failed; inspect privately.');process.exitCode=1});
