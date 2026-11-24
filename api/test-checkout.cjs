'use strict';
// Test-mode checkout only. Live keys and live webhook events are rejected.
const crypto=require('node:crypto');
const {hash,limiter}=require('./player.cjs');
const SKU='sandbox-supporter';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validConfig(c){return Boolean(c.enabled&&/^https:\/\/[^/?#]+$/.test(c.origin||'')&&/^sk_test_/.test(c.key||'')&&/^whsec_/.test(c.secret||'')&&/^price_[A-Za-z0-9]+$/.test(c.price||'')&&Number.isSafeInteger(c.amount)&&c.amount>0&&c.amount<=100000&&/^[a-z]{3}$/.test(c.currency||''));}
function verifySignature(raw,header,secret,now=Date.now()){
 if(typeof header!=='string'||header.length>4096||!Buffer.isBuffer(raw))return false;
 const fields=header.split(',').map(v=>v.trim().split('='));
 const times=fields.filter(([k])=>k==='t');
 if(times.length!==1||!/^\d{1,12}$/.test(times[0][1]||''))return false;
 const stamp=times[0][1];if(Math.abs(Math.floor(now/1000)-Number(stamp))>300)return false;
 const expected=crypto.createHmac('sha256',secret).update(stamp+'.').update(raw).digest();
 return fields.some(([k,v])=>k==='v1'&&/^[0-9a-f]{64}$/i.test(v||'')&&crypto.timingSafeEqual(expected,Buffer.from(v,'hex')));
}
function eventAction(event){
 if(!event||event.livemode!==false||!/^evt_[A-Za-z0-9]+$/.test(event.id||''))return null;
 const o=event.data?.object;
 if(!o||o.livemode!==false)return null;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
  if(o.object!=='checkout.session'||o.mode!=='payment'||o.payment_status!=='paid'||!/^cs_test_[A-Za-z0-9]+$/.test(o.id||'')||!/^pi_[A-Za-z0-9]+$/.test(o.payment_intent||'')||!UUID.test(o.metadata?.stack_order||'')||o.client_reference_id!==o.metadata.stack_order||!Number.isSafeInteger(o.amount_total)||! /^[a-z]{3}$/.test(o.currency||''))return null;
  return {kind:'paid',order:o.metadata.stack_order,session:o.id,intent:o.payment_intent,amount:o.amount_total,currency:o.currency};
 }
 if(event.type==='charge.refunded'&&o.object==='charge'&&Number.isSafeInteger(o.amount_refunded)&&o.amount_refunded>0&&/^pi_[A-Za-z0-9]+$/.test(o.payment_intent||''))return {kind:'refund',intent:o.payment_intent};
 if(event.type==='charge.dispute.created'&&o.object==='dispute'&&/^pi_[A-Za-z0-9]+$/.test(o.payment_intent||''))return {kind:'refund',intent:o.payment_intent};
 return null;
}
function reply(res,status,body){res.statusCode=status;res.setHeader('Cache-Control','no-store, private');res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));}
async function read(req,max){let n=0;const parts=[];for await(const chunk of req){const b=Buffer.from(chunk);n+=b.length;if(n>max)throw Object.assign(Error('too_large'),{status:413});parts.push(b);}return Buffer.concat(parts);}
function createStore(query){return {
 account:async digest=>(await query("SELECT account_id FROM stack_account_sessions WHERE token_hash=$1 AND expires_at>now()",[digest]))[0]?.account_id||null,
 create:async(id,account,amount,currency)=>query("INSERT INTO stack_test_orders(id,account_id,amount,currency) VALUES($1,$2,$3,$4)",[id,account,amount,currency]),
 paid:async a=>query("UPDATE stack_test_orders SET paid_at=COALESCE(paid_at,now()),stripe_session=$2,payment_intent=$3 WHERE id=$1 AND amount=$4 AND currency=$5 AND (stripe_session IS NULL OR stripe_session=$2) AND (payment_intent IS NULL OR payment_intent=$3) RETURNING id",[a.order,a.session,a.intent,a.amount,a.currency]),
 refund:async intent=>query("INSERT INTO stack_test_refunds(payment_intent) VALUES($1) ON CONFLICT DO NOTHING",[intent])
};}
async function stripeCheckout(c,order,request=fetch){
 const body=new URLSearchParams({mode:'payment','payment_method_types[0]':'card','line_items[0][price]':c.price,'line_items[0][quantity]':'1',client_reference_id:order,'metadata[stack_order]':order,success_url:c.origin+'/account?checkout=returned',cancel_url:c.origin+'/account?checkout=cancelled'});
 const r=await request('https://api.stripe.com/v1/checkout/sessions',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+c.key,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':order},body});
 if(!r.ok)throw Error('checkout_failed');
 const s=await r.json(),u=new URL(s.url);
 if(s.livemode!==false||!/^cs_test_/.test(s.id||'')||u.origin!=='https://checkout.stripe.com')throw Error('invalid_checkout');
 return u.href;
}
function createHandler({config,store,checkout=stripeCheckout,allow=limiter(60)}){
 const enabled=validConfig(config);
 return async(req,res,url)=>{
  const hook=url.pathname==='/api/checkout/webhook';
  if(!hook&&req.method==='GET')return reply(res,200,{enabled});
  if(!enabled)return reply(res,503,{ok:false});
  if(req.method!=='POST')return reply(res,405,{ok:false});
  try{
   if(hook){
    const raw=await read(req,128*1024);
    if(!verifySignature(raw,req.headers['stripe-signature'],config.secret))return reply(res,400,{ok:false});
    let event;try{event=JSON.parse(raw);}catch{return reply(res,400,{ok:false});}
    if(event.livemode!==false)return reply(res,400,{ok:false});
    const action=eventAction(event);
    if(action?.kind==='paid')await store.paid(action);
    if(action?.kind==='refund')await store.refund(action.intent);
    return reply(res,200,{ok:true});
   }
   if(req.headers.origin!==config.origin||req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')return reply(res,403,{ok:false});
   if(!allow())return reply(res,429,{ok:false});
   if(String(req.headers['content-type']||'').split(';')[0]!=='application/json')return reply(res,415,{ok:false});
   const raw=await read(req,256);
   let b;try{b=JSON.parse(raw);}catch{return reply(res,400,{ok:false});}
   if(!b||Object.keys(b).length!==1||b.product!==SKU)return reply(res,400,{ok:false});
   const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('__Host-stack_account='));
   const token=cookie.length===1?cookie[0].slice('__Host-stack_account='.length):'';
   const account=/^[A-Za-z0-9_-]{43}$/.test(token)?await store.account(hash(token)):null;
   if(!account)return reply(res,401,{ok:false});
   const order=crypto.randomUUID();
   await store.create(order,account,config.amount,config.currency);
   const checkoutUrl=await checkout(config,order);
   return reply(res,200,{url:checkoutUrl});
  }catch(e){return reply(res,e.status===413?413:503,{ok:false});}
 };
}
let db;
const store=createStore((sql,args)=>{db??=require('@neondatabase/serverless').neon(process.env.PILEHEAD_DATABASE_URL);return db.query(sql,args);});
const config={enabled:process.env.STACK_TEST_CHECKOUT_ENABLED==='true'&&process.env.STACK_ACCOUNT_ENABLED==='true'&&Boolean(process.env.PILEHEAD_DATABASE_URL),origin:process.env.STACK_PLAYER_ORIGIN,key:process.env.STACK_STRIPE_TEST_KEY,secret:process.env.STACK_STRIPE_TEST_WEBHOOK_SECRET,price:process.env.STACK_STRIPE_TEST_PRICE,amount:Number(process.env.STACK_STRIPE_TEST_AMOUNT),currency:process.env.STACK_STRIPE_TEST_CURRENCY};
module.exports={handler:createHandler({config,store}),createHandler,createStore,verifySignature,eventAction,validConfig,stripeCheckout};
