// POST /api/years — add a financial year (auth required).
import { json, requireAuth, validYear, listYears } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!validYear(b)) return json({ error: "Invalid year" }, 400);
  const yrs = await listYears(env);
  const clash = yrs.find(y => b.fy_start <= y.fy_end && y.fy_start <= b.fy_end);
  if (clash) return json({ error: `Dates overlap ${clash.label} (${clash.fy_start} to ${clash.fy_end}). Years can't overlap.` }, 400);
  const r = await env.DB
    .prepare("INSERT INTO years(label, fy_start, fy_end) VALUES(?, ?, ?)")
    .bind(b.label.trim(), b.fy_start, b.fy_end).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
