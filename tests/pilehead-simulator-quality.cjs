'use strict';
// Regression coverage for tabletop interaction predictability and multiplayer stability.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const local=read('dist/pilehead/app.js');
const online=read('dist/pilehead/online.js');
const html=read('dist/pilehead/index.html');
const css=read('dist/pilehead/immersive.css');
const polish=read('dist/pilehead/online-polish.css');
const E=require('../dist/pilehead/engine.js');
function sourceFunction(source,name){
 const start=source.indexOf('function '+name+'(');
 assert.ok(start>=0,'Missing function '+name);
 const open=source.indexOf('{',start),depth0=0;
 let depth=depth0;
 for(let i=open;i<source.length;i++){
  if(source[i]==='{')depth++;
  if(source[i]==='}'&&!--depth)return source.slice(start,i+1);
 }
 throw Error('Unclosed function '+name);
}
function selectCase(source){
 const ctx=vm.createContext({selection:[]});
 vm.runInContext(sourceFunction(source,'sameFace')+'\n'+sourceFunction(source,'selectMatching'),ctx);
 const cards=[{id:1,kind:'number',rank:7},{id:2,kind:'number',rank:7},
  {id:3,kind:'number',rank:8},{id:4,kind:'action',action:'burn'}];
 const tap=id=>{ctx.cards=cards;ctx.id=id;vm.runInContext('selectMatching(cards,id)',ctx);return Array.from(ctx.selection)};
 assert.deepEqual(tap(1),[1],'First tap selects only the tapped card');
 assert.deepEqual(tap(2),[1,2],'Second matching card explicitly adds to the group');
 assert.deepEqual(tap(1),[2],'Tapping a selected card removes only that card');
 assert.deepEqual(tap(3),[3],'Tapping a different rank starts a new selection');
 assert.deepEqual(tap(4),[4],'An action can be selected without selecting all other powers');
}
selectCase(local);
selectCase(online);
{
 const ctx=vm.createContext({
  selection:[52,14],
  currentStage:()=> 'hand',
  getPlayer:()=>({hand:[{id:14}],up:[{id:52}]}),
  bridgeAvailable:()=>true
 });
 vm.runInContext(sourceFunction(local,'selectedPlay'),ctx);
 const move=vm.runInContext('selectedPlay()',ctx);
 assert.deepEqual(JSON.parse(JSON.stringify(move)),{type:'play',source:'hand',ids:[14,52]},
  'Any play path must put hand cards before a face-up bridge card');
}
assert.match(local,/if\(bridged&&selection\.some/,'Local bridge selection must include all required hand cards');
assert.match(online,/if\(bridge&&selection\.some/,'Online bridge selection must include all required hand cards');
assert.equal((local.match(/submitPlay\(selectedPlay\(\)\)/g)||[]).length,5,
 'Play button, pile tap, keyboard and drag must share the normalized move');
assert.match(local,/botQueuedFor===key/,'UI renders must not restart the same bot turn timer');
assert.match(local,/function viewSeat\(\)\{return mode==='bots'\?0:g\?\.turn\?\?0\}/,'Hotseat view not blocked by earlier SNAP');
assert.match(local,/data-do="hot-snap"/,'Shared-device SNAP voluntarily claimable');
assert.match(local,/covered=!g\.pendingDump&&g\.turn!==ev\.seat/,'Hotseat privacy follows actual turn');
assert.match(local,/function selectedPlay\(\)\{[\s\S]*?selection=\[\.\.\.getPlayer\(\)\.hand/,'Local drag/drop normalizes bridge');
assert.match(online,/function legalMove\(\)\{[\s\S]*?selection=\[\.\.\.current\(\)\.hand/,'Online drag/drop normalizes bridge');
assert.match(online,/t\.source==='up'&&bridgeAvailable\(\)/,'Mobile drag supports face-up bridge');
assert.match(online,/data\.game\.botSlamReady/,'Browser requests bot out-of-turn SLAM');
assert.doesNotMatch(local,/4800/,'SNAP cannot introduce a 4.8-second delay');
assert.doesNotMatch(local,/pilehead-snap-choice/,'SNAP should not show an extra tutorial or pass decision');
assert.doesNotMatch(local,/SNAP READY/,'Do not coach the user with additional SNAP hints');
assert.match(online,/next\.revision<data\.revision/,'Old network responses must not rewind room state');
assert.match(online,/function patchPresenceUI\(/,'Presence-only changes should be patched');
assert.match(online,/else if\(presenceChanged\)/,'Presence heartbeat must not rebuild all cards');
assert.match(online,/function setRequesting\(/,'Move submission should not recreate the table');
assert.match(online,/\.classList\.toggle\('is-submitting',flag\)/,'Busy state must be visible');
assert.match(online,/\$\('new'\)\?\.addEventListener\('click'/,
 'Shared New game button must work in the online route');
assert.match(html,/54 cards, one pile/,'Published game metadata reflects the 54-card deck');
assert.match(css,/card-row\.hand\{[\s\S]*?overscroll-behavior-x:contain/);
assert.match(polish,/\.table-actions\.is-submitting/);
assert.equal(E.deck().length,54);
assert.equal(E.ACTIONS.burn,4);
for(const [name,count] of Object.entries(E.ACTIONS))assert.equal(count,name==='burn'?4:2);
for(const source of [local,online])assert.doesNotThrow(()=>new vm.Script(source));
console.log('PASS STACK simulator quality: precise card selection, shared placement, stable online updates, bot timing, 54 cards and source syntax');
