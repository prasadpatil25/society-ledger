// GET /api/session — tells the admin page whether it's signed in.
import { json, requireAuth } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const p = await requireAuth(request, env);
  return json({ authed: !!p, user: p ? p.sub : null });
}
