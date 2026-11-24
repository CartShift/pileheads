'use strict';
// No public admin API. An authorized operator explicitly supplies a separate DB connection.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS=new Set(['grant','revoke','restore']);
const REASONS=new Set(['support','promotion','correction','refund','abuse']);
function parse(argv){
 if(argv.length===1&&argv[0]==='report')return {action:'report'};
 const [action,account,product,reason,flag]=argv;
 if(!ACTIONS.has(action)||!UUID.test(account||'')||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(product||'')||!REASONS.has(reason)||!(argv.length===4||argv.length===5&&flag==='--apply'))throw Error('Usage: report | grant/revoke/restore ACCOUNT_UUID PRODUCT REASON [--apply]');
 return {action,account,product,reason,apply:flag==='--apply'};
}
async function execute(op,{query,allowMutation=false}){
 if(op.action==='report')return {entitlements:await query('SELECT product_id,count(*) FILTER(WHERE revoked_at IS NULL)::int AS active,count(*) FILTER(WHERE revoked_at IS NOT NULL)::int AS revoked FROM stack_entitlements GROUP BY 1 ORDER BY 1',[]),batches:await query('SELECT batch_id,product_id,count(*)::int AS issued,count(*) FILTER(WHERE redeemed_at IS NOT NULL)::int AS redeemed FROM stack_redemption_codes GROUP BY 1,2 ORDER BY 1,2',[])};
 if(!op.apply)return {dryRun:true,action:op.action,product:op.product,reason:op.reason};
 if(!allowMutation)throw Error('Mutation requires STACK_ADMIN_ALLOW_MUTATIONS=true');
 const rows=await query('SELECT stack_admin_entitlement($1,$2,$3,$4) AS changed',[op.account,op.product,op.action,op.reason]);
 return {changed:rows[0]?.changed===true,action:op.action,product:op.product};
}
async function main(){
 const op=parse(process.argv.slice(2));
 if(op.action!=='report'&&!op.apply){console.log(JSON.stringify(await execute(op,{}),null,2));return;}
 if(!process.env.STACK_ADMIN_DATABASE_URL)throw Error('STACK_ADMIN_DATABASE_URL is required');
 const db=require('@neondatabase/serverless').neon(process.env.STACK_ADMIN_DATABASE_URL);
 const result=await execute(op,{query:(s,a)=>db.query(s,a),allowMutation:process.env.STACK_ADMIN_ALLOW_MUTATIONS==='true'});
 console.log(JSON.stringify(result,null,2));
}
if(require.main===module)main().catch(()=>{console.error('Commercial admin failed: verify arguments, explicit authorization, migration and DB permissions.');process.exitCode=1;});
module.exports={parse,execute};
