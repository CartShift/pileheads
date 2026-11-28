'use strict';
// INTEGRATION TEST ONLY. Preload with node -r to replace Neon while running the
// actual Render server, real engine, API and WebSocket hub in two browsers.
// This fixture is never imported by production code.
const Module=require('node:module'),crypto=require('node:crypto');
const E=require('../../dist/pilehead/engine.js');
const rooms=new Map(),members=new Map(),buckets=new Map();
const originalRandomInt=crypto.randomInt;
crypto.randomInt=(...args)=>args.length===1?0:originalRandomInt(...args); // deterministic opening seat only
function duplicate(){const error=Error('unique constraint');error.code='23505';throw error}
function rigSnap(g){
 // Put a number in host's first hand position and one copy atop draw stock.
 const hand=g.people[0].hand,stock=g.stock;
 let card=hand.find(x=>x.kind==='number');
 if(!card){
  const index=stock.findIndex(x=>x.kind==='number');
  if(index<0)throw Error('No numeric card to stage');
  card=stock[index];stock[index]=hand[0];hand[0]=card;
 }
 if(hand[0].id!==card.id){const i=hand.indexOf(card);[hand[0],hand[i]]=[hand[i],hand[0]]}
 const zones=[stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 const slot=zones.find(z=>z.some(x=>x.id!==card.id&&x.kind==='number'&&x.rank===card.rank));
 if(!slot)throw Error('No matching copy to stage');
 const i=slot.findIndex(x=>x.id!==card.id&&x.kind==='number'&&x.rank===card.rank);
 const last=stock.length-1;
 if(slot===stock){[slot[i],stock[last]]=[stock[last],slot[i]]}
 else{const old=stock[last];stock[last]=slot[i];slot[i]=old}
 E.invariant(g);
}
async function query(sql,args=[]){
 if(sql==='SELECT 1 AS ready')return[{ready:1}];
 if(sql.startsWith('INSERT INTO pilehead_rate_limits')){
  const hits=(buckets.get(args[0])||0)+1;buckets.set(args[0],hits);return[{hits}];
 }
 if(sql.startsWith('WITH created AS')){
  const [code,capacity,raw,name,token]=args;if(rooms.has(code))duplicate();
  const state=JSON.parse(raw);rigSnap(state);
  const r={code,capacity,revision:0,status:'lobby',state,expires_at:new Date(Date.now()+86400000)};
  rooms.set(code,r);members.set(code,[{seat:0,display_name:name,token_hash:token,last_seen_at:new Date(),is_away:false}]);
  return[structuredClone(r)];
 }
 if(sql.startsWith('WITH joinable AS')){
  const [code,name,token,capacity]=args,list=members.get(code)||[],r=rooms.get(code);
  if(!r||r.status!=='lobby'||r.expires_at<=new Date())return[];
  const seat=Array.from({length:capacity},(_,i)=>i).find(i=>!list.some(m=>m.seat===i));
  if(seat===undefined)return[];
  list.push({seat,display_name:name,token_hash:token,last_seen_at:new Date(),is_away:false});
  members.set(code,list);return[{...structuredClone(r),joined_seat:seat}];
 }
 if(sql.startsWith('SELECT r.code,r.capacity')){
  const r=rooms.get(args[0]);if(!r)return[];
  const member=(members.get(args[0])||[]).find(m=>m.token_hash===args[1]);
  return[{...structuredClone(r),authenticated_seat:member?.seat??null}];
 }
 if(sql.startsWith('SELECT code,capacity'))return rooms.has(args[0])?[structuredClone(rooms.get(args[0]))]:[];
 if(sql.startsWith("SELECT code,revision,state->'reactionEvents'")){
   return (args[0]||[]).filter(code=>rooms.has(code)).map(code=>{
    const r=rooms.get(code);
    return {code,revision:r.revision,reaction_events:structuredClone(r.state.reactionEvents||[]),expires_at:r.expires_at};
   });
  }
  if(sql.startsWith("SELECT revision,state->'reactionEvents'")){
  const r=rooms.get(args[0]);return r?[{revision:r.revision,reaction_events:structuredClone(r.state.reactionEvents||[]),expires_at:r.expires_at}]:[];
 }
 if(sql.startsWith('SELECT seat,display_name')){
  return (members.get(args[0])||[]).map(m=>structuredClone(m));
 }
 if(sql.startsWith('SELECT seat FROM pilehead_members')&&sql.includes('token_hash')){
  return(members.get(args[0])||[]).filter(m=>m.token_hash===args[1]).map(m=>({seat:m.seat}));
 }
 if(sql.startsWith('SELECT seat FROM pilehead_members'))return(members.get(args[0])||[]).map(m=>({seat:m.seat}));
 if(sql.startsWith('UPDATE pilehead_members SET last_seen_at')){
  const [code,seat,away]=args,m=(members.get(code)||[]).find(x=>x.seat===seat);
  if(m){m.last_seen_at=new Date();m.is_away=Boolean(away)}return[];
 }
 if(sql.startsWith('UPDATE pilehead_rooms')&&sql.includes("state=jsonb_set(state,'{reactionEvents}'")){
  const [code,payload]=args,r=rooms.get(code);if(!r)return[];
  r.state.reactionEvents=[...(r.state.reactionEvents||[]),JSON.parse(payload)].slice(-24);
  return[{code}];
 }
 if(sql.startsWith('UPDATE pilehead_rooms')){
  const [raw,status,code,revision]=args,r=rooms.get(code);
  if(!r||r.revision!==revision)return[];
  const state=JSON.parse(raw);state.reactionEvents=r.state.reactionEvents||[];
  r.state=state;r.status=status;r.revision++;
  return[structuredClone(r)];
 }
 throw Error('Unexpected mock query: '+sql.slice(0,120));
}
const original=Module._load;
Module._load=function(spec,...args){
 if(spec==='@neondatabase/serverless')return{neon:()=>({query})};
 return original.call(this,spec,...args);
};
process.on('message',message=>{
 // Test-only external revision with unchanged legal moves; the changed
 // nickname lets the browser prove that the new snapshot was rendered.
 if(message?.type==='selection-revision'){
  const r=rooms.get(message.code),m=(members.get(message.code)||[]).find(x=>x.seat===1);
  if(r&&m){m.display_name='Guest synced';r.revision++;}
  return;
 }
 if(message?.type!=='finish')return;
 const r=rooms.get(message.code);
 if(r){
  r.state.phase='over';r.state.loser=1;r.state.finishedOrder=[0];r.state.pendingDump=null;
  r.status='finished';r.revision++;
 }
 process.send?.({type:'finished',code:message.code,revision:r?.revision??-1});
});
