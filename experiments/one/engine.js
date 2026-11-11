/* ONE · an experimental, physical-first, one-pile shedding game.
   Every proprietary card has ONE big number and ONE direction arrow.
   The arrow governs the NEXT play. Matching the top number clears the pile.
   No reliance on the earlier TILT/CROSS/FORGE engines. */
(function(root){'use strict';
const VERSION='one-lab-v01',MAX_TURNS=240,HAND=3,DECK_SIZE=48;
function fail(test,message){if(!test)throw Error(message)}
function rng(g){g.rng=(Math.imul(1664525,g.rng)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(arr,g){for(let i=arr.length-1;i>0;i--){let j=Math.floor(rng(g)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function deck(){const out=[];let id=0;for(let n=1;n<=8;n++)for(const arrow of ['up','down'])for(let c=0;c<3;c++)out.push({id:id++,n,arrow});return out}
function create({seed=20261111,players=2}={}){
 fail(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Bad seed');
 fail(Number.isInteger(players)&&players>=2&&players<=4,'Supports 2–4 players');
 const g={version:VERSION,seed,rng:(seed^0x912a6dc3)>>>0,turn:0,winner:null,draw:false,
  stock:[],pile:[],ashes:[],people:Array.from({length:players},(_,seat)=>({seat,hand:[],pickups:0})),log:[]};
 g.stock=shuffle(deck(),g);for(let i=0;i<HAND;i++)for(const p of g.people)p.hand.push(g.stock.pop());
 fail(count(g)===DECK_SIZE,'Deck accounting');return g;
}
function count(g){return g.stock.length+g.ashes.length+g.pile.length+g.people.reduce((x,p)=>x+p.hand.length,0)}
function finished(g){return g.winner!==null||g.draw}
function active(g){return g.turn%g.people.length}
function valid(top,card){return !top||(top.arrow==='up'?card.n>=top.n:card.n<=top.n)}
function legal(g,seat){
 if(finished(g)||active(g)!==seat)return[];
 const h=g.people[seat].hand,top=g.pile.at(-1),opts=[];
 for(let i=0;i<h.length;i++)if(valid(top,h[i]))opts.push({type:'play',index:i});
 if(!opts.length&&g.pile.length)opts.push({type:'take'});
 return opts;
}
function identical(a,b){return a.type===b.type&&(a.type!=='play'||a.index===b.index)}
function play(g,seat,move){
 fail(g.version===VERSION&&!finished(g)&&active(g)===seat,'Not your turn or finished');
 fail(legal(g,seat).some(x=>identical(x,move)),'Illegal action');
 const who=g.people[seat],before=g.pile.at(-1);
 let record={turn:g.turn+1,seat,action:move.type,card:null,cleared:0,taken:0,reason:null};
 if(move.type==='play'){
  const card=who.hand.splice(move.index,1)[0];record.card=card;
  g.pile.push(card);
  if(before?.n===card.n){record.cleared=g.pile.length;record.reason='match';g.ashes.push(...g.pile.splice(0))}
  while(who.hand.length<HAND&&g.stock.length)who.hand.push(g.stock.pop());
 }else{
  const captured=g.pile.splice(-1);
  const discarded=g.pile.splice(0);
  who.hand.push(...captured);who.pickups++;record.taken=captured.length;record.cleared=discarded.length;record.reason='pickup';
  g.ashes.push(...discarded);
 }
 g.turn++;record.hand=who.hand.length;record.stock=g.stock.length;record.top=g.pile.at(-1)||null;
 if(!g.stock.length&&!who.hand.length)g.winner=seat;
 if(g.turn>=MAX_TURNS&&g.winner===null)g.draw=true;
 g.log.push(record);fail(count(g)===DECK_SIZE,'Lost or duplicated cards');return record;
}
function danger(card){
 // Assess how many physical deck cards can follow; no peeking at opponent hands.
 return deck().filter(x=>valid(card,x)).length/DECK_SIZE;
}
function choose(g,seat,policy='thoughtful'){
 const moves=legal(g,seat);fail(moves.length,'No moves');
 if(policy==='random')return moves[Math.floor(rng(g)*moves.length)];
 if(policy==='basic')return moves[0];
 let best=moves[0],val=-Infinity;
 for(const m of moves){
  const c=g.people[seat].hand[m.index],top=g.pile.at(-1);
  const clear=top&&c&&top.n===c.n;
  const score=m.type==='take'?-100:
   (clear?3.5:0)+(-danger(c)*2)+(g.stock.length===0?(c.n===1||c.n===8?.15:0):0)+
   (g.pile.length>=6&&clear?.6:0);
  if(score>val){best=m;val=score}
 }
 return best;
}
function simulate(config={},policies=['thoughtful','basic']){
 const g=create(config);while(!finished(g)){
  const p=active(g),options=legal(g,p);
  if(!options.length){g.draw=true;break}
  play(g,p,choose(g,p,policies[p]||'basic'));
 }
 return{game:g,summary:{completed:g.winner!==null,draw:g.draw,turns:g.turn,winner:g.winner,
  pickups:g.people.reduce((x,p)=>x+p.pickups,0),matches:g.log.filter(x=>x.reason==='match').length,
  handSizes:g.people.map(p=>p.hand.length)}};
}
root.OneLab={VERSION,MAX_TURNS,HAND,DECK_SIZE,deck,create,count,finished,active,valid,legal,play,choose,simulate,danger};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.OneLab;