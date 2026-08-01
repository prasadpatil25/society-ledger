// POST /api/entries/bulk { entries:[...] } — import many entries (auth).
// Skips rows that exactly match an existing entry (date + particulars + type + amount),
// so re-importing an exported file won't create duplicates.
import { json, requireAuth, validEntry, normalizeEntry } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "Unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!Array.isArray(body.entries)) return json({ error: "Expected an entries array" }, 400);

  const existing = await env.DB.prepare("SELECT date, particulars, type, amount, member, category FROM entries").all();
  const seen = new Set((existing.results || []).map(r => `${r.date}|${r.particulars}|${r.type}|${r.amount}|${r.member || ""}|${r.category || ""}`));
  const yrs = (await env.DB.prepare("SELECT fy_start, fy_end FROM years").all()).results || [];
  const covered = d => yrs.some(y => d >= y.fy_start && d <= y.fy_end);

  const stmts = [];
  let added = 0, skipped = 0, invalid = 0, outsideYears = 0;
  for (const raw of body.entries) {
    if (!validEntry(raw)) { invalid++; continue; }
    const e = normalizeEntry(raw);
    const key = `${e.date}|${e.particulars}|${e.type}|${e.amount}|${e.member || ""}|${e.category || ""}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    if (!covered(e.date)) outsideYears++;
    stmts.push(env.DB
      .prepare("INSERT INTO entries(date,particulars,type,amount,category,member,mode) VALUES(?,?,?,?,?,?,?)")
      .bind(e.date, e.particulars, e.type, e.amount, e.category, e.member, e.mode));
    added++;
  }
  // D1 batches are capped; chunk to stay safe on large imports.
  for (let i = 0; i < stmts.length; i += 50) {
    await env.DB.batch(stmts.slice(i, i + 50));
  }
  return json({ ok: true, added, skipped, invalid, outsideYears });
}
