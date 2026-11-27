"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../vercel-static");
const source = path.resolve(__dirname, "../dist");
const read = p => fs.readFileSync(path.join(root,p));
assert.deepEqual(read("index.html"), fs.readFileSync(path.resolve(__dirname,"../apps/web/out/index.html")));
for (const name of ["index.html","app.js","online.js","classic-clean.css","classic-premium.css"]) assert.ok(!fs.existsSync(path.join(root,"pilehead",name)),name+" must not be published");
for (const route of ["play","stack","how-to-play","deck"]) {
  const html = read(route + ".html").toString("utf8");
  assert.match(html, /_next\/static\//, "exported " + route + " must load client JS");
  assert.match(html, /PILEHEADS/, route + " should be a rendered PILEHEADS page");
}
assert.ok(fs.readdirSync(path.join(root,"_next","static")).length,
  "Next.js fingerprinted JS and CSS must be served from this same root");
for(const asset of ["stack-characters.webp","stack-sheet.webp","stack-back.webp"])
  assert.ok(fs.statSync(path.join(root,"pilehead/assets",asset)).size > 100,
    "the original deck art must remain present");
console.log("PASS single Render service: Classic retired, /play + /stack published, Next assets available");

const officialHome = read("stack.html").toString("utf8");
for (const label of ["PILEHEADS", "ONE LOSER", "Why PILEHEADS?", "Meet", "Play online", "The physical", "Physical retail launch to be announced."]) {
  assert.ok(officialHome.includes(label), "Official homepage missing: " + label);
}
for (const href of ["/play", "/deck", "/how-to-play"]) {
  assert.ok(officialHome.includes('href="' + href + '"'), "Official homepage missing navigation: " + href);
}
assert.ok(!officialHome.includes("Our new go-to game night game"), "Concept testimonials must not be published");

for (const asset of ["stack-home-faces-v2.webp","stack-home-box-v2.webp","stack-home-back-v2.webp","stack-home-logo-v2.webp"]) {
  const bytes = read("stack-media/" + asset);
  assert.equal(bytes.toString("ascii",0,4),"RIFF","Invalid WebP: " + asset);
  assert.equal(bytes.toString("ascii",8,12),"WEBP","Invalid WebP: " + asset);
}
assert.ok(officialHome.includes("/stack-media/stack-home-box-web.webp"), "Homepage must use corrected packaging");
assert.ok(officialHome.includes("/stack-media/stack-home-logo-web.webp"), "Homepage must use the source-derived logo");

assert.ok(officialHome.includes("/stack-media/stack-home-explorer-v2.webp"), "Hero must use the canonical Explorer mascot");
assert.equal(read("stack-media/stack-home-explorer-v2.webp").toString("ascii",8,12),"WEBP");

for (const asset of ["stack-home-gameplay-rc3.webp","stack-home-gameplay-wide-rc3.webp","stack-home-gameplay-desktop-rc3.webp","stack-home-sunset.webp"]) { assert.equal(read("stack-media/"+asset).toString("ascii",8,12),"WEBP"); assert.ok(officialHome.includes("/stack-media/"+asset)); }

for(const asset of ["stack-home-box-side-v2.webp","stack-home-box-top-v2.webp"]) { assert.equal(read("stack-media/"+asset).toString("ascii",8,12),"WEBP"); assert.ok(officialHome.includes("/stack-media/"+asset)); }
for(const asset of ["print-grain.svg","comic-cloud.svg","barlow-condensed-black-italic.ttf","barlow-OFL.txt"]) assert.ok(read("stack-media/"+asset).length>100,asset);

assert.equal(read("stack-media/stack-home-burn-beach.webp").toString("ascii",8,12),"WEBP");assert.ok(officialHome.includes("/stack-media/stack-home-burn-beach.webp"));

for (const n of ["faces-web-desktop","faces-web-mobile","logo-web","box-web","explorer-web-desktop","explorer-web-mobile","back-web"]) assert.equal(read("stack-media/stack-home-"+n+".webp").toString("ascii",8,12),"WEBP");
assert.ok(read("stack-media/stack-home-faces-web-mobile.webp").length<250000,"mobile sprite budget");
assert.ok(read("stack-media/stack-home-faces-web-desktop.webp").length<450000,"desktop sprite budget");

// Genuine RC3 Playwright captures are immutable release assets.
for (const [asset,digest] of [["stack-home-gameplay-rc3.webp","060ba98725c812bd6faf250c11465c503ec9bc01f0f9350e4f48ef114136e060"],["stack-home-gameplay-wide-rc3.webp","962cc664dc1615d07525a373c3ab1302f57e4b685b8d54a0ced19d1ed2c1b0c9"],["stack-home-gameplay-desktop-rc3.webp","57274c6d6918fac7b181c94ace8f4aece4a5c309fe0b75fb8e9638f18595afe5"]]) {
 const bytes=read("stack-media/"+asset);
 assert.equal(require("node:crypto").createHash("sha256").update(bytes).digest("hex"),digest,asset+" capture hash");
 assert.ok(bytes.length<50000,asset+" delivery budget");
}

assert.match(read("robots.txt").toString("utf8"),/Sitemap: https:\/\/pileheads\.com\/sitemap\.xml/);
assert.match(read("sitemap.xml").toString("utf8"),/https:\/\/pileheads\.com\/how-to-play/);
const social=read("stack-media/pileheads-social.png");
assert.equal(social.toString("hex",0,8),"89504e470d0a1a0a");assert.equal(social.readUInt32BE(16),1200);assert.equal(social.readUInt32BE(20),630);

for(let i=-1;i<16;i++)for(const width of [140,280]){const image=read("stack-media/cards/"+(i<0?"back":"face-"+i)+"-"+width+".webp");assert.equal(image.subarray(8,12).toString(),"WEBP");assert.ok(image.length<50000,"individual web face delivery budget");}
