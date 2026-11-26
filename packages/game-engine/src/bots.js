'use strict';
// Bot policy uses only injected rules and the game's seeded RNG.
module.exports=function createBotPolicy({options,assert,withBotTarget,finalDuelActive,random,stage,topRun,slamOptions,move}){
function choose(g,seat,style='greedy'){
 const opts=options(g,seat);assert(opts.length,'No moves');
 if(g.pendingCounter)return opts[0]; // Counter sheds cards and wins the next turn.
 if(opts.length===1)return withBotTarget(g,seat,opts[0]);
 // Classic permits long two-player cycles without Final Duel. After
 // unusually many legal turns, stop choosing the same highest-scoring rank
 // forever. Vary among legal card plays using the game's seeded RNG; never
 // alter cards, reveal rivals' hands or quietly turn Final Duel on.
 // Existing normal-game bot behavior remains unchanged.
 if(g.moves>110&&!g.stock.length&&!finalDuelActive(g)&&
    g.people.filter(p=>!p.out).length===2){
   const playable=opts.filter(o=>o.type==='play');
   if(playable.length>1){
     const picks=playable.slice().sort((a,b)=>(b.ids?.length||0)-(a.ids?.length||0));
     const sample=Math.min(picks.length,4);
     return withBotTarget(g,seat,picks[Math.floor(random(g)*sample)]);
   }
 }
 // A bot must not read the faces of physical down cards when selecting a slot.
 // Use seeded randomness over positions, independently of hidden rank/action.
 if(stage(g,seat)==='down'){
  const blind=opts.filter(o=>o.type==='play'&&o.source==='down');
  if(blind.length)return blind[Math.floor(random(g)*blind.length)];
 }
 const p=g.people[seat],score=o=>{
  if(o.type==='take')return -1000;
  const c=p[o.source].find(x=>x.id===o.ids[0]);
  if(c.kind==='number'){
   let v=70-c.rank*2+o.ids.length*6;
   // Avoid deterministic hand/pile ping-pong loops without looking at opponents' hidden cards.
   const recent=g.events.slice(-24).filter(e=>e.seat===seat&&e.reason==='number'&&e.rank===c.rank).length;
   v-=recent*16;
   if(g.pile.length&&topRun(g).rank===c.rank&&topRun(g).count+o.ids.length>=4)v+=100;
   if(style==='saver')v+=c.rank*3;
   return v;
  }
  const power={ghost:48,under:35,skip:40,reset:20,burn:12,dump:13}[c.action];
  // Two identical special cards are one action, resolving once; playing a
  // pair helps empty the hand but does not multiply SKIP/DUMP/BURN effects.
  return (style==='saver'?power-15:power)+(o.ids.length-1)*9;
 };
 if(style==='random'){
  // Keep existing bot behavior: a random bot doesn't randomly surrender an
  // otherwise playable turn just because human players now have that choice.
  const playable=opts.filter(o=>o.type!=='take'),choices=playable.length?playable:opts;
  return withBotTarget(g,seat,choices[Math.floor(random(g)*choices.length)]);
 }
 return withBotTarget(g,seat,opts.slice().sort((a,b)=>score(b)-score(a))[0]);
}
function autoSlam(g,style='greedy',exclude=-1){if(g.phase!=='play'||!g.pile.length)return null;
 for(let n=1;n<=g.people.length;n++){const seat=(g.turn+n)%g.people.length;
  if(seat===exclude||g.people[seat].out)continue;
  const opts=slamOptions(g,seat);
  if(opts.length&&!(style==='random'&&random(g)<.35))return move(g,seat,opts[0]);
 }return null;
}
return {choose,autoSlam};
};
