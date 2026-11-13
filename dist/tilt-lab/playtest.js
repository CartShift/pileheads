/* TILT Mechanics Lab: entirely local, opt-in playtest observations.
   Does not record or export hidden card faces, opponent hands, or per-turn logs. */
(function(root){
'use strict';
const KEY='tilt-mechanics-lab-observations-v1',LIMIT=120;
const zero=()=>({version:1,records:[]});
function load(storage){
 try{const raw=storage.getItem(KEY);if(!raw)return zero();
 const value=JSON.parse(raw);if(value.version!==1||!Array.isArray(value.records))return zero();
 return{version:1,records:value.records.filter(x=>x&&typeof x.id==='string').slice(-LIMIT)}}
 catch(e){return zero()}
}
function write(storage,data){storage.setItem(KEY,JSON.stringify({version:1,records:data.records.slice(-LIMIT)}))}
function snapshot(g){
 const k=['press','counter','collision','match','stops','exchanges','pickups','pressOffers','pressChosen',
 'pressDeclined','controlFlips','twinLaneOffers','collisionOffers','collisionDeclined'];
 const result={};
 for(const name of k)result[name]=Number.isFinite(g.stats[name])?g.stats[name]:0;
 return result;
}
function record(storage,{game,runId,playAs='bot',startedAt=null,finishedAt=Date.now()}){
 if(!game||!(game.winner!==null||game.draw))return null;
 if(typeof runId!=='string'||!runId)return null;
 const data=load(storage),existing=data.records.find(x=>x.id===runId);
 if(existing)return existing;
 const end=Number.isFinite(finishedAt)?finishedAt:Date.now(),begin=Number.isFinite(startedAt)?startedAt:null;
 const item={id:runId,recordVersion:1,mode:game.mode,players:game.people.length,
   sessionType:playAs==='hotseat'?'human-hotseat':'mixed-human-bots',
   winner:game.winner,draw:Boolean(game.draw),seed:game.seed,
   turns:game.turn,actions:game.actions,stats:snapshot(game),
   startedAt:begin?new Date(begin).toISOString():null,finishedAt:new Date(end).toISOString(),
   wallSeconds:begin?Math.max(0,Math.round((end-begin)/1000)):null,
   replay:'not-recorded',notes:''};
 data.records.push(item);write(storage,data);return item;
}
function updateNotes(storage,id,{replay,notes}={}){
 const data=load(storage),item=data.records.find(x=>x.id===id);
 if(!item)return null;
 const accepted=['not-recorded','requested-unprompted','requested-after-question','declined','unsure'];
 item.replay=accepted.includes(replay)?replay:'not-recorded';
 item.notes=String(notes||'').slice(0,3000);
 write(storage,data);return item;
}
function clear(storage){storage.removeItem(KEY)}
function exportData(storage,now=new Date().toISOString()){
 const data=load(storage);
 return JSON.stringify({format:'TILT playtest observations',schema:1,exportedAt:now,
  notices:['Bot simulations do not count as evidence of human enjoyment.',
   'Wall-clock time includes pauses; use a stopwatch for real physical session duration.',
   'Replay responses are self-reported and are not proof of spontaneous behavior.'],
  ...data},null,2);
}
root.TiltPlaytest={KEY,load,record,updateNotes,clear,exportData};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.TiltPlaytest;
