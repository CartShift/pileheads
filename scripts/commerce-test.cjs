'use strict';
const crypto=require('node:crypto');
const {merchandiseQuote,catalog}=require('./commerce-core.cjs');
const SKU=catalog[0].sku;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION=/^cs_test_[a-zA-Z0-9]+$/;
const PAYMENT=/^pi_[a-zA-Z0-9]+$/;
function config(env){
 if(env.VERCEL_ENV!=='preview'||env.PILEHEAD_COMMERCE_TEST_ENABLED!=='1'||!/^sk_test_[a-zA-Z0-9]+$/.test(env.PILEHEAD_COMMERCE_TEST_STRIPE_KEY||'')||!/^whsec_[a-zA-Z0-9]+$/.test(env.PILEHEAD_COMMERCE_TEST_WEBHOOK_SECRET||'')||!env.PILEHEAD_COMMERCE_TEST_DATABASE_URL)return null;
 try{
  const origin=new URL(env.PILEHEAD_COMMERCE_TEST_ORIGIN);
  if(origin.protocol!=='https:'||!origin.hostname.endsWith('.vercel.app')||origin.origin!==env.PILEHEAD_COMMERCE_TEST_ORIGIN||origin.username||origin.password||origin.port)return null;
  if(origin.hostname!==env.VERCEL_URL)return null;
  const db=new URL(env.PILEHEAD_COMMERCE_TEST_DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(db.protocol)||!db.password||!db.username||!db.hostname||db.pathname!=='/pileheads_commerce_test')return null;
  for(const key of ['PILEHEAD_DATABASE_URL','PILEHEAD_PLAYER_DATABASE_URL','PILEHEAD_GROWTH_DATABASE_URL'])if(env[key]){
   const other=new URL(env[key]);if(other.hostname===db.hostname)return null;
  }
  return {origin:origin.origin,key:env.PILEHEAD_COMMERCE_TEST_STRIPE_KEY,secret:env.PILEHEAD_COMMERCE_TEST_WEBHOOK_SECRET,dbUrl:env.PILEHEAD_COMMERCE_TEST_DATABASE_URL};
 }catch{return null;}
}
function quote(quantity){return merchandiseQuote([{sku:SKU,quantity}],[{sku:SKU,active:true,unitMinor:1500,currency:'EUR',available:10}]);}
function createParams(order,origin){
 return new URLSearchParams({
  mode:'payment','payment_method_types[0]':'card',
  'line_items[0][price_data][currency]':'eur',
  'line_items[0][price_data][product_data][name]':'TEST ONLY - PILEHEADS Original Deck',
  'line_items[0][price_data][unit_amount]':'1500','line_items[0][quantity]':String(order.quantity),
  'shipping_address_collection[allowed_countries][0]':'DE',
  'metadata[pileheads_test_order]':order.id,
  client_reference_id:order.id,
  success_url:origin+'/shop?test=return',cancel_url:origin+'/shop?test=cancel'
 });
}
function verifySignature(raw,header,secret,now=Date.now()){
 if(!Buffer.isBuffer(raw)||typeof header!=='string'||header.length>4096||typeof secret!=='string')return false;
 const pairs=header.split(',').map(p=>p.split('='));
 const timestamps=pairs.filter(p=>p[0]==='t').map(p=>p[1]);
 if(timestamps.length!==1||!/^\d{1,12}$/.test(timestamps[0])||Math.abs(now/1000-Number(timestamps[0]))>300)return false;
 const expected=crypto.createHmac('sha256',secret).update(timestamps[0]+'.').update(raw).digest();
 return pairs.some(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/.test(v||'')&&crypto.timingSafeEqual(expected,Buffer.from(v,'hex')));
}
function checkoutUrl(session){
 if(session?.livemode!==false||!SESSION.test(session.id||'')||typeof session.url!=='string')throw Error('invalid_session');
 const url=new URL(session.url);
 if(url.origin!=='https://checkout.stripe.com'||url.username||url.password)throw Error('invalid_url');
 return url.href;
}
function matchesOrder(session,order){
 return session?.livemode===false&&session.mode==='payment'&&SESSION.test(session.id||'')&&session.client_reference_id===order.id&&session.metadata?.pileheads_test_order===order.id&&session.currency==='eur'&&session.amount_total===order.amount_minor&&session.amount_subtotal===order.amount_minor;
}
function transition(event,session,order){
 if(event.livemode!==false||!/^evt_[a-zA-Z0-9]+$/.test(event.id||'')||!matchesOrder(session,order)||session.id!==order.session_id||event.data?.object?.id!==session.id)throw Error('invalid_event');
 if(event.type==='checkout.session.completed'&&session.status==='complete'&&session.payment_status==='paid'&&PAYMENT.test(session.payment_intent||''))return {state:'paid',payment:session.payment_intent};
 if(event.type==='checkout.session.expired'&&session.status==='expired'&&session.payment_status==='unpaid')return {state:'expired',payment:null};
 throw Error('unconfirmed_payment');
}
async function stripe(c,path,params,idempotency,fetcher=fetch){
 const headers={Authorization:'Bearer '+c.key};
 if(params)headers['Content-Type']='application/x-www-form-urlencoded';
 if(idempotency)headers['Idempotency-Key']=idempotency;
 const response=await fetcher('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',headers,body:params,signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw Error('provider_unavailable');
 return response.json();
}
module.exports={config,quote,createParams,verifySignature,checkoutUrl,matchesOrder,transition,stripe,UUID,SESSION};
