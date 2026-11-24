'use strict';
function physicalShopUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash?u.href:null;}catch{return null;}
}
function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({ok:false}));}
 const url=process.env.STACK_PHYSICAL_SHOP_ENABLED==='true'?physicalShopUrl(process.env.STACK_PHYSICAL_SHOP_URL):null;
 res.end(JSON.stringify({physicalShopUrl:url}));
}
module.exports={handler,physicalShopUrl};
