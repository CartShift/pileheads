'use strict';
/* Information-set counterfactual study.
 * node experiments/power-cards/hidden-info-simulate.cjs --states 60 --worlds 30
 *
 * Compare PLAY JOKER NOW vs PLAY A LEGAL NUMBER CARD, preserving the own hand,
 * public pile, public discards and stock count but randomly redistributing only
 * the unseen opponent hand and stock among consistent physical cards.
 * Every comparison uses paired unseen worlds and the same deterministic bot policy.
 * Win-rate differences are *not* a human-skill or enjoyment measurement.
 */
const P=require('./engine.js');
function arg(name,def,max){
 const i=process.argv.indexOf(name);if(i<0)return def;
 const n=Number(process.argv[i+1]);
 if(!Number.isInteger(n)||n<1||n>max)throw Error('Bad '+name);
 return n;
}
const limit=arg('--states',60,300),worlds=arg('--worlds',30,200),
 baseSeed=arg('--seed',20261112,4294967295),clone=x=>JSON.parse(JSON.stringify(x));
function shuffle(cards,seed){
 let s=seed>>>0;const a=cards.slice();
 for(let i=a.length-1;i>0;i--){s=(Math.imul(1664525,s)+1013904223)>>>0;
  const j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}
 return a;
}
function randomizeUnseen(src,actor,seed){
 const g=clone(src),enemy=1-actor,count=g.people[enemy].hand.length;
 const unknown=shuffle([...g.people[enemy].hand,...g.stock],seed);
 g.people[enemy].hand=unknown.slice(0,count);g.stock=unknown.slice(count);
 return g;
}
function finish(g){
 while(!P.finished(g)){const seat=P.active(g);P.play(g,seat,P.choose(g,seat,'timing'))}
 return g;
}
function outcome(state,actor,move,worldSeed){
 const g=randomizeUnseen(state,actor,worldSeed);
 P.play(g,actor,move);finish(g);
 return g.draw?.5:g.winner===actor?1:0;
}
const stages={early:[],middle:[],late:[]};
for(let i=1;i<=Math.max(9000,limit*300)&&Object.values(stages).some(a=>a.length<limit);i++){
 const g=P.create({mode:'match',seed:(baseSeed+i*79)>>>0});
 while(!P.finished(g)){
  const s=P.active(g),opts=P.legal(g,s),hand=g.people[s].hand,
   joker=opts.find(m=>m.type==='play'&&hand[m.index].kind==='joker'),
   normals=opts.filter(m=>m.type==='play'&&!hand[m.index].kind);
  const stage=g.stock.length>=12?'early':g.stock.length>4?'middle':'late';
  if(joker&&normals.length&&g.pile.length>=2&&stages[stage].length<limit&&
    !stages[stage].some(x=>x.seed===g.seed)){
   const flexibility=c=>c.arrow==='up'?9-c.n:c.n,
    value=c=>g.stock.length?flexibility(c):-flexibility(c);
   const normal=normals.reduce((best,m)=>value(hand[m.index])>value(hand[best.index])?m:best,
    normals[0]);
   stages[stage].push({game:clone(g),actor:s,joker,normal,seed:g.seed,pile:g.pile.length});
  }
  const s=P.active(g);P.play(g,s,P.choose(g,s,'timing'));
 }
}
const result={experiment:'Two realistic hidden-hand choices: use Joker now or keep it',baseSeed,limit,worlds,
 data:{},limitations:[
  'A state is eligible only if the player holds a Joker and another playable number card, and the pile contains at least two cards.',
  'The hidden opponent hand and unrevealed stock are redistributed together; the acting player hand, exposed discards and public pile are unchanged.',
  'The alternate number play is chosen by a transparent own-hand flexibility heuristic, not a perfect search.',
  'The game policy after either move is the same non-cheating Timing bot; these are bots, not actual humans.',
  'The same seed under different choices still produces different future gameplay, and the data are grouped by sampled states.',
  'The existence of a winning move does not mean a human player can reliably infer it.'
 ]};
for(const [stage,states] of Object.entries(stages)){
 let absTotal=0,attack=0,keep=0,big=0,size=0,near=0;
 for(const [i,st] of states.entries()){
  let yes=0,no=0;
  for(let j=0;j<worlds;j++){
   const seed=(st.seed+i*331+j*1093)>>>0;
   yes+=outcome(st.game,st.actor,st.joker,seed);
   no+=outcome(st.game,st.actor,st.normal,seed);
  }
  const delta=(yes-no)/worlds;absTotal+=Math.abs(delta);size+=st.pile;
  attack+=+(delta>=.10);keep+=+(delta<=-.10);big+=+(Math.abs(delta)>=.20);
  near+=+(Math.abs(delta)<.10);
 }
 result.data[stage]={states:states.length,meanPileSize:+(size/states.length).toFixed(1),
  avgAbsoluteExpectedWinDifferencePct:+(100*absTotal/states.length).toFixed(1),
  attackNowAdvantageAtLeast10pt:attack,keepJokerAdvantageAtLeast10pt:keep,
  gapAtLeast20pt:big,nearTieLessThan10pt:near};
}
console.log(JSON.stringify(result,null,2));
