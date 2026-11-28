'use strict';
function createStore(url){
 const sql=require('@neondatabase/serverless').neon(url);
 const query=(s,p)=>sql.query(s,p);
 return {
  async start(id,quantity){return (await query('SELECT * FROM pileheads_commerce_test.start_order($1::uuid,$2::integer)',[id,quantity]))[0];},
  async get(id){return (await query('SELECT * FROM pileheads_commerce_test.orders WHERE id=$1::uuid',[id]))[0];},
  async attach(id,session){return (await query("UPDATE pileheads_commerce_test.orders SET session_id=$2,updated_at=now() WHERE id=$1::uuid AND state='pending' AND (session_id IS NULL OR session_id=$2) RETURNING id",[id,session])).length===1;},
  async settle(event,order,next){
   // State and event receipt commit together. Never regress a terminal state.
   const rows=await query(`WITH changed AS (
    UPDATE pileheads_commerce_test.orders SET state=$3,payment_id=$4,updated_at=now()
    WHERE id=$1::uuid AND session_id=$2 AND (state='pending' OR (state=$3 AND payment_id IS NOT DISTINCT FROM $4::text)) RETURNING id
   ), recorded AS (
    INSERT INTO pileheads_commerce_test.events(event_id,order_id,state) SELECT $5,id,$3 FROM changed ON CONFLICT(event_id) DO NOTHING RETURNING event_id
   ) SELECT event_id FROM recorded`,[order.id,order.session_id,next.state,next.payment,event.id]);
   if(rows.length)return true;
   return (await query('SELECT event_id FROM pileheads_commerce_test.events WHERE event_id=$1 AND order_id=$2::uuid AND state=$3',[event.id,order.id,next.state])).length===1;
  }
 };
}
module.exports={createStore};
