"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {render,verify,change}=require("../scripts/creative-studio.cjs");
const base=require("../examples/creative/action-spotlight.json");
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"pileheads-creative-browser-"));
 try{
  const variants=[base,{...base,id:"crew-test",template:"crew",headline:["MEET THE CREW."],cards:["1","2","3"],accent:"teal",body:"Three characters. One table."},{...base,id:"punchline-test",template:"punchline",headline:["ONE MORE ROUND."],cards:["GHOST","BURN"],accent:"yellow",body:"That was the plan, anyway."}];
  for(const [i,brief] of variants.entries()){
   const input=path.join(dir,"brief-"+i+".json"),out=path.join(dir,"render-"+i);
   fs.writeFileSync(input,JSON.stringify(brief));
   await render(input,out,true);
   const file=path.join(out,"manifest.json");
   let m=JSON.parse(fs.readFileSync(file,"utf8"));
   verify(out,m);assert.equal(m.files.length,6);
   for(const [name,w,h] of [["feed",1080,1350],["story",1080,1920],["square",1080,1080]]){
    const image=fs.readFileSync(path.join(out,name+".png"));
    assert.equal(image.readUInt32BE(16),w);assert.equal(image.readUInt32BE(20),h);
   }
   change(out,"approve",["test-reviewer","--rights-confirmed","--claims-checked"]);
   m=JSON.parse(fs.readFileSync(file,"utf8"));
   assert.equal(m.state,"APPROVED");
   assert.throws(()=>change(out,"schedule",["tiktok","2099-01-01T00:00:00Z"]),/not a video/);
   change(out,"schedule",["instagram","2099-01-01T00:00:00Z"]);
   assert.equal(JSON.parse(fs.readFileSync(file,"utf8")).state,"SCHEDULED");
  }
  console.log("Creative Studio: all three template families rendered in all three formats; local review transitions passed.");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
