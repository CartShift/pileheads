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
 const game={phase,legal:take?[{type:'take'}]:[],slam,followup:snap,turn:turn?0:1};
 const data={game,me:0},current=()=>({hand:[{id:10,action:null}]});
 return new Function('data','active','legalMove','selection','busy','current','snapBlocked','displayName','safe',
   onlineBlock+'return tableActions();')(
    data,()=>turn,()=>legal,selection,busy,current,()=>false,()=>turn?'You':'Bot 1',String
   );
}
function renderLocal({phase='play',turn=true,selection=[10],legal=[],pick=false,slams=[],snap=[],stage='hand',mode='bots'}={}){
 const game={phase,slamOpen:false,turn:turn?0:1};
 const props={turn,legal,pick,slams,snap,stage};
 return new Function('g','selection','getPlayer','mode','playerName',
   localBlock+'return tableActions('+JSON.stringify(props)+');')(
    game,selection,()=>({hand:[{id:10,action:null}]}),mode,i=>'Player '+i
   );
}
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
check('empty pile offers meaningful instruction, not three disabled buttons',()=>{
 for(const render of [renderOnline,renderLocal]){
  const html=render({selection:[]});assert.match(html,/Select a card/);
  assert.doesNotMatch(html,/<button/);
 }
});
check('online legal selection reveals a specific enabled play action',()=>{
 const html=renderOnline({legal:{type:'play',source:'hand',ids:[10]}});
 assert.match(html,/Play 1 card/);assert.doesNotMatch(html,/<button[^>]+disabled/);
});
check('local legal selection reveals Play and bad selection explains itself',()=>{
 assert.match(renderLocal({legal:[{type:'play',source:'hand',ids:[10]}]}),/data-do="play"/);
 const invalid=renderLocal();assert.match(invalid,/Choose a legal combination/);
 assert.doesNotMatch(invalid,/data-do="play"/);
});
check('a valid Take action is visible in either mode',()=>{
 assert.match(renderOnline({selection:[],take:true}),/data-do="take"/);
 assert.match(renderLocal({selection:[],pick:true}),/data-do="take"/);
});
check('SLAM remains available outside your turn in both modes',()=>{
 assert.match(renderOnline({turn:false,slam:[{ids:[1,2,3,4]}]}),/SLAM · 4 cards/);
 assert.match(renderLocal({turn:false,slams:[{ids:[1,2,3,4]}]}),/SLAM · 4 cards/);
});
check('SNAP remains available outside your turn in both modes',()=>{
 assert.match(renderOnline({turn:false,snap:[{ids:[7]}]}),/SNAP · matching draw/);
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
check('special effect explanation is adjacent to and above actions',()=>{
 for(const src of [online,local])assert.match(src,/\(selectedEffect\(\)\|\|lastEffect\(\)\)\+tableActions\(/);
});
console.log('PILEHEAD contextual UX: '+checks+' state checks passed');
