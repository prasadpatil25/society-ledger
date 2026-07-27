// Usage: node hash-password.mjs 'your-admin-password'
// Prints the value to store as the ADMIN_PASSWORD_HASH secret.
import { pbkdf2Sync, randomBytes } from "node:crypto";

const pw = process.argv[2];
if (!pw) { console.error("Usage: node hash-password.mjs 'your-password'"); process.exit(1); }

const iterations = 100000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(pw, salt, iterations, 32, "sha256");
console.log(`${iterations}.${salt.toString("hex")}.${hash.toString("hex")}`);
