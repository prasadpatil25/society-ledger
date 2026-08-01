// PUT/DELETE /api/years/:id — edit or remove a financial year (auth required).
// Deleting a year removes only the viewing window, never the entries themselves.
import { json, requireAuth, validYear, listYears } from "../_utils.js";

export async function onRequestPut({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!validYear(b)) return json({ error: "Invalid year" }, 400);
  const yrs = await listYears(env);
  const clash = yrs.find(y => y.id !== id && b.fy_start <= y.fy_end && y.fy_start <= b.fy_end);
  if (clash) return json({ error: `Dates overlap ${clash.label} (${clash.fy_start} to ${clash.fy_end}). Years can't overlap.` }, 400);
  await env.DB.prepare("UPDATE years SET label=?, fy_start=?, fy_end=? WHERE id=?")
    .bind(b.label.trim(), b.fy_start, b.fy_end, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  const { c } = await env.DB.prepare("SELECT COUNT(*) AS c FROM years").first();
  if (c <= 1) return json({ error: "Can't delete the only year" }, 400);
  await env.DB.prepare("DELETE FROM years WHERE id=?").bind(id).run();
  return json({ ok: true });
}
