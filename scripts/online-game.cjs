'use strict';
const crypto=require('node:crypto'),E=require('../packages/game-engine');
const Standings=require('./room-standings.cjs');
function freshGame({players,humans,bots,round=1,starterSeat=null,endgameRule='classic',roundLimit=null}){
 const seed=crypto.randomBytes(4).readUInt32BE(0);
 const game=E.create({players,seed,endgameRule});
 // Keep deterministic RNG for bot policy and offline simulations, but use an
 // independent cryptographic shuffle for every newly dealt online round.
 const deck=E.deck(game.version).filter(c=>!(game.omitSkip&&c.action==='skip'));
 for(let i=deck.length-1;i>0;i--){
  const j=crypto.randomInt(0,i+1);
  [deck[i],deck[j]]=[deck[j],deck[i]];
 }
 game.stock=deck;
 for(const p of game.people)for(const area of ['down','up','hand'])p[area]=[];
 for(const area of ['down','up','hand'])for(let k=0;k<3;k++)for(const p of game.people)p[area].push(game.stock.pop());
 game.humanCount=humans;
 game.botSeats=Array.from({length:bots},(_,i)=>humans+i);
 game.round=round;
 game.roundLimit=roundLimit;
 game.rematchReady=Array.from({length:humans},()=>false);
 Standings.record(game);
 // Pick the first starter once, on the server; the clients only animate the
 // already-authoritative result. Subsequent rounds use the prior winner.
 game.starterSeat=starterSeat===null?crypto.randomInt(players):starterSeat;
 game.starterReason=starterSeat===null?'draw':'winner';
 game.setupReady=Array.from({length:players},(_,i)=>i>=humans);
 for(const seat of game.botSeats)E.autoSetup(game,seat);
 E.invariant(game);
 return game;
}
module.exports={freshGame};
