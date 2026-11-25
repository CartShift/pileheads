"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../vercel-static");
const source = path.resolve(__dirname, "../dist");
const read = p => fs.readFileSync(path.join(root,p));
assert.deepEqual(read("index.html"), fs.readFileSync(path.join(source,"index.html")),
  "the original homepage must not change");
assert.deepEqual(read("pilehead/index.html"),
  fs.readFileSync(path.join(source,"pilehead/index.html")),
  "the original Classic simulator must not change");
for (const route of ["play","stack","decks","profile","account","shop","partners"]) {
  const html = read(route + ".html").toString("utf8");
  assert.match(html, /_next\/static\//, "exported " + route + " must load client JS");
  assert.match(html, /STACK/, route + " should be a rendered STACK page");
}
assert.ok(fs.readdirSync(path.join(root,"_next","static")).length,
  "Next.js fingerprinted JS and CSS must be served from this same root");
for(const asset of ["stack-characters.webp","stack-sheet.webp","stack-back.webp"])
  assert.ok(fs.statSync(path.join(root,"pilehead/assets",asset)).size > 100,
    "the original deck art must remain present");
for (const asset of ["stack-sw.js","stack-offline.html","stack.webmanifest","stack-icon.svg","pilehead/table-feedback.css"])
  assert.ok(read(asset).length > 0, "missing offline/public asset " + asset);
const manifest = JSON.parse(read("stack.webmanifest"));
assert.equal(manifest.start_url,"/play");
assert.equal(manifest.scope,"/");
console.log("PASS static export: Classic preserved, all seven Next routes and offline assets published");

const officialHome = read("stack.html").toString("utf8");
for (const label of ["STACK", "THE ODDS", "Why STACK?", "Meet", "Play online", "The physical", "Physical retail launch to be announced."]) {
  assert.ok(officialHome.includes(label), "Official homepage missing: " + label);
}
for (const href of ["/play", "/pilehead/gallery.html", "/pilehead/playtest.html", "/pilehead/index.html"]) {
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

for (const asset of ["stack-home-gameplay-v2.webp","stack-home-gameplay-wide-v2.webp","stack-home-gameplay-desktop-v2.webp","stack-home-sunset.webp"]) { assert.equal(read("stack-media/"+asset).toString("ascii",8,12),"WEBP"); assert.ok(officialHome.includes("/stack-media/"+asset)); }

for(const asset of ["stack-home-box-side-v2.webp","stack-home-box-top-v2.webp"]) { assert.equal(read("stack-media/"+asset).toString("ascii",8,12),"WEBP"); assert.ok(officialHome.includes("/stack-media/"+asset)); }
for(const asset of ["print-grain.svg","comic-cloud.svg","barlow-condensed-black-italic.ttf","barlow-OFL.txt"]) assert.ok(read("stack-media/"+asset).length>100,asset);

assert.equal(read("stack-media/stack-home-burn-beach.webp").toString("ascii",8,12),"WEBP");assert.ok(officialHome.includes("/stack-media/stack-home-burn-beach.webp"));

for (const n of ["faces-web-desktop","faces-web-mobile","logo-web","box-web","explorer-web-desktop","explorer-web-mobile","back-web"]) assert.equal(read("stack-media/stack-home-"+n+".webp").toString("ascii",8,12),"WEBP");
assert.ok(read("stack-media/stack-home-faces-web-mobile.webp").length<250000,"mobile sprite budget");
assert.ok(read("stack-media/stack-home-faces-web-desktop.webp").length<450000,"desktop sprite budget");

for(const href of ["/decks","/account","/shop","/partners"])assert.ok(officialHome.includes('href="'+href+'"'),"Missing commercial navigation: "+href);
require("./stack-commercial-http.cjs").run().catch(error=>{console.error(error);process.exitCode=1;});
