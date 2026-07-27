// POST /api/login { username, password } — issues an HttpOnly session cookie.
import { json, verifyPassword, makeToken, cookie } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const user = String(body.username || "").trim();
  const expectedUser = env.ADMIN_USERNAME || "admin";
  const ok = user.toLowerCase() === expectedUser.toLowerCase()
    && await verifyPassword(String(body.password || ""), env.ADMIN_PASSWORD_HASH || "");
  if (!ok) return json({ error: "Invalid username or password" }, 401);
  const token = await makeToken({ sub: user }, env.SESSION_SECRET || "", 86400);
  return json({ ok: true }, 200, { "Set-Cookie": cookie("sess", token, { maxAge: 86400 }) });
}
