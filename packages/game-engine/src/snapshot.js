'use strict';
// Trusted local saves only. Never send full state to another online seat.
const SCHEMA_VERSION=1;
module.exports=function createSnapshotCodec({invariant,VERSION}){
 const uint=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
 const requireValid=(ok,message)=>{if(!ok)throw new Error('Invalid local save: '+message)};
 function validate(g){
  requireValid(g&&typeof g==='object','state');
  requireValid([VERSION,'pilehead-1.2.0','pilehead-1.3.0','pilehead-1.4.0','pilehead-1.5.0','pilehead-1.6.0'].includes(g.version),'rules version');
  requireValid(['setup','play','over'].includes(g.phase)&&uint(g.seed)&&uint(g.rng)&&uint(g.moves),'phase or counters');
  requireValid(Array.isArray(g.people)&&g.people.length>=2&&g.people.length<=5,'players');
  const seat=n=>Number.isInteger(n)&&n>=0&&n<g.people.length;
  requireValid(seat(g.turn)&&Array.isArray(g.stock)&&Array.isArray(g.pile)&&Array.isArray(g.ashes)&&Array.isArray(g.events)&&Array.isArray(g.finishedOrder),'zones or turn');
  requireValid(g.people.every((p,i)=>p&&p.seat===i&&typeof p.out==='boolean'&&uint(p.pickups)&&['hand','up','down'].every(k=>Array.isArray(p[k]))),'player state');
  requireValid(g.finishedOrder.every(seat)&&new Set(g.finishedOrder).size===g.finishedOrder.length&&(g.loser===null||seat(g.loser)),'results');
  requireValid(g.limit===null||(g.limit&& (g.limit.type==='under'||(g.limit.type==='min'&&Number.isInteger(g.limit.value)&&g.limit.value>=1&&g.limit.value<=10))),'restriction');
  requireValid(g.pendingDump==null||(seat(g.pendingDump.seat)&&['hand','up','down'].includes(g.pendingDump.source)&&Number.isInteger(g.pendingDump.count)&&g.pendingDump.count>=1&&g.pendingDump.count<=4),'pending DUMP');
  requireValid(g.followUp==null||(seat(g.followUp.seat)&&Number.isInteger(g.followUp.rank)&&Array.isArray(g.followUp.ids)&&g.followUp.ids.every(uint)),'SNAP');
  requireValid(typeof g.slamOpen==='boolean','SLAM flag');
  invariant(g);
  return g;
 }
 function serialize(g){validate(g);return JSON.stringify({schemaVersion:SCHEMA_VERSION,state:g});}
 function restore(serialized){
  requireValid(typeof serialized==='string','expected JSON text');
  const envelope=JSON.parse(serialized);
  requireValid(envelope&&envelope.schemaVersion===SCHEMA_VERSION,'snapshot schema version');
  return validate(envelope.state);
 }
 return {serialize,restore,SNAPSHOT_VERSION:SCHEMA_VERSION};
};
