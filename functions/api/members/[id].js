// /api/members/:id — PUT update (auth), DELETE (auth).
// Renaming a member cascades the new name onto their existing entries.
import { json, requireAuth } from "../_utils.js";

export async function onRequestPut({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const name = String(b.name || "").trim();
  if (!name) return json({ error: "Name is required" }, 400);
  const flat = b.flat ? String(b.flat).trim().slice(0, 20) : null;
  const contact = b.contact ? String(b.contact).trim().slice(0, 120) : null;
  const active = (b.active === 0 || b.active === false || b.active === "0") ? 0 : 1;

  const cur = await env.DB.prepare("SELECT name FROM members WHERE id=?").bind(id).first();
  if (!cur) return json({ error: "Not found" }, 404);

  const stmts = [
    env.DB.prepare("UPDATE members SET flat=?, name=?, contact=?, active=? WHERE id=?")
      .bind(flat, name, contact, active, id)
  ];
  if (cur.name !== name) {
    stmts.push(env.DB.prepare("UPDATE entries SET member=? WHERE member=?").bind(name, cur.name));
  }
  await env.DB.batch(stmts);
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  await env.DB.prepare("DELETE FROM members WHERE id=?").bind(id).run();
  return json({ ok: true });
}
