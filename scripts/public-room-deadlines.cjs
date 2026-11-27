'use strict';
// Server-side casual public-room deadlines. No client time, no artificial
// win/placement, no ranked penalties. Private and local games are untouched.
const MS=Object.freeze({setup:90000,turn:45000,dump:30000,counter:30000,intermission:60000});
function context(g){
 if(g?.publicMatch!==true||g.tournamentWithdrawal)return null;
 const round=g.round??1;
 if(g.phase==='setup')return {kind:'setup',seat:null,key:round+':setup'};
 if(g.phase==='over')return round>=g.roundLimit?null:{kind:'intermission',seat:null,key:round+':intermission'};
 if(g.phase!=='play')return null;
 const kind=g.pendingDump?'dump':g.pendingCounter?'counter':'turn',seat=g.pendingDump?.seat??g.pendingCounter?.seat??g.turn;
 if(!Number.isInteger(seat)||seat<0||seat>=g.people.length)throw Error('invalid deadline actor');
 return {kind,seat,key:[round,kind,seat,g.moves].join(':')};
}
function deadline(g){
 const c=context(g),d=g?.publicDeadline;
 return c&&d&&d.key===c.key&&d.kind===c.kind&&d.seat===c.seat&&Number.isSafeInteger(d.expiresAt)&&d.expiresAt>0?d:null;
}
function advance(previous,next,now=Date.now()){
 if(next.publicMatch!==true)return;
 const c=context(next);
 if(!c){delete next.publicDeadline;return}
 const old=deadline(previous);
 next.publicDeadline=old&&old.key===c.key?{...old}:{...c,expiresAt:now+MS[c.kind]};
}
function expired(g,now=Date.now()){
 const d=deadline(g);return d&&now>=d.expiresAt?d:null;
}
function withdraw(g,now=Date.now()){
 const d=expired(g,now);if(!d)return false;
 g.tournamentWithdrawal={seat:d.seat??0,reason:'deadline',deadlineKind:d.kind};
 g.rematchReady=Array.from({length:g.humanCount??g.people.length},()=>false);
 delete g.publicDeadline;
 return true;
}
function projection(g,now=Date.now()){
 const d=deadline(g);return d?{kind:d.kind,seat:d.seat,expiresAt:d.expiresAt,remainingMs:Math.max(0,d.expiresAt-now)}:null;
}
module.exports={MS,context,deadline,advance,expired,withdraw,projection};
