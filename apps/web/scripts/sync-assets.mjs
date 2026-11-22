import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const base = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(base, "../../../");
const target = path.resolve(base, "../public/pilehead/assets");
await mkdir(target, { recursive: true });
for (const name of ["stack-characters.webp", "stack-sheet.webp", "stack-back.webp"]) {
  await copyFile(path.join(repo, "dist/pilehead/assets", name), path.join(target, name));
}
console.log("STACK card artwork synchronized from the canonical deck assets");
