import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const target = path.join(publicDir, "pwa");
await mkdir(target, { recursive: true });
const logo = path.join(publicDir, "stack-media/stack-home-logo-web.webp");
for (const [file, size, ratio] of [["icon-192.png",192,.85],["icon-512.png",512,.85],["apple-touch-icon.png",180,.85],["maskable-512.png",512,.68]]) {
  const width = Math.floor(size * ratio);
  const mark = await sharp(logo).resize(width,width,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await sharp({create:{width:size,height:size,channels:4,background:"#086879"}})
    .composite([{input:mark,gravity:"centre"}]).png().toFile(path.join(target,file));
}
