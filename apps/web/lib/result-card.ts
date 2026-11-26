"use client";
export type ResultCardData={kind:"first"|"escaped"|"loss";headline:string[];players:number;moves:number};
const Core=require("./result-card-core.cjs") as {resultCard:(input:{phase:string;kind:string;players:number;moves:number;drill:boolean})=>ResultCardData|null};
export const resultCardData=Core.resultCard;
async function asset(path:string){
 const res=await fetch(path,{credentials:"omit",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(8000)});
 if(!res.ok)throw Error("asset_unavailable");return res;
}
function fitText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,size:number){
 let px=size;
 do{ctx.font=`italic 900 ${px}px PileheadsResult`;if(ctx.measureText(text).width<=max)break;px-=2;}while(px>24);
 ctx.fillText(text,x,y);
}
function fitImage(ctx:CanvasRenderingContext2D,image:ImageBitmap,x:number,y:number,w:number,h:number){
 const scale=Math.min(w/image.width,h/image.height),width=image.width*scale,height=image.height*scale;
 ctx.drawImage(image,x+(w-width)/2,y+(h-height)/2,width,height);
}
export async function renderResultCard(data:ResultCardData):Promise<Blob>{
 const [logoRes,backRes,fontRes]=await Promise.all([
  asset("/stack-media/stack-home-logo-web.webp"),asset("/stack-media/stack-home-back-web.webp"),asset("/stack-media/barlow-condensed-black-italic.ttf")
 ]);
 const logo=await createImageBitmap(await logoRes.blob());
 let back:ImageBitmap|undefined,font:FontFace|undefined;
 try{
  back=await createImageBitmap(await backRes.blob());
  font=new FontFace("PileheadsResult",await fontRes.arrayBuffer(),{style:"italic",weight:"900"});
  await font.load();document.fonts.add(font);
  const c=document.createElement("canvas");c.width=1080;c.height=1350;
  const ctx=c.getContext("2d");if(!ctx)throw Error("canvas_unavailable");
  const paper="#F9EBCB",ink="#191B19",accent=data.kind==="loss"?"#CE302D":"#119C9E";
  ctx.fillStyle=paper;ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle=ink;ctx.lineWidth=7;ctx.strokeRect(36,36,1008,1278);
  ctx.fillStyle=accent;ctx.fillRect(65,65,950,19);
  ctx.fillStyle=ink;ctx.globalAlpha=.12;
  for(let x=80;x<235;x+=18)for(let y=118;y<265;y+=18){ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill();}
  for(let x=845;x<1000;x+=18)for(let y=118;y<265;y+=18){ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  fitImage(ctx,logo,390,103,300,168);
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle=ink;fitText(ctx,"ROUND COMPLETE",540,304,850,42);
  ctx.fillStyle=ink;fitText(ctx,data.headline[0],540,403,930,142);
  ctx.fillStyle=accent;fitText(ctx,data.headline[1],540,516,930,data.kind==="first"?66:132);
  ctx.fillStyle="#F6C32C";ctx.beginPath();ctx.arc(540,799,214,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.stroke();
  ctx.save();ctx.translate(540,799);ctx.rotate(-.16);
  // Preserve the real back's aspect ratio. It is decorative, not a played card.
  fitImage(ctx,back,-142,-198,284,396);ctx.restore();
  ctx.fillStyle=ink;ctx.fillRect(100,1030,880,4);
  ctx.font="italic 900 78px PileheadsResult";
  ctx.fillText(String(data.moves),320,1110);ctx.fillText(String(data.players),760,1110);
  ctx.font="700 26px Arial";ctx.fillText("MOVES",320,1168);ctx.fillText("PLAYERS",760,1168);
  ctx.fillStyle=ink;ctx.fillRect(100,1210,880,72);
  ctx.fillStyle=paper;fitText(ctx,"PLAY FREE · PILEHEADS.COM",540,1246,830,44);
  return await new Promise<Blob>((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error("png_failed")),"image/png"));
 }finally{logo.close();back?.close();if(font)document.fonts.delete(font);}
}
export async function downloadResultCard(data:ResultCardData){
 const blob=await renderResultCard(data),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="pileheads-round-result.png";document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
