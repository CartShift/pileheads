'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const {pwaBuildEnv}=await import('../scripts/pwa-build-config.mjs');
  const P='NEXT_PUBLIC_PILEHEADS_PWA',O='NEXT_PUBLIC_PILEHEADS_OFFLINE';
  assert.deepEqual(pwaBuildEnv({OTHER:'x'}),{OTHER:'x'});
  assert.deepEqual(pwaBuildEnv({OTHER:'x'},true),{OTHER:'x',[P]:'1',[O]:'1'});
  assert.deepEqual(pwaBuildEnv({[P]:'0',[O]:'0'},true),{[P]:'0',[O]:'0'});
  assert.deepEqual(pwaBuildEnv({[O]:'0'},true),{[P]:'1',[O]:'0'});
  assert.equal(JSON.parse(fs.readFileSync('vercel.json','utf8')).buildCommand,'npm run build -- --pwa-release');
  const source=fs.readFileSync('scripts/build-integrated.mjs','utf8');
  assert(source.includes("pwaBuildEnv(process.env,process.argv.includes('--pwa-release'))"));
  assert(source.includes("env = buildEnv"));
  assert(source.includes("{...buildEnv, NEXT_PUBLIC_STACK_API_ORIGIN: ''}"));
  console.log('PWA release configuration: Vercel activation and explicit rollback overrides passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
