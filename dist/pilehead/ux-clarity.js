/* STACK UX clarity layer. Presentation-only: never calculates legal moves or reads hidden cards. */
(function(root){'use strict';
const app=document.getElementById('app');
if(!app)return;
let helpOpen=false,practiceDismissed=false;
const rules=[
 ['NUMBERS','Play an equal or higher number than the pile requires. Matching copies can go together.'],
 ['RESET','Any number may be played next. The pile stays.'],
 ['GHOST','Keep the current number rule unchanged.'],
 ['UNDER','The next number must be 1, 2, 3 or 4.'],
 ['SKIP','The next player misses a turn.'],
 ['BURN','Clear the entire pile. You play again.'],
 ['DUMP','Choose any active opponent to receive the existing pile. You play again.'],
 ['SLAM','Four matching number cards burn the pile. A legal SLAM can interrupt a turn.'],
 ['SNAP','A number freshly drawn after your play can be placed immediately if it matches. Only the newly drawn card qualifies.']
];
function rulesHTML(){
 return '<details class="stack-rules-peek"'+(helpOpen?' open':'')+'><summary aria-label="Quick card rules">? Rules</summary>'+
  '<div class="stack-rules-pop" role="group" aria-label="Quick rules"><strong>QUICK RULES</strong>'+
  rules.map(([name,info])=>'<p><b>'+name+'</b> '+info+'</p>').join('')+'</div></details>';
}
function coachFor({active,moveNo,stage}){
 if(stage==='up')return ['The face-up row','The draw stock and your hand are empty. Now play your exposed cards, or take the pile.'];
 if(stage==='down')return ['Blind cards','Flip one card without looking. If it cannot be played, you collect the pile.'];
 if(moveNo===0)return ['Your first play','Choose a card in your hand, then tap the pile or Play. Matching copies may be selected together.'];
 if(!active)return ['Watch the table','Your opponent is playing. Notice how the number restriction changes after each move.'];
 if(moveNo<4)return ['Read the pile','Play the required number or higher. Every action card is playable regardless of the number rule.'];
 return ['Keep the pressure on','Pay attention to the pile, save useful cards, and try to finish your hand.'];
}
function sync({practice=false,active=false,moveNo=0,stage=null}={}){
 const table=app.querySelector('.table');if(!table)return;
 const hud=app.querySelector('.pilehead-table-hud');
 // Reposition existing contextual feedback before the table; no duplicate live regions.
 const feedback=app.querySelector('.pilehead-selected-effect,.pilehead-effect-note');
 if(feedback)table.before(feedback);
 if(hud){
  const peek=document.createElement('span');peek.innerHTML=rulesHTML();
  const control=peek.firstElementChild;
  control.addEventListener('toggle',()=>{helpOpen=control.open});
  hud.appendChild(control);
 }
 if(practice&&!practiceDismissed&&stage&&moveNo<10){
  const [title,message]=coachFor({active,moveNo,stage});
  const node=document.createElement('section');node.className='stack-practice-coach';
  node.setAttribute('aria-label','Practice lesson');
  node.innerHTML='<div><span>PRACTICE ROUND</span><strong></strong><p></p></div>'+
   '<button type="button" data-stack-dismiss-coach aria-label="Hide practice guidance">×</button>';
  node.querySelector('strong').textContent=title;
  node.querySelector('p').textContent=message;
  table.before(node);
 }
}
app.addEventListener('click',e=>{
 const button=e.target.closest('[data-stack-dismiss-coach]');if(!button)return;
 practiceDismissed=true;button.closest('.stack-practice-coach')?.remove();
});
function resetPractice(){practiceDismissed=false}
root.StackUX={sync,resetPractice};
})(window);
