"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const shared=read("apps/web/public/stack-media/stack-design-system.css");
for(const token of ["--brand-paper:#f9ebcb","--brand-ink:#191b19","--brand-yellow:#f6c32c","--brand-red:#ce302d","--brand-teal:#006675","--brand-display:","@media screen","@media print"])assert.ok(shared.includes(token),token);
for(const page of ["index","endgame-lab","gallery","playtest","print"]){const html=read("dist/pilehead/"+page+".html");assert.ok(html.includes('href="/stack-media/stack-design-system.css"'),page);assert.ok(html.includes('href="/stack"'),page);assert.ok(html.includes('stack-home-logo-web.webp'),page)}
assert.ok(read("apps/web/app/layout.tsx").includes("/stack-media/stack-design-system.css"));
assert.ok(read("apps/web/app/homepage-refinement.module.css").includes("var(--brand-display)"));
assert.ok(read("apps/web/components/game-table.tsx").includes("logo stack-site-brand"));
assert.ok(read("scripts/build-vercel.mjs").includes("stack-design-system.css"));
assert.match(read("dist/pilehead/print.html"),/grid-template-columns:repeat\(3,57mm\);grid-template-rows:repeat\(3,82mm\)/);
assert.match(read("dist/pilehead/playtest.html"),/<title>STACK · Official Playtest Kit<\/title>/);
console.log("PASS unified STACK design tokens, all public routes, logo, print geometry and publishing");
