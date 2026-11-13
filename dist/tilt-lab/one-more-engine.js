/* TILT ONE MORE · experimental minimalist print-and-play (never production rules).
   Play one legal card, then STOP or risk exactly ONE MORE.
   The next player may bounce the bonus card using the same number.
   No arrow rotations, no 3-card chains, no explicit accept stage. */
(function(root){
'use strict';
const TOTAL=48,VERSION='one-more-v1',MAX=240;
function checkRule(ok,msg){if(!ok)throw Error(msg)}
function random(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(a,g){for(let i=a.length-1;i>0;i--){let j=Math.floor(random(g)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function deck(){let id=0,arr=[];for(let n=1;n<=8;n++)for(const arrow of ['up','down'])for(let k=0;k<3;k++)arr.push({id:id++,n,arrow});return arr}
function start({players=2,seed=20261113,firstSeat=0}={}){
 checkRule(Number.isInteger(players)&&players>=2&&players<=4,'2–4 players');
 checkRule(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid seed');
 checkRule(Number.isInteger(firstSeat)&&firstSeat>=0&&firstSeat<players,'Invalid seat');
 const g={version:VERSION,mode:'one-more',seed,rng:(seed^0x3b2d7f99)>>>0,
  people:Array.from({length:players},(_,seat)=>({seat,hand:[],pickups:0})),stock:[],pile:[],burn:[],current:firstSeat,
  turn:0,actions:0,phase:'play',pending:null,winner:null,draw:false,
  stats:{plays:0,clears:0,offers:0,extra:0,stops:0,bounces:0,trades:0,accepted:0},history:[]};
 g.stock=shuffle(deck(),g);for(let i=0;i<4;i++)for(const person of g.people)person.hand.push(g.stock.pop());
 // The first player leads with any card onto an EMPTY pile: no awkward blocked opening.
 check(g);return g;
}
function count(g){return g.stock.length+g.pile.length+g.burn.length+g.people.reduce((n,p)=>n+p.hand.length,0)}
function check(g){
 checkRule(count(g)===TOTAL,'48-card conservation '+count(g));
 const cards=g.stock.concat(g.pile,g.burn,...g.people.map(p=>p.hand));
 checkRule(new Set(cards.map(c=>c.id)).size===TOTAL,'Duplicate card');
 checkRule(g.current>=0&&g.current<g.people.length,'Invalid active player');return true;
}
const top=g=>g.pile.at(-1)||null;
const valid=(previous,c)=>!previous||(previous.arrow==='up'?c.n>=previous.n:c.n<=previous.n);
function refill(g,seat){const hand=g.people[seat].hand;while(hand.length<4&&g.stock.length)hand.push(g.stock.pop())}
function next(g,seat){
 g.phase='play';refill(g,seat);
 if(!g.stock.length&&!g.people[seat].hand.length&&!g.pending){g.winner=seat;g.phase='done';return}
 g.current=(seat+1)%g.people.length;g.turn++;
 if(g.turn>=MAX&&g.winner===null){g.draw=true;g.phase='done'}
}
function legal(g){
 if(g.winner!==null||g.draw)return[];
 const h=g.people[g.current].hand,m=[],last=top(g);
 if(g.phase==='choice'){
  m.push({type:'stop'});
  h.forEach((c,index)=>{if(c.n!==last.n&&valid(last,c))m.push({type:'extra',index})});
  return m;
 }
 if(g.pending)h.forEach((c,index)=>{if(c.n===g.pending.rank)m.push({type:'bounce',index})});
 h.forEach((c,index)=>{if(c.n!==g.pending?.rank&&valid(last,c))m.push({type:'play',index})});
 if(!m.length&&last)h.forEach((c,index)=>m.push({type:'trade',index}));
 return m;
}
function same(a,b){return a.type===b.type&&Object.keys(a).every(k=>a[k]===b[k])}
function play(g,move){
 const opts=legal(g);checkRule(opts.some(m=>same(m,move)),'Illegal '+JSON.stringify(move));
 const seat=g.current,person=g.people[seat],hand=person.hand,old=g.pending,evt={seat,type:move.type,card:null,effect:move.type,taken:0};
 if(g.phase==='choice'&&(move.type==='stop'||move.type==='extra')){g.stats.offers++}
 if(old&&move.type!=='bounce'){
  // Passing up a final-card bounce concedes the finished game immediately.
  if(!g.stock.length&&!g.people[old.from].hand.length){
   g.pending=null;g.winner=old.from;g.phase='done';evt.effect='bonus-survived';
   g.actions++;g.history.push({seat,type:move.type,effect:evt.effect});check(g);return evt;
  }
  g.pending=null;g.stats.accepted++;
 }
 if(move.type==='stop'){
  g.stats.stops++;next(g,seat);
 }else if(move.type==='extra'){
  const c=hand.splice(move.index,1)[0];evt.card=c;g.pile.push(c);g.stats.extra++;
  g.pending={from:seat,rank:c.n,id:c.id};g.phase='play';refill(g,seat);evt.effect='bonus';
  if(!g.stock.length&&!hand.length){
   const nextPlayer=g.people[(seat+1)%g.people.length];
   if(!nextPlayer.hand.some(card=>card.n===c.n)){g.pending=null;g.winner=seat;g.phase='done'}
  }
  if(g.winner===null){g.current=(seat+1)%g.people.length;g.turn++}
 }else if(move.type==='bounce'){
  const c=hand.splice(move.index,1)[0];evt.card=c;g.burn.push(c);
  const attacker=g.people[g.pending.from];evt.taken=g.pile.length;
  attacker.hand.push(...g.pile.splice(0));attacker.pickups++;g.stats.bounces++;
  g.pending=null;evt.effect='bounce';next(g,seat);
 }else if(move.type==='play'){
  const c=hand.splice(move.index,1)[0],prev=top(g);evt.card=c;g.pile.push(c);g.stats.plays++;
  if(prev&&prev.n===c.n){
   g.burn.push(...g.pile.splice(0));g.stats.clears++;evt.effect='clear';next(g,seat);
  }else{
   g.phase='choice';evt.effect='played';
   if(!legal(g).some(m=>m.type==='extra'))next(g,seat);
  }
 }else if(move.type==='trade'){
  const outgoing=hand.splice(move.index,1)[0],incoming=g.pile.pop();
  evt.card=outgoing;hand.push(incoming);g.burn.push(outgoing);g.stats.trades++;next(g,seat);
 }
 g.actions++;
 if(g.actions>MAX*3&&g.winner===null){g.draw=true;g.phase='done'}
 g.history.push({seat,type:move.type,effect:evt.effect,rank:evt.card?.n??null});check(g);return evt;
}
function bot(g,style='mixed'){
 const moves=legal(g),h=g.people[g.current].hand;
 checkRule(moves.length>0,'Bot has no move');
 const bounce=moves.find(m=>m.type==='bounce');if(bounce)return bounce;
 if(g.phase==='choice'){
  const extras=moves.filter(x=>x.type==='extra');
  if(!extras.length)return moves[0];
  let risk=style==='bold'?.8:style==='safe'?.18:.5;
  risk-=Math.min(.3,g.pile.length*.032);
  if(random(g)<risk)return extras.slice().sort((a,b)=>
   h.filter(c=>c.n===h[b.index].n).length-h.filter(c=>c.n===h[a.index].n).length)[0];
  return{type:'stop'};
 }
 const normal=moves.filter(m=>m.type==='play');
 if(normal.length){
  const prev=top(g);
  return normal.slice().sort((a,b)=>{
   const score=i=>{const card=h[i];return prev&&card.n===prev.n?100:prev?8-Math.abs(card.n-prev.n):8};
   return score(b.index)-score(a.index);
  })[0];
 }
 return moves[0];
}
function simulate({players=2,seed=1,styles=['mixed','safe','bold','mixed']}={}){
 const g=start({players,seed});
 while(g.winner===null&&!g.draw)play(g,bot(g,styles[g.current%styles.length]));
 return g;
}
root.TiltOneMore={TOTAL,VERSION,deck,start,count,check,top,valid,legal,play,bot,simulate};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.TiltOneMore;
