'use strict';
const catalog=require('../apps/web/lib/commerce-catalog.json');
const skuPattern=/^[A-Z0-9][A-Z0-9-]{0,63}$/;
const MAX_QUANTITY=10;
const MAX_MINOR=100000000;
// Trusted offers come from the server's published price/inventory records,
// never from request data. This calculates merchandise only, not a payable total.
function merchandiseQuote(items,offers){
 if(!Array.isArray(items)||items.length<1||items.length>10||!Array.isArray(offers))throw Error('invalid_cart');
 const seen=new Set(),lines=[];let currency=null,subtotalMinor=0;
 for(const item of items){
  if(!item||Object.keys(item).sort().join(',')!=='quantity,sku'||typeof item.sku!=='string'||!skuPattern.test(item.sku)||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>MAX_QUANTITY||seen.has(item.sku))throw Error('invalid_item');
  seen.add(item.sku);
  const matches=offers.filter(o=>o.sku===item.sku);
  if(matches.length!==1)throw Error('unavailable');
  const o=matches[0];
  if(o.active!==true||!Number.isSafeInteger(o.unitMinor)||o.unitMinor<1||o.unitMinor>MAX_MINOR||typeof o.currency!=='string'||!['EUR'].includes(o.currency)||!Number.isSafeInteger(o.available)||o.available<item.quantity)throw Error('unavailable');
  if(currency&&currency!==o.currency)throw Error('currency_mismatch');
  currency=o.currency;
  const lineMinor=o.unitMinor*item.quantity;
  subtotalMinor+=lineMinor;
  if(subtotalMinor>MAX_MINOR)throw Error('cart_limit');
  lines.push({sku:item.sku,quantity:item.quantity,unitMinor:o.unitMinor,lineMinor});
 }
 return {currency,subtotalMinor,lines};
}
module.exports={catalog,merchandiseQuote,MAX_QUANTITY};
