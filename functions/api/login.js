// POST /api/login { username, password } — with per-IP rate limiting.
import { json, verifyPassword, makeToken, cookie, clientIp } from "./_utils.js";

const MAX_FAILS = 5;          // failures allowed within the window
const WINDOW = 15 * 60;       // seconds over which failures accumulate
const LOCKOUT = 15 * 60;      // seconds an IP is locked after hitting MAX_FAILS

function human(sec) {
  const m = Math.ceil(sec / 60);
  return m <= 1 ? "about a minute" : `about ${m} minutes`;
}

export async function onRequestPost({ request, env }) {
  const now = Math.floor(Date.now() / 1000);
  const ip = clientIp(request);

  const rec = await env.DB
    .prepare("SELECT fails, window_start, locked_until FROM login_attempts WHERE ip=?")
    .bind(ip).first();

  // currently locked out?
  if (rec && rec.locked_until && rec.locked_until > now) {
    return json({ error: `Too many attempts. Try again in ${human(rec.locked_until - now)}.` }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const user = String(body.username || "").trim();
  const expectedUser = env.ADMIN_USERNAME || "admin";
  const ok = user.toLowerCase() === expectedUser.toLowerCase()
    && await verifyPassword(String(body.password || ""), env.ADMIN_PASSWORD_HASH || "");

  if (ok) {
    await env.DB.prepare("DELETE FROM login_attempts WHERE ip=?").bind(ip).run();
    const token = await makeToken({ sub: user }, env.SESSION_SECRET || "", 86400);
    return json({ ok: true }, 200, { "Set-Cookie": cookie("sess", token, { maxAge: 86400 }) });
  }

  // register the failure (reset the counter if the window has elapsed)
  let fails, windowStart;
  if (!rec || (now - rec.window_start) > WINDOW) { fails = 1; windowStart = now; }
  else { fails = rec.fails + 1; windowStart = rec.window_start; }
  const lockedUntil = fails >= MAX_FAILS ? now + LOCKOUT : 0;

  await env.DB.prepare(
    "INSERT INTO login_attempts(ip, fails, window_start, locked_until) VALUES(?,?,?,?) " +
    "ON CONFLICT(ip) DO UPDATE SET fails=excluded.fails, window_start=excluded.window_start, locked_until=excluded.locked_until"
  ).bind(ip, fails, windowStart, lockedUntil).run();

  if (lockedUntil) {
    return json({ error: `Too many attempts. Try again in ${human(LOCKOUT)}.` }, 429);
  }
  const left = MAX_FAILS - fails;
  return json({ error: `Invalid username or password. ${left} attempt${left === 1 ? "" : "s"} left.` }, 401);
}
