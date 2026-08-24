import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modules = [
  "lib/clubs.js",
  "lib/class-notices.js",
  "lib/data.js",
  "lib/email.js",
  "lib/http.js",
  "lib/notice.js",
  "lib/security.js",
  "functions/api/clubs.js",
  "functions/api/register.js",
  "functions/api/admin/login.js",
  "functions/api/admin/registrations.js",
  "functions/api/admin/decision.js",
  "functions/api/admin/notice.js",
  "functions/api/admin/notices.js",
  "functions/api/admin/class-notices.js",
  "functions/api/admin/registration.js",
];
const projectFiles = [
  "index.html",
  "admin.html",
  "app.js",
  "admin.js",
  "styles.css",
  "db/schema.sql",
  "wrangler.jsonc",
];

for (const modulePath of modules) {
  await import(pathToFileURL(resolve(root, modulePath)));
}

for (const file of projectFiles) {
  const path = resolve(root, file);
  await access(path);
  if (!(await readFile(path, "utf8")).trim()) {
    throw new Error(`${file} is empty`);
  }
}

console.log(`Checked ${modules.length} modules and ${projectFiles.length} project files.`);
