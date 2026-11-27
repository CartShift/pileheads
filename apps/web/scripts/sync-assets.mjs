import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const base = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(base, "../../../");
const target = path.resolve(base, "../public/pilehead/assets");
await mkdir(target, { recursive: true });
const vendor = path.resolve(base, "../vendor");
await mkdir(vendor, { recursive: true });
const {renderBrowserBundle} = (await import("../../../scripts/sync-game-engine.cjs")).default;
await writeFile(path.join(vendor, "pilehead-engine.cjs"), renderBrowserBundle());
for (const name of ["stack-characters.webp", "stack-sheet.webp", "stack-back.webp", "stack-characters-v2.webp", "stack-back-v2.webp"]) {
  await copyFile(path.join(repo, "dist/pilehead/assets", name), path.join(target, name));
}
console.log("PILEHEADS engine and card artwork synchronized from canonical sources");

const sounds = ["play", "burn", "snap", "dump", "reset", "ghost", "under", "skip", "victory"];
await mkdir(path.join(target, "sound-v2"), { recursive: true });
for (const name of sounds) await copyFile(path.join(repo, "dist/pilehead/assets/sound-v2", name + ".mp3"), path.join(target, "sound-v2", name + ".mp3"));

await import("./social-card.mjs");
