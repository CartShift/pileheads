'use strict';
// Runtime public presentation metadata, never an authorization or tenant boundary.
const SLUG=/^[a-z0-9][a-z0-9-]{0,47}$/;
const DECKS=new Set(['refined','characters','original']);
function parseEditions(raw){
 if(typeof raw!=='string'||raw.length>32768)return [];
 try{
  const list=JSON.parse(raw);
  if(!Array.isArray(list)||list.length>50)return [];
  const seen=new Set(),result=[];
  for(const e of list){
   if(!e||typeof e!=='object'||!SLUG.test(e.slug||'')||seen.has(e.slug)||typeof e.name!=='string'||e.name.trim().length<1||e.name.length>80||typeof e.description!=='string'||e.description.length>240||!DECKS.has(e.deck)||!/^#[0-9a-f]{6}$/i.test(e.accent||'')||e.published!==true)continue;
   seen.add(e.slug);result.push({slug:e.slug,name:e.name.trim(),description:e.description,deck:e.deck,accent:e.accent});
  }
  return result;
 }catch{return [];}
}
function inquiryEmail(value){return typeof value==='string'&&value.length<=180&&/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)?value:null;}
function createHandler({editions,contact}){
 return (req,res,url)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({ok:false}));}
  const slug=url.searchParams.get('partner');
  if(slug===null)return res.end(JSON.stringify({contact}));
  const edition=SLUG.test(slug)?editions.find(x=>x.slug===slug):null;
  if(!edition){res.statusCode=404;return res.end(JSON.stringify({edition:null}));}
  return res.end(JSON.stringify({edition}));
 };
}
const handler=createHandler({editions:process.env.STACK_PARTNER_EDITIONS_ENABLED==='true'?parseEditions(process.env.STACK_PARTNER_EDITIONS_JSON):[],contact:inquiryEmail(process.env.STACK_PARTNER_CONTACT_EMAIL)});
module.exports={handler,createHandler,parseEditions,inquiryEmail};
