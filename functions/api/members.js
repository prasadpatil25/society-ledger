// /api/members — GET full roster (auth), POST create (auth).
import { json, requireAuth, listMembers } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  return json({ members: await listMembers(env, true) });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const name = String(b.name || "").trim();
  if (!name) return json({ error: "Name is required" }, 400);
  const flat = b.flat ? String(b.flat).trim().slice(0, 20) : null;
  const contact = b.contact ? String(b.contact).trim().slice(0, 120) : null;
  const r = await env.DB
    .prepare("INSERT INTO members(flat, name, contact, active) VALUES(?,?,?,1)")
    .bind(flat, name, contact).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
