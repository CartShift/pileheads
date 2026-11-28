"use strict";
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const {config,publicRoutes,canonical,validatePage,validateSitemap,validateRobots,inspect}=require("../scripts/seo-audit.cjs");
const root=path.resolve(__dirname,"../vercel-static");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const file=route=>route==="/"?"index.html":route.slice(1)+".html";
function htmlFiles(dir){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(item=>{
    const rel=path.join(dir,item.name);
    if(item.isDirectory())return item.name==="_next"?[]:htmlFiles(rel);
    return item.isFile()&&item.name.endsWith(".html")?[rel.split(path.sep).join("/")]:[];
  });
}
validateSitemap(read("sitemap.xml"));
validateRobots(read("robots.txt"));
assert.ok(fs.statSync(path.join(root,config.socialImage.slice(1))).size>100);
const known=new Set(Object.keys(config.routes).map(file));
for(const relative of htmlFiles("")){
  if(["404.html","404/index.html","_not-found.html","_not-found/index.html"].includes(relative))continue;
  assert.ok(known.has(relative),"Unclassified exported HTML: "+relative);
}
const inbound=new Set();
for(const route of Object.keys(config.routes)){
  const a=validatePage(route,read(file(route)));
  if(config.routes[route].index){
    for(const href of a.links){
      if(!href.startsWith("/")||href.startsWith("//"))continue;
      const url=new URL(href,config.origin);
      const target=url.pathname.replace(/\/$/,"")||"/";
      if(publicRoutes.includes(target)&&target!==route)inbound.add(target);
      if(url.pathname.startsWith("/pilehead/")&&url.pathname.endsWith(".html"))assert.ok(fs.existsSync(path.join(root,url.pathname.slice(1))),"broken local link "+href);
    }
  }
}
for(const route of publicRoutes)assert.ok(inbound.has(route),route+" has no contextual inbound link");
const home=read("index.html");
assert.throws(()=>validatePage("/",home.replace("</head>",'<link rel="canonical" href="'+canonical("/")+'"></head>')));
assert.throws(()=>validatePage("/",home.replace("</head>",'<meta name="robots" content="noindex"></head>')));
assert.throws(()=>validateSitemap(read("sitemap.xml").replace("</urlset>","<url><loc>"+canonical("/profile")+"</loc></url></urlset>")));
assert.throws(()=>inspect('<script type="application/ld+json">{bad}</script>'));
console.log("PASS SEO static export: "+publicRoutes.length+" canonical pages, index policy, metadata, schema, links and negative fixtures");
