"use strict";
// Safe read-only checks; never create rooms, submit email or contact analytics.
const assert=require("node:assert/strict");
const {config,publicRoutes,validatePage,validateSitemap,validateRobots}=require("./seo-audit.cjs");
const origin=config.origin;
async function get(route){
  const r=await fetch(origin+route,{redirect:"manual",signal:AbortSignal.timeout(15000)});
  return {status:r.status,headers:r.headers,text:await r.text()};
}
(async()=>{
  for(const route of publicRoutes){
    const r=await get(route);assert.equal(r.status,200,route);
    assert.match(r.headers.get("content-type")||"",/text\/html/);
    assert.ok(!/\bnoindex\b/i.test(r.headers.get("x-robots-tag")||""),route+" blocked by header");
    validatePage(route,r.text);console.log("PASS",route);
  }
  for(const route of ["/profile","/quick-play","/growth","/deck-updates","/pilehead/print","/pilehead/playtest","/pilehead/endgame-lab"]){
    const r=await get(route);assert.equal(r.status,200,route);validatePage(route,r.text);console.log("PASS noindex",route);
  }
  const sitemap=await get("/sitemap.xml");assert.equal(sitemap.status,200);assert.match(sitemap.headers.get("content-type")||"",/xml/);validateSitemap(sitemap.text);
  const robots=await get("/robots.txt");assert.equal(robots.status,200);assert.match(robots.headers.get("content-type")||"",/text\/plain/);validateRobots(robots.text);
  for(const [route,target] of [["/stack","/"],["/pilehead","/play"],["/pilehead/gallery","/deck"]]){
    const r=await get(route);assert.ok([301,308].includes(r.status),route+" must permanently redirect");
    assert.equal(new URL(r.headers.get("location"),origin).href,origin+target);console.log("PASS redirect",route);
  }
  assert.equal((await get("/seo-nonexistent-404-probe")).status,404);
  console.log("PASS live SEO smoke; indexing and CWV require separate verification");
})().catch(err=>{console.error(err.message);process.exitCode=1;});
