'use strict';
// Operator-only maintenance. Never imported by the public API or run on deploy.
const {neon}=require('@neondatabase/serverless');
async function main(){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--apply'))throw Error('Usage: node scripts/room-retention.cjs [--apply]');
 const url=process.env.PILEHEAD_MAINTENANCE_DATABASE_URL;
 if(!url)throw Error('Missing dedicated maintenance database connection');
 const sql=neon(url);
 const [counts]=await sql.query("SELECT (SELECT count(*) FROM pilehead_rooms WHERE expires_at<=now()) AS expired_rooms,(SELECT count(*) FROM pilehead_rate_limits WHERE expires_at<=now()) AS expired_buckets",[]);
 console.log(JSON.stringify({mode:args.length?'apply':'dry-run',...counts}));
 if(!args.length)return;
 // Bound work per invocation; concurrent maintenance processes skip locked rows.
 const rooms=await sql.query("WITH candidates AS (SELECT code FROM pilehead_rooms WHERE expires_at<=now() ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED), removed AS (DELETE FROM pilehead_rooms r USING candidates c WHERE r.code=c.code AND r.expires_at<=now() RETURNING 1) SELECT count(*) AS deleted FROM removed",[]);
 const buckets=await sql.query("WITH candidates AS (SELECT bucket FROM pilehead_rate_limits WHERE expires_at<=now() ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED), removed AS (DELETE FROM pilehead_rate_limits r USING candidates c WHERE r.bucket=c.bucket AND r.expires_at<=now() RETURNING 1) SELECT count(*) AS deleted FROM removed",[]);
 console.log(JSON.stringify({deletedRooms:rooms[0].deleted,deletedBuckets:buckets[0].deleted}));
}
main().catch(()=>{console.error('Room maintenance failed; inspect privately.');process.exitCode=1});
