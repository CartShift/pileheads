/*
 * SPARK GAME DESIGN LAB, v0.1.
 * Two independent experimental physical card games, no production imports.
 * Claim: public lane-control + action-economy race to claim 3+ cards.
 * Signal: hidden simultaneous bids for three public prizes.
 * Intentionally plain UMD so the same rules work in browsers and Node.
 */
(function(root){'use strict';
const COLORS=['O','B','P','G'],CLAIM_COLORS=COLORS.slice(0,3);
function ensure(ok,msg){if(!ok)throw Error(msg)}
function seedRng(seed){return(seed^0x8f123ab5)>>>0}
function next(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(cards,g){for(let i=cards.length-1;i>0;i--){const j=Math.floor(next(g)*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}return cards}
function deck(colors,maxRank,copies){let id=0;return colors.flatMap(c=>Array.from({length:maxRank*copies},(_,i)=>({id:id++,c,v:1+i%maxRank})))}
function draw(g){return g.stock.pop()||null}
function createClaim({seed=1,players=2,turnsPerPlayer=players===2?14:players===3?12:10}={}){
 ensure(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid seed');
 ensure([2,3,4].includes(players),'Claim supports 2-4 players');
 ensure(Number.isInteger(turnsPerPlayer)&&turnsPerPlayer>=3&&turnsPerPlayer<=14,'Invalid Claim turn limit');
 ensure(players*turnsPerPlayer+players*4<=72,'Not enough cards for Claim turn limit');
 const g={kind:'claim',version:'spark-lab-01',seed,rng:seedRng(seed),turn:0,turnsPerPlayer,
   players:Array.from({length:players},(_,seat)=>({seat,hand:[],captured:[],score:0})),
   lanes:{O:[],B:[],P:[]},stock:[],discard:[],log:[],lastEvent:null};
 g.stock=shuffle(deck(CLAIM_COLORS,3,8),g);
 for(let i=0;i<4;i++)for(const p of g.players)p.hand.push(draw(g));
 ensure(cardCount(g)===72,'Claim deck accounting');
 return g;
}
function claimDone(g){return g.turn>=g.players.length*g.turnsPerPlayer}
function strength(lane,p){return lane.reduce((sum,a)=>sum+(a.owner===p?a.card.v:0),0)}
function leader(lane,n){
 let max=0,winner=null,ties=0;
 for(let seat=0;seat<n;seat++){
  const s=strength(lane,seat);
  if(s>max){max=s;winner=seat;ties=1}
  else if(s===max&&s>0)ties++;
 }
 return ties===1?winner:null;
}
function claimLegal(g,p){
 if(claimDone(g)||!g.players[p]||g.turn%g.players.length!==p)return[];
 const arr=[];
 for(let index=0;index<g.players[p].hand.length;index++)arr.push({type:'play',index});
 for(const c of CLAIM_COLORS){
  const lane=g.lanes[c];
  if(lane.length>=3&&leader(lane,g.players.length)===p)arr.push({type:'claim',lane:c});
 }
 return arr;
}
function sameMove(a,b){return a.type===b.type&&(a.type==='play'?a.index===b.index:a.lane===b.lane)}
function grantClaim(g,c,p,reason){
 const cards=g.lanes[c].map(e=>e.card);
 g.lanes[c]=[];
 if(p===null)g.discard.push(...cards);
 else {g.players[p].captured.push(...cards);g.players[p].score+=cards.length}
 return{winner:p,lane:c,points:cards.length,reason};
}
function playClaim(g,p,move){
 ensure(g.kind==='claim'&&g.turn%g.players.length===p&&!claimDone(g),'Wrong seat or finished Claim');
 ensure(claimLegal(g,p).some(x=>sameMove(x,move)),'Illegal Claim move');
 const before=g.players.map(x=>x.score),turn=g.turn+1;
 let event;
 if(move.type==='claim')event={type:'claim',seat:p,turn,...grantClaim(g,move.lane,p,'claimed')};
 else {
  const [card]=g.players[p].hand.splice(move.index,1);
  const lane=g.lanes[card.c];
  lane.push({owner:p,card});
  const replacement=draw(g);
  ensure(!!replacement,'Stock depleted before final turn');
  g.players[p].hand.push(replacement);
  const trigger=lane.length>=7?grantClaim(g,card.c,leader(lane,g.players.length),'overload'):null;
  event={type:'play',seat:p,turn,card,lane:card.c,trigger};
 }
 g.turn++;event.scores=g.players.map(x=>x.score);event.scoreChanges=event.scores.map((x,i)=>x-before[i]);
 g.lastEvent=event;g.log.push(event);
 ensure(cardCount(g)===72,'Claim card conservation failed');
 ensure(g.players.every(x=>x.hand.length===4),'Claim hand size changed');
 return event;
}
function claimAnalysis(g,p,move){
 if(move.type==='claim')return{immediate:g.lanes[move.lane].length,pressure:0,oppClaim:0,margin:0,overload:false};
 const card=g.players[p].hand[move.index],lane=[...g.lanes[card.c],{owner:p,card}];
 const n=g.players.length;
 const win=leader(lane,n),margin=strength(lane,p)-Math.max(...g.players.filter(x=>x.seat!==p).map(x=>strength(lane,x.seat)));
 const immediate=lane.length>=7&&win===p?lane.length:0;
 const risk=(lane.length>=3&&win!==null&&win!==p)?lane.length:0;
 return{immediate,pressure:lane.length,oppClaim:risk,margin,overload:lane.length>=7};
}
function claimChoose(g,p,policy='planner'){
 const options=claimLegal(g,p);ensure(options.length>0,'No Claim moves available');
 let best=-Infinity,bestMove=options[0];
 for(const m of options){
  const a=claimAnalysis(g,p,m);
  const color=m.type==='play'?g.players[p].hand[m.index].c:m.lane;
  const ownColorCount=g.players[p].hand.filter(c=>c.c===color).length;
  const val=m.type==='claim'?a.immediate*(policy==='greedy'?4:3.3):
    policy==='random'?next(g):
    policy==='greedy'?a.immediate*4+a.margin*.12+(m.type==='play'?g.players[p].hand[m.index].v*.16:0):
    a.immediate*4+a.margin*.38+Math.min(4,a.pressure)*.32-
     a.oppClaim*1.8+(a.margin>0&&a.pressure>=3?1.4:0)+(ownColorCount>1?.2:0);
  if(val>best+1e-9){best=val;bestMove=m}
 }
 return bestMove;
}
function createSignal({seed=1,rounds=10}={}){
 ensure(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid seed');
 ensure(Number.isInteger(rounds)&&rounds>=3&&rounds<=10,'Signal supports 3-10 rounds');
 const g={kind:'signal',version:'spark-lab-01',seed,rng:seedRng(seed),round:0,rounds,
  players:Array.from({length:2},(_,seat)=>({seat,hand:[],captured:[],score:0})),
  prizes:[],commits:[null,null],stock:[],discard:[],log:[],lastEvent:null};
 g.stock=shuffle(deck(COLORS,5,3),g);
 for(let i=0;i<5;i++)for(const p of g.players)p.hand.push(draw(g));
 for(let i=0;i<3;i++)g.prizes.push(draw(g));
 ensure(cardCount(g)===60,'Signal deck accounting');
 return g;
}
function signalDone(g){return g.round>=g.rounds}
function signalSeat(g){return g.commits[0]===null?0:g.commits[1]===null?1:null}
function signalLegal(g,p){
 if(signalDone(g)||signalSeat(g)!==p)return[];
 return g.players[p].hand.flatMap((card,index)=>g.prizes.map((_,slot)=>({type:'bid',index,slot})));
}
function signalPower(card,prize){return card.v+(card.c===prize.c?2:0)}
function signalChoose(g,p,policy='planner'){
 // All policies use own hand plus public prizes, never read an opponent's
 // hand/commit/stock. In live play the bot selects before the opponent reveals.
 const choices=g.players[p].hand.flatMap((card,index)=>g.prizes.map((prize,slot)=>({type:'bid',index,slot,card,prize})));
 ensure(choices.length>0,'No Signal bids');
 let winner=choices[0],max=-Infinity;
 for(const o of choices){
  const bid=signalPower(o.card,o.prize);
  const prizeValues=g.prizes.reduce((sum,x)=>sum+x.v,0);
  const contest=.12+.73*o.prize.v/prizeValues;
  const contestedWin=Math.min(.96,Math.max(.12,(bid-1)/8));
  const futureCost=(g.round+1<g.rounds?(o.card.v-1)*.27:0);
  const value=policy==='random'?next(g):
    policy==='greedy'?o.prize.v*2+.10*bid:
    o.prize.v*(1-contest*(1-contestedWin))-.60*futureCost+
      .18*bid+(g.round>6?.14*o.prize.v:0);
  if(value>max+1e-9){max=value;winner=o}
 }
 return{type:'bid',index:winner.index,slot:winner.slot};
}
function playSignal(g,p,move){
 ensure(g.kind==='signal'&&!signalDone(g)&&signalSeat(g)===p,'Wrong seat or finished Signal');
 ensure(signalLegal(g,p).some(x=>x.type===move.type&&x.index===move.index&&x.slot===move.slot),'Illegal Signal bid');
 const [card]=g.players[p].hand.splice(move.index,1);
 g.commits[p]={seat:p,card,slot:move.slot};
 if(g.commits[0]===null||g.commits[1]===null){
  ensure(cardCount(g)===60,'Card conservation while bids hidden');
  return{type:'waiting',seat:p,round:g.round+1};
 }
 const bids=g.commits.slice(),scoresBefore=g.players.map(x=>x.score),claims=[];
 for(let slot=0;slot<g.prizes.length;slot++){
  const prize=g.prizes[slot],visitors=bids.filter(x=>x.slot===slot);
  let winner=null;
  if(visitors.length===1)winner=visitors[0].seat;
  if(visitors.length===2){
   const a=signalPower(visitors[0].card,prize),b=signalPower(visitors[1].card,prize);
   if(a!==b)winner=a>b?visitors[0].seat:visitors[1].seat;
  }
  if(winner===null)g.discard.push(prize);
  else {g.players[winner].captured.push(prize);g.players[winner].score+=prize.v}
  claims.push({slot,prize,winner,contested:visitors.length===2});
 }
 g.discard.push(...bids.map(x=>x.card));g.commits=[null,null];g.prizes=[];g.round++;
 if(!signalDone(g)){
  for(const player of g.players){const drawn=draw(g);ensure(!!drawn,'Signal shortage of hand refill');player.hand.push(drawn)}
  for(let i=0;i<3;i++){const c=draw(g);ensure(!!c,'Signal shortage of prize cards');g.prizes.push(c)}
 }
 const event={type:'reveal',round:g.round,bids,claims,scores:g.players.map(p=>p.score),
  scoreChanges:g.players.map((p,i)=>p.score-scoresBefore[i])};
 g.lastEvent=event;g.log.push(event);
 ensure(cardCount(g)===60,'Signal card conservation after reveal');
 if(!signalDone(g))ensure(g.players.every(p=>p.hand.length===5),'Signal hand size changed');
 return event;
}
function cardCount(g){
 if(g.kind==='claim')return g.stock.length+g.discard.length+
   Object.values(g.lanes).reduce((n,l)=>n+l.length,0)+
   g.players.reduce((n,p)=>n+p.hand.length+p.captured.length,0);
 return g.stock.length+g.discard.length+g.prizes.length+
   g.commits.filter(Boolean).length+
   g.players.reduce((n,p)=>n+p.hand.length+p.captured.length,0);
}
function runClaim(config={},policies=['planner','greedy','greedy','greedy']){
 const g=createClaim(config);let claims=0,overloads=0,scoreless=0,availableClaim=0;
 while(!claimDone(g)){
  const seat=g.turn%g.players.length;const legal=claimLegal(g,seat);
  availableClaim+=legal.some(x=>x.type==='claim')?1:0;
  const e=playClaim(g,seat,claimChoose(g,seat,policies[seat]||'planner'));
  claims+=e.type==='claim'?1:0;overloads+=e.trigger?1:0;
  scoreless+=e.scoreChanges.every(x=>x===0)?1:0;
 }
 return{game:g,summary:{completed:claimDone(g),scores:g.players.map(p=>p.score),claims,overloads,
  scoreless,availableClaim,turns:g.turn,winners:g.players.filter(p=>p.score===Math.max(...g.players.map(x=>x.score))).map(p=>p.seat)}};
}
function runSignal(config={},policies=['planner','greedy']){
 const g=createSignal(config);let collisions=0,ties=0,uncontested=0;
 while(!signalDone(g)){
  const first=signalChoose(g,0,policies[0]);playSignal(g,0,first);
  const second=signalChoose(g,1,policies[1]);const e=playSignal(g,1,second);
  collisions+=e.claims.some(c=>c.contested)?1:0;
  ties+=e.claims.some(c=>c.contested&&c.winner===null)?1:0;
  uncontested+=e.claims.filter(c=>c.winner!==null&&!c.contested).length;
 }
 return{game:g,summary:{completed:signalDone(g),scores:g.players.map(p=>p.score),rounds:g.round,collisions,ties,uncontested,
  winners:g.players.filter(p=>p.score===Math.max(...g.players.map(x=>x.score))).map(p=>p.seat)}};
}
root.SparkGameLab={COLORS,CLAIM_COLORS,createClaim,claimDone,claimLegal,claimChoose,claimAnalysis,playClaim,strength,leader,
 createSignal,signalDone,signalSeat,signalLegal,signalChoose,signalPower,playSignal,cardCount,runClaim,runSignal};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.SparkGameLab;