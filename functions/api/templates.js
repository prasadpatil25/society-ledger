// /api/templates — GET list (auth), POST create (auth).
import { json, requireAuth, listTemplates, parseTemplate } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  return json({ templates: await listTemplates(env) });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const t = parseTemplate(b);
  if (t.error) return json({ error: t.error }, 400);
  const r = await env.DB
    .prepare("INSERT INTO templates(label,particulars,type,amount,category,member,mode,sort) VALUES(?,?,?,?,?,?,?,0)")
    .bind(t.label, t.particulars, t.type, t.amount, t.category, t.member, t.mode).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
