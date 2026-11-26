"use strict";
// Read-only, one-off live acceptance. Never merge this network-dependent test.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const origin="https://stack-card-game-t7vx.onrender.com",commit="5d729aac0942f99d2aef0ae3aacc30f284cb21b4";
const names=["stack-home-faces-v2.webp","stack-home-faces-web-desktop.webp","stack-home-faces-web-mobile.webp","stack-home-back-web.webp","stack-home-back-v2.webp","stack-home-box-web.webp","stack-home-box-v2.webp","stack-home-box-side-v2.webp","stack-home-box-top-v2.webp","stack-home-gameplay-rc3.webp","stack-home-gameplay-wide-rc3.webp","stack-home-gameplay-desktop-rc3.webp"];
const assets=[...names.map(n=>["/stack-media/"+n,"apps/web/public/stack-media/"+n]),...["stack-characters.webp","stack-characters-v2.webp","stack-back.webp","stack-back-v2.webp"].map(n=>["/pilehead/assets/"+n,"dist/pilehead/assets/"+n]),["/pileheads-icon.png","apps/web/public/pileheads-icon.png"]];
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
async function get(url,ua){const r=await fetch(url,{headers:{"cache-control":"no-cache",...(ua?{"user-agent":ua}:{})},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,url);return r}
(async()=>{
 const live=await (await get(origin+"/livez")).json();assert.equal(live.commit,commit);
 const ready=await (await get(origin+"/readyz")).json();assert.equal(ready.ok,true);
 for(const [url,file] of assets){
  const r=await get(origin+url);const b=Buffer.from(await r.arrayBuffer()),expected=hash(fs.readFileSync(file));
  assert.equal(hash(b),expected,url+" byte equality");
  assert.match(r.headers.get("content-type")||"",url.endsWith(".png")?/image\/png/:/image\/webp/);
  console.log("RC3_LIVE_ASSET "+JSON.stringify({url,bytes:b.length,sha256:expected,type:r.headers.get("content-type")}));
 }
 for(const ua of ["facebookexternalhit/1.1","Twitterbot/1.0","LinkedInBot/1.0"]){
  const r=await get(origin+"/",ua),html=await r.text();
  const tags=[...html.matchAll(/<meta[^>]+>/gi)].map(x=>x[0]);
  const find=name=>tags.find(t=>t.includes('property="'+name+'"')||t.includes('name="'+name+'"'));
  const content=t=>t?.match(/content="([^"]+)"/)?.[1];
  const og=content(find("og:image")),tw=content(find("twitter:image"));
  assert.equal(og,origin+"/stack-media/stack-home-gameplay-desktop-rc3.webp");
  assert.equal(tw,og);
  assert.equal(content(find("og:title")),"PILEHEADS | The Card Game");
  assert.equal(content(find("twitter:card")),"summary_large_image");
  console.log("RC3_SOCIAL_META "+JSON.stringify({ua,og,tw,title:content(find("og:title"))}));
 }
 const after=await(await get(origin+"/livez")).json();assert.equal(after.commit,commit);
 console.log("RC3_LIVE_PASS "+JSON.stringify({commit,assets:assets.length,crawlerMetadata:3}));
 // Diagnostic only, custom domain may still be configured separately.
 try{const r=await fetch("https://pileheads.com/",{signal:AbortSignal.timeout(12000)});console.log("RC3_DOMAIN "+JSON.stringify({status:r.status,url:r.url,hasPileheads:(await r.text()).includes("PILEHEADS")}))}catch(e){console.log("RC3_DOMAIN "+JSON.stringify({error:e.message}))}
})().catch(e=>{console.error(e);process.exitCode=1});
