'use strict';
const assert=require('node:assert/strict');
const P=require('../dist/tilt-lab/playtest.js');
const E=require('../dist/tilt-lab/engine.js');
const memory=new Map(),storage={
 getItem:k=>memory.get(k)||null,
 setItem:(k,v)=>memory.set(k,v),
 removeItem:k=>memory.delete(k)
};
let checks=0;function check(label,fn){fn();checks++;console.log('PASS '+label)}
check('completed 48-card game creates one aggregate record with no opponent hand content',()=>{
 const g=E.simulate({mode:'chain',players:3,seed:42});
 const x=P.record(storage,{game:g,runId:'p1',playAs:'hotseat',startedAt:100000,finishedAt:160000});
 assert.equal(x.sessionType,'human-hotseat');assert.equal(x.wallSeconds,60);
 assert.equal(x.turns,g.turn);
 const json=P.exportData(storage,'2026-11-13T00:00:00.000Z');
 assert.doesNotMatch(json,/"piles"\s*:/);
 assert.doesNotMatch(json,/"hand"\s*:/);
 assert.doesNotMatch(json,/"stock"\s*:/);
 assert.doesNotMatch(json,/"history"\s*:/);
 assert.match(json,/"pressOffers"/);
});
check('same completed game does not create duplicate record after page refresh',()=>{
 const g=E.simulate({mode:'chain',players:2,seed:5});
 P.record(storage,{game:g,runId:'repeat-test',playAs:'bot'});
 P.record(storage,{game:g,runId:'repeat-test',playAs:'bot'});
 assert.equal(P.load(storage).records.length,2);
});
check('uncompleted games never enter the human playtest dataset',()=>{
 const g=E.start({mode:'twin',seed:100});
 assert.equal(P.record(storage,{game:g,runId:'in-progress',playAs:'hotseat'}),null);
 assert.equal(P.load(storage).records.length,2);
});
check('feedback and unprompted replay are optional and explicitly self-reported',()=>{
 const item=P.updateNotes(storage,'repeat-test',{replay:'requested-unprompted',notes:'Try again'});
 assert.equal(item.replay,'requested-unprompted');assert.equal(item.notes,'Try again');
 assert.equal(P.updateNotes(storage,'missing',{notes:'x'}),null);
});
check('clear deletes only this prototype experiment’s observations',()=>{
 storage.setItem('spark-simple-v04','unrelated');
 P.clear(storage);
 assert.equal(P.load(storage).records.length,0);
 assert.equal(storage.getItem('spark-simple-v04'),'unrelated');
});
console.log(JSON.stringify({pass:true,checks}));
