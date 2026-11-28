'use strict';
const core=require('../scripts/commerce-test.cjs');
const {createStore}=require('../scripts/commerce-test-store.cjs');
function createHandler({env=process.env,store=createStore,provider=core.stripe}={}){
 return async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,body)=>res.status(status).json(body);
  const c=core.config(env);
  if(req.method==='GET')return send(200,{enabled:!!c,...(c?{unitMinor:1500,currency:'EUR'}:{})});
  if(!c)return send(404,{error:'disabled'});
  if(req.method!=='POST')return send(405,{error:'method'});
  if(req.headers.origin!==c.origin)return send(403,{error:'origin'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'json_required'});
  try{
   const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
   if(!raw||Buffer.byteLength(raw)>1024)return send(400,{error:'invalid_body'});
   const b=JSON.parse(raw);
   if(!b||!core.UUID.test(b.id||''))return send(400,{error:'invalid_request'});
   const db=store(c.dbUrl);
   if(b.action==='status'&&Object.keys(b).sort().join(',')==='action,id'){
    const order=await db.get(b.id);return send(order?200:404,order?{state:order.state}:{error:'unknown_order'});
   }
   if(b.action!=='checkout'||Object.keys(b).sort().join(',')!=='action,id,quantity')return send(400,{error:'invalid_request'});
   try{core.quote(b.quantity)}catch{return send(400,{error:'invalid_quantity'});}
   const order=await db.start(b.id,b.quantity);
   if(!order)return send(409,{error:'retry_or_limit'});
   const session=order.session_id?await provider(c,'checkout/sessions/'+order.session_id):await provider(c,'checkout/sessions',core.createParams(order,c.origin),'pileheads-test-'+order.id);
   if(!core.matchesOrder(session,order)||session.status!=='open'||(order.session_id&&order.session_id!==session.id))return send(409,{error:'session_unavailable'});
   const url=core.checkoutUrl(session);
   if(!await db.attach(order.id,session.id))return send(409,{error:'session_conflict'});
   return send(200,{url});
  }catch{return send(503,{error:'unavailable'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
