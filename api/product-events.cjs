'use strict';
// Opt-in, first-party product measurement. Not a game-authority endpoint.
const EVENTS = new Set(['landing_view','catalog_view','lobby_view','deck_selected','round_started','round_completed','rematch_requested','invite_copied']);
const GAME_EVENTS = new Set(['round_started','round_completed','rematch_requested','invite_copied']);
const DECKS = new Set(['characters','original']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (Object.keys(input).some(k => !['id','event','mode','deck'].includes(k))) return null;
  if (typeof input.id !== 'string' || !UUID.test(input.id) || !EVENTS.has(input.event)) return null;
  const game = GAME_EVENTS.has(input.event);
  if (game && !['local','online'].includes(input.mode)) return null;
  if (!game && input.mode !== undefined) return null;
  if (input.event === 'invite_copied' && input.mode !== 'online') return null;
  if ((game || input.event === 'deck_selected') ? !DECKS.has(input.deck) : input.deck !== undefined) return null;
  return {id:input.id.toLowerCase(),event:input.event,mode:input.mode??null,deck:input.deck??null};
}
function createLimiter(max=180, now=Date.now) {
  let window=-1, count=0;
  return () => {
    const minute=Math.floor(now()/60000);
    if (minute!==window) {window=minute;count=0;}
    return ++count<=max;
  };
}
function reply(res,status,body) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(body));
}
function createHandler({enabled,origin,write,allow=createLimiter()}) {
  return async (req,res) => {
    if (req.method==='GET') return reply(res,200,{enabled:Boolean(enabled && origin)});
    if (req.method!=='POST') {res.setHeader('Allow','GET, POST');return reply(res,405,{ok:false});}
    if (!enabled || !origin) return reply(res,503,{ok:false});
    if (req.headers.origin!==origin || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site']!=='same-origin'))
      return reply(res,403,{ok:false});
    if (String(req.headers['content-type']||'').split(';')[0].trim()!=='application/json') return reply(res,415,{ok:false});
    if (!allow()) return reply(res,429,{ok:false});
    if (Number(req.headers['content-length'])>1024) return reply(res,413,{ok:false});
    let bytes=0;const chunks=[];
    try {
      for await(const chunk of req) {
        const buffer=Buffer.from(chunk);bytes+=buffer.length;
        if(bytes>1024) return reply(res,413,{ok:false});
        chunks.push(buffer);
      }
      let input;
      try {input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply(res,400,{ok:false});}
      const event=validateEvent(input);
      if(!event)return reply(res,400,{ok:false});
      await write(event);
      return reply(res,202,{ok:true});
    }catch{
      // Never log request bodies, identifiers or database connection details.
      return reply(res,503,{ok:false});
    }
  };
}
function createStore(query) {
  let lastPruneDay='';
  return async event => {
    await query('INSERT INTO stack_product_events(id,event,mode,deck) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[event.id,event.event,event.mode,event.deck]);
    const day=new Date().toISOString().slice(0,10);
    if(lastPruneDay!==day) {
      lastPruneDay=day;
      try {await query("DELETE FROM stack_product_events WHERE received_at < now() - interval '30 days'",[]);}
      catch {lastPruneDay='';}
    }
  };
}
let db;
const store=createStore((sql,args)=>{
  db??=require('@neondatabase/serverless').neon(process.env.PILEHEAD_DATABASE_URL);
  return db.query(sql,args);
});
const handler=createHandler({
  enabled:process.env.STACK_ANALYTICS_ENABLED==='true' && Boolean(process.env.PILEHEAD_DATABASE_URL),
  origin:process.env.STACK_ANALYTICS_ORIGIN,
  write:store
});
module.exports={handler,validateEvent,createLimiter,createHandler,createStore};
