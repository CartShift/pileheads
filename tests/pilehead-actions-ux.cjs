'use strict';
/* Real action-state tests for mobile/table UI, independent of CSS snapshots. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const online=read('dist/pilehead/online.js'),local=read('dist/pilehead/app.js');
const css=read('dist/pilehead/immersive.css');
function block(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Cannot locate action renderer');
 return source.slice(a,b);
}
const onlineBlock=block(online,'function tableActions(){','function playView(){');
const localBlock=block(local,'function tableActions({','function gameView(){');
function renderOnline({phase='play',turn=true,selection=[10],legal=null,take=false,slam=[],snap=[],busy=false}={}){
 const game={phase,legal:take?[{type:'take'}]:[],pile:[{rank:7},{rank:8},{rank:9}],slam,followup:snap,turn:turn?0:1};
 const data={game,me:0},current=()=>({hand:[{id:10,action:null}]});
 return new Function('data','active','legalMove','selection','busy','current','snapBlocked','displayName','safe',
   onlineBlock+'return tableActions();')(
    data,()=>turn,()=>legal,selection,busy,current,()=>false,()=>turn?'You':'Bot 1',String
   );
}
function renderLocal({phase='play',turn=true,selection=[10],legal=[],pick=false,slams=[],snap=[],stage='hand',mode='bots'}={}){
 const game={phase,slamOpen:false,pile:[{rank:7},{rank:8},{rank:9}],turn:turn?0:1};
 const props={turn,legal,pick,slams,snap,stage};
 return new Function('g','selection','getPlayer','mode','playerName','isTurn','covered','viewSeat','currentStage','E',
   localBlock+'return tableActions('+JSON.stringify(props)+');')(
    game,selection,()=>({hand:[{id:10,action:null,kind:'number',rank:7}],up:[]}),mode,i=>'Player '+i,
    ()=>turn,false,()=>0,()=>stage,{options:()=>legal}
   );
}
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
check('Classic has no idle dock; online remains unchanged',()=>{
 assert.equal(renderLocal({selection:[]}), '', 'Classic should not show unavailable controls');
 const onlineHtml=renderOnline({selection:[]});
 assert.match(onlineHtml,/Select a card/);
 assert.doesNotMatch(onlineHtml,/<button/);
});
check('online legal selection reveals a specific enabled play action',()=>{
 const html=renderOnline({legal:{type:'play',source:'hand',ids:[10]}});
 assert.match(html,/Play 1 card/);assert.doesNotMatch(html,/<button[^>]+disabled/);
});
check('local legal selection reveals Play and bad selection explains itself',()=>{
 assert.match(renderLocal({legal:[{type:'play',source:'hand',ids:[10]}]}),/data-do="play"/);
 const invalid=renderLocal();assert.equal(invalid,'','bad selection must not generate redundant guidance');
});
check('a valid Take action is visible in either mode',()=>{
 assert.match(renderOnline({selection:[],take:true}),/Take pile · 3/);
 assert.match(renderLocal({selection:[],pick:true}),/Take pile · 3/);
});
check('SLAM remains available outside your turn in both modes',()=>{
 assert.match(renderOnline({turn:false,slam:[{ids:[1,2,3,4]}]}),/SLAM · 4 cards/);
 assert.match(renderLocal({turn:false,slams:[{ids:[1,2,3,4]}]}),/SLAM · 4 cards/);
});
check('SNAP button remains available outside turn without an artificial priority delay',()=>{
 const ready=renderOnline({turn:false,snap:[{ids:[7]}],selection:[]});
 assert.match(ready,/data-do="snap"/);
 assert.match(ready,/SNAP · matching draw/);
 const selected=renderOnline({turn:false,snap:[{ids:[7]}],selection:[7],
  legal:{type:'followup',source:'hand',ids:[7]}});
 assert.match(selected,/data-do="play"/);
 assert.match(selected,/data-do="snap"/);
 assert.doesNotMatch(renderOnline({turn:false,snap:[]}),/data-do="snap"/);
 assert.match(renderLocal({turn:false,snap:[{ids:[7]}]}),/SNAP · matching draw/);
});
check('same-room replay and local replay remain actionable',()=>{
 assert.match(renderOnline({phase:'over'}),/data-do="rematch"/);
 assert.match(renderLocal({phase:'over'}),/data-do="rematch"/);
});
check('mobile rules are content-sized and protect card visibility',()=>{
 assert.match(css,/PHONE TABLE · NOVEMBER 2026/);
 assert.match(css,/grid-template-rows:auto auto auto auto/);
 assert.match(css,/\.table-actions/);
 assert.match(css,/\.hand-scroll-arrow/);
 assert.match(css,/\.hand-controls/);
});
check('no always-on move explanation; selected action guidance remains available',()=>{
 assert.match(online,/selectedEffect\(\)\+tableActions\(\)/);
 assert.doesNotMatch(online,/lastEffect\(\)/);
 assert.doesNotMatch(local,/lastEffect\(\)/);
 assert.match(local,/tableActions\(\{turn,legal,pick,slams,snap,stage\}\)/);
});
console.log('PILEHEAD contextual UX: '+checks+' state checks passed');
