"use strict";
const fs=require("node:fs"),path=require("node:path"),{spawnSync}=require("node:child_process");
const {validateVideoBrief,wrapCaption,composeFilter}=require("./creative-video-core.cjs");
const {hash,nextState}=require("./creative-studio-core.cjs");
const root=path.resolve(__dirname,"..");
const logo=path.join(root,"apps/web/public/stack-media/stack-home-logo-web.webp");
const font=path.join(root,"apps/web/public/stack-media/barlow-condensed-black-italic.ttf");
function command(bin,args,cwd){
  const r=spawnSync(bin,args,{cwd,encoding:"utf8",maxBuffer:1024*1024,timeout:180000});
  if(r.error||r.status!==0)throw Error(bin+" failed: "+String(r.stderr||r.error?.message||"").slice(-1800));
  return r.stdout;
}
function probe(file){return JSON.parse(command("ffprobe",["-v","error","-show_streams","-show_format","-of","json",file]));}
function digest(file){return hash(fs.readFileSync(file));}
function read(file){if(fs.statSync(file).size>100000)throw Error("Manifest too large");return JSON.parse(fs.readFileSync(file,"utf8"));}
function write(dir,m){const tmp=path.join(dir,"manifest.tmp");fs.writeFileSync(tmp,JSON.stringify(m,null,2)+"\n",{flag:"wx",mode:0o600});fs.renameSync(tmp,path.join(dir,"manifest.json"));}
function verify(dir,m){
  if(m.schema!=="pileheads-video-v1"||!Array.isArray(m.files)||m.files.length!==2)throw Error("Invalid video manifest");
  validateVideoBrief(m.brief);
  const names=new Set(m.files.map(f=>f.name));
  if(!names.has("vertical.mp4")||!names.has("cover.png"))throw Error("Missing required export");
  for(const f of m.files){if(!["vertical.mp4","cover.png"].includes(f.name)||digest(path.join(dir,f.name))!==f.sha256)throw Error("Export changed");}
  if(hash(JSON.stringify({brief:m.brief,assets:m.assets,sources:m.sources,files:m.files}))!==m.fingerprint)throw Error("Manifest changed");
}
function render(input,sourceDir,target){
  const {brief,duration}=validateVideoBrief(read(input));
  const sourceRoot=fs.realpathSync(sourceDir),out=path.resolve(target);
  const sources=brief.segments.map(s=>{
    const file=fs.realpathSync(path.join(sourceRoot,s.file));
    if(!file.startsWith(sourceRoot+path.sep)||!fs.statSync(file).isFile()||fs.statSync(file).size>1024*1024*1024)throw Error("Source file outside input directory or too large");
    const p=probe(file),length=Number(p.format?.duration);
    if(!Number.isFinite(length)||s.start+s.duration>length+.05||!p.streams?.some(v=>v.codec_type==="video"))throw Error("Source duration or video stream invalid");
    return {file,hasAudio:p.streams.some(v=>v.codec_type==="audio"),sha256:digest(file)};
  });
  fs.mkdirSync(out,{mode:0o700});
  const work=fs.mkdtempSync(path.join(out,".work-"));
  try{
    fs.copyFileSync(logo,path.join(work,"logo.webp"));fs.copyFileSync(font,path.join(work,"font.ttf"));
    fs.writeFileSync(path.join(work,"headline.txt"),brief.headline.toUpperCase());
    const list=[];
    for(const [i,s] of brief.segments.entries()){
      const source=sources[i];
      fs.writeFileSync(path.join(work,"caption.txt"),wrapCaption(s.caption));
      const name="segment-"+i+".mp4",useAudio=s.audio==="source"&&source.hasAudio;
      const args=["-hide_banner","-loglevel","error","-nostdin","-ss",String(s.start),"-i",source.file,"-i","logo.webp"];
      if(!useAudio)args.push("-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=48000");
      args.push("-filter_complex_threads","1","-filter_complex",composeFilter(),"-map","[out]","-map",useAudio?"0:a:0":"2:a:0","-af","aresample=48000,apad","-t",String(s.duration),"-c:v","libx264","-threads","2","-preset","fast","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-ar","48000","-ac","2","-movflags","+faststart",name);
      command("ffmpeg",args,work);list.push("file '"+name+"'");
    }
    fs.writeFileSync(path.join(work,"concat.txt"),list.join("\n")+"\n");
    const video=path.join(out,"vertical.mp4"),cover=path.join(out,"cover.png");
    command("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-f","concat","-safe","1","-i","concat.txt","-c","copy","-movflags","+faststart",video],work);
    command("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-ss","0.1","-i",video,"-frames:v","1","-threads","2",cover],work);
    const p=probe(video),v=p.streams.find(x=>x.codec_type==="video"),a=p.streams.find(x=>x.codec_type==="audio");
    if(v?.width!==1080||v.height!==1920||v.codec_name!=="h264"||v.pix_fmt!=="yuv420p"||a?.codec_name!=="aac"||Math.abs(Number(p.format.duration)-duration)>.5)throw Error("Unexpected video export format");
    const files=["vertical.mp4","cover.png"].map(name=>({name,sha256:digest(path.join(out,name))}));
    const m={schema:"pileheads-video-v1",state:"REVIEW",brief,assets:{logo:digest(logo),font:digest(font)},sources:sources.map((s,i)=>({file:brief.segments[i].file,sha256:s.sha256})),files,createdAt:new Date().toISOString()};
    m.fingerprint=hash(JSON.stringify({brief,assets:m.assets,sources:m.sources,files}));write(out,m);
    return m;
  }finally{fs.rmSync(work,{recursive:true,force:true});}
}
function change(dir,action,args){
 const m=read(path.join(dir,"manifest.json"));verify(dir,m);
 const state=nextState(m.state,action);
 if(action==="approve"){
  if(args.length!==3||!args[0]||args[0].length>80||args[1]!=="--rights-confirmed"||args[2]!=="--claims-checked")throw Error("Explicit reviewer and both review flags required");
  m.approval={reviewer:args[0],fingerprint:m.fingerprint,at:new Date().toISOString(),rightsConfirmed:true,claimsChecked:true};
 }else if(action==="schedule"){
  const [platform,at]=args;
  if(args.length!==2||!["instagram","tiktok","youtube"].includes(platform)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(at)||!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at.replace("Z",".000Z")||Date.parse(at)<=Date.now()||m.approval?.fingerprint!==m.fingerprint)throw Error("Approved video, platform and future UTC timestamp required");
  m.schedule={platform,at,mode:"manual-publication"};
 }else{
  if(args.length!==1||m.approval?.fingerprint!==m.fingerprint)throw Error("Actual post URL required");
  const u=new URL(args[0]),allowed={instagram:["instagram.com","www.instagram.com"],tiktok:["tiktok.com","www.tiktok.com"],youtube:["youtube.com","www.youtube.com","youtu.be"]};
  if(u.protocol!=="https:"||!allowed[m.schedule?.platform]?.includes(u.hostname)||u.username||u.password||u.hash||u.pathname==="/")throw Error("Invalid platform URL");
  m.publication={url:u.href,recordedAt:new Date().toISOString(),verification:"operator-reported"};
 }
 m.state=state;write(dir,m);
}
function main(args){
 const [action,...rest]=args;
 if(action==="render"&&rest.length===3)return render(...rest);
 if(["approve","schedule","record"].includes(action)&&rest.length>=2)return change(rest[0],action,rest.slice(1));
 throw Error("Usage: render <brief.json> <private-source-directory> <new-output-directory> | approve <directory> <reviewer> --rights-confirmed --claims-checked | schedule <directory> <platform> <UTC> | record <directory> <post-url>");
}
if(require.main===module)try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}
module.exports={render,verify,change,probe};
