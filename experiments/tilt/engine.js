/*
 * TILT MECHANICS LAB v0.1
 * Two *different* physical shedding games with the same purpose-built 48-card
 * paired-value deck. These are experimental, not retail-approved rules.
 * Pure UMD JS, browser and Node compatible, no dependency on SPARK Simple+.
 */
(function(root){'use strict';
const SIZE=48, HAND=4, MAX_TURNS=320;
function ok(x,m){if(!x)throw Error(m)}
function seedStep(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296}
function shuffle(arr,g){for(let i=arr.length-1;i>0;i--){let j=Math.floor(seedStep(g)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function makeDeck(){
 const deck=[];let id=0;
 for(let r=0;r<6;r++)for(let n=1;n<=8;n++){
  const crest=n,shade=((n-1+3*r)%8)+1;
  deck.push({id:id++,crest,shade,pivot:(r+n)%4===0});
 }
 return deck;
}
function create({seed=1,kind='cross',players=2}={}){
 ok(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid seed');
 ok(['cross','forge'].includes(kind),'Unknown ruleset');
 ok(Number.isInteger(players)&&players>=2&&players<=4,'Supports 2 to 4 players');
 const g={version:'tilt-mechanics-lab-v01',kind,seed,rng:(seed^0x23ae6c41)>>>0,turn:0,winner:null,drawn:false,
  players:Array.from({length:players},(_,seat)=>({seat,hand:[],prepared:null,pickups:0})),
  stock:[],log:[],piles:{sun:[],moon:[]},pile:[],force:null};
 g.stock=shuffle(makeDeck(),g);
 for(let i=0;i<HAND;i++)for(const p of g.players)p.hand.push(g.stock.pop());
 ok(count(g)===SIZE,'Initial conservation');return g;
}
function count(g){
 return g.stock.length+g.players.reduce((n,p)=>n+p.hand.length+(p.prepared?1:0),0)+
 (g.kind==='cross'?g.piles.sun.length+g.piles.moon.length:g.pile.length);
}
function ended(g){return g.winner!==null||g.drawn}
function active(g){return g.turn%g.players.length}
function phase(g,p){return g.stock.length>0?'draw':p.hand.length?'finish':'done'}
function readyToWin(g,seat){
 const p=g.players[seat];return g.stock.length===0&&p.hand.length===0&&p.prepared===null;
}
function validCross(g,p,card,lane){
 if(g.force&&g.force!==lane)return false;
 const row=g.piles[lane],top=row[row.length-1];
 return !top||(lane==='sun'?card.crest>=top.shade:card.shade<=top.crest);
}
function legal(g,seat){
 if(ended(g)||active(g)!==seat)return[];
 const p=g.players[seat],out=[];
 if(g.kind==='cross'){
  for(let i=0;i<p.hand.length;i++)for(const lane of ['sun','moon'])
   if(validCross(g,p,p.hand[i],lane))out.push({type:'play',index:i,lane});
  if(!out.length){
   const choices=g.force?[g.force]:['sun','moon'];
   for(const lane of choices)if(g.piles[lane].length)out.push({type:'pickup',lane});
  }
 }else{
  const top=g.pile[g.pile.length-1]?.card;
  for(let i=0;i<p.hand.length;i++){
   if(!top||p.hand[i].crest>=top.shade)out.push({type:'play',index:i});
   if(p.prepared===null)out.push({type:'prepare',index:i});
  }
  if(p.prepared&&(!top||p.prepared.shade>=top.shade))out.push({type:'release'});
  const attack=out.some(m=>m.type==='play'||m.type==='release');
  if(!attack&&g.pile.length)out.push({type:'pickup'});
 }
 ok(out.length>0||readyToWin(g,seat),'No legal action for live game');
 return out;
}
function actionEquals(a,b){return a.type===b.type&&a.index===b.index&&a.lane===b.lane}
function refill(g,p){while(p.hand.length<HAND&&g.stock.length)p.hand.push(g.stock.pop())}
function move(g,seat,a){
 ok(g.version==='tilt-mechanics-lab-v01'&&!ended(g)&&active(g)===seat,'Not your turn or match ended');
 ok(legal(g,seat).some(m=>actionEquals(m,a)),'Illegal move');
 const p=g.players[seat],card=a.index===undefined?null:p.hand[a.index],beforeHand=p.hand.length;
 let event={turn:g.turn+1,seat,kind:g.kind,type:a.type,card:card||null,lane:a.lane||null,spent:0,forceBefore:g.force};
 if(g.kind==='cross'){
  if(a.type==='play'){
   p.hand.splice(a.index,1);
   g.piles[a.lane].push(card);
   g.force=card.pivot?(a.lane==='sun'?'moon':'sun'):null;
   refill(g,p);
  }else{
   const taken=g.piles[a.lane].splice(0);
   p.hand.push(...taken);p.pickups++;
   event.spent=taken.length;g.force=null;
  }
  event.sun=g.piles.sun.length;event.moon=g.piles.moon.length;event.forceAfter=g.force;
 }else{
  if(a.type==='play'){
   p.hand.splice(a.index,1);
   g.pile.push({card,mode:'strike'});refill(g,p);
  }else if(a.type==='prepare'){
   p.hand.splice(a.index,1);p.prepared=card;refill(g,p);
  }else if(a.type==='release'){
   event.card=p.prepared;g.pile.push({card:p.prepared,mode:'release'});
   p.prepared=null;refill(g,p);
  }else{
   const taken=g.pile.splice(0).map(x=>x.card);
   p.hand.push(...taken);p.pickups++;event.spent=taken.length;
  }
  event.height=g.pile.length;
 }
 event.handDelta=p.hand.length-beforeHand;
 g.turn++;if(readyToWin(g,seat))g.winner=seat;
 if(g.turn>=MAX_TURNS&&!ended(g))g.drawn=true;
 event.stock=g.stock.length;event.hand=p.hand.length;event.winner=g.winner;
 g.log.push(event);
 ok(count(g)===SIZE,'Card conservation violation');
 return event;
}
function choose(g,seat,policy='planner'){
 const choices=legal(g,seat),p=g.players[seat];ok(choices.length,'No moves');
 if(policy==='random')return choices[Math.floor(seedStep(g)*choices.length)];
 if(policy==='greedy')return choices.find(x=>x.type==='play')||choices.find(x=>x.type==='release')||choices[0];
 let best=-1e8,selected=choices[0];
 for(const a of choices){
  let value=0;
  if(g.kind==='cross'){
   if(a.type==='pickup')value=-2-a.lane.length*0.001-g.piles[a.lane].length*1.8;
   else{
    const c=p.hand[a.index],other=a.lane==='sun'?'moon':'sun';
    const hardship=a.lane==='sun'?c.shade/8:(9-c.crest)/8;
    const nextTop=g.piles[other].at(-1),otherHard=nextTop?(other==='sun'?nextTop.shade/8:(9-nextTop.crest)/8):0;
    value=2+hardship*1.8+((c.pivot&&otherHard>0)?otherHard*1.8:0)+
      (g.stock.length===0?3:0)+.003*c.crest;
   }
  }else{
   const top=g.pile.at(-1)?.card;
   if(a.type==='pickup')value=-1.2-g.pile.length*1.7;
   else if(a.type==='play') {
    const c=p.hand[a.index];
    value=3+c.shade*.20+(g.stock.length===0?3:0)+
      (c.crest>=7?.10:0);
   }else if(a.type==='prepare'){
    const c=p.hand[a.index];
    value=1.0+(c.shade-c.crest)*.22+(c.shade>=5?.45:0)-
      (p.hand.length<=2&&!g.stock.length?.8:0);
    if(top&&c.crest<top.shade)value+=1.0;
   }else{
    const c=p.prepared;
    value=3.0+c.crest*.20+(g.stock.length===0?3.0:0);
   }
  }
  if(value>best){best=value;selected=a}
 }
 return selected;
}
function simulate(config={},policies=['planner','greedy']){
 const g=create(config);
 while(!ended(g)){
  const seat=active(g),l=legal(g,seat);
  if(!l.length){g.drawn=true;break}
  move(g,seat,choose(g,seat,policies[seat]||'planner'));
 }
 return {game:g,stats:{kind:g.kind,seed:g.seed,turns:g.turn,completed:g.winner!==null,drawn:g.drawn,
  winner:g.winner,stock:g.stock.length,remaining:g.players.map(p=>p.hand.length+(p.prepared?1:0)),pickups:g.players.map(p=>p.pickups),
  longPickups:g.log.filter(e=>e.spent>=5).length,prepared:g.log.filter(e=>e.type==='prepare').length,
  released:g.log.filter(e=>e.type==='release').length}};
}
root.TiltLab={SIZE,HAND,makeDeck,create,legal,move,choose,simulate,count,ended,active,phase};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.TiltLab;
