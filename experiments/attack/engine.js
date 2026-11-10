/* SPARK Attack: physical-style shedding laboratory.
 * Two players, four colors, nine-row, finite deck.
 * A successful Merge grants one OPTIONAL additional placement (at most one
 * per full turn). The bonus can attack, but cannot earn another bonus.
 * Modes differ only in cards sent to the opponent.
 * Pure deterministic UMD engine for browser, Node, and simulation.
 */

(function(root){'use strict';
const COLORS=['O','B','P','G'],ROW_SIZE=9,DEFAULT_HAND=9;
function check(ok,msg){if(!ok)throw Error(msg)}
function next(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296}
function botRandom(g){g.botRng=(Math.imul(g.botRng,1664525)+1013904223)>>>0;return g.botRng/4294967296}
function shuffle(a,g){for(let i=a.length-1;i>0;i--){const j=Math.floor(next(g)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function draw(g){
 if(!g.stock.length){
  if(!g.discard.length)return null;
  g.stock=shuffle(g.discard.splice(0),g);g.reshuffles++;
 }
 return g.stock.pop();
}
function resolve(cards){
 let row=cards.slice(),waves=[];
 for(let guard=0;guard<10;guard++){
  const removed=[],indices=[];
  for(let i=0;i<row.length;){
   let j=i+1;while(j<row.length&&row[j]===row[i])j++;
   if(j-i>=3)for(let k=i;k<j;k++){indices.push(k);removed.push(row[k])}
   i=j;
  }
  if(!indices.length)break;
  const block=new Set(indices);
  waves.push({before:row.slice(),indices,removed});
  row=row.filter((_,i)=>!block.has(i));
  if(guard===9)throw Error('Resolution guard exhausted');
 }
 return {row,waves,captured:waves.flatMap(w=>w.removed)};
}
function replenish(g){
 while(g.row.length<g.rowSize&&!g.blocked){
  const total=g.stock.length+g.discard.length;
  if(total===0){g.blocked='stock_exhausted';break}
  let accepted=false;
  // Rejected top cards remain visible in discard; no hidden deck search.
  for(let k=0;k<total;k++){
   const c=draw(g);
   if(c===null)break;
   if(g.row.length>=2&&g.row.at(-1)===c&&g.row.at(-2)===c){
    g.discard.push(c);g.rejections++;continue;
   }
   g.row.push(c);g.refills++;accepted=true;break;
  }
  if(!accepted){g.blocked='no_safe_refill';break}
 }
}
function create({seed=1,mode='attack',players=2,initialHand=DEFAULT_HAND,deckSize=144,rowSize=ROW_SIZE,turnLimit=240}={}){
 check(Number.isInteger(seed)&&seed>=0,'Invalid seed');
 check(['attack','chains','no-penalty'].includes(mode),'Invalid mode');
 check(players===2,'Attack v0 supports exactly two players');
 check(Number.isInteger(initialHand)&&initialHand>=3&&initialHand<=18,'Invalid initial hand');
 check(Number.isInteger(deckSize)&&deckSize>=48&&deckSize%4===0,'Deck must be at least 48 and divisible by 4');
 check(rowSize===9,'This initial experiment fixes the shared row at 9');
 check(Number.isInteger(turnLimit)&&turnLimit>=8&&turnLimit<=1000,'Invalid turn limit');
 const g={version:'attack-lab-0.2',seed,mode,rowSize,deckSize,initialHand,turnLimit,
  rng:(seed^0x51a7d1f3)>>>0,botRng:(seed^0x91273c4f)>>>0,stock:[],discard:[],row:[],
  players:Array.from({length:players},(_,i)=>({seat:i,hand:[]})),
  turn:0,winner:null,drawn:false,blocked:null,pending:null,log:[],rejections:0,refills:0,reshuffles:0};
 g.stock=shuffle(Array.from({length:deckSize},(_,i)=>COLORS[i%4]),g);
 for(let k=0;k<initialHand;k++)for(const p of g.players){
  const c=draw(g);check(c!==null,'Deck could not deal');p.hand.push(c);
 }
 replenish(g);
 check(conservation(g)===deckSize,'Initial card accounting failed');
 return g;
}
function conservation(g){return g.stock.length+g.discard.length+g.row.length+g.players.reduce((n,p)=>n+p.hand.length,0)}
function preview(g,seat,index,pos){
 const hand=g.players[seat]?.hand;
 if(!hand||!Number.isInteger(index)||index<0||index>=hand.length||!Number.isInteger(pos)||pos<0||pos>=g.row.length)return null;
 const placed=hand[index],b=g.row.slice();b.splice(pos,0,placed);
 const result=resolve(b),rest=hand.filter((_,i)=>i!==index);
 let taken=null;
 if(result.captured.length===0){
  taken=result.row.pop();rest.push(taken);
  // Do not offer a "move" that leaves both the row and hand unchanged.
  if(result.row.join('')===g.row.join('')&&rest.slice().sort().join('')===hand.slice().sort().join(''))return null;
 }
 return {move:{index,pos},placed,board:result.row,hand:rest,taken,captured:result.captured,
  waves:result.waves,scored:result.captured.length>0};
}
function legal(g,seat){
 if(g.blocked||g.drawn||g.winner!==null||g.turn>=g.turnLimit||seat!==g.turn%2)return [];
 if(g.pending&&(g.pending.kind!=='bonus'||g.pending.seat!==seat))return [];
 const out=[];
 for(let index=0;index<g.players[seat].hand.length;index++)
  for(let pos=0;pos<g.row.length;pos++){
   const m=preview(g,seat,index,pos);if(m)out.push(m);
  }
 return out;
}
function finish(g,actions){
 check(actions.length>=1&&actions.length<=2,'Invalid turn actions');
 const seat=actions[0].seat;
 const record={turn:g.turn+1,seat,actions,scored:actions.some(a=>a.scored),
  waves:actions.flatMap(a=>a.waves),captured:actions.flatMap(a=>a.captured),
  received:actions.flatMap(a=>a.received),discarded:[],
  before:actions[0].before.slice(),after:g.row.slice(),
  handBefore:actions[0].handBefore.slice(),handAfter:g.players[seat].hand.slice(),
  bonusEarned:actions[0].scored&&actions[0].handAfter.length>0,
  bonusUsed:actions.length===2,
  bonusAttacks:actions.length===2&&actions[1].scored?1:0};
 g.log.push(record);
 g.pending=null;g.turn++;
 if(g.players[seat].hand.length===0)g.winner=seat;
 else if(g.players[1-seat].hand.length===0)g.winner=1-seat;
 else if(g.turn>=g.turnLimit)g.drawn=true;
 return record;
}
function place(g,seat,index,pos){
 check(g.winner===null&&!g.drawn&&!g.blocked,'Not ready to place');
 check(seat===g.turn%2,'Wrong turn');
 const previous=g.pending,isBonus=!!previous;
 check(!previous||(previous.kind==='bonus'&&previous.seat===seat),'Wrong bonus owner');
 const m=preview(g,seat,index,pos);
 check(m&&legal(g,seat).some(x=>x.move.index===index&&x.move.pos===pos),'Illegal placement');
 const p=g.players[seat],opponent=g.players[1-seat];
 const before=g.row.slice(),handBefore=p.hand.slice(),opponentBefore=opponent.hand.length;
 g.row=m.board.slice();p.hand=m.hand.slice();
 // Captured-card penalties are determined by the same waves as the visual FX.
 // Attack = first wave only; Chains = one captured card from each wave.
 const penaltyIndices=[],penalty=[];
 if(g.mode!=='no-penalty'){
  let offset=0;
  for(let i=0;i<m.waves.length;i++){
   if(i===0||g.mode==='chains'){
    penaltyIndices.push(offset);
    penalty.push(m.waves[i].removed[0]);
   }
   offset+=m.waves[i].removed.length;
  }
 }
 const marked=new Set(penaltyIndices);
 opponent.hand.push(...penalty);
 g.discard.push(...m.captured.filter((_,i)=>!marked.has(i)));
 if(m.taken===null)replenish(g);
 const action={turn:g.turn+1,seat,bonus:isBonus,move:{index,pos},placed:m.placed,
  before,handBefore,handAfter:p.hand.slice(),opponentBefore,
  scored:m.scored,waves:m.waves,captured:m.captured.slice(),
  received:penalty.slice(),penaltyIndices:penaltyIndices.slice(),
  taken:m.taken,discarded:[],after:g.row.slice()};
 check(conservation(g)===g.deckSize,'Card accounting failure after placement');
 if(!isBonus&&m.scored&&p.hand.length>0&&!g.blocked){
  g.pending={kind:'bonus',seat,actions:[action]};
  if(legal(g,seat).length)return {status:'bonus',record:action};
  // No legal bonus move: never strand a game in an unfinishable phase.
  g.pending=null;
 }
 const actions=isBonus?[...previous.actions,action]:[action];
 return {status:'done',record:action,turnRecord:finish(g,actions)};
}
function endBonus(g,seat){
 check(g.pending?.kind==='bonus'&&g.pending.seat===seat,'No bonus move to end');
 check(!g.blocked&&g.winner===null&&!g.drawn,'Game already over');
 return {status:'done',turnRecord:finish(g,g.pending.actions)};
}
function estimate(row,hand){
 // No access to the hidden stock or the opponent's hand.
 let best=0,options=0;
 for(let i=0;i<hand.length;i++)for(let pos=0;pos<row.length;pos++){
  const b=row.slice();b.splice(pos,0,hand[i]);
  const c=resolve(b).captured.length;
  if(c){options++;best=Math.max(best,c)}
 }
 return {best,options};
}
function choose(g,seat,policy='greedy'){
 const moves=legal(g,seat);
 check(moves.length>0,'No legal move');
 if(policy==='random')return moves[Math.floor(botRandom(g)*moves.length)].move;
 let max=-Infinity,choices=[];
 for(const m of moves){
  const attack=m.scored?1:0;
  const follow=policy==='planner'?estimate(m.board,m.hand):{best:0,options:0};
  const threats=m.board.reduce((n,c,i,a)=>n+(i>0&&a[i-1]===c?1:0),0);
  const score=attack*100+Math.min(m.waves.length,3)*5+
    (policy==='planner'?(follow.best*2+Math.min(follow.options,5)*.4-threats*.2):0);
  if(score>max+1e-7){max=score;choices=[m]}
  else if(Math.abs(score-max)<1e-7)choices.push(m);
 }
 return choices[Math.floor(botRandom(g)*choices.length)].move;
}
function step(g,seat,policy='greedy'){
 const move=choose(g,seat,policy);
 let response=place(g,seat,move.index,move.pos);
 if(response.status==='bonus'){
  const follow=legal(g,seat);
  if(follow.length){
   const nextMove=choose(g,seat,policy);
   response=place(g,seat,nextMove.index,nextMove.pos);
  }else response=endBonus(g,seat);
 }
 return response.turnRecord;
}
function run(config={},policies=['planner','greedy']){
 const g=create(config);
 let noScore=0,scoringAvailable=0,attacks=0,chains=0,meaningful=0,distinct=0,repeats=0,maxHand=0,bonusEarned=0,bonusUsed=0,bonusAttacks=0;
 const seen=new Set();
 while(!g.blocked&&g.winner===null&&!g.drawn&&g.turn<g.turnLimit){
  const seat=g.turn%2,opts=legal(g,seat);
  if(!opts.length){g.blocked='no_legal_moves';break}
  scoringAvailable+=opts.some(o=>o.scored);
  const outcomes=new Set(opts.map(o=>o.scored+'|'+o.board.join('')+'|'+o.hand.slice().sort().join('')));
  distinct+=outcomes.size;
  meaningfulloop: {
   let scored=opts.filter(o=>o.scored);
   // Proxy: same attack value, different hand + row consequences.
   const variants=new Set(scored.map(o=>o.board.join('')+'|'+o.hand.slice().sort().join('')));
   if(variants.size>=2)meaningful++;
  }
  const r=step(g,seat,policies[seat]||'greedy');
  if(!r)throw Error('No returned completed move');
  if(!r.scored)noScore++;
  else {attacks++;if(r.waves.length>1)chains++}
  bonusEarned+=Number(r.bonusEarned);bonusUsed+=Number(r.bonusUsed);bonusAttacks+=r.bonusAttacks;
  const key=g.row.join('')+'|'+g.players.map(p=>p.hand.slice().sort().join('')).join('|')+'|'+g.turn%2;
  if(seen.has(key))repeats++;
  seen.add(key);
  maxHand=Math.max(maxHand,...g.players.map(p=>p.hand.length));
  if(conservation(g)!==g.deckSize)throw Error('Conservation violation');
 }
 return {seed:g.seed,mode:g.mode,initialHand:g.initialHand,turns:g.turn,endedBy:g.winner!==null?'winner':g.blocked||'turn_limit',
  winner:g.winner,handSizes:g.players.map(p=>p.hand.length),maxHand,noScore,scoringAvailable,attacks,chains,
  meaningful,distinct,repeats,bonusEarned,bonusUsed,bonusAttacks,rejections:g.rejections,reshuffles:g.reshuffles,log:g.log};
}
root.SparkAttack={COLORS,create,conservation,resolve,preview,legal,place,endBonus,choose,step,run};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.SparkAttack;
