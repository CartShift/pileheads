"use strict";
/** Explicitly isolated, deterministic local teaching snapshots. They are not
 * normal random deals, online rooms, tournament games, or saved matches. */
const DRILLS = Object.freeze([
  {id:"snap",label:"SNAP · complete the pile",description:"Play the matching drawn card before another player acts."},
  {id:"slam",label:"SLAM · four of a kind",description:"Use four matching cards to interrupt another turn."},
  {id:"counter",label:"Counter DUMP · send it back",description:"Choose whether to return the received pile."}
]);
function buildDrill(E,id){
  if(!DRILLS.some(d=>d.id===id))throw Error("Unknown practice drill");
  const g=E.create({players:2,seed:2026112600+DRILLS.findIndex(d=>d.id===id),endgameRule:"classic"});
  E.autoSetup(g,1);
  E.start(g);
  const p=g.people[0],bot=g.people[1],deck=E.effectiveDeck(g);
  const zones=()=>[g.stock,g.pile,g.ashes,...g.people.flatMap(person=>[person.hand,person.up,person.down])];
  function transfer(card,to){
    const from=zones().find(zone=>zone.some(c=>c.id===card.id));
    if(!from)throw Error("Missing drill card");
    if(from!==to)to.push(from.splice(from.findIndex(c=>c.id===card.id),1)[0]);
  }
  const rank=n=>deck.filter(c=>c.kind==="number"&&c.rank===n);
  if(id==="snap"){
    const cards=rank(6);
    for(const card of cards.slice(0,3))transfer(card,g.pile);
    transfer(cards[3],p.hand);
    g.turn=1;g.limit={type:"min",value:6};g.slamOpen=true;
    g.followUp={seat:0,rank:6,ids:[cards[3].id]};
    if(!E.followUpOptions(g,0).length)throw Error("SNAP drill not legal");
  }else if(id==="slam"){
    for(const card of rank(7))transfer(card,p.hand);
    transfer(rank(3)[0],g.pile);
    g.turn=1;g.limit={type:"min",value:3};g.slamOpen=false;
    if(!E.slamOptions(g,0).length)throw Error("SLAM drill not legal");
  }else{
    const [mine,theirs]=deck.filter(c=>c.action==="dump");
    transfer(mine,p.hand);transfer(theirs,bot.hand);
    transfer(rank(4)[0],g.pile);transfer(rank(4)[1],g.pile);
    g.turn=1;g.limit={type:"min",value:4};
    E.move(g,1,{type:"play",source:"hand",ids:[theirs.id],target:0});
    if(g.pendingCounter?.seat!==0||!E.options(g,0).some(m=>m.type==="counter-dump"))
      throw Error("Counter DUMP drill not legal");
  }
  E.invariant(g);
  return g;
}
module.exports={DRILLS,buildDrill};
