'use strict';
// Reconciliation of authoritative redacted snapshots; no network, storage,
// engine mutations or client-derived legal actions.
function disposition(previous,next){
 if(!previous||previous.code!==next.code)return 'apply';
 if(next.revision<previous.revision)return 'stale';
 if(previous.me===next.me&&previous.revision===next.revision&&!next.session&&
    JSON.stringify(previous.game)===JSON.stringify(next.game)&&
    JSON.stringify(previous.members)===JSON.stringify(next.members))return 'identical';
 return 'apply';
}
function sameRound(previous,next){
 return previous.code===next.code&&previous.me===next.me&&previous.game.round===next.game.round;
}
function selectionBoundary(previous,next){
 return !!previous&&(!sameRound(previous,next)||previous.revision!==next.revision);
}
function retainSelection(previous,next,selected){
 if(!selected.length)return selected;
 const game=next.game;
 const canRetain=sameRound(previous,next)&&previous.game.phase==='play'&&
  game.phase==='play'&&game.turn===next.me&&!game.pendingDump&&!game.pendingCounter&&!game.tournamentWithdrawal;
 return canRetain&&game.legal.some(move=>move.type==='play'&&move.source!=='down'&&
   selected.every(id=>move.ids?.includes(id)))?selected:[];
}
function retainSwap(previous,next,id){
 return sameRound(previous,next)&&previous.game.phase==='setup'&&next.game.phase==='setup'&&
  !next.game.setupReady[next.me]&&next.game.players[next.me]?.hand?.some(card=>card.id===id)?id:null;
}
module.exports={disposition,selectionBoundary,retainSelection,retainSwap};
