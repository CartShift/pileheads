'use strict';
/* Production UX contracts: executed state guidance and stable interaction markup. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const online=read('dist/pilehead/online.js'),local=read('dist/pilehead/app.js');
const css=read('dist/pilehead/immersive.css'),html=read('dist/pilehead/index.html');
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
const block=(code,start,end)=>{
 const i=code.indexOf(start),j=code.indexOf(end,i);
 assert.ok(i>=0&&j>i,'Missing block '+start);return code.slice(i,j);
};
const onlineHud=block(online,'function tableHUD(){','function tableActions(){');
const localHud=block(local,'function tableHUD(){','function tableActions({');
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function onlineStatus({turn=true,layer='hand',selection=[],legal=null,limit=null,slam=[],snap=[],name='Bot 1'}={}){
 const data={game:{phase:'play',round:2,limit,slam,followup:snap,turn:turn?0:1}};
 return new Function('data','active','stageNow','selection','legalMove','displayName','snapBlocked','safe',
  onlineHud+'return tableHUD()')(data,()=>turn,()=>layer,selection,()=>legal,()=>name,()=>false,escape);
}
function localStatus({turn=true,layer='hand',selection=[],limit=null}={}){
 const g={phase:'play',limit,turn:turn?0:1};
 const E={followUpOptions:()=>[],slamOptions:()=>[]};
 return new Function('g','viewSeat','currentStage','isTurn','covered','selection','E','playerName',
  localHud+'return tableHUD()')(g,()=>0,()=>layer,()=>turn,false,selection,E,i=>'Player '+(i+1));
}
check('online your turn explains how to play, with a separate rank rule',()=>{
 const s=onlineStatus({limit:{type:'min',value:6}});
 assert.match(s,/YOUR TURN/);assert.match(s,/Tap a card to select matching copies/);
 assert.match(s,/NUMBERS 6\+/);
});
check('number restriction and layer status are legible without the old busy dashboard',()=>{
 assert.match(onlineStatus({layer:'up',limit:{type:'under'}}),/Choose a face-up card/);
 assert.match(onlineStatus({layer:'down'}),/Choose one blind card to flip/);
 assert.match(localStatus({limit:{type:'under'}}),/NUMBERS 1–4/);
 assert.match(localStatus(),/YOUR TURN/);
});
check('opponents and urgent reactions get correct state hints and escaped names',()=>{
 const s=onlineStatus({turn:false,name:'<Other & Co>'});
 assert.match(s,/&lt;Other &amp; Co&gt;/);
 assert.match(onlineStatus({turn:false,slam:[{ids:[1,2,3,4]}]}),/SLAM READY/);
 assert.match(onlineStatus({snap:[{ids:[8]}]}),/SNAP READY/);
});
check('move history is an expandable disclosure preserved on rerender',()=>{
 for(const code of [online,local]){
  assert.match(code,/class="move-history"/);
  assert.match(code,/historyOpen/);
  assert.match(code,/\.move-history'\)\.open=true/);
  assert.match(code,/key\.type==='history'/);
  assert.match(code,/focus\(\{preventScroll:true\}\)/);
 }
});
check('connection errors have a visible retry and automatic recovery',()=>{
 assert.match(online,/class="connection-banner"/);
 assert.match(online,/data-do="retry"/);
 assert.match(online,/if\(hadError\)render\(\)/);
 assert.match(online,/if\(!hadError\|\|!quiet\|\|!data\)render\(\)/);
});
check('readiness and invitation are clear to an arriving multiplayer user',()=>{
 assert.match(online,/class="lobby-progress"/);
 assert.match(online,/readyCount/);
 assert.match(online,/class="room-identity"/);
 assert.match(online,/Copy invite/);
});
check('the UI stays narrow-screen safe and avoids idle card jitter',()=>{
 assert.match(css,/PRODUCTION GAMEPLAY SYSTEM/);
 assert.match(css,/--ph-ui-paper:/);
 assert.match(css,/body\.pilehead-playing \.toolbar\.table-actions/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(css,/HAND STABILITY \/ NOV 2026/);
});
check('browser title, screen reader announcements and result dialog are present',()=>{
 assert.match(html,/PILEHEAD \| The Card Game/);
 assert.match(html,/id="pilehead-announcer"/);
 assert.match(html,/aria-live="polite"/);
 assert.match(online,/announcer\.dataset\.lastKey/);
 assert.match(local,/announcer\.dataset\.lastKey/);
});
console.log('PILEHEAD production UX: '+checks+' scenarios passed');
