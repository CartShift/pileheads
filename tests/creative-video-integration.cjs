"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawnSync}=require("node:child_process");
const {render,verify,change,probe}=require("../scripts/creative-video.cjs");
const base=require("../examples/creative/gameplay-video.json");
const available=["ffmpeg","ffprobe"].every(bin=>spawnSync(bin,["-version"],{stdio:"ignore"}).status===0);
if(!available){
 if(process.env.PILEHEAD_REQUIRE_VIDEO_TEST==="1")throw Error("FFmpeg/ffprobe required");
 console.log("SKIP creative video integration: FFmpeg is not installed on this runner.");process.exit(0);
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"pileheads-video-test-"));
try{
 const source=path.join(dir,"fixture.mp4");
 // Synthetic technical fixture ONLY, never an approved campaign or real gameplay.
 const f=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-f","lavfi","-i","testsrc2=size=320x240:rate=30","-f","lavfi","-i","sine=frequency=440:sample_rate=48000","-t","6","-c:v","libx264","-threads","2","-pix_fmt","yuv420p","-c:a","aac",source],{encoding:"utf8",timeout:60000});
 assert.equal(f.status,0,f.stderr);
 const brief={...base,id:"technical-fixture",segments:[{file:"fixture.mp4",start:0,duration:3,caption:"Fixture only.",kind:"gameplay",audio:"source"},{file:"fixture.mp4",start:3,duration:3,caption:"Never publish this test.",kind:"gameplay",audio:"mute"}]};
 const input=path.join(dir,"brief.json"),out=path.join(dir,"review");
 fs.writeFileSync(input,JSON.stringify(brief));
 const m=render(input,dir,out);verify(out,m);assert.equal(m.state,"REVIEW");
 const info=probe(path.join(out,"vertical.mp4")),v=info.streams.find(x=>x.codec_type==="video"),a=info.streams.find(x=>x.codec_type==="audio");
 assert.equal(v.width,1080);assert.equal(v.height,1920);assert.equal(v.codec_name,"h264");assert.equal(a.codec_name,"aac");assert.ok(Math.abs(Number(info.format.duration)-6)<.5);
 const png=fs.readFileSync(path.join(out,"cover.png"));assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);
 assert.throws(()=>change(out,"schedule",["instagram","2099-01-01T00:00:00Z"]));
 change(out,"approve",["test-reviewer","--rights-confirmed","--claims-checked"]);
 change(out,"schedule",["youtube","2099-01-01T00:00:00Z"]);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,"manifest.json"),"utf8")).state,"SCHEDULED");
 console.log("PASS creative video: actual 1080x1920 H.264/AAC render, source and muted segments, cover and manual approval queue (technical fixture only).");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
