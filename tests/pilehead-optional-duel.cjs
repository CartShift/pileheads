'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/pilehead/engine.js');
function setup(endgameRule){
 const g=E.create({players:2,seed:123456,...(endgameRule?{endgameRule}:{})});
 E.autoSetup(g,0);E.autoSetup(g,1);E.start(g);
 g.pile.push(...g.stock.splice(0));
 E.invariant(g);
 return g;
}
for(const rule of [undefined,'classic','final-duel']){
 const g=setup(rule),active=rule==='final-duel';
 assert.equal(g.endgameRule,rule||'classic');
 assert.equal(E.finalDuelActive(g),active);
 const pileTop=g.pile.at(-1).id,ashes=g.ashes.length,pileSize=g.pile.length;
 const ev=E.move(g,0,{type:'take'});
 assert.equal(ev.erodedCount,Number(active),'top-card erosion must depend only on the chosen rule');
 assert.equal(ev.takenCount,pileSize-Number(active));
 assert.equal(g.ashes.length,ashes+Number(active));
 assert.equal(g.ashes.some(c=>c.id===pileTop),active);
 assert.equal(g.people[0].hand.some(c=>c.id===pileTop),!active);
 E.invariant(g);
}
assert.throws(()=>E.create({players:2,endgameRule:'strange'}),/Invalid endgame rule/);
const old=setup('classic');delete old.endgameRule;
assert.equal(E.finalDuelActive(old),false,'older saves without a flag stay Classic');
E.invariant(old);
const restore=structuredClone(setup('final-duel'));
assert.equal(E.finalDuelActive(restore),true,'explicit old opt-in saves stay opted in');
console.log('PASS optional Final Duel: OFF by default, ON explicitly, saved-rule compatibility and conservation');
