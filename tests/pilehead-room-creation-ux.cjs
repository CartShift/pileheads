'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../dist/pilehead/online.js'),'utf8');

function harness(search,server){
 const events=new Map(),calls=[],store=new Map();
 const form={name:'',humans:2,bots:0};
 const root={
  innerHTML:'',
  contains(){return false},
  querySelector(){return null},
  addEventListener(type,cb){
   if(!events.has(type))events.set(type,[]);
   events.get(type).push(cb);
  }
 };
 const elements={
  'online-name':{get value(){return form.name},focus(){}},
  'online-humans':{get value(){return String(form.humans)}},
  'online-bots':{get value(){return String(form.bots)}}
 };
 const document={
  activeElement:null,visibilityState:'visible',
  getElementById(id){return id==='app'?root:elements[id]||null},
  addEventListener(){},
 };
 const window={
  addEventListener(){},
  PileheadTableFX:null,
 };
 const context={
  document,window,globalThis:null,
  URLSearchParams,Date,Math,Set,Map,String,Number,
  location:{search,origin:'https://example.com',pathname:'/pilehead/',href:'https://example.com/pilehead/'+search},
  history:{replaceState(){}},
  localStorage:{getItem(k){return store.get(k)||null},setItem(k,v){store.set(k,v)}},
  setInterval(){return 1},
  setTimeout(){return 1},
  fetch:async (url,opts)=>{
   calls.push({url,payload:JSON.parse(opts.body)});
   return server();
  },
  PileheadCardArt:{glyph:{},rules:{}},
 };
 context.globalThis=context;
 vm.runInNewContext(script,context,{filename:'online.js'});
 async function click(action){
  const target={dataset:{do:action},closest(sel){return sel==='button'?this:null}};
  await events.get('click')[0]({target});
 }
 return {click,calls,form,root,store};
}

(async()=>{
 let checks=0;
 const network=harness('?online=1',()=>{throw new TypeError('Failed to fetch')});
 network.form.humans=1;network.form.bots=2;
 await network.click('create');
 assert.equal(network.calls.length,1,'Blank optional name must still create an API request');
 assert.equal(network.calls[0].payload.name,'Player 1');
 assert.equal(network.calls[0].payload.humans,1);
 assert.equal(network.calls[0].payload.bots,2);
 assert.match(network.root.innerHTML,/Could not reach the room server/);
 assert.match(network.root.innerHTML,/id="online-form-message"/);
 assert.match(network.root.innerHTML,/value="1" selected/);
 assert.match(network.root.innerHTML,/value="2" selected/);
 assert.match(network.root.innerHTML,/value="Player 1"/);
 checks++;

 const server=harness('?online=1',()=>({ok:false,status:503,json:async()=>({error:'service_unavailable'})}));
 server.form.name='Alex';
 await server.click('create');
 assert.equal(server.calls[0].payload.name,'Alex');
 assert.match(server.root.innerHTML,/temporarily unavailable/);
 assert.match(server.root.innerHTML,/data-do="create"/);
 checks++;

 const join=harness('?room=ABCDEFGH',()=>{throw Error('Should not call server')});
 await join.click('join');
 assert.equal(join.calls.length,0);
 assert.match(join.root.innerHTML,/Enter your name to join the room/);
 assert.match(join.root.innerHTML,/role="alert"/);
 checks++;

 console.log('PASS online room creation UX: '+checks+' scenarios');
})().catch(e=>{console.error(e);process.exitCode=1});
