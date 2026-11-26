/* PILEHEADS deck themes: a local visual preference, never part of game state or room messages.
 * One selector works in the tabletop, gallery and print preview.
 */
(function(root){'use strict';
const KEY='stack-deck-theme-v1';
const OPTIONS=Object.freeze([
  {id:'refined',label:'PILEHEADS Illustrated V3',detail:'Current no-logo character artwork'},
  {id:'geometry',label:'PILEHEADS Original',detail:'Geometric artwork'},
  {id:'characters',label:'PILEHEADS Illustrated (compact)',detail:'Compact-resolution current artwork'},
  {id:'studio',label:'PILEHEADS Studio',detail:'Minimal vector artwork'}
]);
const allowed=new Set(OPTIONS.map(t=>t.id));
function normalized(value){return allowed.has(value)?value:'refined';}
function saved(){
 try{return normalized(root.localStorage?.getItem(KEY));}
 catch{return 'refined';}
}
let active=saved();
function apply(value,notify=true){
 const next=normalized(value),changed=active!==next;
 active=next;
 if(root.document?.documentElement)root.document.documentElement.dataset.stackDeckTheme=active;
 try{root.localStorage?.setItem(KEY,active)}catch{}
 root.document?.querySelectorAll('[data-stack-deck-select]').forEach(select=>{select.value=active});
 if(changed&&notify)root.dispatchEvent(new Event('stack-deck-theme-change'));
 return active;
}
function picker(){
 const label=document.createElement('label');
 label.className='stack-deck-picker';label.htmlFor='stack-deck-style';
 const title=document.createElement('span');title.className='stack-deck-picker-label';title.textContent='Deck style';
 const select=document.createElement('select');
 select.id='stack-deck-style';select.dataset.stackDeckSelect='1';select.setAttribute('aria-label','Card deck illustration theme');
 for(const t of OPTIONS){
  const option=document.createElement('option');option.value=t.id;option.textContent=t.label;option.title=t.detail;
  select.appendChild(option);
 }
 select.value=active;
 select.addEventListener('change',()=>apply(select.value));
 label.append(title,select);
 return label;
}
function mount(){
 if(!root.document||document.getElementById('stack-deck-style'))return;
 const gameTop=document.querySelector('.layout > header.top');
 const galleryNav=document.querySelector('#gallery-theme-control')||document.querySelector('header nav');
 const printControls=document.querySelector('header .controls');
 const target=gameTop||printControls||galleryNav;
 if(!target)return;
 const el=picker();
 if(gameTop)target.insertBefore(el,gameTop.querySelector('.links')||null);
 else target.appendChild(el);
}
root.StackDeckThemes=Object.freeze({get:()=>active,set:apply,options:OPTIONS,key:KEY,mount});
apply(active,false);
if(root.document){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
root.addEventListener?.('storage',event=>{
 if(event.key===KEY)apply(event.newValue);
});
})(typeof window!=='undefined'?window:globalThis);
