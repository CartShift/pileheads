/* STACK Tabletop Preview V3. Dedicated composition, zero rule duplication.
 * Repositions the existing local/online DOM; never creates simulated cards,
 * changes moves, or intercepts authoritative multiplayer actions.
 */
(() => {
  'use strict';
  const app=document.getElementById('app');
  if (!app || !document.body.classList.contains('stack-tabletop-v3')) return;
  let pending=false;
  const previous=document.querySelector('[data-tabletop-legacy]');
  if(previous && (location.search.includes('room=') || location.search.includes('online=')))
    previous.href='3d-beta.html'+location.search;
  const avatarSvg='<svg viewBox="0 0 100 100" aria-hidden="true">' +
   '<rect x="23" y="28" width="54" height="48" rx="18" fill="#e9f7f7" stroke="#182234" stroke-width="5"/>' +
   '<rect x="30" y="37" width="40" height="29" rx="11" fill="#12273a"/>' +
   '<ellipse cx="42" cy="50" rx="5" ry="7" fill="#49e5e9"/>' +
   '<ellipse cx="58" cy="50" rx="5" ry="7" fill="#49e5e9"/>' +
   '<path d="M43 61q7 5 14 0" fill="none" stroke="#5be2e2" stroke-width="3" stroke-linecap="round"/>' +
   '<path d="M50 28V17" stroke="#1d293e" stroke-width="5"/>' +
   '<circle cx="50" cy="16" r="5" fill="#ffdd63"/>' +
   '<rect x="13" y="42" width="10" height="18" rx="5" fill="#e6f5f9"/>' +
   '<rect x="77" y="42" width="10" height="18" rx="5" fill="#e6f5f9"/>' +
  '</svg>';
  function botPortrait(index){
    const palettes=[
      {eye:'#4be3ee',face:'#e6f8fd',mouth:'#5be2e2',trim:'#ffdb58'},
      {eye:'#ffd45c',face:'#ffe9d9',mouth:'#ffb470',trim:'#7ed9ff'},
      {eye:'#d9a4ff',face:'#f3e8ff',mouth:'#d9a4ff',trim:'#f69fc4'},
      {eye:'#8ef0b6',face:'#ecfff0',mouth:'#8ef0b6',trim:'#ffd559'}
    ];
    const tone=palettes[index%palettes.length];
    const accessories=[
      '<path d="M23 38q2-23 27-24 26 1 28 24" fill="none" stroke="'+tone.trim+'" stroke-width="5"/>',
      '<path d="M29 30q21-15 42 0" fill="none" stroke="'+tone.trim+'" stroke-width="6" stroke-linecap="round"/><path d="M26 33h48" stroke="#212e3b" stroke-width="3"/>',
      '<circle cx="25" cy="31" r="5" fill="'+tone.trim+'"/><circle cx="75" cy="31" r="5" fill="'+tone.trim+'"/>',
      '<path d="M35 23h30" stroke="'+tone.trim+'" stroke-width="6" stroke-linecap="round"/>'
    ];
    return avatarSvg
      .replaceAll('#49e5e9',tone.eye)
      .replaceAll('#5be2e2',tone.mouth)
      .replaceAll('#e9f7f7',tone.face)
      .replace('</svg>',accessories[index%accessories.length]+'</svg>');
  }
  function playerName(element){
    return (element.querySelector('strong')?.textContent||'Player').replace(/\s*·\s*(TURN|OUT).*/,'').trim();
  }
  function decorateOpponents(table){
    const group=table.querySelector('.opponents');
    if (!group) return;
    const players=[...group.querySelectorAll('.opponent')];
    group.dataset.seats=String(players.length);
    players.forEach((player, index)=>{
      if(player.querySelector('.v3-avatar'))return;
      const label=playerName(player);
      const bot=/^bot\b/i.test(label);
      const circle=document.createElement('span');
      circle.className='v3-avatar '+(bot?'v3-robot':'v3-person');
      circle.setAttribute('role','img');
      circle.setAttribute('aria-label',bot?'Robot avatar':label+' avatar');
      if(bot)circle.innerHTML=botPortrait(index);
      else {
        const initials=document.createElement('span');
        initials.textContent=label.trim().split(/\s+/).slice(0,2).map(w=>w.charAt(0)).join('').toUpperCase();
        circle.appendChild(initials);
      }
      const heading=player.querySelector('strong');
      player.insertBefore(circle,heading||player.firstChild);
      const counter=document.createElement('span');
      counter.className='v3-seat-count';
      const source=player.querySelector('small')?.textContent||'';
      const match=source.match(/(\d+)\s+in hand/);
      if(match)counter.textContent=match[1];
      counter.setAttribute('aria-hidden','true');
      circle.appendChild(counter);
    });
  }
  function create(tag, cls){
    const node=document.createElement(tag);node.className=cls;return node;
  }
  function relocate(node, parent){
    if(node&&node.parentElement!==parent)parent.appendChild(node);
  }
  function compose(){
    const table=app.querySelector('section.table');
    if(!table)return;
    const root=table.closest('.online-layout')||app;
    const action=root.querySelector('.toolbar.table-actions');
    let shell=root.querySelector(':scope > .v3-shell');
    if(!shell){
      shell=create('div','v3-shell');
      root.insertBefore(shell,table);
    }
    let top=shell.querySelector(':scope > .v3-topline');
    if(!top){top=create('div','v3-topline');shell.appendChild(top);}
    for(const selector of ['.pitch','.online-room-tools','.pilehead-table-hud']){
      const node=root.querySelector(selector);
      relocate(node,top);
    }
    let room=shell.querySelector(':scope > .v3-room');
    if(!room){
      room=create('div','v3-room');
      shell.appendChild(room);
      const ambient=create('div','v3-ambient');ambient.setAttribute('aria-hidden','true');room.appendChild(ambient);
    }
    relocate(table,room);
    let info=room.querySelector(':scope > .v3-info');
    if(!info){
      info=create('aside','v3-info');
      info.setAttribute('aria-label','Game activity');
      const motto=create('div','v3-motto');
      const crown=create('span','v3-crown');crown.textContent='♛';crown.setAttribute('aria-hidden','true');
      const words=create('div','v3-words');
      const headline=create('strong','');headline.textContent='ONE PILE. ONE LOSER.';
      const subtitle=create('small','');subtitle.textContent='Get rid of every card. Don’t be the Pilehead.';
      words.append(headline,subtitle);motto.append(crown,words);info.append(motto);
      room.append(info);
    }
    let controls=room.querySelector(':scope > .v3-controls');
    if(!controls){controls=create('div','v3-controls');room.appendChild(controls);}
    relocate(action,controls);
    const history=root.querySelector('.move-history');
    if(history && history.parentElement!==info)info.appendChild(history);
    let foot=shell.querySelector(':scope > .v3-foot');
    if(!foot){foot=create('div','v3-foot');shell.appendChild(foot);}
    for(const selector of ['.pilehead-effect-note','.pilehead-selected-effect','.message','.pilehead-bridge-hint']){
      const node=root.querySelector(selector);
      relocate(node,foot);
    }
    decorateOpponents(table);
    table.classList.add('v3-ready');
    document.body.classList.add('v3-composed');
  }
  function schedule(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{pending=false;compose();});
  }
  const observer=new MutationObserver(schedule);
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  schedule();
})();