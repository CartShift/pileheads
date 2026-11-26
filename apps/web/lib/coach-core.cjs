"use strict";
/** Contextual copy consumes the same redacted move groups as the game UI.
 * No hidden cards, speculative rules, timers or forced actions. */
function coachTip(game, {me,active,stage,selection,canPlay,needsTarget,selectedAction}) {
  if (game.phase === "setup") return {id:"setup",text:"Choose three face-up cards. Tap a hand card, then a face-up card to swap. Auto arrange can help."};
  if (game.phase !== "play") return null;
  if (game.pendingCounter) return game.pendingCounter.seat === me ?
    {id:"counter",text:"Counter DUMP returns the received cards to the attacker. Or choose Keep cards to accept them."} :
    {id:"wait-counter",text:"The recipient is deciding whether to return the pile."};
  if (game.pendingDump || needsTarget) return game.pendingDump && game.pendingDump.seat !== me ?
    {id:"wait-dump",text:"The other player is choosing who receives the pile."} :
    {id:"dump-target",text:"Choose an opponent to receive the pile. They may have a DUMP to return it."};
  if (game.followup.length) return {id:"snap",text:"SNAP! Play the matching card you just drew before another move commits."};
  if (game.slam.length) return {id:"slam",text:"SLAM! Use the matching group to complete four and burn the pile."};
  if (!active) return {id:"wait",text:"Watch the bot's move. SNAP and SLAM opportunities can interrupt a turn."};
  if (game.moves === 0 && !selection.length) return {id:"first",text:"Your first move: select a card in your hand, then Play cards. You can also drag it onto the pile."};
  if (selection.length) {
    if (!canPlay) return {id:"blocked",text:"That selection cannot be played now. Choose a legal group, or take the pile if available."};
    if (selectedAction === "dump") return {id:"dump",text:"DUMP sends the pile to an opponent. They may return it with their own DUMP."};
    if (selectedAction === "burn") return {id:"burn",text:"BURN clears the pile and gives you another turn."};
    return {id:"confirm",text:"This group is legal. Play cards to commit your move, or choose another group."};
  }
  if (stage === "down") return {id:"blind",text:"Flip a blind card without looking. An invalid flip means you collect the pile."};
  if (!game.legal.some(m=>m.type==="play") && game.legal.some(m=>m.type==="take"))
    return {id:"take",text:"No legal card is available. Take the pile to continue."};
  if (stage === "up") return {id:"face-up",text:"Play your visible face-up cards before touching the blind cards."};
  if (!game.stockCount && stage === "hand") return {id:"last-hand",text:"The deck is empty. Empty your hand to uncover your face-up cards."};
  if (game.limit?.type === "under") return {id:"under",text:"Play a number from 1–4 or a special card. Matching numbers can be played together."};
  if (game.limit?.type === "min") return {id:"minimum",text:"Play "+game.limit.value+" or higher, or a special card. The deck refills your hand to three."};
  return {id:"free",text:"Play a number or a special card. Your hand refills to three while the deck lasts."};
}
function roundOutcome(game,me){
  if(game.phase!=="over")return null;
  const index=game.finishedOrder.indexOf(me);
  if(game.loser===me)return {kind:"loss",title:"You're the PILEHEAD!",description:"The pile got you this time. A fresh round is another chance."};
  if(index===0)return {kind:"first",title:"First out!",description:"You emptied all your cards first. You start the next round."};
  if(index>0)return {kind:"escaped",title:"You escaped the pile!",description:"You finished in place "+(index+1)+". The last player is the PILEHEAD."};
  return {kind:"neutral",title:"Round complete!",description:"Here is how everyone finished."};
}
module.exports={coachTip,roundOutcome};
