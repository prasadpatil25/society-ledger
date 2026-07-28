// Shared helpers for the API. Underscore prefix = not a route, importable.
const enc = new TextEncoder();
const dec = new TextDecoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function cookie(name, value, { maxAge } = {}) {
  let s = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  if (maxAge != null) s += `; Max-Age=${maxAge}`;
  return s;
}

// --- base64url ---
function b64url(bytes) {
  const b = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}
function hexToBytes(h) {
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
}
function bytesToHex(b) {
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// --- HMAC session token: base64url(payload).base64url(sig) ---
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
export async function makeToken(payload, secret, ttl = 86400) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttl };
  const bodyStr = b64url(enc.encode(JSON.stringify(body)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(bodyStr));
  return bodyStr + "." + b64url(sig);
}
export async function verifyToken(token, secret) {
  if (!token || !secret || token.indexOf(".") < 0) return null;
  const [bodyStr, sig] = token.split(".");
  const expected = b64url(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(bodyStr)));
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    const body = JSON.parse(dec.decode(b64urlToBytes(bodyStr)));
    if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch { return null; }
}

// --- PBKDF2 password check. stored format: "iterations$saltHex$hashHex" ---
export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = String(stored).split(/[$.]/);
  if (parts.length !== 3) return false;
  const [iterStr, saltHex, hashHex] = parts;
  const iterations = parseInt(iterStr, 10);
  if (!iterations || !saltHex || !hashHex) return false;
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
    keyMaterial, 256
  );
  return timingSafeEqual(bytesToHex(bits), hashHex);
}

export async function requireAuth(request, env) {
  return await verifyToken(getCookie(request, "sess"), env.SESSION_SECRET || "");
}

export async function getSociety(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM meta").all();
  const m = {};
  (results || []).forEach(r => { m[r.key] = r.value; });
  return {
    name: m.name || "Society",
    opening: parseFloat(m.opening || "0"),   // genesis: balance before the first year
    due: m.due || "0",
  };
}

export async function listYears(env) {
  const { results } = await env.DB
    .prepare("SELECT id, label, fy_start, fy_end FROM years ORDER BY fy_start")
    .all();
  return results || [];
}

export function validYear(b) {
  return b &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.fy_start || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.fy_end || "") &&
    (b.fy_start <= b.fy_end) &&
    String(b.label || "").trim().length > 0;
}

export function validEntry(b) {
  return b &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") &&
    (b.type === "credit" || b.type === "debit") &&
    Number(b.amount) > 0 &&
    String(b.particulars || "").trim().length > 0;
}

export function normalizeEntry(b) {
  return {
    date: b.date,
    particulars: String(b.particulars).trim().slice(0, 200),
    type: b.type,
    amount: Number(b.amount),
    category: b.type === "debit" ? (b.category ? String(b.category).trim().slice(0, 60) : null) : "Maintenance",
    member: b.type === "credit" ? (b.member ? String(b.member).trim().slice(0, 80) : null) : null,
    mode: b.type === "credit" ? (b.mode ? String(b.mode).trim().slice(0, 40) : null) : null,
  };
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP")
    || request.headers.get("X-Forwarded-For")
    || "unknown";
}

export async function listMembers(env, includeContact = false) {
  const cols = includeContact ? "id, flat, name, contact, active" : "id, flat, name, active";
  const { results } = await env.DB
    .prepare(`SELECT ${cols} FROM members ORDER BY (flat IS NULL), flat, name`)
    .all();
  return results || [];
}
