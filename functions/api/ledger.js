// GET /api/ledger?year=<id> — public, read-only.
// Returns the selected year's meta (opening chained from prior years),
// that year's entries, and the full list of years for the selector.
import { json, getSociety, listYears, listMembers } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const society = await getSociety(env);
  const years = await listYears(env);
  const members = await listMembers(env, false);
  let monthlyCategories = [];
  try {
    const mc = await env.DB.prepare("SELECT DISTINCT category FROM templates WHERE monthly=1 AND type='debit' AND category IS NOT NULL").all();
    monthlyCategories = (mc.results || []).map(r => r.category);
  } catch (e) { /* 'monthly' column not migrated yet — feature stays dormant */ }

  if (!years.length) {
    return json({
      meta: { name: society.name, due: society.due, opening: society.opening,
              fy_start: "2025-04-01", fy_end: "2026-03-31", label: "—", year_id: null },
      years: [], members: [], entries: [], monthlyCategories
    });
  }

  const wanted = parseInt(url.searchParams.get("year") || "", 10);
  const year = years.find(y => y.id === wanted) || years[years.length - 1]; // default: latest

  // opening = genesis + net of every entry dated before this year starts
  const before = await env.DB
    .prepare("SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) AS net FROM entries WHERE date < ?")
    .bind(year.fy_start).first();
  const opening = society.opening + (before ? before.net : 0);

  const { results } = await env.DB
    .prepare("SELECT id, date, particulars, type, amount, category, member, mode FROM entries WHERE date >= ? AND date <= ? ORDER BY date, id")
    .bind(year.fy_start, year.fy_end).all();

  return json({
    meta: { name: society.name, due: society.due, opening,
            fy_start: year.fy_start, fy_end: year.fy_end, label: year.label, year_id: year.id },
    society_opening: society.opening,   // genesis balance (before the first year), for the admin field
    years,
    members,
    monthlyCategories,
    entries: results || []
  });
}
