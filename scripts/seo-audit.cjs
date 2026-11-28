"use strict";
const assert=require("node:assert/strict");
const config=require("../apps/web/lib/seo-routes.json");
const publicRoutes=Object.keys(config.routes).filter(route=>config.routes[route].index);
const canonical=route=>new URL(route,config.origin).href;
// Next serializes the bare origin without a slash; HTTP treats both forms as the same root.
const normalizeRoot=values=>values.map(value=>value===config.origin?config.origin+"/":value);
const sitemapUrls=xml=>Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g),m=>m[1]);
const decode=s=>s.replace(/&(?:amp|quot|apos|#39|#x27|lt|gt);/g,x=>({"&amp;":"&","&quot;":'"',"&apos;":"'","&#39;":"'","&#x27;":"'","&lt;":"<","&gt;":">"})[x]);
function tags(html,tag){
  const pattern=new RegExp("<"+tag+"\\b([^>]*?)>","gi");
  return Array.from(html.matchAll(pattern),m=>{
    const attrs={};
    for(const a of m[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]);
    return attrs;
  });
}
function inspect(html){
  const metas=tags(html,"meta");
  const content=(key,value)=>metas.filter(a=>a[key]===value).map(a=>a.content);
  return {
    titles:Array.from(html.matchAll(/<title>([^<]*)<\/title>/gi),m=>decode(m[1])),
    canonicals:tags(html,"link").filter(a=>a.rel==="canonical").map(a=>a.href),
    description:content("name","description"), robots:content("name","robots"),
    ogTitle:content("property","og:title"), ogDescription:content("property","og:description"),
    ogUrl:content("property","og:url"), ogImage:content("property","og:image"),
    twitterTitle:content("name","twitter:title"),
    lang:tags(html,"html")[0]?.lang,
    h1Count:tags(html,"h1").length,
    schema:Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)).filter(m=>/\btype=["']application\/ld\+json["']/.test(m[1])).map(m=>JSON.parse(m[2])),
    links:tags(html,"a").map(a=>a.href).filter(Boolean),
  };
}
function validatePage(route,html){
  const p=config.routes[route];assert.ok(p,"Unclassified route: "+route);
  const a=inspect(html);
  if(p.index){
    assert.deepEqual(a.titles,[p.title],route+" title");
    assert.deepEqual(a.description,[p.description],route+" description");
    assert.deepEqual(normalizeRoot(a.canonicals),[canonical(route)],route+" canonical");
    assert.ok(!a.robots.some(x=>/\bnoindex\b/i.test(x)),route+" unexpectedly noindex");
    assert.deepEqual(a.ogTitle,[p.title],route+" OG title");
    assert.deepEqual(a.ogDescription,[p.description],route+" OG description");
    assert.deepEqual(normalizeRoot(a.ogUrl),[canonical(route)],route+" OG URL");
    assert.deepEqual(a.ogImage,[canonical(config.socialImage)],route+" OG image");
    assert.deepEqual(a.twitterTitle,[p.title],route+" Twitter title");
    assert.equal(a.lang,"en",route+" HTML language");
    assert.equal(a.h1Count,1,route+" primary heading");
    if(route==="/")assert.ok(a.schema.some(s=>s["@type"]==="WebSite"&&s.url===canonical("/")),route+" WebSite");
    if(route==="/play")assert.ok(a.schema.some(s=>s["@type"]==="VideoGame"&&s.url===canonical("/play")),route+" VideoGame");
  }else{
    assert.ok(a.robots.some(x=>/\bnoindex\b/i.test(x)),route+" missing noindex");
    if(p.canonical)assert.deepEqual(normalizeRoot(a.canonicals),[canonical(p.canonical)],route+" alias canonical");
  }
  return a;
}
function validateSitemap(xml){
  assert.match(xml,/<urlset\b/);
  assert.deepEqual(sitemapUrls(xml).sort(),publicRoutes.map(canonical).sort(),"sitemap must exactly match public registry");
}
function validateRobots(txt){
  assert.match(txt,/^Sitemap: https:\/\/pileheads\.com\/sitemap\.xml$/m);
  assert.match(txt,/^Disallow: \/api\/$/m);
  assert.ok(!/^Disallow:\s*\/\s*$/m.test(txt),"public crawling blocked");
  assert.ok(!/^Disallow:\s*\/pilehead\/endgame-lab/m.test(txt),"lab noindex must be crawlable");
}
module.exports={config,publicRoutes,canonical,inspect,validatePage,validateSitemap,validateRobots};
