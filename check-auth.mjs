// Run from the project root:  node check-auth.mjs
// Tells you whether your local secrets file holds a hash that matches 'test1234',
// and where the problem is if login is failing.
import { readFileSync, existsSync } from "node:fs";
import { verifyPassword } from "./functions/api/_utils.js";

const file = existsSync(".dev.vars") ? ".dev.vars" : existsSync(".env") ? ".env" : null;
if (!file) {
  console.log("VERDICT: No .dev.vars (or .env) file found in this folder.");
  console.log("→ Create .dev.vars in the same folder as wrangler.toml. See steps below.");
  process.exit(1);
}
console.log("Reading:", file);

const env = {};
for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  let v = line.slice(i + 1).trim();
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
  env[line.slice(0, i).trim()] = v;
}

const hash = env.ADMIN_PASSWORD_HASH || "";
const len = hash.length;
const ok = await verifyPassword("test1234", hash);

console.log("ADMIN_USERNAME    =", JSON.stringify(env.ADMIN_USERNAME), "(login expects this, or 'admin' if unset)");
console.log("hash present?     =", !!hash, "| length =", len, "(healthy ≈ 104)");
console.log("verify 'test1234' =", ok);
console.log("-----");

if (!hash) {
  console.log("VERDICT: ADMIN_PASSWORD_HASH line is missing or misnamed in", file + ".");
} else if (len < 90) {
  console.log("VERDICT: The hash looks TRUNCATED — the $ signs were eaten by the parser.");
  console.log("→ Wrap the value in SINGLE quotes:  ADMIN_PASSWORD_HASH='210000$...$...'");
} else if (!ok) {
  console.log("VERDICT: Hash is intact but does NOT match 'test1234'.");
  console.log("→ It was generated for a different password. Re-run: node hash-password.mjs 'test1234'");
  console.log("  and paste the new value (single-quoted) into", file + ".");
} else {
  console.log("VERDICT: Your hash is CORRECT for 'test1234'.");
  console.log("→ So login failing means wrangler isn't loading", file, "into the server.");
  console.log("  Fixes: (1) fully restart `wrangler pages dev` after editing the file;");
  console.log("         (2) confirm the file is named exactly", file, "and sits next to wrangler.toml;");
  console.log("         (3) on wrangler 4.47+ try renaming .dev.vars to .env (same format).");
}
