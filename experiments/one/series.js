/* TILT ONE · transparent, deterministic 2-player best-of-three set.
 * This is session scoring, not a change to the 32-card turn rules.
 * Each player gets the opening lead once across the first two rounds.
 * In the decider, the previous round's loser leads.
 */
(function(root){'use strict';
const VERSION='one-series-v01';
function assert(ok,msg){if(!ok)throw Error(msg)}
function create(seed){
 assert(Number.isInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid series seed');
 return{version:VERSION,baseSeed:seed,round:1,wins:[0,0],history:[],complete:false};
}
function firstSeat(s){
 assert(s.version===VERSION,'Invalid series');
 if(s.round===1)return s.baseSeed%2;
 if(s.round===2)return 1-(s.baseSeed%2);
 assert(s.round===3&&s.history.length===2,'Round 3 requires completed rounds');
 return 1-s.history[1].winner; // loser of previous round gets the lead
}
function roundSeed(s){return (s.baseSeed+(s.round-1)*7919)>>>0}
function canRecord(s){return !s.complete&&s.round===s.history.length+1}
function record(s,game){
 assert(canRecord(s),'Round already recorded or set finished');
 assert(game.winner===0||game.winner===1,'Cannot score an unresolved match');
 assert(game.people.length===2,'Only two-person sets supported');
 assert(game.seed===roundSeed(s)&&game.firstSeat===firstSeat(s),'Scored match does not belong to current round');
 const winner=game.winner;
 s.history.push({round:s.round,seed:game.seed,winner,firstSeat:game.firstSeat,turns:game.turn});
 s.wins[winner]++;
 s.complete=s.wins[winner]===2;
 return s;
}
function advance(s){
 assert(!s.complete&&s.history.length===s.round&&s.round<3,'Cannot start next round');
 s.round++;
 return{seed:roundSeed(s),firstSeat:firstSeat(s)};
}
root.OneSeries={VERSION,create,firstSeat,roundSeed,record,advance,canRecord};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.OneSeries;
