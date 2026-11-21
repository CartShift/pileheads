/* STACK 3D BETA V2: cinematic table composition only.
 * All game controls, card buttons, room authority and move validation remain
 * in the existing app.js / online.js. This adapter only places live DOM.
 */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app || !document.body.classList.contains('stack-3d-beta')) return;
  let scheduled = false, lastTable = null;
  const moved = ['.pitch','.online-room-tools','.pilehead-table-hud','.toolbar.table-actions','.move-history','.pilehead-effect-note','.pilehead-selected-effect'];
  function portraitSvg(seed, bot) {
    const hue = [32,194,305,174,18][seed%5];
    if (bot) return '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="20" y="25" width="60" height="52" rx="20" fill="#e7f5ff" stroke="#121521" stroke-width="5"/><rect x="28" y="34" width="44" height="30" rx="12" fill="#101d2a"/><ellipse cx="40" cy="48" rx="5" ry="7" fill="#24d9fa"/><ellipse cx="60" cy="48" rx="5" ry="7" fill="#24d9fa"/><path d="M42 57q8 6 16 0" fill="none" stroke="#24d9fa" stroke-width="3"/><path d="M50 25V17" stroke="#18232f" stroke-width="5"/><circle cx="50" cy="14" r="5" fill="#ffc936"/><rect x="12" y="45" width="8" height="16" rx="4" fill="#f2d6a3"/><rect x="80" y="45" width="8" height="16" rx="4" fill="#f2d6a3"/></svg>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M7 100Q8 67 35 68h30q30 2 30 32Z" fill="hsl('+hue+' 69% 36%)"/><circle cx="50" cy="45" r="29" fill="#eeb98e"/><path d="M18 44Q11 7 51 10q36-4 33 36-8-14-12-21-18 18-53 19" fill="'+(seed%2?'#3a2526':'#241c26')+'"/><path d="M30 45h13m14 0h13" stroke="#30242a" stroke-width="5" stroke-linecap="round"/><path d="M40 63q10 7 20 0" stroke="#964a42" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M25 57q3 15 12 18M75 57q-3 15-12 18" stroke="#b37b5b" stroke-width="2" fill="none"/></svg>';
  }
  function avatar(seed, bot, label) {
    const span=document.createElement('span');
    span.className='stack-beta-portrait '+(bot?'is-bot':'is-human')+' portrait-'+(seed%5);
    span.setAttribute('aria-label', bot?'Bot avatar':(label||'Player')+' avatar');
    span.setAttribute('role','img');
    span.innerHTML=portraitSvg(seed,bot);
    return span;
  }
  function insertPlayers(table) {
    const opponents=Array.from(table.querySelectorAll('.opponents > .opponent'));
    table.dataset.stackOpponents=String(opponents.length);
    opponents.forEach((op,index) => {
      if (op.querySelector('.stack-beta-portrait')) return;
      const text=(op.querySelector('strong')?.textContent||'Player').trim();
      const bot=/\bbot\b/i.test(text)||op.classList.contains('is-bot');
      const name=op.querySelector('strong');
      const av=avatar(index+1,bot,text); op.insertBefore(av,name||op.firstChild);
      const counter=document.createElement('span');
      counter.className='stack-beta-opponent-count';
      const small=op.querySelector('small')?.textContent||'';
      const match=small.match(/(\d+)\s+in hand/);
      counter.textContent=match?match[1]:'';
      counter.title=small;
      if(name)name.insertAdjacentElement('afterend',counter);
    });
    let me=table.querySelector('.stack-beta-me');
    if(!me) {
      me=document.createElement('div');
      me.className='stack-beta-me';
      me.setAttribute('aria-hidden','true');
      const image=avatar(0,false,'You');
      const name=document.createElement('strong'); name.textContent='YOU';
      const count=document.createElement('span');count.className='stack-beta-me-count';
      me.append(image,name,count);table.appendChild(me);
    }
    const hand=table.querySelector('.hand-area .area-label b');
    const handCount=hand?hand.textContent.replace(/\D/g,''):null;
    const count=me.querySelector('.stack-beta-me-count');
    if(count)count.textContent=handCount||'0';
  }
  function decorate(table) {
    if(!table.querySelector('.stack-beta-room-light')){
      const bg=document.createElement('div');bg.className='stack-beta-room-light';bg.setAttribute('aria-hidden','true');table.prepend(bg);
    }
    if(!table.querySelector('.stack-beta-table-glow')){
      const el=document.createElement('div');el.className='stack-beta-table-glow';el.setAttribute('aria-hidden','true');table.prepend(el);
    }
    if(!table.querySelector('.stack-beta-side-intro')){
      const intro=document.createElement('aside');intro.className='stack-beta-side-intro';
      const crown=document.createElement('span');crown.className='stack-beta-crown';crown.textContent='♛';
      const copy=document.createElement('div');
      const main=document.createElement('strong');main.textContent='DON’T BE THE PILEHEAD!';
      const extra=document.createElement('small');extra.textContent='Be the first to get rid of your cards. The last player left loses.';
      copy.append(main,extra);intro.append(crown,copy);table.append(intro);
    }
    if(!table.querySelector('.stack-beta-action-mark')){
      const marker=document.createElement('div');marker.className='stack-beta-action-mark';
      marker.textContent='✦ ONE PILE · ONE LOSER ✦';marker.setAttribute('aria-hidden','true');
      table.appendChild(marker);
    }
  }
  function compose() {
    const table=app.querySelector('.table');
    if(!table) {lastTable=null;return;}
    // The current local/online controller remounts its HTML after a validated action.
    // Reparent the live controls after each render; their existing delegated handlers survive.
    decorate(table);
    const mobile = matchMedia('(max-width:760px)').matches;
    if (mobile) {
      // On phones, the HUD belongs above the tabletop and actions belong OUTSIDE
      // the table's overflow:hidden container. Otherwise position:fixed is clipped
      // and the cards, status, and buttons overlap each other.
      for (const selector of ['.pitch','.online-room-tools','.pilehead-table-hud']) {
        const node=app.querySelector(selector);
        if(node && node.parentElement!==app)app.insertBefore(node,table);
      }
      for (const selector of [
        '.pilehead-effect-note','.pilehead-selected-effect',
        '.toolbar.table-actions','.move-history'
      ]) {
        const node=app.querySelector(selector);
        if(node && node.parentElement!==app)app.appendChild(node);
      }
      const history=app.querySelector('.move-history');
      if(history&&!history.dataset.betaMobileSeen) {
        history.open=false;
        history.dataset.betaMobileSeen='1';
      }
    } else {
      moved.forEach(selector => {
        const node=app.querySelector(selector);
        if(node&&node.parentElement!==table)table.appendChild(node);
      });
      const history=table.querySelector('.move-history');
      if(history)history.open=true;
    }
    insertPlayers(table);
    table.classList.add('stack-beta-composed');
    lastTable=table;
  }
  const observer=new MutationObserver(() => {
    if (scheduled) return;
    scheduled=true;
    requestAnimationFrame(() => {scheduled=false;compose();});
  });
  observer.observe(app,{childList:true,subtree:true});
  requestAnimationFrame(compose);
  // Responsive breakpoint changes must also reparent already-mounted controls.
  window.addEventListener('resize', () => {
    if (scheduled) return;
    scheduled=true;
    requestAnimationFrame(() => {scheduled=false;compose()});
  }, {passive:true});
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();