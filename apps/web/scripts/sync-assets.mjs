import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const base = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(base, "../../../");
const target = path.resolve(base, "../public/pilehead/assets");
await mkdir(target, { recursive: true });
const vendor = path.resolve(base, "../vendor");
await mkdir(vendor, { recursive: true });
await copyFile(path.join(repo, "dist/pilehead/engine.js"), path.join(vendor, "pilehead-engine.cjs"));
for (const name of ["stack-characters.webp", "stack-sheet.webp", "stack-back.webp"]) {
  await copyFile(path.join(repo, "dist/pilehead/assets", name), path.join(target, name));
}
console.log("STACK engine and card artwork synchronized from canonical sources");
