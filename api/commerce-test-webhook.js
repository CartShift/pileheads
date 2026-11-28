'use strict';
const core=require('../scripts/commerce-test.cjs');
const {createStore}=require('../scripts/commerce-test-store.cjs');
async function rawBody(req){
 if(Buffer.isBuffer(req.body)){if(req.body.length>262144)throw Error('too_large');return req.body;}
 if(req.body!==undefined)throw Error('body_already_parsed');
 const chunks=[];let size=0;
 for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>262144)throw Error('too_large');chunks.push(bytes);}
 return Buffer.concat(chunks);
}
function createHandler({env=process.env,store=createStore,provider=core.stripe,read=rawBody}={}){
 return async function(req,res){
  res.setHeader('Cache-Control','no-store');
  const send=(status,body)=>res.status(status).json(body);
  const c=core.config(env);if(!c)return send(404,{error:'disabled'});
  if(req.method!=='POST')return send(405,{error:'method'});
  let event;
  try{const raw=await read(req);if(!core.verifySignature(raw,req.headers['stripe-signature'],c.secret))return send(400,{error:'signature'});event=JSON.parse(raw.toString('utf8'));}
  catch{return send(400,{error:'invalid_event'});}
  if(event?.livemode!==false)return send(400,{error:'mode'});
  if(!['checkout.session.completed','checkout.session.expired'].includes(event.type))return send(200,{received:true});
  const obj=event.data?.object;
  const id=obj?.metadata?.pileheads_test_order;
  // Ignore other sandbox applications sharing the endpoint.
  if(!id)return send(200,{received:true});
  if(!core.UUID.test(id)||!core.SESSION.test(obj.id||''))return send(400,{error:'invalid_reference'});
  try{
   const db=store(c.dbUrl),order=await db.get(id);
   if(!order||order.session_id!==obj.id)return send(503,{error:'order_not_ready'});
   const session=await provider(c,'checkout/sessions/'+obj.id);
   const next=core.transition(event,session,order);
   if(!await db.settle(event,order,next))return send(409,{error:'state_conflict'});
   return send(200,{received:true});
  }catch{return send(503,{error:'unavailable'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
module.exports.config={api:{bodyParser:false}};
