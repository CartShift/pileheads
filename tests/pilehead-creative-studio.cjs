"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {FORMATS,validateBrief,renderHTML,nextState,hash}=require("../scripts/creative-studio-core.cjs");
const {render,verify,change}=require("../scripts/creative-studio.cjs");
const brief=require("../examples/creative/action-spotlight.json");
const assets={logo:"data:image/webp;base64,AA",cards:"data:image/webp;base64,AA",font:"data:font/ttf;base64,AA",grain:"data:image/svg+xml;base64,AA"};
assert.equal(validateBrief(brief),brief);
for(const format of FORMATS){
  const html=renderHTML(brief,format,assets);
  assert.ok(html.includes("width:"+format.width+"px;height:"+format.height+"px"));
  assert.ok(html.includes("background-position:100% 100%"));
  assert.ok(html.includes("PILEHEADS"));
}
const injected=renderHTML({...brief,headline:["<script>"]},FORMATS[0],assets);
assert.ok(injected.includes("&lt;script&gt;"));assert.ok(!injected.includes("<script>"));
for(const bad of [{...brief,id:"../bad"},{...brief,cards:["JOKER"]},{...brief,headline:["x".repeat(24)]},{...brief,asset:"other"},{...brief,template:"crew"}])assert.throws(()=>validateBrief(bad));
assert.equal(nextState("REVIEW","approve"),"APPROVED");
assert.throws(()=>nextState("REVIEW","schedule"));
async function main(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"pileheads-creative-"));
  const out=path.join(dir,"draft");
  try{
    await render(path.resolve(__dirname,"../examples/creative/action-spotlight.json"),out,false);
    const m=JSON.parse(fs.readFileSync(path.join(out,"manifest.json"),"utf8"));
    assert.equal(m.state,"REVIEW");assert.equal(m.files.length,3);verify(out,m);
    assert.throws(()=>change(out,"approve",["reviewer","--rights-confirmed","--claims-checked"]),/PNG/);
    fs.appendFileSync(path.join(out,"feed.html"),"changed");
    assert.throws(()=>verify(out,m),/changed/);
    assert.equal(hash("abc"),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
  console.log("Creative Studio: strict inputs, deterministic templates and approval gates passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
