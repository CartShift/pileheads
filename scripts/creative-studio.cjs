"use strict";

const fs=require("node:fs"),path=require("node:path");
const {FORMATS,validateBrief,renderHTML,nextState,hash}=require("./creative-studio-core.cjs");
const root=path.resolve(__dirname,"..");
const assetPaths={
  logo:["apps/web/public/stack-media/stack-home-logo-web.webp","image/webp"],
  cards:["apps/web/public/stack-media/stack-home-faces-web-desktop.webp","image/webp"],
  font:["apps/web/public/stack-media/barlow-condensed-black-italic.ttf","font/ttf"],
  grain:["apps/web/public/stack-media/print-grain.svg","image/svg+xml"]
};
function readJSON(file){if(fs.statSync(file).size>100000)throw Error("JSON too large");return JSON.parse(fs.readFileSync(file,"utf8"));}
function assets(){
  const data={},hashes={};
  for(const [key,[file,mime]] of Object.entries(assetPaths)){
    const bytes=fs.readFileSync(path.join(root,file));
    data[key]="data:"+mime+";base64,"+bytes.toString("base64");
    hashes[key]={file,sha256:hash(bytes)};
  }
  return {data,hashes};
}
const fileHash=file=>hash(fs.readFileSync(file));
function writeManifest(dir,m){const tmp=path.join(dir,"manifest.tmp");fs.writeFileSync(tmp,JSON.stringify(m,null,2)+"\n",{flag:"wx",mode:0o600});fs.renameSync(tmp,path.join(dir,"manifest.json"));}
function verify(dir,m){
  if(m.schema!=="pileheads-creative-v1"||!Array.isArray(m.files)||m.files.length<3||m.files.length>6)throw Error("Invalid manifest");
  validateBrief(m.brief);
  const names=new Set();
  for(const item of m.files){
    if(!/^(feed|story|square)\.(html|png)$/.test(item.name)||names.has(item.name)||!/^[a-f0-9]{64}$/.test(item.sha256)||fileHash(path.join(dir,item.name))!==item.sha256)throw Error("Creative file changed or missing");
    names.add(item.name);
  }
  for(const format of FORMATS)if(!names.has(format.id+".html"))throw Error("Missing required format");
  const fingerprint=hash(JSON.stringify({brief:m.brief,assets:m.assets,files:m.files}));
  if(fingerprint!==m.fingerprint)throw Error("Creative manifest changed");
}
async function render(briefFile,dir,png){
  const brief=validateBrief(readJSON(briefFile)),a=assets();
  const files=[];
  fs.mkdirSync(dir,{mode:0o700});
  let browser;
  try{
    if(png){const {chromium}=require("playwright");browser=await chromium.launch({headless:true});}
    for(const format of FORMATS){
      const html=renderHTML(brief,format,a.data);
      const name=format.id+".html";
      fs.writeFileSync(path.join(dir,name),html,{flag:"wx",mode:0o600});files.push({name,sha256:hash(html)});
      if(browser){
        const page=await browser.newPage({viewport:{width:format.width,height:format.height},deviceScaleFactor:1});
        try{
          await page.setContent(html,{waitUntil:"load"});
          await page.evaluate(()=>document.fonts.ready);
          const layout=await page.evaluate(()=>{
            const headline=[...document.querySelectorAll(".headline span")].map(e=>{
              const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return b.left>=72&&b.right<=innerWidth-72;
            });
            const stage=document.querySelector(".stage").getBoundingClientRect();
            const footer=document.querySelector("footer").getBoundingClientRect();
            const cards=[...document.querySelectorAll(".card")].every(e=>{const b=e.getBoundingClientRect();return Math.abs(e.offsetWidth/e.offsetHeight-63/88)<.01&&b.left>=65&&b.right<=innerWidth-65&&b.top>=stage.top-4&&b.bottom<=stage.bottom+4;});
            return {headline:headline.every(Boolean),stage:stage.height>120,cards,footer:footer.bottom<=innerHeight,fonts:document.fonts.check("italic 900 60px BarlowBrand")};
          });
          if(Object.values(layout).some(x=>!x))throw Error("Render overflow or font failure in "+format.id);
          const pngName=format.id+".png";await page.screenshot({path:path.join(dir,pngName),type:"png"});files.push({name:pngName,sha256:fileHash(path.join(dir,pngName))});
        }finally{await page.close();}
      }
    }
    const manifest={schema:"pileheads-creative-v1",state:"REVIEW",brief,assets:a.hashes,files,createdAt:new Date().toISOString()};
    manifest.fingerprint=hash(JSON.stringify({brief,assets:manifest.assets,files}));
    writeManifest(dir,manifest);
  }finally{if(browser)await browser.close();}
}
function change(dir,action,args){
  const m=readJSON(path.join(dir,"manifest.json"));verify(dir,m);
  const state=nextState(m.state,action);
  if(action==="approve"){
    if(args.length!==3||!args[0]||args[0].length>80||args[1]!=="--rights-confirmed"||args[2]!=="--claims-checked"||
      !FORMATS.every(f=>m.files.some(item=>item.name===f.id+".png")))throw Error("Approve requires all PNG exports, reviewer and both review flags");
    m.approval={reviewer:args[0],at:new Date().toISOString(),fingerprint:m.fingerprint,rightsConfirmed:true,claimsChecked:true};
  }else if(action==="schedule"){
    if(args.length!==2||!["instagram","tiktok","youtube"].includes(args[0])||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(args[1])||
      !Number.isFinite(Date.parse(args[1]))||new Date(args[1]).toISOString()!==args[1].replace("Z",".000Z")||Date.parse(args[1])<=Date.now()||
      m.approval?.fingerprint!==m.fingerprint)throw Error("Schedule requires approved creative, platform and future UTC timestamp");
    if(args[0]!=="instagram")throw Error("This static PNG template is not a video; adapt and review video separately for this platform");
    m.schedule={platform:args[0],at:args[1],mode:"manual-publication"};
  }else{
    if(args.length!==1||m.schedule?.platform!=="instagram"||m.approval?.fingerprint!==m.fingerprint)throw Error("Record requires an approved scheduled post URL");
    const u=new URL(args[0]);
    if(u.protocol!=="https:"||!["instagram.com","www.instagram.com"].includes(u.hostname)||!/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)||u.username||u.password||u.search||u.hash)throw Error("Invalid Instagram post URL");
    m.publication={url:u.href,recordedAt:new Date().toISOString(),verification:"operator-reported"};
  }
  m.state=state;writeManifest(dir,m);
}
async function main(args){
  const [command,...rest]=args;
  if(command==="render"&&(rest.length===2||rest.length===3&&rest[2]==="--png"))return render(rest[0],rest[1],rest[2]==="--png");
  if(["approve","schedule","record"].includes(command)&&rest.length>=2)return change(rest[0],command,rest.slice(1));
  throw Error("Usage: render <brief.json> <new-directory> [--png] | approve <directory> <reviewer> --rights-confirmed --claims-checked | schedule <directory> instagram <UTC> | record <directory> <post-url>");
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={render,verify,change};
