'use strict';
const core=require('../scripts/commerce-admin.cjs');
function createHandler({env=process.env,store=core.createStore}={}){
 return async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const send=(status,body)=>res.status(status).json(body);
  const c=core.adminConfig(env);
  if(!c)return send(404,{error:'disabled'});
  if(req.method!=='POST')return send(405,{error:'method'});
  if(req.headers.origin!==c.origin)return send(403,{error:'origin'});
  if(!core.authorized(req.headers.authorization,c.token))return send(401,{error:'unauthorized'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'json_required'});
  let b;
  try{const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(!raw||Buffer.byteLength(raw)>2048)return send(400,{error:'invalid_body'});b=JSON.parse(raw);}
  catch{return send(400,{error:'invalid_body'});}
  if(!core.validate(b))return send(400,{error:'invalid_request'});
  try{
   const db=store(c.dbUrl);
   if(b.action==='overview')return send(200,{overview:await db.overview()});
   if(b.action==='orders'){const rows=await db.orders(b.filter,b.offset);return send(200,{orders:rows.slice(0,25),hasMore:rows.length>25});}
   const ok=await (b.action==='advance'?db.advance(b):db.adjust(b));
   return send(ok?200:409,ok?{ok:true}:{error:'state_conflict'});
  }catch(error){return send(['22012','23505','23503','23514'].includes(error?.code)?409:503,{error:'operation_unavailable'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
