/* PILEHEAD · deterministic physical-card engine, separate from SPARK and TILT.
   Rules v1: 40 numbers (1–10 x4) + 12 independent actions.
   All information lives in state; rendering never determines legality. */
(function(root){'use strict';
const VERSION='pilehead-1.0.0',DECK_SIZE=52,ACTIONS={reset:3,ghost:3,under:2,skip:2,burn:2};
function assert(ok,message){if(!ok)throw new Error(message)}
function random(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(a,g){for(let i=a.length-1;i>0;i--){let j=Math.floor(random(g)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function deck(){const a=[];let id=0;for(let n=1;n<=10;n++)for(let k=0;k<4;k++)a.push({id:id++,kind:'number',rank:n});
 for(const [action,n] of Object.entries(ACTIONS))for(let k=0;k<n;k++)a.push({id:id++,kind:'action',action});
 return a;
}
function create({seed=20261113,players=4}={}){
 assert(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,'Invalid seed');
 assert(Number.isInteger(players)&&players>=2&&players<=5,'2–5 players required');
 const g={version:VERSION,seed,rng:(seed^0x53a2d18b)>>>0,phase:'setup',turn:0,
   moves:0,stock:[],pile:[],ashes:[],limit:null,slamOpen:false,finishedOrder:[],
   loser:null,people:Array.from({length:players},(_,seat)=>({seat,hand:[],up:[],down:[],pickups:0,out:false})),
   events:[]};
 g.stock=shuffle(deck(),g);
 for(const area of ['down','up','hand'])for(let k=0;k<3;k++)for(const p of g.people)p[area].push(g.stock.pop());
 assert(count(g)===DECK_SIZE,'Setup conservation failed');
 return g;
}
function count(g){return g.stock.length+g.pile.length+g.ashes.length+
 g.people.reduce((n,p)=>n+p.hand.length+p.up.length+p.down.length,0)}
function invariant(g){assert(count(g)===DECK_SIZE,'Card conservation failed: '+count(g));
 const ids=[...g.stock,...g.pile,...g.ashes,...g.people.flatMap(p=>[...p.hand,...p.up,...p.down])].map(c=>c.id);
 assert(new Set(ids).size===DECK_SIZE,'Duplicate card identity');
 assert(g.people.every(p=>!(p.out&&(p.hand.length||p.up.length||p.down.length))),'Finished player has cards');
 return true;
}
function stage(g,seat){const p=g.people[seat];assert(p,'Unknown seat');
 return p.hand.length||g.stock.length?'hand':p.up.length?'up':p.down.length?'down':'out'}
function start(g){assert(g.phase==='setup','Game already started');g.phase='play';g.turn=0;return g}
function swap(g,seat,handId,upId){assert(g.phase==='setup','Swaps only during setup');
 const p=g.people[seat],a=p?.hand.findIndex(c=>c.id===handId),b=p?.up.findIndex(c=>c.id===upId);
 assert(a>=0&&b>=0,'Invalid setup swap');[p.hand[a],p.up[b]]=[p.up[b],p.hand[a]];return g}
function autoSetup(g,seat){
 const p=g.people[seat];assert(g.phase==='setup','Setup already finished');
 const value=c=>c.kind==='action'?({burn:30,reset:25,ghost:16,skip:12,under:10}[c.action]):c.rank;
 const nine=[...p.hand,...p.up].sort((a,b)=>value(b)-value(a));
 p.up=nine.slice(0,3);p.hand=nine.slice(3);return g;
}
function next(g,seat){for(let k=1;k<=g.people.length;k++){const i=(seat+k)%g.people.length;if(!g.people[i].out)return i}return seat}
function finish(g){for(const p of g.people){if(!p.out&&!p.hand.length&&!p.up.length&&!p.down.length){
 p.out=true;g.finishedOrder.push(p.seat)}}const alive=g.people.filter(p=>!p.out);
 if(alive.length<=1){g.phase='over';g.loser=alive[0]?.seat??null;g.slamOpen=false;return true}return false}
function isLegal(g,c){if(c.kind==='action')return true;
 if(g.limit?.type==='under')return c.rank<=4;
 if(g.limit?.type==='min')return c.rank>=g.limit.value;
 return true;
}
function options(g,seat){if(g.phase!=='play'||g.turn!==seat)return[];
 const p=g.people[seat],s=stage(g,seat);if(s==='down')return p.down.map(c=>({type:'play',ids:[c.id],source:'down'}));
 const cards=p[s],legal=cards.filter(c=>isLegal(g,c)),opts=[];
 for(const c of legal){if(c.kind==='action'){opts.push({type:'play',source:s,ids:[c.id]});continue}
 const same=cards.filter(x=>x.kind==='number'&&x.rank===c.rank);
 if(same[0].id!==c.id)continue;
 for(let n=1;n<=same.length;n++)opts.push({type:'play',source:s,ids:same.slice(0,n).map(x=>x.id)});
 }
 if(!opts.length&&g.pile.length)opts.push({type:'take'});
 return opts;
}
function topRun(g){let n=0,rank=null;for(let i=g.pile.length-1;i>=0;i--){
 const c=g.pile[i];if(c.kind!=='number'||rank!==null&&rank!==c.rank)break;
 rank=c.rank;n++;
 }return{rank,count:n};
}
function slamOptions(g,seat){if(g.phase!=='play'||!g.slamOpen||g.people[seat]?.out)return[];
 const top=topRun(g),need=4-top.count;
 if(top.count===0||need<=0)return[];
 const s=stage(g,seat);if(s==='down'||s==='out')return[];
 const eligible=g.people[seat][s].filter(c=>c.kind==='number'&&c.rank===top.rank);
 return eligible.length>=need?[{type:'slam',source:s,ids:eligible.slice(0,need).map(c=>c.id)}]:[];
}
function take(g,seat){
 assert(g.pile.length>0,'Cannot take an empty pile');
 const n=g.pile.length;g.people[seat].hand.push(...g.pile.splice(0));g.people[seat].pickups++;
 g.limit=null;g.slamOpen=false;g.moves++;g.turn=next(g,seat);
 const event={type:'take',seat,count:n};g.events.push(event);invariant(g);return event;
}
function move(g,seat,choice){
 assert(g.phase==='play','Game is not in progress');
 assert(g.people[seat]&&!g.people[seat].out,'Invalid player');
 assert(choice&&['play','take','slam'].includes(choice.type),'Invalid action');
 if(choice.type==='slam'){
  const eligible=slamOptions(g,seat)[0];
  assert(eligible&&choice.source===eligible.source&&sameIds(choice.ids,eligible.ids),'Illegal SLAM');
 }else assert(g.turn===seat,'Not your turn');
 if(choice.type==='take'){
  assert(options(g,seat).some(o=>o.type==='take'),'Pickup only when no legal move');
  return take(g,seat);
 }
 const p=g.people[seat],s=stage(g,seat);
 assert(s===choice.source,'Wrong card source');
 const ids=choice.ids;
 assert(Array.isArray(ids)&&ids.length>0&&ids.length<=4&&new Set(ids).size===ids.length,'Invalid card selection');
 const cards=ids.map(id=>p[s].find(c=>c.id===id));
 assert(cards.every(Boolean),'Selected card not owned');
 if(choice.type==='play'){
  if(s==='down')assert(ids.length===1,'One blind card at a time');
  else{
   assert(cards.every(c=>isLegal(g,c)),'Card is not playable');
   assert(cards.length===1||cards.every(c=>c.kind==='number'&&c.rank===cards[0].rank),'Only matching numbers together');
  }
 }
 p[s]=p[s].filter(c=>!ids.includes(c.id));
 g.slamOpen=false;
 if(choice.type==='play'&&s==='down'&&!isLegal(g,cards[0])){
  g.pile.push(...cards);const ev=take(g,seat);ev.type='blind-fail';return ev;
 }
 g.pile.push(...cards);
 const card=cards[0];let burned=false,reason=choice.type==='slam'?'slam':'number';
 if(choice.type==='slam'){burned=true}
 else if(card.kind==='action'){
  reason=card.action;
  if(card.action==='reset')g.limit=null;
  if(card.action==='under')g.limit={type:'under'};
  if(card.action==='burn')burned=true;
  // GHOST and SKIP preserve the active numeric/UNDER restriction.
 }else{
  g.limit={type:'min',value:card.rank};
  burned=topRun(g).count>=4;
  if(burned)reason='four';
  else g.slamOpen=true;
 }
 if(burned){g.ashes.push(...g.pile.splice(0));g.limit=null;g.slamOpen=false}
 if(s==='hand')while(p.hand.length<3&&g.stock.length)p.hand.push(g.stock.pop());
 g.moves++;const event={type:choice.type,seat,reason,count:cards.length,burned,
  rank:card.rank??null,action:card.action??null};
 g.events.push(event);
 const over=finish(g);
 if(!over)g.turn=burned?(!p.out?seat:next(g,seat)):card.action==='skip'?next(g,next(g,seat)):next(g,seat);
 invariant(g);return event;
}
function sameIds(a,b){return Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i])}
function choose(g,seat,style='greedy'){
 const opts=options(g,seat);assert(opts.length,'No moves');
 if(opts.length===1)return opts[0];
 const p=g.people[seat],score=o=>{
  if(o.type==='take')return -1000;
  const c=p[o.source].find(x=>x.id===o.ids[0]);
  if(c.kind==='number'){
   let v=70-c.rank*2+o.ids.length*6;
   if(g.pile.length&&topRun(g).rank===c.rank&&topRun(g).count+o.ids.length>=4)v+=100;
   if(style==='saver')v+=c.rank*3;
   return v;
  }
  const power={ghost:48,under:35,skip:40,reset:20,burn:12}[c.action];
  return style==='saver'?power-15:power;
 };
 if(style==='random')return opts[Math.floor(random(g)*opts.length)];
 return opts.slice().sort((a,b)=>score(b)-score(a))[0];
}
function autoSlam(g,style='greedy',exclude=-1){if(g.phase!=='play'||!g.slamOpen)return null;
 for(let n=1;n<=g.people.length;n++){const seat=(g.turn+n)%g.people.length;
  if(seat===exclude||g.people[seat].out)continue;
  const opts=slamOptions(g,seat);
  if(opts.length&&!(style==='random'&&random(g)<.35))return move(g,seat,opts[0]);
 }return null;
}
const api={VERSION,DECK_SIZE,ACTIONS,deck,create,start,swap,autoSetup,stage,count,invariant,
 options,slamOptions,topRun,isLegal,move,choose,autoSlam,next};
root.PileheadEngine=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
