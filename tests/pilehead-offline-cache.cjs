'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const {OFFLINE_ASSETS,workerSource,buildOffline}=await import('../scripts/build-offline.mjs');
 assert.equal(new Set(OFFLINE_ASSETS).size,OFFLINE_ASSETS.length);
 assert.ok(OFFLINE_ASSETS.includes('/pilehead/table-feedback.css'));
 assert.ok(OFFLINE_ASSETS.every(p=>p==='/stack-offline.html'||p.startsWith('/pilehead/')||p.startsWith('/stack-media/')));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stack-offline-'));
 try{
  for(const p of OFFLINE_ASSETS){const f=path.join(dir,p.slice(1));fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,'test:'+p);}
  const v=buildOffline(dir);assert.equal(buildOffline(dir),v);fs.appendFileSync(path.join(dir,'pilehead/engine.js'),'x');assert.notEqual(buildOffline(dir),v);
  fs.unlinkSync(path.join(dir,'pilehead/engine.js'));assert.throws(()=>buildOffline(dir));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 const events={},deleted=[],added=[];const cache={addAll:async requests=>added.push(...requests),match:async p=>'cached:'+p};
 const self={location:{origin:'https://stack.test'},addEventListener:(n,f)=>events[n]=f,clients:{claim:async()=>{}}};
 class Request{constructor(url,options){this.url=url;this.options=options;}}
 vm.runInNewContext(workerSource('test'),{self,caches:{open:async()=>cache,keys:async()=>['other-cache','stack-offline-old','stack-offline-test'],delete:async k=>deleted.push(k)},Request,URL,Set,fetch:async()=>{throw Error('offline');},Response:{error:()=>null}});
 let result;events.install({waitUntil:p=>result=p});await result;assert.equal(added.length,OFFLINE_ASSETS.length);assert.ok(added.every(r=>r.options.credentials==='omit'));
 events.activate({waitUntil:p=>result=p});await result;assert.deepEqual(deleted,['stack-offline-old']);
 function request(url,mode='navigate',method='GET'){let response;events.fetch({request:{url,mode,method},respondWith:p=>response=p});return response;}
 assert.equal(await request('https://stack.test/play'),'cached:/stack-offline.html');
 assert.equal(await request('https://stack.test/pilehead/index.html'),'cached:/pilehead/index.html');
 for(const u of ['/api/account','/api/account/bonus','/api/checkout','/account','/play?room=private','/pilehead/index.html?room=private'])assert.equal(request('https://stack.test'+u),undefined);
 assert.equal(request('https://other.test/play'),undefined);
 assert.equal(request('https://stack.test/play','navigate','POST'),undefined);
 console.log('Offline cache policy and versioning checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
