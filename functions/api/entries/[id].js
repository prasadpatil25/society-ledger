// PUT/DELETE /api/entries/:id — edit or delete an entry (auth required).
import { json, requireAuth, validEntry, normalizeEntry } from "../_utils.js";

export async function onRequestPut({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!validEntry(body)) return json({ error: "Invalid entry" }, 400);
  const e = normalizeEntry(body);
  await env.DB
    .prepare("UPDATE entries SET date=?, particulars=?, type=?, amount=?, category=?, member=?, mode=? WHERE id=?")
    .bind(e.date, e.particulars, e.type, e.amount, e.category, e.member, e.mode, id)
    .run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  await env.DB.prepare("DELETE FROM entries WHERE id=?").bind(id).run();
  return json({ ok: true });
}
