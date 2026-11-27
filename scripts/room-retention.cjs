'use strict';
// Operator-only maintenance. Never imported by the public API or run on deploy.
function parseArgs(args){
 if(args.length>1||(args.length===1&&args[0]!=='--apply'))throw Error('Usage: node scripts/room-retention.cjs [--apply]');
 return args.length===1;
}
async function runRetention({query,args=[],log=console.log}){
 const apply=parseArgs(args);
 const [counts]=await query("SELECT (SELECT count(*) FROM pilehead_rooms WHERE expires_at<=now()) AS expired_rooms,(SELECT count(*) FROM pilehead_rate_limits WHERE expires_at<=now()) AS expired_buckets",[]);
 log(JSON.stringify({mode:apply?'apply':'dry-run',...counts}));
 if(!apply)return;
 // Bounded batches; DELETE rechecks expiry. Avoid SELECT FOR UPDATE:
 // the dedicated maintenance role intentionally lacks UPDATE privileges.
 // Run only one operator invocation at a time.
 const rooms=await query("WITH candidates AS (SELECT code FROM pilehead_rooms WHERE expires_at<=now() ORDER BY expires_at,code LIMIT 500), removed AS (DELETE FROM pilehead_rooms r USING candidates c WHERE r.code=c.code AND r.expires_at<=now() RETURNING 1) SELECT count(*) AS deleted FROM removed",[]);
 const buckets=await query("WITH candidates AS (SELECT bucket FROM pilehead_rate_limits WHERE expires_at<=now() ORDER BY expires_at,bucket LIMIT 500), removed AS (DELETE FROM pilehead_rate_limits r USING candidates c WHERE r.bucket=c.bucket AND r.expires_at<=now() RETURNING 1) SELECT count(*) AS deleted FROM removed",[]);
 log(JSON.stringify({deletedRooms:rooms[0].deleted,deletedBuckets:buckets[0].deleted}));
}
async function main(){
 const args=process.argv.slice(2);
 parseArgs(args);
 const url=process.env.PILEHEAD_MAINTENANCE_DATABASE_URL;
 if(!url)throw Error('Missing dedicated maintenance database connection');
 const sql=require('@neondatabase/serverless').neon(url);
 await runRetention({query:(text,params)=>sql.query(text,params),args});
}
module.exports={runRetention};
if(require.main===module)main().catch(()=>{console.error('Room maintenance failed; inspect privately.');process.exitCode=1});
