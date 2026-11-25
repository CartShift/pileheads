"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {spawnSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
function migrationBody(text){
 const match=text.match(/^(?:\s|--[^\n]*\n)*BEGIN\s*;([\s\S]*)COMMIT\s*;\s*$/i);
 if(!match)throw Error("Migration must have one explicit outer BEGIN/COMMIT");
 return match[1];
}
function buildSql(migrations,checks,schema){
 if(!/^stack_verify_[a-f0-9]{24}$/.test(schema))throw Error("Invalid isolated schema");
 return ["BEGIN;","CREATE SCHEMA "+schema+";","SET LOCAL search_path TO "+schema+";",
  ...migrations.map(migrationBody),checks,"ROLLBACK;","\\echo STACK_POSTGRES_CONTRACT_PASSED",""].join("\n");
}
function main(){
 const host=process.env.STACK_VERIFY_PG_HOST, database=process.env.STACK_VERIFY_PG_DATABASE;
 if(!["127.0.0.1","::1","localhost"].includes(host)||!/^stack_test_[a-z0-9_]+$/.test(database||"")||process.env.STACK_VERIFY_PG_CONFIRM!=="disposable-local"){
  throw Error("Requires explicit disposable LOCAL database: STACK_VERIFY_PG_HOST, STACK_VERIFY_PG_DATABASE=stack_test_..., STACK_VERIFY_PG_CONFIRM=disposable-local");
 }
 const migrationDir=path.join(ROOT,"db/migrations");
 const migrations=fs.readdirSync(migrationDir).filter(f=>/^\d{3}_.+\.sql$/.test(f)).sort().map(f=>fs.readFileSync(path.join(migrationDir,f),"utf8"));
 if(migrations.length!==5)throw Error("Expected five reviewed commercial migrations; update release verification when adding migrations");
 const checks=fs.readFileSync(path.join(ROOT,"tests/stack-commercial-postgres.sql"),"utf8");
 const sql=buildSql(migrations,checks,"stack_verify_"+crypto.randomBytes(12).toString("hex"));
 const env={PATH:process.env.PATH,HOME:process.env.HOME,PGCONNECT_TIMEOUT:"5"};
 for(const key of ["PGUSER","PGPASSWORD","PGPORT"])if(process.env[key])env[key]=process.env[key];
 const result=spawnSync("psql",["-X","-w","-h",host,"-d",database,"-v","ON_ERROR_STOP=1","-q"],{env,input:sql,encoding:"utf8",timeout:60000});
 if(result.error)throw Error("Local psql unavailable or timed out: "+result.error.code);
 if(result.status!==0||!result.stdout.includes("STACK_POSTGRES_CONTRACT_PASSED")){
  console.error(result.stderr||"PostgreSQL contract did not complete");process.exitCode=1;return;
 }
 console.log("PASS PostgreSQL migrations, redemption, audit, refund ordering and deletion (rolled back)");
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={migrationBody,buildSql};
