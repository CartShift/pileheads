'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ORIGIN='https://pileheads.test';
const key=url=>new URL(typeof url==='string'?url:url.url,ORIGIN).href;
const stores=new Map();
let quotaFailure=false;
const caches={
  async has(name){return stores.has(name);},
  async keys(){return [...stores.keys()];},
  async delete(name){return stores.delete(name);},
  async open(name){
    if(!stores.has(name))stores.set(name,new Map());
    const store=stores.get(name);
    return {async put(url,response){if(quotaFailure&&!name.endsWith('meta'))throw Error('QuotaExceededError');store.set(key(url),response.clone());},
      async match(url){return store.get(key(url))?.clone();},
      async keys(){return [...store.keys()];}};
  }
};
(async()=>{
  const {PUBLIC_ASSETS,buildOfflineIndex,publishOfflineWorker,retirementSource,publishPwaWorker}=await import('../scripts/build-pwa-offline.mjs');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pileheads-pwa-'));
  try{
    const template=path.resolve('scripts/pwa-offline-worker.js');
    for(const url of [...PUBLIC_ASSETS,'/play.html','/_next/static/chunks/runtime.js','/_next/static/chunks/style.css','/_next/static/chunks/private.js.map','/profile.html','/api/account']){
      const file=path.join(root,url.split('?')[0].slice(1));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'public fixture '+file);
    }
    const index=publishOfflineWorker(root,template);
    assert.deepEqual(index,buildOfflineIndex(root));
    assert(index.entries.some(e=>e.url==='/play'));
    assert(index.entries.some(e=>e.url.includes('?v=production-rc3')));
    assert(!index.entries.some(e=>/profile|\/api\/|\.map$/.test(e.url)));
    let disconnected=false,badHash=false,privateHeader=false;
    const fetches=[];
    function launch(){
      const handlers={};
      const fetch=async(request,options)=>{
        const url=new URL(typeof request==='string'?request:request.url,ORIGIN);
        fetches.push({url:url.pathname+url.search,options});
        if(disconnected)throw Error('offline');
        const file=path.join(root,url.pathname==='/play'?'play.html':url.pathname.slice(1));
        const body=badHash?'wrong release':fs.readFileSync(file);
        return new Response(body,{status:200,headers:{'Content-Type':'text/plain','Cache-Control':privateHeader?'private, no-store':'no-cache'}});
      };
      vm.runInNewContext(fs.readFileSync(path.join(root,'pwa-sw.js'),'utf8'),{self:{location:{origin:ORIGIN},addEventListener:(name,fn)=>handlers[name]=fn},URL,Headers,Response,crypto:webcrypto,Uint8Array,caches,fetch});
      return {
        async command(action,source=ORIGIN+'/play'){
          let work,result;handlers.message({data:{action},source:{url:source},ports:[{postMessage(value){if(value.kind==='result')result=value;}}],waitUntil(p){work=p;}});
          if(work)await work;return result;
        },
        fetch(url,mode='navigate',method='GET',headers={}){
          let response;handlers.fetch({request:{url:new URL(url,ORIGIN).href,mode,method,headers:new Headers(headers)},respondWith(value){response=value;}});
          return response;
        }
      };
    }
    let worker=launch();
    assert.equal((await worker.command('status')).ready,false);
    assert.equal(stores.size,0,'status and install must not create caches');
    assert.equal(await worker.command('download',ORIGIN+'/play?room=SECRET'),undefined);
    assert.equal(await worker.command('download','https://other.test/play'),undefined);
    const ready=await worker.command('download');
    assert(ready.ok&&ready.ready);assert.equal(ready.version,index.version);
    assert(fetches.every(f=>f.options.credentials==='omit'&&f.options.redirect==='error'));
    for(const [name,store] of stores)if(!name.endsWith('meta'))assert.equal(store.size,index.entries.length);
    disconnected=true;
    assert.equal(await (await worker.fetch('/play')).text(),fs.readFileSync(path.join(root,'play.html'),'utf8'));
    assert.equal(await (await worker.fetch('/_next/static/chunks/runtime.js','cors')).text(),fs.readFileSync(path.join(root,'_next/static/chunks/runtime.js'),'utf8'));
    assert.equal((await worker.fetch('/')).status,503);
    for(const url of ['/api/account','/api/pilehead','/profile','/play?room=SECRET','/play?token=SECRET','https://other.test/play','/stack-media/stack-home-logo-web.webp?token=SECRET'])assert.equal(worker.fetch(url),undefined,url);
    assert.equal(worker.fetch('/play','navigate','POST'),undefined);
    assert.equal(worker.fetch('/play','navigate','GET',{Authorization:'Bearer private'}),undefined);
    disconnected=false;
    fs.appendFileSync(path.join(root,'play.html'),' changed');
    const next=publishOfflineWorker(root,template);
    assert.notEqual(next.version,index.version);
    worker=launch();
    assert.equal((await worker.command('status')).updateAvailable,true);
    badHash=true;assert.equal((await worker.command('download')).ok,false);badHash=false;
    privateHeader=true;assert.equal((await worker.command('download')).ok,false);privateHeader=false;
    quotaFailure=true;assert.equal((await worker.command('download')).ok,false);quotaFailure=false;
    assert.equal((await worker.command('status')).version,index.version,'failed updates retain completed release');
    assert.equal((await worker.command('download')).version,next.version);
    // Simulate partial eviction of the newest snapshot; navigation must
    // use the previous complete release, not advertise a broken app.
    const newest=[...stores.keys()].find(name=>name.startsWith('pileheads-offline-v1-'+next.version+'-'));
    stores.get(newest).delete(key('/_next/static/chunks/runtime.js'));
    assert.equal((await worker.command('status')).version,index.version);
    disconnected=true;
    const previousBody=await (await worker.fetch('/play/')).text();
    assert(!previousBody.endsWith(' changed'));
    disconnected=false;
    assert.equal((await worker.command('download')).version,next.version);
    await caches.open('other-app');
    assert.equal((await worker.command('remove')).ready,false);
    assert.deepEqual(await caches.keys(),['other-app']);
    disconnected=true;
    assert.equal((await worker.fetch('/play')).status,503);
    disconnected=false;
    assert.equal((await worker.command('download')).ready,true);
    let unregistered=0,activation;
    vm.runInNewContext(retirementSource(false),{self:{addEventListener:(name,fn)=>{assert.equal(name,'activate');activation=fn;},registration:{unregister:async()=>{unregistered++;}}},caches});
    let pending;activation({waitUntil:value=>pending=value});await pending;
    assert.deepEqual(await caches.keys(),['other-app']);assert.equal(unregistered,0);
    assert.equal((await worker.command('download')).ready,true);
    vm.runInNewContext(retirementSource(true),{self:{addEventListener:(name,fn)=>{activation=fn;},registration:{unregister:async()=>{unregistered++;}}},caches});
    activation({waitUntil:value=>pending=value});await pending;
    assert.deepEqual(await caches.keys(),['other-app']);assert.equal(unregistered,1);
    fs.writeFileSync(path.join(root,'pwa-sw.js'),'// foundation');
    assert.equal(publishPwaWorker(root,{pwaEnabled:true,offlineEnabled:false,template}),null);
    assert(fs.readFileSync(path.join(root,'pwa-sw.js'),'utf8').includes('// foundation'));
    assert.equal(publishPwaWorker(root,{pwaEnabled:false,offlineEnabled:true,template}),null);
    const retired=fs.readFileSync(path.join(root,'pwa-sw.js'),'utf8');
    assert(retired.includes('registration.unregister'));assert(!retired.includes('// foundation'));
    fs.unlinkSync(path.join(root,'play.html'));
    assert.throws(()=>buildOfflineIndex(root));
    console.log('PWA offline build hashes, opt-in, privacy, rollback, update and removal contracts passed');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
