/* TILT ONE / ZIGZAG
 * Independent, deliberately small game-design candidate. Not production rules.
 *
 * A player normally plays one card. They MAY play a second card immediately
 * if it obeys the arrow on the first and its own arrow points the opposite way.
 * Either matching rank clears the pile and ENDS the turn.
 *
 * No two piles, no special numbered cards, no score calculation, no abilities.
 * 32 physical CORE cards (2 each 1–8 × UP/DOWN), four cards in hand.
 */
(function(root){'use strict';
const VERSION='one-zigzag-v01',DECK_SIZE=48,ACTIVE_CARDS=32,HAND=4,MAX_TURNS=240;
function fail(v,msg){if(!v)throw Error(msg)}
function rng(g){g.rng=(Math.imul(1664525,g.rng)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(a,g){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function deck(){
 const all=[];let id=0;
 for(let n=1;n<=8;n++)for(const arrow of ['up','down'])for(let k=0;k<3;k++)
  all.push({id:id++,n,arrow});
 return all;
}
function create({seed=20261111,firstSeat=0}={}){
 fail(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid seed');
 fail(firstSeat===0||firstSeat===1,'Invalid first seat');
 const all=deck(),g={version:VERSION,seed,firstSeat,turn:0,winner:null,draw:false,
  rng:(seed^0x912a6dc3)>>>0,stock:[],aside:[],pile:[],ashes:[],
  people:[{seat:0,hand:[],pickups:0},{seat:1,hand:[],pickups:0}],log:[]};
 g.stock=shuffle(all.filter(c=>c.id%3!==2),g);
 g.aside=all.filter(c=>c.id%3===2);
 for(let i=0;i<HAND;i++)for(const p of g.people)p.hand.push(g.stock.pop());
 fail(g.stock.length===ACTIVE_CARDS-2*HAND&&count(g)===DECK_SIZE,'Incorrect setup');
 return g;
}
function count(g){
 return g.stock.length+g.aside.length+g.ashes.length+g.pile.length+
  g.people.reduce((sum,p)=>sum+p.hand.length,0);
}
function finished(g){return g.winner!==null||g.draw}
function active(g){return (g.turn+g.firstSeat)%2}
function valid(top,card){return !top||(top.arrow==='up'?card.n>=top.n:card.n<=top.n)}
function continuation(first,second){return first.arrow!==second.arrow&&valid(first,second)}
function legal(g,seat){
 if(finished(g)||seat!==active(g))return [];
 const top=g.pile.at(-1),hand=g.people[seat].hand,options=[];
 for(let i=0;i<hand.length;i++){
  const first=hand[i];if(!valid(top,first))continue;
  options.push({type:'play',indices:[i]});
  if(top&&first.n===top.n)continue; // a matching rank clears; cannot continue
  for(let j=0;j<hand.length;j++)if(j!==i&&continuation(first,hand[j]))
   options.push({type:'play',indices:[i,j]});
 }
 if(options.length===0&&g.pile.length)options.push({type:'take'});
 return options;
}
function sameMove(a,b){
 return a&&b&&a.type===b.type&&(a.type!=='play'||
  Array.isArray(a.indices)&&Array.isArray(b.indices)&&
  a.indices.length===b.indices.length&&a.indices.every((n,i)=>n===b.indices[i]));
}
function play(g,seat,move){
 fail(g.version===VERSION&&!finished(g)&&seat===active(g),'Not your turn or finished');
 fail(legal(g,seat).some(allowed=>sameMove(allowed,move)),'Illegal action');
 const who=g.people[seat],record={turn:g.turn+1,seat,action:move.type,
  cards:[],card:null,cleared:0,taken:0,reason:null};
 if(move.type==='play'){
  // Capture physical cards before mutating the indexed hand.
  const cards=move.indices.map(index=>who.hand[index]);
  for(const index of [...move.indices].sort((a,b)=>b-a))who.hand.splice(index,1);
  let top=g.pile.at(-1);
  for(const card of cards){
   record.cards.push(card);record.card=card;g.pile.push(card);
   if(top&&top.n===card.n){
    record.cleared=g.pile.length;record.reason='match';
    g.ashes.push(...g.pile.splice(0));
   }
   top=card;
  }
  while(who.hand.length<HAND&&g.stock.length)who.hand.push(g.stock.pop());
 }else{
  const captured=g.pile.splice(-1),discarded=g.pile.splice(0);
  who.hand.push(...captured);who.pickups++;
  record.taken=captured.length;record.cleared=discarded.length;
  record.reason='pickup';g.ashes.push(...discarded);
 }
 g.turn++;record.hand=who.hand.length;record.stock=g.stock.length;
 record.top=g.pile.at(-1)||null;
 if(!g.stock.length&&!who.hand.length)g.winner=seat;
 if(g.turn>=MAX_TURNS&&g.winner===null)g.draw=true;
 g.log.push(record);
 fail(count(g)===DECK_SIZE,'Card count mismatch');
 return record;
}
function choose(g,seat,policy='strategic'){
 const moves=legal(g,seat);fail(moves.length,'No legal moves');
 if(policy==='random')return moves[Math.floor(rng(g)*moves.length)];
 if(policy==='basic')return moves[0];
 const early=g.stock.length>0,hand=g.people[seat].hand,top=g.pile.at(-1);
 let best=moves[0],highest=-Infinity;
 for(const move of moves){
  if(move.type==='take')continue;
  const cards=move.indices.map(i=>hand[i]),last=cards.at(-1);
  const flexibility=last.arrow==='up'?9-last.n:last.n;
  const firstMatch=top&&top.n===cards[0].n;
  const secondMatch=cards.length===2&&cards[0].n===cards[1].n;
  const clears=Boolean(firstMatch||secondMatch),size=cards.length;
  let score;
  switch(policy){
   case 'greedy':score=size*100-flexibility*.01;break;
   case 'single':score=-size*100+(early?flexibility:-flexibility);break;
   case 'pressure':score=size*3+(8-flexibility)*2-(clears?1:0);break;
   case 'strategic':
   default:
    score=size*3+(early?flexibility:-flexibility)*2-(clears?2:0);
  }
  if(score>highest){best=move;highest=score}
 }
 return best;
}
function simulate({seed=20261111,firstSeat=0}={},policies=['strategic','greedy']){
 const g=create({seed,firstSeat});
 while(!finished(g)){const s=active(g);play(g,s,choose(g,s,policies[s]||'basic'))}
 return{game:g,summary:{winner:g.winner,turns:g.turn,draw:g.draw,
  chainTurns:g.log.filter(e=>e.cards.length===2).length,
  pickups:g.log.filter(e=>e.action==='take').length,
  matchedClears:g.log.filter(e=>e.reason==='match').length}};
}
root.ZigzagLab={VERSION,DECK_SIZE,ACTIVE_CARDS,HAND,MAX_TURNS,
 deck,create,count,finished,active,valid,continuation,legal,play,choose,simulate};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.ZigzagLab;
