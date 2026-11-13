/* TILT Mechanics Lab. Experimental, independent of production SPARK and TILT. */
(function(root){
'use strict';
const TOTAL=48,MAX=240,MODES=['chain','twin'];
function ok(v,s){if(!v)throw Error(s)}
function random(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(a,g){for(let i=a.length-1;i>0;i--){let j=Math.floor(random(g)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function deck(){let id=0,a=[];for(let n=1;n<=8;n++)for(let d of ['up','down'])for(let j=0;j<3;j++)a.push({id:id++,n,arrow:d});return a}
function start({mode='chain',players=2,seed=20261113}={}){
 ok(MODES.includes(mode),'Bad mode');ok(players>=2&&players<=4&&Number.isInteger(players),'2-4 players');ok(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Bad seed');
 let g={version:1,mode,seed,rng:(seed^0xa95f5fa2)>>>0,stock:[],burn:[],piles:mode==='chain'?[[]]:[[],[]],
 people:Array.from({length:players},(_,seat)=>({seat,hand:[],pickups:0})),current:0,phase:'play',chain:null,pending:null,turn:0,actions:0,winner:null,draw:false,history:[],
 stats:{press:0,counter:0,collision:0,match:0,stops:0,exchanges:0,pickups:0,
 pressOffers:0,pressChosen:0,pressDeclined:0,controlFlips:0,twinLaneOffers:0,collisionOffers:0,collisionDeclined:0}};
 g.stock=shuffle(deck(),g);
 for(let i=0;i<4;i++)for(const p of g.people)p.hand.push(g.stock.pop());
 for(const pile of g.piles)pile.push(g.stock.pop());
 check(g);return g;
}
function count(g){return g.stock.length+g.burn.length+g.piles.reduce((a,p)=>a+p.length,0)+g.people.reduce((a,p)=>a+p.hand.length,0)}
function check(g){
 ok(count(g)===TOTAL,'Card conservation: '+count(g));
 const all=g.stock.concat(g.burn,...g.piles,...g.people.map(p=>p.hand));
 ok(new Set(all.map(c=>c.id)).size===TOTAL,'Duplicate card');
 ok(g.current>=0&&g.current<g.people.length,'Invalid seat');return true;
}
function face(c){return c.face||c.arrow}
function can(top,c){return !top||(face(top)==='up'?c.n>=top.n:c.n<=top.n)}
function top(g,l=0){return g.piles[l].at(-1)||null}
function refill(g,seat){let h=g.people[seat].hand;while(h.length<4&&g.stock.length)h.push(g.stock.pop())}
function burn(g,l){g.burn.push(...g.piles[l].splice(0))}
function winner(g,seat){if(!g.stock.length&&!g.people[seat].hand.length&&!g.pending){g.winner=seat;g.phase='done';return true}return false}
function next(g,seat){g.chain=null;g.pending=null;refill(g,seat);
 if(!winner(g,seat)){g.turn++;g.current=(seat+1)%g.people.length;g.phase='play'}
 if(g.turn>=MAX&&g.winner===null){g.draw=true;g.phase='done'}}
function legal(g){
 if(g.winner!==null||g.draw)return[];
 const h=g.people[g.current].hand,o=[];
 if(g.mode==='chain'){
  if(g.phase==='counter'){
   o.push({type:'accept'});h.forEach((c,i)=>{if(g.pending.ranks.includes(c.n))o.push({type:'counter',index:i})});
  }else if(g.phase==='extend'){
   if(g.chain.count===1)o.push({type:'stop',arrow:'up'},{type:'stop',arrow:'down'});
   else o.push({type:'stop'});
   if(g.chain.count<3){const t=top(g);h.forEach((c,i)=>{if(c.n!==t.n&&can(t,c))o.push({type:'extend',index:i})})}
  }else if(g.phase==='play'){
   const t=top(g);
   h.forEach((c,i)=>{if(can(t,c))o.push({type:'play',index:i,lane:0})});
   if(!o.length&&t)h.forEach((c,i)=>o.push({type:'exchange',index:i}));
  }
 }else if(g.phase==='bonus'){
  h.forEach((c,i)=>o.push({type:'burnBonus',index:i}));if(!h.length)o.push({type:'skipBonus'});
 }else if(g.phase==='play'){
  h.forEach((c,i)=>g.piles.forEach((_,lane)=>{if(can(top(g,lane),c))o.push({type:'play',index:i,lane})}));
  if(!o.length)g.piles.forEach((p,lane)=>{if(p.length)h.forEach((c,index)=>o.push({type:'exchange',lane,index}))});
 }
 return o;
}
function press(g,seat){
 const x=g.chain;g.stats.press++;refill(g,seat);
 g.pending={by:seat,count:x.count,ranks:x.ranks.slice()};g.chain=null;
 g.current=(seat+1)%g.people.length;g.turn++;g.phase='counter';
}
function play(g,m){
 ok(legal(g).some(a=>a.type===m.type&&Object.keys(a).every(k=>a[k]===m[k])),'Illegal action: '+JSON.stringify(m));
 const seat=g.current,p=g.people[seat],e={seat,type:m.type,effect:'',rank:null,lane:m.lane??null};
 // Counters are updated when the human/bot actually chooses an option, never by rendering legal moves.
 for(const name of ['pressOffers','pressChosen','pressDeclined','controlFlips','twinLaneOffers','collisionOffers','collisionDeclined'])g.stats[name]??=0;
 if(g.mode==='chain'&&g.phase==='extend'&&g.chain.count===1){
  const hasPress=legal(g).some(x=>x.type==='extend');
  if(hasPress){g.stats.pressOffers++;if(m.type==='extend')g.stats.pressChosen++;if(m.type==='stop')g.stats.pressDeclined++}
 }
 if(g.mode==='twin'&&g.phase==='play'&&m.type==='play'){
  const choices=legal(g).filter(x=>x.type==='play');
  if(new Set(choices.map(x=>x.lane)).size===2)g.stats.twinLaneOffers++;
  const canCollision=choices.some(x=>top(g,1-x.lane)?.n===p.hand[x.index].n);
  if(canCollision){g.stats.collisionOffers++;if(top(g,1-m.lane)?.n!==p.hand[m.index].n)g.stats.collisionDeclined++}
 }
 if(g.mode==='chain'){
  const t=top(g),pile=g.piles[0];
  if(m.type==='play'){
   let c=p.hand.splice(m.index,1)[0];e.rank=c.n;pile.push(c);
   if(t&&t.n===c.n){burn(g,0);g.stats.match++;e.effect='match';next(g,seat)}
   else{g.chain={by:seat,count:1,ranks:[]};g.phase='extend'}
  }else if(m.type==='extend'){
   const c=p.hand.splice(m.index,1)[0];e.rank=c.n;pile.push(c);g.chain.count++;g.chain.ranks.push(c.n);
   e.effect='press';if(g.chain.count>=3)press(g,seat);
  }else if(m.type==='stop'){
   if(g.chain.count===1){if(t.arrow!==m.arrow)g.stats.controlFlips++;t.face=m.arrow;g.stats.stops++;e.effect='control-'+m.arrow;next(g,seat)}
   else{e.effect='press-finished';press(g,seat)}
  }else if(m.type==='accept'){
   const challenger=g.pending.by;g.pending=null;e.effect='accepted';
   if(!winner(g,challenger))g.phase='play';
  }else if(m.type==='counter'){
   const c=p.hand.splice(m.index,1)[0];e.rank=c.n;g.burn.push(c);
   const a=g.pending,attacker=g.people[a.by];
   const penalty=pile.splice(-Math.min(a.count,pile.length));for(const x of penalty){delete x.face;attacker.hand.push(x)}
   burn(g,0);attacker.pickups++;g.pending=null;g.stats.counter++;e.effect='counter';
   refill(g,seat);if(!winner(g,seat)){g.turn++;g.current=(seat+1)%g.people.length;g.phase='play'}
  }else if(m.type==='exchange'){
   const outgoing=p.hand.splice(m.index,1)[0],incoming=pile.pop();delete incoming.face;
   e.rank=outgoing.n;p.hand.push(incoming);g.burn.push(outgoing);g.stats.exchanges++;e.effect='exchange';next(g,seat);
  }
 }else if(m.type==='play'){
   const pile=g.piles[m.lane],other=top(g,1-m.lane),before=top(g,m.lane),c=p.hand.splice(m.index,1)[0];e.rank=c.n;pile.push(c);
   if(other&&other.n===c.n){
    burn(g,0);burn(g,1);g.stats.collision++;e.effect='collision';
    if(p.hand.length)g.phase='bonus';else next(g,seat);
   }else if(before&&before.n===c.n){burn(g,m.lane);g.stats.match++;e.effect='match';next(g,seat)}
   else next(g,seat);
 }else if(m.type==='burnBonus'){
   const c=p.hand.splice(m.index,1)[0];e.rank=c.n;g.burn.push(c);e.effect='bonus';next(g,seat);
 }else if(m.type==='skipBonus'){e.effect='skip-bonus';next(g,seat)}
 else if(m.type==='exchange'){
   const pile=g.piles[m.lane],outgoing=p.hand.splice(m.index,1)[0],incoming=pile.pop();delete incoming.face;
   p.hand.push(incoming);g.burn.push(outgoing);burn(g,m.lane);g.stats.exchanges++;e.effect='exchange';next(g,seat);
 }
 g.actions++;if(g.actions>=MAX*2&&g.winner===null){g.draw=true;g.phase='done'}
 g.history.push(e);check(g);return e;
}
function bot(g,style='mixed'){
 const opts=legal(g),hand=g.people[g.current].hand;
 ok(opts.length,'Bot has no moves');
 if(g.phase==='counter')return opts.find(x=>x.type==='counter')||opts[0];
 if(g.phase==='bonus')return opts.filter(x=>x.type==='burnBonus').sort((a,b)=>hand[b.index].n-hand[a.index].n)[0]||opts[0];
 if(g.phase==='extend'){
  const stop=opts.filter(x=>x.type==='stop').sort((a,b)=>{
   const t=top(g);const v=x=>x.arrow==='up'?t.n-1:8-t.n;
   return v(b)-v(a);
  })[0];
  const extra=opts.filter(x=>x.type==='extend');
  if(!extra.length)return stop;
  const t=top(g),risk=(g.chain.count+1)*.34;
  const control=g.chain.count===1?Math.max(t.n-1,8-t.n)*.14:0;
  if(1.5-risk-control+(style==='bold'?.65:style==='careful'?-.65:0)>0){
   return extra.sort((a,b)=>Math.abs(hand[a.index].n-t.n)-Math.abs(hand[b.index].n-t.n))[0];
  }return stop;
 }
 if(g.mode==='chain'){
  if(opts[0].type==='exchange')return opts.sort((a,b)=>hand[b.index].n-hand[a.index].n)[0];
  const t=top(g);
  return opts.sort((a,b)=>{
   const value=x=>{const c=hand[x.index];return t&&c.n===t.n?50:Math.max(c.n-1,8-c.n)};
   return value(b)-value(a);
  })[0];
 }
 if(opts[0].type==='exchange')return opts.sort((a,b)=>g.piles[b.lane].length-g.piles[a.lane].length||hand[b.index].n-hand[a.index].n)[0];
 const value=x=>{
  const c=hand[x.index],other=top(g,1-x.lane),own=top(g,x.lane);
  return (other&&other.n===c.n?12:0)+(own&&own.n===c.n?2:0)+((c.arrow==='up'?c.n-1:8-c.n)*.30);
 };
 return opts.sort((a,b)=>value(b)-value(a))[0];
}
function simulate({mode='chain',players=2,seed=1,styles=['mixed','bold','careful','mixed']}={}){
 const g=start({mode,players,seed});while(g.winner===null&&!g.draw){const m=bot(g,styles[g.current%styles.length]);play(g,m)}return g;
}
root.TiltMechanics={TOTAL,MODES,deck,start,count,check,face,can,top,legal,play,bot,simulate};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.TiltMechanics;
