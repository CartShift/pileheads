import sharp from "sharp";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const media=path.resolve(here,"../public/stack-media/cards");
const source=path.resolve(here,"../public/pilehead/assets");
const sheet=path.join(source,"stack-characters-v2.webp");
const meta=await sharp(sheet).metadata();
if(!meta.width||!meta.height||meta.width%4||meta.height%4)throw Error("Invalid official 4x4 card grid");
const w=meta.width/4,h=meta.height/4;
await mkdir(media,{recursive:true});
for(let i=-1;i<16;i++){
 for(const width of [140,280]){
  const art=i<0?sharp(path.join(source,"stack-back-v2.webp")):sharp(sheet).extract({left:(i%4)*w,top:Math.floor(i/4)*h,width:w,height:h});
  await art.resize(width,Math.round(width*355/252),{fit:"fill"}).webp({quality:82}).toFile(path.join(media,(i<0?"back":"face-"+i)+"-"+width+".webp"));
 }
}
console.log("Generated individual responsive public card artwork (17 faces, two resolutions)");
