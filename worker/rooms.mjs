/* Authoritative rooms. Engine is the exact v5 solo/simulator engine. */
export function roomService(Engine){
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const fail=(code,status=400)=>{throw Object.assign(Error(code),{status})};
 const cleanName=n=>typeof n==='string'?n.trim().slice(0,28):'';
 const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
 function view(row,user){const s=JSON.parse(row.state),me=s.members.findIndex(m=>m.id===user);if(me<0)fail('not_member',403);const g=s.game;return {id:row.id,revision:row.revision,status:s.status,mode:s.mode,capacity:s.capacity,host:me===0,me,expiresAt:row.expires_at,turn:s.turn,round:g?Math.min(8,Math.floor(g.moveNo/g.players.length)+1):0,board:g?.board||[],rowSize:g?.rowSize||Engine.MODES[s.mode].rowSize,members:s.members.map((m,i)=>({name:m.name,points:g?.players[i]?.points||0,wild:g?.players[i]?.wild??1,swap:g?.players[i]?.swap??1,handCount:3,...(i===me&&g?{hand:g.players[i].hand}:{})})),events:s.events||[]}}
 async function read(env,id){const row=await env.DB.prepare('SELECT * FROM spark_rooms WHERE id = ?').bind(id).first();if(!row)fail('room_not_found',404);if(row.expires_at<Date.now())fail('room_expired',410);return row}
 return async function(request,env){try{
  const user=request.headers.get('oai-authenticated-user-id');if(!user)fail('sign_in_required',401);if(!env.DB)fail('rooms_unavailable',503);
  const url=new URL(request.url),match=url.pathname.match(/^\/api\/rooms(?:\/([a-f0-9-]{36})(?:\/(join|start|move|close))?)?$/);if(!match)fail('not_found',404);
  if(request.method==='GET'&&match[1]&&!match[2])return json(view(await read(env,match[1]),user));
  if(request.method!=='POST')fail('method_not_allowed',405);
  if(request.headers.get('Origin')!==url.origin)fail('invalid_origin',403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('json_required',415);
  if(Number(request.headers.get('Content-Length')||0)>4096)fail('request_too_large',413);
  const raw=await request.text();if(raw.length>4096)fail('request_too_large',413);let body;try{body=JSON.parse(raw)}catch{fail('invalid_json')}
  if(!body||typeof body!=='object'||Array.isArray(body))fail('invalid_json');
  if(!match[1]){
   if(!Engine.MODES[body.mode]||![2,3].includes(body.capacity)||!cleanName(body.name))fail('invalid_setup');
   const recent=await env.DB.prepare('SELECT COUNT(*) AS n FROM spark_rooms WHERE host_id = ? AND expires_at > ?').bind(user,Date.now()).first();if(recent.n>=10)fail('room_limit',429);
   const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),expires=Date.now()+86400000;
   const state={status:'lobby',mode:body.mode,capacity:body.capacity,members:[{id:user,name:cleanName(body.name)}],turn:0,events:[],requests:[]};
   await env.DB.prepare('INSERT INTO spark_rooms (id,host_id,invite_hash,state,revision,expires_at) VALUES (?,?,?,?,0,?)').bind(id,user,await sha(token),JSON.stringify(state),expires).run();
   return json({...view({id,state:JSON.stringify(state),revision:0,expires_at:expires},user),inviteToken:token},201);
  }
  const row=await read(env,match[1]),s=JSON.parse(row.state),action=match[2],me=s.members.findIndex(m=>m.id===user);
  if(action==='join'){
   if(me>=0)return json(view(row,user));
   if(typeof body.token!=='string'||body.token.length>200||await sha(body.token)!==row.invite_hash)fail('invalid_invite',403);
   if(s.status!=='lobby'||s.members.length>=s.capacity)fail('room_full',409);if(!cleanName(body.name))fail('name_required');s.members.push({id:user,name:cleanName(body.name)});
  }else{
   if(me<0)fail('not_member',403);
   if(typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))fail('invalid_request_id');
   if(s.requests.some(r=>r.id===body.requestId&&r.user===user))return json(view(row,user));
   if(body.revision!==row.revision)fail('stale_revision',409);
   if(action==='start'){
    if(me!==0)fail('host_only',403);if(s.status!=='lobby'||s.members.length!==s.capacity)fail('waiting_for_players',409);
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];s.game=Engine.create(s.capacity-1,s.mode,seed);s.game.players.forEach((p,i)=>{p.name=s.members[i].name;p.strategy='human'});s.status='playing';s.turn=0;
   }else if(action==='move'){
    if(s.status!=='playing'||me!==s.turn)fail('not_your_turn',409);
    const g=s.game,m=body.move;if(!Engine.valid(g,me,m))fail('illegal_move');
    const event=Engine.act(g,me,m);g.currentMoves.push(event);
    if(g.moveNo%g.players.length===0){g.round++;g.log.push({round:g.round,moves:g.currentMoves});g.currentMoves=[]}
    s.events.push({id:g.moveNo,player:me,kind:event.kind,color:event.color,pos:event.pos,swapUsed:event.swapUsed,swapPos:event.swapPos,score:event.score,waves:event.waves,shiftCount:event.shiftCount,scoreBefore:event.scoreBefore,before:event.before,after:event.after,steps:event.steps});s.events=s.events.slice(-24);
    if(g.moveNo===8*g.players.length){g.over=true;s.status='finished'}else s.turn=(s.turn+1)%g.players.length;
   }else if(action==='close'){if(me!==0)fail('host_only',403);s.status='closed'}else fail('not_found',404);
   s.requests.push({id:body.requestId,user});s.requests=s.requests.slice(-32);
  }
  const changed=await env.DB.prepare('UPDATE spark_rooms SET state = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify(s),row.id,row.revision).run();if(!changed.meta.changes)fail('stale_revision',409);
  return json(view({...row,state:JSON.stringify(s),revision:row.revision+1},user));
 }catch(e){return json({error:e.status?e.message:'server_error'},e.status||500)}};
}
