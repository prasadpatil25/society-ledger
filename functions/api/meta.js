// PUT /api/meta — society-level settings (auth required).
import { json, requireAuth } from "./_utils.js";
const ALLOWED = ["name", "opening", "due"];

export async function onRequestPut({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const stmts = [];
  for (const k of ALLOWED) {
    if (k in body) {
      stmts.push(env.DB
        .prepare("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(k, String(body[k])));
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
}
