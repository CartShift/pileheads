(function(){'use strict';
const E=globalThis.TiltLab,$=id=>document.getElementById(id),KEY='tilt-mechanics-lab-v01';
const QUERY=new URLSearchParams(location.search),VALID=['cross','forge'];
let kind=QUERY.get('concept')==='forge'?'forge':'cross',selected=null,covered=false,busy=false,epoch=0,timer=null,session=null;
function create(k,seed){return E.create({kind:k,seed,players:2})}
function initial(){
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!saved||saved.version!==1||saved.games?.cross?.version!=='tilt-mechanics-lab-v01'||saved.games?.forge?.version!=='tilt-mechanics-lab-v01')throw Error('Missing');
  session=saved;
  if(!VALID.includes(QUERY.get('concept')))kind=VALID.includes(saved.kind)?saved.kind:'cross';
 }catch{
  session={version:1,kind,games:{cross:create('cross',20261111),forge:create('forge',20261111)},
    options:{cross:{opponents:'bot',botStyle:'planner'},forge:{opponents:'bot',botStyle:'planner'}},
    messages:{cross:'Tap a card to choose which danger pile to play.',forge:'Tap a card to strike or prepare it for a later escape.'}};
 }
 session.options=session.options||{};
 for(const k of VALID)session.options[k]=session.options[k]||{opponents:'bot',botStyle:'planner'};
 session.messages=session.messages||{cross:'Choose a card.',forge:'Choose a card.'};
 if(QUERY.get('new')==='1'){
  const n=QUERY.get('seed')&&/^\d+$/.test(QUERY.get('seed'))?Number(QUERY.get('seed')):20261111;
  session.games[kind]=create(kind,n);
  session.messages[kind]='Fresh game. Start with one card.';
 }
 sync();
 save();
 if(opt().opponents==='hotseat'&&!E.ended(g()))showCover();else{render();queueBot()}
}
function g(){return session.games[kind]}
function opt(){return session.options[kind]}
function save(){session.kind=kind;try{localStorage.setItem(KEY,JSON.stringify(session))}catch(error){console.warn('Save unavailable',error)}}
function label(s){return opt().opponents==='bot'?(s===0?'You':'Bot'):'Player '+(s+1)}
function turn(){return E.active(g())}
function focus(){return opt().opponents==='bot'?0:turn()}
function canPlay(){return !covered&&!busy&&!E.ended(g())&&(opt().opponents==='hotseat'||turn()===0)}
function cardHtml(c,attrs='',cls=''){
 return '<button type="button" class="card '+cls+'" '+attrs+' aria-label="Card crest '+c.crest+' shade '+c.shade+(c.pivot?', link':'')+'">'+
   '<span class="labels"><span>CREST</span><span>SHADE</span></span>'+
   '<span class="crest"><span>↑</span> '+c.crest+'</span>'+
   '<span class="mid">'+(c.pivot?'↔ LINK':'◇ DUAL')+'</span>'+
   '<span class="shade"><span>↓</span> '+c.shade+'</span></button>';
}
function emptyCard(){return'<div class="empty">Empty</div>'}
function head(){
 const a=g(),p=a.players;
 $('tabCross').setAttribute('aria-selected',String(kind==='cross'));
 $('tabForge').setAttribute('aria-selected',String(kind==='forge'));
 $('status').textContent=E.ended(a)?(a.drawn?'Turn-limit draw':label(a.winner)+' wins!'):
    'Turn '+(a.turn+1)+' · '+label(turn())+' · '+(kind==='cross'?'CROSS':'FORGE');
 $('stock').textContent=String(a.stock.length);
 $('ashes').textContent=String(a.burned.length);
 $('handLabel').innerHTML='<span>'+label(focus())+' · '+p[focus()].hand.length+' cards in hand</span>'+
   '<small> · Opponent: '+p[1-focus()].hand.length+' in hand</small>';
}
function panel(title,items,subtitle,footer){
 const top=items.at(-1);
 return '<article class="stack"><h3>'+title+'</h3><p>'+subtitle+'</p>'+
  '<div class="stack-content">'+(top?cardHtml(top,'disabled'):emptyCard())+
  '<span class="pill">'+items.length+' cards</span></div>'+
  '<p>'+footer+'</p></article>';
}
function board(){
 const a=g(),p=a.players[focus()];
 if(kind==='cross'){
  const force=a.force?'NEXT MOVE: '+(a.force==='sun'?'SUN ↑':'MOON ↓'):'Either pile is available';
  $('board').innerHTML='<div class="stage">'+
   panel('SUN · RISING ↑',a.piles.sun,'Crest played ≥ previous top SHADE',force)+
   panel('MOON · FALLING ↓',a.piles.moon,'Shade played ≤ previous top CREST',force)+
   '</div>';
 }else{
  const current=a.pile.at(-1)?.card,threshold=current?current.shade:'any value';
  const mine=p.prepared,other=a.players[1-focus()].prepared;
  $('board').innerHTML='<div class="single-main">'+
   panel('THE DANGER PILE',a.pile.map(x=>x.card),'To strike: new CREST ≥ '+threshold,
   'Six cards crack the pile. Prepared release needs SHADE ≥ threshold minus 3.')+
   '</div><div class="single-stage">'+
   '<section class="own-plan"><h3>'+label(focus())+' · Prepared card</h3>'+
    (mine?cardHtml(mine,'disabled'):'<p class="none">No card prepared</p>')+'</section>'+
   '<section class="opp-plan"><h3>'+label(1-focus())+' · Prepared card</h3>'+
    (other?cardHtml(other,'disabled'):'<p class="none">No card prepared</p>')+'</section>'+
   '</div>';
 }
}
function ruleTexts(){
 if(kind==='cross'){
 $('ruleTitle').textContent='CROSS · 60-second rules';
 $('rules').innerHTML='<ol>'+
  '<li>Each card has two numbers: <strong>CREST ↑</strong> and <strong>SHADE ↓</strong>. Both matter, and this is not a regular card deck.</li>'+
  '<li>Play one card to the <strong>SUN</strong> if its CREST is at least the SUN top card’s SHADE; or to the <strong>MOON</strong> if its SHADE is at most the MOON top card’s CREST. Empty piles accept anything.</li>'+
  '<li>The <strong>LINK ↔</strong> symbol forces the next player to use the opposite pile.</li>'+
  '<li>If you cannot play legally, <strong>pick up</strong> a chosen pile; a LINK restriction may limit which one. Clearing a pile creates a fresh opening.</li>'+
  '<li>When any pile reaches <strong>3 cards</strong>, all 3 are cleared to the ashes. Refill your hand to 4 while the stock lasts. After the stock runs out, the first player to empty their hand wins.</li></ol>'+
  '<p><strong>Test question:</strong> Does choosing where to play create real traps or just arithmetic?</p>';
 }else{
 $('ruleTitle').textContent='FORGE · 60-second rules';
 $('rules').innerHTML='<ol>'+
  '<li>One shared danger pile. To play normally, your card’s <strong>CREST ↑ must be at least the top card’s SHADE ↓</strong>.</li>'+
  '<li>Instead of striking, you may <strong>PREPARE</strong> one card face up in front of yourself, using a whole turn. Your opponent can see it.</li>'+
  '<li>On a later turn, you may <strong>RELEASE</strong> your prepared card if its <strong>SHADE ≥ the current threshold minus 3</strong> (minimum 1). It enters the pile and can rescue a weak hand.</li>'+
  '<li>If you cannot strike or release, you may <strong>CRACK</strong>: take the top card into your hand, discard the rest of the pile and reset the danger.</li>'+
  '<li>The pile also cracks automatically at <strong>6 cards</strong>. Draw back up to 4 while the stock lasts. Your prepared card still counts against winning. First to empty both hand and prepared card after the stock is gone wins.</li></ol>'+
  '<p><strong>Test question:</strong> Does spending a turn to prepare a visible rescue make a satisfying long-term decision?</p>';
 }
}
function options(){
 const a=g(),seat=turn(),moves=canPlay()?E.legal(a,seat):[];
 const only=selected===null?moves.filter(x=>x.index===undefined):moves.filter(x=>x.index===selected||x.index===undefined);
 let title='STEP 1: Select one card from your hand';
 if(E.ended(a))title='Match over. Start a fresh match to compare.';
 else if(covered)title='Pass the device safely';
 else if(opt().opponents==='bot'&&seat===1)title='Bot deciding';
 else if(selected!==null)title='STEP 2: Choose what to do with this card';
 $('actionTitle').textContent=title;
 $('instruction').textContent=E.ended(a)?(a.drawn?'Match ended at the safety turn limit.':'Game over: '+label(a.winner)+' shed all cards!'):
  covered?'Pass the device to '+label(seat):
  opt().opponents==='bot'&&seat===1?'The bot is deciding from its private cards.':
  selected===null?'STEP 1: Choose a card in your hand.':
  'STEP 2: Choose a legal move below. The two printed values have different roles.';
 const items=only.map(x=>{
 let caption=x.type;
 if(x.type==='play'&&kind==='cross')caption='PLAY TO '+(x.lane==='sun'?'SUN ↑':'MOON ↓');
 if(x.type==='play'&&kind==='forge')caption='STRIKE · send CREST to the pile';
 if(x.type==='prepare')caption='PREPARE · visible rescue later';
 if(x.type==='release')caption='RELEASE · use prepared SHADE';
 if(x.type==='pickup')caption=kind==='cross'?'PICK UP '+x.lane.toUpperCase()+' ('+a.piles[x.lane].length+' cards)':'CRACK · take top card / clear pile';
 return'<button data-type="'+x.type+'" data-index="'+(x.index===undefined?'':x.index)+'" data-lane="'+(x.lane||'')+'" class="'+(x.type==='play'||x.type==='release'?'best':'')+'">'+caption+'</button>';
 });
 $('actions').innerHTML=items.join('')||'<span style="color:#cadaD2;font-size:12px">'+
  (canPlay()?'Choose a card above to see its legal destinations.':'Moves are unavailable right now.')+'</span>';
}
function render(){
 head();board();ruleTexts();
 const available=canPlay(),p=g().players[focus()];
 if(selected!==null&&selected>=p.hand.length)selected=null;
 $('hand').innerHTML=available?p.hand.map((c,i)=>cardHtml(c,'data-index="'+i+'"',i===selected?'selected':'')).join(''):
  '<span style="font-size:12px;color:#d5e0d8">Cards hidden during handoff or the opponent’s turn.</span>';
 options();
 $('feedback').textContent=session.messages[kind]||'Try a move.';
 $('history').innerHTML=g().log.slice(-7).reverse().map(e=>
 '<div>Turn '+e.turn+' · '+label(e.seat)+' · '+e.type+
 (e.card?' '+e.card.crest+'/'+e.card.shade:'')+
 (e.lane?' in '+e.lane.toUpperCase():'')+
 (e.spent?' · collected '+e.spent:'')+
 (e.burnedCount?' · cracked '+e.burnedCount+' to ashes':'')+'</div>').join('');
}
function cover(){
 covered=true;$('coverTitle').textContent='Pass to '+label(turn());
 $('cover').style.display='flex';render();
}
function showCover(){cover()}
function after(event){
 selected=null;
 if(event.type==='pickup')session.messages[kind]=label(event.seat)+(kind==='cross'?' collected '+event.spent+' pile cards.':' took '+event.spent+' card and cleared the remainder of the pile.');
 else if(event.type==='prepare')session.messages[kind]=label(event.seat)+' prepared a visible rescue card for a later turn.';
 else if(event.type==='release')session.messages[kind]=label(event.seat)+' released the prepared card using its SHADE value.';
 else session.messages[kind]=label(event.seat)+' played CREST '+event.card.crest+' / SHADE '+event.card.shade+
  (event.card.pivot&&kind==='cross'?'. LINK forces the opposite pile next.':'.');
 if(event.burnedCount)session.messages[kind]+=' The pile cracked and '+event.burnedCount+' cards left play.';
 save();
 if(E.ended(g())){covered=false;$('cover').style.display='none';busy=false;render();return}
 if(opt().opponents==='hotseat'){cover();return}
 render();queueBot();
}
function act(action){
 if(!canPlay())return;
 try{const e=E.move(g(),turn(),action);after(e)}
 catch(error){session.messages[kind]='Move blocked: '+String(error.message);render()}
}
function queueBot(){
 if(opt().opponents!=='bot'||E.ended(g())||turn()!==1||busy)return;
 busy=true;render();const capture=epoch,which=kind;
 timer=setTimeout(()=>{
  if(capture!==epoch||which!==kind||E.ended(g())||turn()!==1){busy=false;return}
  busy=false;
  try{const e=E.move(g(),1,E.choose(g(),1,opt().botStyle));after(e)}
  catch(error){session.messages[kind]='Bot stopped: '+String(error.message);render()}
 },500);
}
function switchTo(next){
 if(!VALID.includes(next)||kind===next)return;
 if(timer!==null)clearTimeout(timer);epoch++;busy=false;selected=null;covered=false;kind=next;
 $('cover').style.display='none';sync();save();
 if(opt().opponents==='hotseat'&&!E.ended(g()))cover();
 else{render();queueBot()}
}
function sync(){
 $('opponents').value=opt().opponents;
 $('botStyle').value=opt().botStyle;
 $('seed').value=String(g().seed);
}
$('tabCross').onclick=()=>switchTo('cross');
$('tabForge').onclick=()=>switchTo('forge');
$('hand').onclick=e=>{
 if(!canPlay())return;
 const node=e.target.closest('[data-index]');if(!node)return;
 selected=Number(node.dataset.index);render();
};
$('actions').onclick=e=>{
 if(!canPlay())return;
 const node=e.target.closest('[data-type]');if(!node)return;
 const type=node.dataset.type;
 if(node.dataset.index&&!Number.isInteger(Number(node.dataset.index)))return;
 const action={type};
 if(node.dataset.index!=='')action.index=Number(node.dataset.index);
 if(node.dataset.lane)action.lane=node.dataset.lane;
 if(['play','prepare'].includes(type)&&selected!==action.index)return;
 act(action);
};
$('reveal').onclick=()=>{covered=false;$('cover').style.display='none';render();queueBot()};
$('newGame').onclick=()=>{
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<0||seed>4294967295){alert('Please enter a valid numeric seed.');return}
 if(timer!==null)clearTimeout(timer);
 epoch++;busy=false;selected=null;covered=false;
 session.options[kind]={opponents:$('opponents').value,botStyle:$('botStyle').value};
 session.games[kind]=create(kind,seed);
 session.messages[kind]='Fresh game. Choose a card in your hand.';
 $('cover').style.display='none';save();
 if(opt().opponents==='hotseat')cover();
 else render();
};
$('export').onclick=()=>{
 const payload={format:'tilt-mechanics-lab-v01',concept:kind,game:g(),options:opt(),generatedAt:new Date().toISOString()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='tilt-'+kind+'-'+g().seed+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
};
initial();
})();