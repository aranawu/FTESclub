import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const publicFiles = [
  "index.html",
  "admin.html",
  "app.js",
  "admin.js",
  "styles.css",
  "_headers",
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of publicFiles) {
  await cp(resolve(root, file), resolve(dist, file));
}

console.log(`Built ${publicFiles.length} public files in ${dist}`);
