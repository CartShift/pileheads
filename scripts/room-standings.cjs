'use strict';
// A small, bounded, server-only aggregate scoped to the existing private room.
// It is not a durable tournament, rating, or cross-room player identity.
function validRound(round){return Number.isSafeInteger(round)&&round>=1}
function fresh(n,round){return {version:1,trackedFrom:round,lastRound:round-1,completedRounds:0,
 seats:Array.from({length:n},(_,seat)=>({seat,points:0,wins:0,lastPlace:null}))}}
function read(g){
 const n=g.people.length,round=g.round??1;
 if(!Number.isInteger(n)||n<2||n>5||!validRound(round))throw Error('invalid room standings context');
 if(g.roomStandings===undefined)return fresh(n,round);
 const s=g.roomStandings;
 if(!s||s.version!==1||!validRound(s.trackedFrom)||!Number.isSafeInteger(s.lastRound)||
  s.lastRound!==round-1&&s.lastRound!==round||
  s.lastRound===round&&g.phase!=='over'||
  s.trackedFrom>s.lastRound+1||s.completedRounds!==s.lastRound-s.trackedFrom+1||
  !Array.isArray(s.seats)||s.seats.length!==n||
  !s.seats.every((x,i)=>x&&x.seat===i&&Number.isSafeInteger(x.points)&&x.points>=0&&x.points<=s.completedRounds*(n-1)&&
   Number.isSafeInteger(x.wins)&&x.wins>=0&&x.wins<=s.completedRounds&&
   (s.completedRounds===0?x.lastPlace===null:Number.isInteger(x.lastPlace)&&x.lastPlace>=1&&x.lastPlace<=n))||
  s.seats.reduce((sum,x)=>sum+x.points,0)!==s.completedRounds*n*(n-1)/2||
  s.seats.reduce((sum,x)=>sum+x.wins,0)!==s.completedRounds||
  (s.completedRounds>0&&new Set(s.seats.map(x=>x.lastPlace)).size!==n))throw Error('invalid room standings');
 // Copy only fields belonging to the score contract.
 return {version:1,trackedFrom:s.trackedFrom,lastRound:s.lastRound,completedRounds:s.completedRounds,
  seats:s.seats.map(({seat,points,wins,lastPlace})=>({seat,points,wins,lastPlace}))}
}
function snapshot(g){
 const s=read(g),round=g.round??1,n=g.people.length;
 if(g.phase!=='over'||s.lastRound===round)return s;
 const order=Array.isArray(g.finishedOrder)?[...g.finishedOrder]:[];
 if(g.loser!==null&&g.loser!==undefined)order.push(g.loser);
 if(order.length!==n||new Set(order).size!==n||order.some(i=>!Number.isInteger(i)||i<0||i>=n))
  throw Error('invalid round placements');
 order.forEach((seat,index)=>{const entry=s.seats[seat];entry.points+=n-index-1;entry.wins+=index===0?1:0;entry.lastPlace=index+1});
 s.lastRound=round;s.completedRounds++;
 return s;
}
function record(g){g.roomStandings=snapshot(g);return g.roomStandings}
function publicStandings(g){
 const s=snapshot(g);
 return {trackedFrom:s.trackedFrom,completedRounds:s.completedRounds,seats:s.seats};
}
module.exports={record,publicStandings};
