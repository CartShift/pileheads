"use strict";
const path=require("node:path");
const textOk=(s,max)=>typeof s==="string"&&s.trim()===s&&s.length>0&&s.length<=max&&!/[\x00-\x1f\x7f]/.test(s);
const exact=(b,keys)=>b&&typeof b==="object"&&!Array.isArray(b)&&Object.keys(b).length===keys.length&&keys.every(k=>Object.hasOwn(b,k));
function validateVideoBrief(b){
  if(!exact(b,["id","headline","caption","sourceRelease","segments","sourceApprovedForReview"])||
    typeof b.id!=="string"||!/^[a-z0-9][a-z0-9-]{0,59}$/.test(b.id)||
    !textOk(b.headline,20)||!textOk(b.caption,300)||
    typeof b.sourceRelease!=="string"||!/^[A-Za-z0-9._-]{1,40}$/.test(b.sourceRelease)||
    b.sourceApprovedForReview!==true||!Array.isArray(b.segments)||!b.segments.length||b.segments.length>8)throw Error("Invalid video brief");
  let duration=0;
  for(const s of b.segments){
    if(!exact(s,["file","start","duration","caption","kind","audio"])||typeof s.file!=="string"||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,150}\.(mp4|mov|webm)$/i.test(s.file)||
      s.file.split("/").some(part=>part===".."||part==="."||part==="")||path.isAbsolute(s.file)||
      !Number.isFinite(s.start)||s.start<0||s.start>86400||!Number.isFinite(s.duration)||s.duration<2||s.duration>15||
      !textOk(s.caption,64)||s.caption.split(" ").some(w=>w.length>29)||!["gameplay","real_playtest"].includes(s.kind)||!["source","mute"].includes(s.audio))
      throw Error("Invalid video segment");
    duration+=s.duration;
  }
  if(duration<6||duration>45)throw Error("Video duration must be 6–45 seconds");
  return {brief:b,duration};
}
function wrapCaption(text,width=30){
  const lines=[];let line="";
  for(const word of text.split(/ +/)){
    if(line&&(line+" "+word).length>width){lines.push(line);line=word;}else line=line?line+" "+word:word;
  }
  if(line)lines.push(line);
  if(lines.length>3)throw Error("Caption too long to fit");
  return lines.join("\n");
}
function composeFilter(){
  return "[0:v]fps=30,scale=w=940:h=1190:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=940:1190:(ow-iw)/2:(oh-ih)/2:color=0x191B19,setsar=1,pad=1080:1920:70:340:color=0xF9EBCB[base];"+
  "[1:v]scale=220:-2[logo];[base][logo]overlay=(W-w)/2:112:format=auto[branded];"+
  "[branded]drawtext=fontfile=font.ttf:textfile=headline.txt:expansion=none:fontcolor=0x191B19:fontsize=72:x=(w-tw)/2:y=248,"+
  "drawtext=fontfile=font.ttf:textfile=caption.txt:expansion=none:fontcolor=0x191B19:fontsize=44:line_spacing=8:x=(w-tw)/2:y=1550,"+
  "drawbox=x=180:y=1745:w=720:h=5:color=0xCE302D:t=fill,drawtext=fontfile=font.ttf:text=pileheads.com:expansion=none:fontcolor=0x191B19:fontsize=33:x=(w-tw)/2:y=1765[out]";
}
module.exports={validateVideoBrief,wrapCaption,composeFilter};
