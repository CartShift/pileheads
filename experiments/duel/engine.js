/* SPARK Duel laboratory v0.1. A two-player, four-color strategic
 * exchange game with 3-card hands, public/hidden information variants,
 * a shared row, a finite deck, and fixed turns with captured-card scoring.
 * No special powers or hidden peek for policy decisions.
 * Isolated from the SPARK Sites production game and Momentum previews.
 */
(function(root){'use strict';
const COLORS=['O','B','P','G'],ROW=9,HAND=3;
function invariant(x,message){if(!x)throw Error(message)}
function stepRng(g){g.random=(Math.imul(g.random,1664525)+1013904223)>>>0;return g.random/4294967296}
function stepChoice(g){g.choiceRandom=(Math.imul(g.choiceRandom,1664525)+1013904223)>>>0;return g.choiceRandom/4294967296}
function shuffle(a,g){for(let i=a.length-1;i>0;i--){let j=Math.floor(stepRng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function triples(row){
 const groups=[];
 for(let i=0;i<row.length;){
   let end=i+1;while(end<row.length&&row[end]===row[i])end++;
   if(end-i>=3)groups.push(Array.from({length:end-i},(_,k)=>i+k));
   i=end;
 }
 return groups;
}
function collapse(input){
 let row=input.slice(),waves=[],guard=0;
 while(row.length&&guard++<8){
  let groups=triples(row);if(!groups.length)break;
  let removedIndices=new Set(groups.flat());
  let removed=row.filter((_,i)=>removedIndices.has(i));
  waves.push({before:row.slice(),removed,indices:Array.from(removedIndices).sort((a,b)=>a-b)});
  row=row.filter((_,i)=>!removedIndices.has(i));
 }
 invariant(guard<=8,'Resolution overflow');
 return {row,waves,points:waves.reduce((n,w)=>n+w.removed.length,0)};
}
function draw(g){
 if(!g.stock.length){
  if(!g.discard.length)return null;
  g.stock=shuffle(g.discard.splice(0),g);g.reshuffles++;
 }
 return g.stock.pop();
}
function takePoints(g,owner,waves,origin){
 for(const wave of waves){
  if(owner===null)g.discard.push(...wave.removed);
  else {
   g.players[owner].captured.push(...wave.removed);
   g.players[owner].score+=wave.removed.length;
  }
  g.wavesRecorded.push({kind:origin,owner,...wave});
 }
}
function replenish(g,owner){
 while(g.row.length<g.rowSize&&!g.blocked){
  const remaining=g.stock.length+g.discard.length;
  if(!remaining){g.blocked='stock_exhausted';break}
  if(g.refillRule==='safe'){
   let accepted=false;
   for(let attempts=0;attempts<remaining;attempts++){
    const c=draw(g);if(c===null)break;
    if(g.row.length>=2&&g.row.at(-1)===c&&g.row.at(-2)===c){
     g.discard.push(c);g.rejected++;continue;
    }
    g.row.push(c);accepted=true;g.refills++;break;
   }
   if(!accepted){g.blocked='no_safe_refill';break}
  }else{
   const c=draw(g);if(c===null){g.blocked='stock_exhausted';break}
   g.row.push(c);g.refills++;
   const cascaded=collapse(g.row);
   if(cascaded.points){
    g.row=cascaded.row;g.refillScored+=cascaded.points;
    takePoints(g,owner,cascaded.waves,'refill');
   }
  }
 }
}
function create({seed=1,players=2,turnsPerPlayer=10,deckSize=144,action='exchange',refillRule='safe',gaps='all',rowSize=ROW,handSize=HAND,colorCount=4,information='open'}={}){
 invariant(Number.isInteger(seed)&&seed>=0,'Invalid seed');
 invariant(players===2,'Duel supports exactly 2 players');
 invariant(['open','hidden'].includes(information),'Information mode must be open or hidden');
 invariant(Number.isInteger(turnsPerPlayer)&&turnsPerPlayer>=1&&turnsPerPlayer<=30,'Invalid turn count');
 invariant(Number.isInteger(deckSize)&&deckSize>=36&&deckSize%3===0,'Deck must contain balanced colors and have at least 36 cards');
 invariant(['exchange','insert'].includes(action),'Invalid action');
 invariant(['safe','cascade'].includes(refillRule),'Invalid refill rule');
 invariant(['all','nine'].includes(gaps),'Invalid gap rule');
 invariant(Number.isInteger(rowSize)&&rowSize>=5&&rowSize<=9,'Row size must be 5-9');
 invariant(Number.isInteger(handSize)&&handSize>=1&&handSize<=3,'Hand size must be 1-3');
 invariant([3,4].includes(colorCount)&&deckSize%colorCount===0,'Colors must be 3 or 4, deck divisible by colors');
 const g={
  version:'duel-lab-0.1',seed,information,action,refillRule,gaps,turnsPerPlayer,deckSize,rowSize,handSize,colorCount,palette:COLORS.slice(0,colorCount),turn:0,blocked:null,
  random:(seed^0x71c638bd)>>>0,choiceRandom:(seed^0x432a9b61)>>>0,
  stock:[],discard:[],row:[],players:Array.from({length:players},(_,i)=>({seat:i,hand:[],score:0,captured:[]})),
  wavesRecorded:[],rejected:0,refills:0,refillScored:0,reshuffles:0,log:[]
 };
 g.stock=shuffle(Array.from({length:deckSize},(_,i)=>g.palette[i%colorCount]),g);
 // Deal three to each player and the central row from the SAME finite deck.
 for(let t=0;t<g.handSize;t++)for(const p of g.players){const c=draw(g);invariant(c!==null,'Cannot deal');p.hand.push(c)}
 replenish(g,null);
 return g;
}
function evaluate(row,hand,action,move,gaps='all',rowLimit=ROW){
 const {index,pos}=move;
 if(!Number.isInteger(index)||index<0||index>=hand.length||!Number.isInteger(pos))return null;
 let b=row.slice(),h=hand.slice(),taken=null,overflow=null;
 if(action==='exchange'){
  if(pos<0||pos>=b.length||b[pos]===h[index])return null;
  taken=b[pos];b[pos]=h[index];h[index]=taken;
 }else{
  if(pos<0||pos>b.length||(gaps==='nine'&&pos===b.length))return null;
  b.splice(pos,0,h[index]);h.splice(index,1);
 }
 const resolved=collapse(b);
 b=resolved.row;
 if(action==='insert'&&resolved.points===0&&b.length>rowLimit)overflow=b.pop();
 return {move:{index,pos},color:hand[index],taken,overflow,board:b,hand:h,points:resolved.points,waves:resolved.waves.length,removed:resolved.waves.flatMap(x=>x.removed),resolution:resolved.waves};
}
function legal(g,seat){
 const p=g.players[seat],out=[];
 if(!p||g.blocked||g.turn>=g.players.length*g.turnsPerPlayer)return out;
 const positions=g.action==='exchange'?g.row.length:g.row.length+(g.gaps==='nine'?0:1);
 for(let i=0;i<p.hand.length;i++)for(let pos=0;pos<positions;pos++){
  const result=evaluate(g.row,p.hand,g.action,{index:i,pos},g.gaps,g.rowSize);
  if(result)out.push(result);
 }
 return out;
}
function potential(row,hand,action,gaps){
 let best=0;
 const len=action==='exchange'?row.length:row.length+(gaps==='nine'?0:1);
 for(let i=0;i<hand.length;i++)for(let pos=0;pos<len;pos++){
  const o=evaluate(row,hand,action,{index:i,pos},gaps);if(o)best=Math.max(best,o.points);
 }
 return best;
}
function expectedOptions(outcome,action,gaps,palette=COLORS.slice(0,3)){
 // The refill is hidden. Only project the fully visible pre-refill position.
 // Shorter boards are deliberately not padded with actual stock order.
 let own=potential(outcome.board,outcome.hand,action,gaps);
 let enemy=0;
 for(const c of palette)enemy=Math.max(enemy,potential(outcome.board,[c],action,gaps));
 const different=new Set(outcome.hand).size;
 const nearby=outcome.board.reduce((n,c,i,a)=>n+(i>0&&a[i-1]===c?1:0),0);
 return {own,enemy,different,nearby};
}
function optionsMetrics(g,seat,opts=legal(g,seat)){
 const scored=opts.filter(x=>x.points>0);
 const distinct=(arr)=>new Set(arr.map(o=>[o.points,o.board.join(''),o.hand.slice().sort().join('')].join('|'))).size;
 const byColor=new Map();
 for(const o of scored){const key=o.color;byColor.set(key,Math.max(byColor.get(key)||0,o.points))}
 const tradeoffs=opts.filter(o=>o.points>0).map(o=>({...expectedOptions(o,g.action,g.gaps,g.palette),score:o.points}));
 const frontier=tradeoffs.filter((a,i)=>!tradeoffs.some((b,j)=>j!==i&&
    b.score>=a.score&&b.own>=a.own&&b.enemy<=a.enemy&&(b.score>a.score||b.own>a.own||b.enemy<a.enemy)));
 return {actions:opts.length,scoring:scored.length,distinctScoring:distinct(scored),
  distinctNoScore:distinct(opts.filter(x=>x.points===0)),
  scoringAvailable:scored.length>0,scoringColors:byColor.size,
  differentTradeoffs:Math.min(distinct(scored),new Set(frontier.map(x=>[x.score,x.own,x.enemy].join('|'))).size)
 };
}
function choose(g,seat,policy='greedy',opts=legal(g,seat)){
 invariant(opts.length>0,'No legal moves');
 if(policy==='random')return opts[Math.floor(stepChoice(g)*opts.length)].move;
 let best=-Infinity,winners=[];
 for(const o of opts){
  const p=policy==='planner'?expectedOptions(o,g.action,g.gaps,g.palette):null;
  // A counter player only reads the opponent's hand in the explicit OPEN mode.
  // Compare attack value against both one's own next-turn prospects and the
  // exposed opponent's replies on the visible post-collapse row. No stock peek.
  const opponentHand=policy==='counter'&&g.information==='open'?g.players[1-seat].hand:null;
  const selfFuture=opponentHand?potential(o.board,o.hand,g.action,g.gaps):0;
  const replyThreat=opponentHand?potential(o.board,opponentHand,g.action,g.gaps):0;
  const value=opponentHand?o.points+0.3*selfFuture-0.4*replyThreat+0.1*new Set(o.hand).size:
    o.points+(p?0.24*p.own-0.28*p.enemy+0.12*p.different+0.015*p.nearby:0);
  if(value>best+1e-9){best=value;winners=[o]}
  else if(Math.abs(value-best)<1e-9)winners.push(o);
 }
 return winners[Math.floor(stepChoice(g)*winners.length)].move;
}
function play(g,seat,move){
 invariant(!g.blocked,'Game already blocked');
 invariant(seat===g.turn%g.players.length,'Not your turn');
 const o=legal(g,seat).find(o=>o.move.index===move.index&&o.move.pos===move.pos);
 invariant(!!o,'Illegal action');
 const before=g.row.slice(),beforeHand=g.players[seat].hand.slice(),beforeWaves=g.wavesRecorded.length;
 const p=g.players[seat];
 p.hand=o.hand.slice();g.row=o.board.slice();
 if(o.overflow!==null)g.discard.push(o.overflow);
 takePoints(g,seat,o.resolution,'placement');
 if(g.action==='insert'){
  const replacement=draw(g);
  if(replacement===null)g.blocked='no_hand_replacement';
  else p.hand.push(replacement);
 }
 // Board is replenished without peeking into the hidden deck.
 if(!g.blocked)replenish(g,seat);
 g.turn++;
 const record={
  seat,turn:g.turn,kind:g.action,move:{...move},before,after:g.row.slice(),handBefore:beforeHand,handAfter:p.hand.slice(),
  exchanged:o.taken,score:g.wavesRecorded.slice(beforeWaves).filter(w=>w.owner===seat).reduce((n,w)=>n+w.removed.length,0),
  scoredByDecision:o.points,scoredFromRefill:g.wavesRecorded.slice(beforeWaves).filter(w=>w.owner===seat&&w.kind==='refill').reduce((n,w)=>n+w.removed.length,0),
  waves:g.wavesRecorded.slice(beforeWaves).length,blocked:g.blocked
 };
 g.log.push(record);invariant(cardCount(g)===g.deckSize,'Card conservation failed');
 invariant(p.hand.length===g.handSize||g.blocked,'Hand must have exactly three cards');
 invariant(g.row.length===g.rowSize||g.blocked,'Row length mismatch');
 return record;
}
function cardCount(g){return g.stock.length+g.discard.length+g.row.length+g.players.reduce((n,p)=>n+p.hand.length+p.captured.length,0)}
function run(config={},policies=['planner','greedy','random','greedy']){
 const g=create(config),firstStates=new Set();let repeats=0,zero=0,scoringAvailable=0,chains=0,decisions=0,distinct=0,noScoreAlternatives=0,
   tradeoffs=0,decisionScoring=0,refillLuckPoints=0;
 while(!g.blocked&&g.turn<g.turnsPerPlayer*g.players.length){
  const seat=g.turn%g.players.length,opts=legal(g,seat),metrics=optionsMetrics(g,seat,opts),move=choose(g,seat,policies[seat]||'greedy',opts);
  scoringAvailable+=metrics.scoringAvailable;distinct+=metrics.distinctScoring;
  noScoreAlternatives+=metrics.distinctNoScore;tradeoffs+=metrics.differentTradeoffs>=2;
  const r=play(g,seat,move);decisions++;
  zero+=r.score===0;decisionScoring+=r.scoredByDecision>0;chains+=r.waves>1;refillLuckPoints+=r.scoredFromRefill;
  const key=g.row.join('')+'|'+g.players.map(p=>p.hand.slice().sort().join('')).join('|')+'|'+(g.turn%g.players.length);
  if(firstStates.has(key))repeats++;firstStates.add(key);
 }
 const points=g.players.map(p=>p.score),highest=Math.max(...points);
 return {seed:g.seed,action:g.action,refillRule:g.refillRule,gaps:g.gaps,players:g.players.length,rounds:g.turnsPerPlayer,rowSize:g.rowSize,handSize:g.handSize,colorCount:g.colorCount,
  completed:!g.blocked,blocked:g.blocked,turns:g.turn,scores:points,
  winners:points.flatMap((p,i)=>p===highest?[i]:[]),repeats,zero,decisions,scoringAvailable,distinct,noScoreAlternatives,
  tradeoffs,decisionScoring,chains,refillLuckPoints,reshuffles:g.reshuffles,rejected:g.rejected,refills:g.refills,
  log:g.log};
}
root.SparkDuel={COLORS,ROW,HAND,create,triples,collapse,evaluate,legal,potential,expectedOptions,optionsMetrics,choose,play,cardCount,run};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.SparkDuel;
