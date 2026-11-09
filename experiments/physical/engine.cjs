'use strict';
// Experimental physical tabletop simulator. NOT loaded by the Sites game.
const COLORS = ['O','B','P'];
const PATTERNS = ['triples','aabb'];
function random(seed) {
  let n=seed>>>0;
  return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
}
function shuffle(a,rng) {
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function coloredDeck(size,seed){
  if(!Number.isInteger(size)||size<24||size%3!==0)throw Error('Deck size must be >=24 and divisible by 3');
  return shuffle(Array.from({length:size},(_,i)=>COLORS[i%3]),random(seed));
}
function matches(row,pattern='triples'){
  const groups=[];
  for(let i=0;i<row.length;){
    let j=i+1;
    while(j<row.length&&row[j]===row[i])j++;
    if(j-i>=3)groups.push({type:'triple',indices:Array.from({length:j-i},(_,k)=>i+k)});
    i=j;
  }
  if(groups.length||pattern==='triples')return groups;
  // Explicit non-overlapping left-to-right priority AFTER triples.
  // Require exactly two A followed by two B; A != B.
  for(let i=0;i+3<row.length;){
    const a=row[i],b=row[i+2];
    if(a===row[i+1]&&b===row[i+3]&&a!==b&&
      (i===0||row[i-1]!==a)&&
      (i+4===row.length||row[i+4]!==b)){
      groups.push({type:'aabb',indices:[i,i+1,i+2,i+3]});i+=4;
    } else i++;
  }
  return groups;
}
function resolve(row,color,pos,pattern='triples'){
  if(!COLORS.includes(color)||!Number.isInteger(pos)||pos<0||pos>row.length)throw Error('Invalid placement');
  const b=row.slice();b.splice(pos,0,color);
  let waves=0,points=0,tripleWaves=0,aabbWaves=0;
  const steps=[];
  // Every wave removes >= 3; a 10-card row cannot have more than 3.
  for(let guard=0;guard<8;guard++){
    const groups=matches(b,pattern);
    if(!groups.length)break;
    const indices=new Set(groups.flatMap(x=>x.indices));
    const removed=Array.from(indices).sort((a,b)=>a-b).map(i=>b[i]);
    waves++;points+=removed.length;
    if(groups.some(x=>x.type==='triple'))tripleWaves++;
    if(groups.some(x=>x.type==='aabb'))aabbWaves++;
    steps.push({groups,removed,before:b.slice()});
    const keep=b.filter((_,i)=>!indices.has(i));
    b.splice(0,b.length,...keep);
    if(guard===7)throw Error('Match resolution guard exhausted');
  }
  return {row:b,points,waves,tripleWaves,aabbWaves,steps};
}
function makeStock(size,seed){return {drawPile:coloredDeck(size,seed),discard:[],reshuffles:0,rejected:0,forced:0,missing:0}};
function draw(stock,rng){
  if(!stock.drawPile.length&&stock.discard.length){
    stock.drawPile=shuffle(stock.discard.splice(0),rng);stock.reshuffles++;
  }
  return stock.drawPile.pop()||null;
}
function refill(state,row,target,pattern){
  const b=row.slice();
  while(b.length<target){
    // We only examine real top cards one by one. No deck search/peeking.
    const remaining=state.stock.drawPile.length+state.stock.discard.length;
    if(!remaining){state.stock.missing++;state.earlyStop=true;break}
    let placed=false;
    for(let attempts=0;attempts<remaining;attempts++){
      const c=draw(state.stock,state.rng);
      if(c===null)break;
      if(!matches(b.concat(c),pattern).length){b.push(c);placed=true;break}
      state.stock.discard.push(c);state.stock.rejected++;
    }
    if(!placed){
      // Bounded physical fallback when every candidate was rejected.
      // The forced card is visible, and any completed match remains for the
      // next regular move (no free scoring during refill).
      const c=draw(state.stock,state.rng);
      if(c===null){state.stock.missing++;state.earlyStop=true;break}
      b.push(c);state.stock.forced++;
    }
  }
  return b;
}
function stateFor({players=3,deckSize=144,seed=1,pattern='triples',edgeChoice=false,turnsPerPlayer=8}={}){
  if(![2,3,4].includes(players))throw Error('2-4 players supported');
  if(!PATTERNS.includes(pattern))throw Error('Invalid match pattern');
  const state={
    seed,pattern,edgeChoice,turnsPerPlayer,deckSize,
    rng:random(seed^0xaac49ff1),decisionRng:random(seed^0x6a7c821f),stock:makeStock(deckSize,seed^0x923c4b77),
    players:[],row:[],turn:0,earlyStop:false,
    log:[]
  };
  state.row=refill(state,[],9,pattern);
  for(let i=0;i<players;i++){
    const player={hand:[],score:0,captured:[]};
    while(player.hand.length<3){
      const c=draw(state.stock,state.rng);
      if(!c){state.earlyStop=true;break}
      player.hand.push(c);
    }
    state.players.push(player);
  }
  return state;
}
function legalOptions(state,playerIndex){
  const p=state.players[playerIndex];
  if(!p||state.earlyStop)return [];
  const out=[];
  for(let i=0;i<p.hand.length;i++){
    for(let pos=0;pos<=state.row.length;pos++){
      const result=resolve(state.row,p.hand[i],pos,state.pattern);
      if(result.points||!state.edgeChoice){
        out.push({cardIndex:i,pos,edge:'right',result});
      }else{
        out.push({cardIndex:i,pos,edge:'right',result});
        out.push({cardIndex:i,pos,edge:'left',result});
      }
    }
  }
  return out;
}
function stateAfterOverflow(result,edge){
  const b=result.row.slice();
  while(b.length>9) b.splice(edge==='left'?0:b.length-1,1);
  return b;
}
function distinctOptions(opts){
  return new Set(opts.map(o=>o.result.points+'|'+stateAfterOverflow(o.result,o.edge).join(''))).size;
}
function setupPotential(row){
  let v=0;
  for(let i=0;i+1<row.length;i++)if(row[i]===row[i+1])v+=1;
  return v;
}
function choose(state,playerIndex,policy='greedy'){
  const opts=legalOptions(state,playerIndex);
  if(!opts.length)return null;
  if(policy==='random')return opts[Math.floor(state.decisionRng()*opts.length)];
  const scored=opts.map(o=>{
    const row=stateAfterOverflow(o.result,o.edge);
    const bonus=setupPotential(row);
    // Lookahead values own future setup, not another player's hidden hand
    // and never inspects the hidden draw pile.
    const possible=state.players[playerIndex].hand.filter((_,i)=>i!==o.cardIndex);
    let bestNext=0;
    if(policy==='lookahead'){
      for(const c of new Set(possible))for(let pos=0;pos<=row.length;pos++)
        bestNext=Math.max(bestNext,resolve(row,c,pos,state.pattern).points);
    }
    return {o,v:o.result.points+(policy==='lookahead'?.14*bestNext:.035*bonus)+state.decisionRng()*.001};
  });
  scored.sort((a,b)=>b.v-a.v);
  return scored[0].o;
}
function play(state,playerIndex,choice){
  if(state.earlyStop)return null;
  if(playerIndex!==state.turn%state.players.length)throw Error('Out of turn');
  const opts=legalOptions(state,playerIndex);
  if(!opts.some(o=>o.cardIndex===choice.cardIndex&&o.pos===choice.pos&&o.edge===choice.edge))
    throw Error('Illegal move');
  const p=state.players[playerIndex],card=p.hand[choice.cardIndex];
  const result=resolve(state.row,card,choice.pos,state.pattern);
  const inserted=result.row.slice();
  const overflow=[];
  while(inserted.length>9){
    overflow.push(inserted.splice(choice.edge==='left'?0:inserted.length-1,1)[0]);
  }
  state.stock.discard.push(...overflow);
  p.hand.splice(choice.cardIndex,1);
  p.captured.push(...result.steps.flatMap(s=>s.removed));
  p.score+=result.points;
  const before=state.row.slice();
  state.row=refill(state,inserted,9,state.pattern);
  const replacement=draw(state.stock,state.rng);
  if(replacement)p.hand.push(replacement);
  else{state.earlyStop=true;state.stock.missing++}
  state.turn++;
  const observation={playerIndex,turn:state.turn,before,card,pos:choice.pos,edge:choice.edge,
    points:result.points,waves:result.waves,tripleWaves:result.tripleWaves,aabbWaves:result.aabbWaves,
    after:state.row.slice(),scoringAvailable:opts.some(o=>o.result.points>0),
    distinctImmediateOutcomes:distinctOptions(opts),
    distinctScoringOutcomes:distinctOptions(opts.filter(o=>o.result.points>0)),
    legalActions:opts.length,scoringActions:opts.filter(o=>o.result.points>0).length,
    overflow:overflow.slice()};
  state.log.push(observation);
  return observation;
}
function conservation(state){
  return state.stock.drawPile.length+state.stock.discard.length+state.row.length+
    state.players.reduce((sum,p)=>sum+p.hand.length+p.captured.length,0);
}
function runGame(config={}){
  const state=stateFor(config);
  const policies=config.policies||['random','greedy','lookahead','greedy'];
  while(!state.earlyStop&&state.turn<state.turnsPerPlayer*state.players.length){
    const i=state.turn%state.players.length;
    const choice=choose(state,i,policies[i%policies.length]);
    if(!choice){state.earlyStop=true;break}
    play(state,i,choice);
    if(conservation(state)!==state.deckSize)throw Error('Card conservation failed');
    if(state.row.length!==9&&!state.earlyStop)throw Error('Row length invariant failed');
  }
  const max=Math.max(...state.players.map(p=>p.score));
  return {config:{players:state.players.length,deckSize:state.deckSize,seed:state.seed,
    pattern:state.pattern,edgeChoice:state.edgeChoice,turnsPerPlayer:state.turnsPerPlayer},
    turns:state.turn,completed:!state.earlyStop,earlyStop:state.earlyStop,
    scores:state.players.map(p=>p.score),winners:state.players.map((p,i)=>p.score===max?i:-1).filter(i=>i>=0),
    stock:{reshuffles:state.stock.reshuffles,rejected:state.stock.rejected,
      forced:state.stock.forced,missing:state.stock.missing},log:state.log};
}
function summarize(games){
  const turns=games.flatMap(g=>g.log),n=turns.length||1;
  return {games:games.length,turns:turns.length,
    completionRate:games.filter(g=>g.completed).length/Math.max(1,games.length),
    noAvailableScoreRate:turns.filter(t=>!t.scoringAvailable).length/n,
    actualZeroScoreRate:turns.filter(t=>t.points===0).length/n,
    anyComboRate:turns.filter(t=>t.waves>0).length/n,
    chainRate:turns.filter(t=>t.waves>1).length/n,
    avgDistinctOutcomes:turns.reduce((a,t)=>a+t.distinctImmediateOutcomes,0)/n,
    avgDistinctScoringOutcomes:turns.reduce((a,t)=>a+t.distinctScoringOutcomes,0)/n,
    multiOutcomeRate:turns.filter(t=>t.distinctScoringOutcomes>=2).length/n,
    pointsPerTurn:turns.reduce((a,t)=>a+t.points,0)/n,
    reshufflePerGame:games.reduce((a,g)=>a+g.stock.reshuffles,0)/Math.max(1,games.length),
    forcedPerGame:games.reduce((a,g)=>a+g.stock.forced,0)/Math.max(1,games.length),
    rejectedPerGame:games.reduce((a,g)=>a+g.stock.rejected,0)/Math.max(1,games.length)};
}
module.exports={COLORS,matches,resolve,stateFor,legalOptions,choose,play,conservation,runGame,summarize,coloredDeck};
