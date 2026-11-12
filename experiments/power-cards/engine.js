/* TILT ONE · SPECIAL CARDS LAB
 * Experimental physics-first 32-card game. Two JOKER cards replace two
 * regular CORE card faces; 16 EXTRA cards remain set aside.
 *
 * Three strictly isolated variants:
 * plain  - next player picks up entire pile; their turn ends.
 * joker  - another Joker may reflect the entire penalty.
 * match  - matching the visible rank beneath the sideways Joker reflects it.
 *
 * A Joker is played SIDEWAYS next to the pile so no earlier card needs to be
 * remembered; the challenged rank stays visible. No power cards are ever
 * recycled on a pickup or counter. A Joker on an empty pile is discarded
 * without attack or skipping another player's turn.
 */
(function(root){'use strict';
const VERSION='one-joker-duel-v01',DECK_SIZE=48,HAND=4,MAX_TURNS=240,MODES=['plain','joker','match'];
function fail(ok,msg){if(!ok)throw Error(msg)}
function rng(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(arr,g){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function deck(){
 let id=0;const out=[];
 for(let n=1;n<=8;n++)for(const arrow of ['up','down'])
  for(let k=0;k<3;k++)out.push({id:id++,n,arrow});
 for(const marker of [1,46]){
  const c=out.find(x=>x.id===marker);c.kind='joker';c.n=null;c.arrow='wild';
 }
 return out;
}
function create({seed=20261111,mode='match',firstSeat=0}={}){
 fail(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid seed');
 fail(MODES.includes(mode),'Invalid Joker variant');
 fail(firstSeat===0||firstSeat===1,'Invalid first seat');
 const g={version:VERSION,seed,mode,firstSeat,rng:(seed^0x912a6dc3)>>>0,
  turn:0,winner:null,draw:false,stock:[],aside:[],pile:[],ashes:[],
  pending:null,people:[{seat:0,hand:[],pickups:0},{seat:1,hand:[],pickups:0}],log:[]};
 const cards=deck();
 g.stock=shuffle(cards.filter(c=>c.id%3!==2),g);
 g.aside=cards.filter(c=>c.id%3===2);
 for(let i=0;i<HAND;i++)for(const p of g.people)p.hand.push(g.stock.pop());
 fail(g.stock.length===24&&count(g)===DECK_SIZE,'Invalid physical setup');
 return g;
}
function count(g){
 return g.stock.length+g.aside.length+g.pile.length+g.ashes.length+
  (g.pending?1:0)+g.people.reduce((x,p)=>x+p.hand.length,0);
}
function active(g){return(g.turn+(g.firstSeat||0))%2}
function finished(g){return g.winner!==null||g.draw}
function valid(top,card){
 if(card.kind==='joker')return true;
 return !top||(top.arrow==='up'?card.n>=top.n:card.n<=top.n);
}
function legal(g,seat){
 if(finished(g)||active(g)!==seat)return[];
 const hand=g.people[seat].hand;
 if(g.pending){
  const opts=[{type:'takeAll'}];
  for(let i=0;i<hand.length;i++){
   const c=hand[i],counter=g.mode==='joker'?c.kind==='joker':
    g.mode==='match'&&g.pending.targetRank!==null&&c.kind!=='joker'&&c.n===g.pending.targetRank;
   if(counter)opts.push({type:'counter',index:i});
  }
  return opts;
 }
 const top=g.pile.at(-1),moves=[];
 for(let i=0;i<hand.length;i++)if(valid(top,hand[i]))moves.push({type:'play',index:i});
 if(!moves.length&&g.pile.length)moves.push({type:'takeTop'});
 return moves;
}
function same(a,b){return a.type===b.type&&(!['play','counter'].includes(a.type)||a.index===b.index)}
function play(g,seat,move){
 fail(g.version===VERSION&&!finished(g)&&seat===active(g),'Not your turn or already finished');
 fail(legal(g,seat).some(x=>same(x,move)),'Illegal action');
 const who=g.people[seat],before=g.pile.at(-1);
 const event={turn:g.turn+1,seat,action:move.type,card:null,reason:null,
  victim:null,challenge:null,taken:0,cleared:0};
 let skipOne=false;
 if(move.type==='play'){
  const card=who.hand.splice(move.index,1)[0];event.card=card;
  if(card.kind==='joker'){
   if(!g.pile.length){
    // No pile means no victim or target number. Discard without a skip.
    // This also lets a player shed their final Joker without deadlocking.
    g.ashes.push(card);event.reason='jokerBurned';
   }else{
    g.pending={card,from:seat,to:1-seat,targetRank:before?.n??null};
    event.reason='joker';event.challenge=before?.n??null;event.victim=1-seat;
   }
  }else{
   g.pile.push(card);
   if(before&&before.n===card.n){
    event.reason='match';event.cleared=g.pile.length;
    g.ashes.push(...g.pile.splice(0));
   }
  }
  while(who.hand.length<HAND&&g.stock.length)who.hand.push(g.stock.pop());
 }else if(move.type==='takeTop'){
  const removed=g.pile.splice(-1),rest=g.pile.splice(0);
  who.hand.push(...removed);who.pickups++;
  event.reason='pickup';event.taken=removed.length;event.cleared=rest.length;
  g.ashes.push(...rest);
 }else if(move.type==='takeAll'){
  const attack=g.pending;
  event.reason='jokerHit';event.victim=seat;
  event.taken=g.pile.length;
  who.hand.push(...g.pile.splice(0));who.pickups++;
  g.ashes.push(attack.card);g.pending=null;
 }else if(move.type==='counter'){
  const attack=g.pending;
  const answer=who.hand.splice(move.index,1)[0];event.card=answer;
  event.reason='jokerBlocked';event.victim=attack.from;
  event.challenge=attack.targetRank;
  event.taken=g.pile.length;
  const attacker=g.people[attack.from];
  attacker.hand.push(...g.pile.splice(0));attacker.pickups++;
  g.ashes.push(attack.card,answer);g.pending=null;
  skipOne=true; // the attacker loses their next turn; defender leads
  while(who.hand.length<HAND&&g.stock.length)who.hand.push(g.stock.pop());
 }
 g.turn+=skipOne?2:1;
 event.hand=who.hand.length;event.stock=g.stock.length;event.top=g.pile.at(-1)||null;
 if(!g.pending&&!g.stock.length){
  const empty=g.people.filter(p=>p.hand.length===0);
  if(empty.length===1)g.winner=empty[0].seat;
  else if(empty.length===2)g.draw=true;
 }
 if(g.turn>=MAX_TURNS&&g.winner===null)g.draw=true;
 g.log.push(event);
 fail(count(g)===DECK_SIZE,'Card conservation failure');
 return event;
}
function choose(g,seat,style='timing'){
 const moves=legal(g,seat);fail(moves.length,'No legal action');
 if(style==='random')return moves[Math.floor(rng(g)*moves.length)];
 if(g.pending){
  const block=moves.find(x=>x.type==='counter');
  // Holding the counter for another attack is relevant only in the 2-Joker duel.
  const threshold=style==='hoard'?5:style==='greedy'?0:2;
  return block&&g.pile.length>=threshold?block:moves[0];
 }
 const top=g.pile.at(-1),early=g.stock.length>0,hand=g.people[seat].hand;
 let best=moves[0],high=-Infinity;
 for(const m of moves){
  if(m.type!=='play')continue;
  const c=hand[m.index],flex=c.arrow==='up'?9-c.n:c.n;
  let score=early?flex:-flex;
  if(c.kind==='joker'){
   if(style==='greedy')score=100;
   else if(style==='hoard')score=g.pile.length>=6?20+g.pile.length:-100;
   else if(style==='timing')score=(g.pile.length-3)*2.5+(!early?3:0)+
    (top&&hand.some(x=>x.kind!=='joker'&&x.n===top.n)?1.5:0);
   else if(style==='basic')score=-50;
   else score=-20;
  }else if(top&&c.n===top.n)score-=1;
  if(score>high){high=score;best=m}
 }
 return best;
}
function simulate({seed=20261111,mode='match',firstSeat=0}={},styles=['timing','greedy']){
 const g=create({seed,mode,firstSeat});
 while(!finished(g)){const seat=active(g);play(g,seat,choose(g,seat,styles[seat]))}
 return{game:g,summary:{winner:g.winner,draw:g.draw,turns:g.turn,
  jokers:g.log.filter(e=>e.reason==='joker').length,
  hits:g.log.filter(e=>e.reason==='jokerHit').length,
  counters:g.log.filter(e=>e.reason==='jokerBlocked').length,
  pickups:g.people.reduce((x,p)=>x+p.pickups,0)}};
}
root.PowerLab={VERSION,DECK_SIZE,HAND,MAX_TURNS,MODES,deck,create,count,active,finished,
 valid,legal,play,choose,simulate};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.PowerLab;
