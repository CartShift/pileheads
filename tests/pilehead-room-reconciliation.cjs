'use strict';
const assert=require('node:assert/strict');
const R=require('../apps/web/lib/room-reconciliation.cjs');
const room=(overrides={})=>({code:'ROOMAAAA',me:0,revision:7,members:[{seat:0,name:'Host'}],
 game:{round:1,phase:'play',turn:0,legal:[{type:'play',source:'hand',ids:[1,2]}],
 pendingDump:null,pendingCounter:null,setupReady:[false,false],players:[{hand:[{id:1},{id:2}]},{}]},...overrides});
const a=room(),b=structuredClone(a);b.revision++;
assert.equal(R.disposition(null,a),'apply');
assert.equal(R.disposition(a,structuredClone(a)),'identical');
assert.equal(R.disposition(b,a),'stale');
assert.equal(R.disposition(a,b),'apply');
assert.equal(R.disposition(a,{...a,session:'fixture-only'}),'apply','a session refresh must not be discarded');
assert.equal(R.disposition(a,{...a,me:1}),'apply');
assert.equal(R.disposition(a,{...a,members:[{seat:0,name:'New'}]}),'apply');
assert.equal(R.selectionBoundary(a,structuredClone(a)),false);
assert.equal(R.selectionBoundary(a,b),true);
assert.equal(R.selectionBoundary(a,{...a,code:'ROOMBBBB'}),true);
assert.equal(R.selectionBoundary(a,{...a,me:1}),true);
assert.equal(R.retainSelection(a,b,[1,2]).length,2);
assert.deepEqual(R.retainSelection(a,b,[1,3]),[]);
for(const patch of [{phase:'over'},{turn:1},{pendingDump:{seat:0}},{pendingCounter:{seat:0}},
 {tournamentWithdrawal:{seat:1}},{round:2},{legal:[{type:'play',source:'down',ids:[1]}]},
 {legal:[{type:'followup',ids:[1]}]}]){
 assert.deepEqual(R.retainSelection(a,{...b,game:{...b.game,...patch}},[1]),[]);
}
assert.deepEqual(R.retainSelection(a,{...b,code:'ROOMBBBB'},[1]),[]);
assert.deepEqual(R.retainSelection(a,{...b,me:1},[1]),[]);
const setup={...a,game:{...a.game,phase:'setup'}},nextSetup={...setup,revision:8};
assert.equal(R.retainSwap(setup,nextSetup,1),1);
assert.equal(R.retainSwap(setup,nextSetup,99),null);
assert.equal(R.retainSwap(setup,{...nextSetup,game:{...setup.game,setupReady:[true,false]}},1),null);
assert.equal(R.retainSwap(setup,b,1),null);
console.log('PASS authoritative snapshot disposition and selection/room/seat/round boundaries');
