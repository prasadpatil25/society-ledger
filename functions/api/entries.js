// POST /api/entries — add an entry (auth required).
import { json, requireAuth, validEntry, normalizeEntry } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!validEntry(body)) return json({ error: "Invalid entry" }, 400);
  const e = normalizeEntry(body);
  const r = await env.DB
    .prepare("INSERT INTO entries(date, particulars, type, amount, category, member, mode) VALUES(?,?,?,?,?,?,?)")
    .bind(e.date, e.particulars, e.type, e.amount, e.category, e.member, e.mode)
    .run();
  return json({ ok: true, id: r.meta.last_row_id });
}
