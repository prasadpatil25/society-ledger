// /api/templates/:id — PUT update (auth), DELETE (auth).
import { json, requireAuth, parseTemplate } from "../_utils.js";

export async function onRequestPut({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  let b; try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const t = parseTemplate(b);
  if (t.error) return json({ error: t.error }, 400);
  await env.DB
    .prepare("UPDATE templates SET label=?,particulars=?,type=?,amount=?,category=?,member=?,mode=? WHERE id=?")
    .bind(t.label, t.particulars, t.type, t.amount, t.category, t.member, t.mode, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  const id = Number(params.id);
  if (!id) return json({ error: "Bad id" }, 400);
  await env.DB.prepare("DELETE FROM templates WHERE id=?").bind(id).run();
  return json({ ok: true });
}
