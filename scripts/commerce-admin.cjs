'use strict';
const crypto=require('node:crypto');
const {config,UUID}=require('./commerce-test.cjs');
const STATES=['pending','paid','expired'], FULFILLMENT=['unfulfilled','packed','shipped'];
const digest=x=>crypto.createHash('sha256').update(x).digest();
function adminConfig(env){
 const c=config(env),token=env.PILEHEAD_COMMERCE_TEST_ADMIN_TOKEN;
 if(!c||typeof token!=='string'||! /^[A-Za-z0-9_-]{43,128}$/.test(token))return null;
 return {...c,token};
}
function authorized(header,token){
 return typeof header==='string'&&header.length<=256&&crypto.timingSafeEqual(digest(header),digest('Bearer '+token));
}
function validate(b){
 if(!b||typeof b!=='object'||Array.isArray(b))return false;
 const keys=Object.keys(b).sort().join(',');
 if(b.action==='overview')return keys==='action';
 if(b.action==='orders')return keys==='action,filter,offset'&&['all',...STATES].includes(b.filter)&&Number.isSafeInteger(b.offset)&&b.offset>=0&&b.offset<=10000&&b.offset%25===0;
 if(b.action==='advance')return keys==='action,eventId,expected,id'&&typeof b.eventId==='string'&&UUID.test(b.eventId)&&typeof b.id==='string'&&UUID.test(b.id)&&['unfulfilled','packed'].includes(b.expected);
 if(b.action==='adjust')return keys==='action,delta,eventId,reason,version'&&typeof b.eventId==='string'&&UUID.test(b.eventId)&&Number.isSafeInteger(b.delta)&&b.delta!==0&&Math.abs(b.delta)<=100000&&['count_correction','test_receipt'].includes(b.reason)&&(b.reason!=='test_receipt'||b.delta>0)&&Number.isSafeInteger(b.version)&&b.version>=0&&b.version<2147483647;
 return false;
}
function createStore(url){
 const sql=require('@neondatabase/serverless').neon(url);
 const q=(s,p=[])=>sql.query(s,p);
 return {
 async overview(){
  const [r]=await q(`SELECT count(*)::int AS orders,
   count(*) FILTER(WHERE state='pending')::int AS pending,
   count(*) FILTER(WHERE state='paid')::int AS paid,
   count(*) FILTER(WHERE state='expired')::int AS expired,
   coalesce(sum(amount_minor) FILTER(WHERE state='paid'),0)::text AS gross_minor,
   coalesce(sum(quantity) FILTER(WHERE state='paid'),0)::text AS units_paid,
   count(*) FILTER(WHERE state='paid' AND fulfillment_state='unfulfilled')::int AS to_pack,
   count(*) FILTER(WHERE fulfillment_state='packed')::int AS to_ship,
   count(*) FILTER(WHERE fulfillment_state='shipped')::int AS shipped,
   (SELECT json_build_object('units',units,'low_threshold',low_threshold,'version',version) FROM pileheads_commerce_test.stock WHERE singleton) AS stock
   FROM pileheads_commerce_test.orders`);
  if(!r?.stock)throw Error('schema_missing');
  return r;
 },
 async orders(filter,offset){
  // Never return provider session/payment IDs or customer data.
  return q(`SELECT id,quantity,amount_minor,state,fulfillment_state,created_at,updated_at
   FROM pileheads_commerce_test.orders WHERE ($1='all' OR state=$1)
   ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $2`,[filter,offset]);
 },
 async advance(b){
  const next=b.expected==='unfulfilled'?'packed':'shipped';
  const [row]=await q('SELECT pileheads_commerce_test.advance_order($1::uuid,$2::uuid,$3,$4) AS ok',[b.eventId,b.id,b.expected,next]);
  return row?.ok===true;
 },
 async adjust(b){
  const [row]=await q('SELECT pileheads_commerce_test.adjust_stock($1::uuid,$2::integer,$3::integer,$4) AS ok',[b.eventId,b.delta,b.version,b.reason]);
  return row?.ok===true;
 }
 };
}
module.exports={adminConfig,authorized,validate,createStore,STATES,FULFILLMENT};
