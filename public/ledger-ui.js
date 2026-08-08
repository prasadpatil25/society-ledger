// Shared rendering + computation for the society ledger.
// Pure client-side: takes {meta, entries} from /api/ledger and paints the page.

export const fmt = n => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n || 0));

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtDate(iso){ if(!iso) return ""; const [y,m,d] = String(iso).split("-"); return d ? `${d} ${MON[+m-1]} ${y}` : iso; }
export function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

const $ = id => document.getElementById(id);

// Compute the balance sheet for the selected period.
export function computeView(meta, entries, members){
  const start = meta.fy_start, end = meta.fy_end;
  const opening = parseFloat(meta.opening || "0");
  const due = parseFloat(meta.due || "0");

  const inRange = entries
    .filter(e => e.date >= start && e.date <= end)
    .sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id - b.id));

  let bal = opening, totalIn = 0, totalOut = 0;
  const rows = inRange.map((e, i) => {
    if(e.type === "credit"){ bal += e.amount; totalIn += e.amount; }
    else { bal -= e.amount; totalOut += e.amount; }
    return { ...e, bal, seq: i + 1 };
  });

  const paidByName = {};
  rows.filter(r=>r.type==="credit" && r.member).forEach(r => paidByName[r.member] = (paidByName[r.member]||0) + r.amount);
  const roster = (members || []).filter(m => m.active !== 0);
  const seen = new Set();
  const byMember = [];
  roster.forEach(m => { seen.add(m.name); byMember.push({ name:m.name, flat:m.flat||"", paid:paidByName[m.name]||0 }); });
  Object.keys(paidByName).forEach(n => { if(!seen.has(n)) byMember.push({ name:n, flat:"", paid:paidByName[n] }); });
  byMember.forEach(d => {
    d.due = due;
    d.outstanding = due > 0 ? Math.max(0, due - d.paid) : 0;
    d.status = due <= 0 ? "paid" : d.paid >= due ? "paid" : d.paid > 0 ? "partial" : "unpaid";
  });
  byMember.sort((a,b) => b.outstanding - a.outstanding || b.paid - a.paid || a.name.localeCompare(b.name));
  const outstandingTotal = byMember.reduce((s,d)=>s+d.outstanding, 0);
  const unpaidCount = byMember.filter(d => d.outstanding > 0).length;

  const cats = {};
  rows.filter(r=>r.type==="debit").forEach(r => { const k = r.category||"Other"; cats[k] = (cats[k]||0) + r.amount; });
  const byCategory = Object.entries(cats).map(([name,amt])=>({name,amt})).sort((a,b)=>b.amt-a.amt);

  const outside = entries.length - inRange.length;
  return { rows, opening, due, totalIn, totalOut, closing: opening + totalIn - totalOut, byMember, byCategory, outside, outstandingTotal, unpaidCount };
}

const CAT_COLORS = { Electricity:"#c08a1e", Water:"#2f7d8a", Sweeper:"#a83f2b", Cleaning:"#5b7a5b", Repair:"#8a5b7a" };

// Paint everything. opts: { editable, filter, query }
export function renderLedger(data, opts = {}){
  const { meta } = data;
  const v = computeView(meta, data.entries, data.members);
  try { renderGaps(meta, data.entries, data.monthlyCategories || []); } catch(err){ console.error("gap notice skipped:", err); }
  const editable = !!opts.editable, filter = opts.filter || "all", query = (opts.query||"").trim().toLowerCase();
  const category = opts.category || "", sortKey = opts.sortKey || "", sortDir = opts.sortDir || "asc";

  if($("socName")) $("socName").textContent = meta.name || "Society";
  if($("period")) $("period").textContent = `${fmtDate(meta.fy_start)} – ${fmtDate(meta.fy_end)}`;
  const ph = $("printHead");
  if(ph) ph.innerHTML = `<div class="print-title">${esc(meta.name||"Society")} — Cash Book</div>`
    + `<div class="print-sub">${esc(meta.label||"")}${meta.label?" · ":""}${fmtDate(meta.fy_start)} – ${fmtDate(meta.fy_end)} · Generated ${new Date().toLocaleDateString("en-IN")}</div>`;
  $("closing").textContent = fmt(v.closing);
  $("totalIn").textContent = fmt(v.totalIn);
  $("totalOut").textContent = fmt(v.totalOut);
  $("asOn").textContent = v.rows.length ? `As on last entry, ${fmtDate(v.rows[v.rows.length-1].date)}` : "No entries in this period yet";
  $("ledgerMeta").textContent = `${v.rows.length} entries in period` + (v.outside ? ` · ${v.outside} outside` : "");
  if($("computedNote")) $("computedNote").textContent = `${v.rows.length} entries · opening ${fmt(v.opening)}`;

  $("collMeta").textContent = v.unpaidCount > 0
    ? `${fmt(v.outstandingTotal)} outstanding from ${v.unpaidCount} member${v.unpaidCount>1?"s":""} · ${fmt(v.totalIn)} collected`
    : (v.byMember.length ? `All paid · ${fmt(v.totalIn)} collected` : `${fmt(v.totalIn)} collected`);
  $("incomeBars").innerHTML = v.byMember.length ? v.byMember.map(m=>{
    const pct = m.due > 0 ? Math.min(100, Math.round(m.paid/m.due*100)) : 100;
    const label = (m.flat ? `${esc(m.flat)} · ` : "") + esc(m.name);
    const statusText = m.status === "paid" ? "Paid" : m.status === "unpaid" ? "Unpaid" : `${pct}%`;
    const rightSide = m.outstanding > 0
      ? `<span class="amt cr">${fmt(m.paid)}</span> · <span class="status">${statusText} · ${fmt(m.outstanding)} due</span>`
      : `<span class="amt cr">${fmt(m.paid)}</span> · <span class="status">Paid</span>`;
    return `<div class="bar${m.outstanding>0?' pending':''}"><div class="top"><span class="name">${label}</span>
      <span>${rightSide}</span></div>
      <div class="trk"><div class="fill" style="width:${pct}%;background:var(--credit)"></div></div></div>`;
  }).join("") : `<div class="muted">No members in the roster yet.</div>`;

  const cmax = Math.max(1, ...v.byCategory.map(c=>c.amt));
  $("expenseBars").innerHTML = v.byCategory.length ? v.byCategory.map(c=>`
    <div class="bar"><div class="top"><span class="name">${esc(c.name)}</span><span class="amt db">${fmt(c.amt)}</span></div>
    <div class="trk"><div class="fill" style="width:${Math.round(c.amt/cmax*100)}%;background:${CAT_COLORS[c.name]||'var(--debit)'}"></div></div></div>`).join("")
    : `<div class="muted">No spending recorded in this period.</div>`;

  drawChart([v.opening, ...v.rows.map(r=>r.bal)], v.rows, v.closing);

  // table
  const shown = v.rows.filter(r=>{
    if(filter==="credit" && r.type!=="credit") return false;
    if(filter==="debit" && r.type!=="debit") return false;
    if(category && (r.category||"") !== category) return false;
    if(query && !(`${r.particulars} ${r.date} ${r.member||""} ${r.category||""}`.toLowerCase().includes(query))) return false;
    return true;
  });
  if(sortKey){
    const dir = sortDir === "desc" ? -1 : 1;
    const keyval = r => sortKey==="date" ? r.date
      : sortKey==="particulars" ? r.particulars.toLowerCase()
      : sortKey==="in" ? (r.type==="credit"?r.amount:0)
      : sortKey==="out" ? (r.type==="debit"?r.amount:0)
      : sortKey==="balance" ? r.bal : r.seq;
    shown.sort((a,b)=>{ const av=keyval(a), bv=keyval(b); if(av<bv) return -dir; if(av>bv) return dir; return a.seq-b.seq; });
  }
  document.querySelectorAll(".ledger thead th[data-sort]").forEach(th=>{
    const active = th.dataset.sort === sortKey;
    th.classList.toggle("sorted", active);
    th.setAttribute("aria-sort", active ? (sortDir==="desc"?"descending":"ascending") : "none");
  });
  if($("empty")) $("empty").hidden = shown.length>0;
  // Band alternating month groups — only meaningful while rows are in date order.
  const bandable = !sortKey || sortKey === "date";
  let bandOn = false, prevYm = null;
  let rowsHtml = shown.map((r,i)=>{
    let bandCls = "";
    if(bandable && typeof r.date === "string"){
      const ym = r.date.slice(0,7);
      if(prevYm !== null && ym !== prevYm) bandOn = !bandOn;
      prevYm = ym;
      if(bandOn) bandCls = " month-band";
    }
    const cr = r.type==="credit"?r.amount:0, db = r.type==="debit"?r.amount:0;
    const tag = r.category ? esc(r.category) : (r.mode?esc(r.mode):"");
    const tagHtml = tag ? `<div class="tag">${tag}${r.member?` · ${esc(r.member)}`:""}</div>` : (r.member?`<div class="tag">${esc(r.member)}</div>`:"");
    const act = editable ? `<td class="r col-edit" data-label=""><span class="rowact">
        <button class="btn btn-sm" data-edit="${r.id}">Edit</button>
        <button class="btn btn-sm btn-danger" data-del="${r.id}">Delete</button></span></td>` : "";
    return `<tr class="${bandCls.trim()}">
      <td class="folio" data-label="#">${String(r.seq).padStart(2,'0')}</td>
      <td class="date" data-label="Date">${fmtDate(r.date)}</td>
      <td class="particulars" data-label="Particulars">${esc(r.particulars)}${tagHtml}</td>
      <td class="r num ${cr?'cr':'nil'}" data-label="In">${cr?fmt(cr):'—'}</td>
      <td class="r num ${db?'db':'nil'}" data-label="Out">${db?fmt(db):'—'}</td>
      <td class="r num bal" data-label="Balance">${fmt(r.bal)}</td>${act}</tr>`;
  }).join("");

  if (shown.length) {
    const shownIn  = shown.reduce((s,r)=> s + (r.type==="credit"?r.amount:0), 0);
    const shownOut = shown.reduce((s,r)=> s + (r.type==="debit" ?r.amount:0), 0);
    const label = filter==="credit" ? `Total money in · ${shown.length}`
                : filter==="debit"  ? `Total money out · ${shown.length}`
                : `Total · ${shown.length} entries`;
    const actCell = editable ? '<td class="col-edit nil"></td>' : "";
    rowsHtml += `<tr class="total-row">
      <td class="nil"></td><td class="nil"></td>
      <td class="particulars" data-label="">${label}</td>
      <td class="r num cr" data-label="Total in">${shownIn?fmt(shownIn):'—'}</td>
      <td class="r num db" data-label="Total out">${shownOut?fmt(shownOut):'—'}</td>
      <td class="r num bal" data-label="Balance">${fmt(v.closing)}</td>${actCell}</tr>`;
  }
  $("rows").innerHTML = rowsHtml;

  return v;
}

function drawChart(series, rows, closing){
  const el = $("chart"); if(!el) return;
  const cs = getComputedStyle(document.documentElement);
  const cvar = (n,f) => (cs.getPropertyValue(n).trim() || f);
  const cInk=cvar("--ink","#12302b"), cBrass=cvar("--brass","#a9822f"),
        cLine=cvar("--line","#dbe2db"), cCredit=cvar("--credit","#0f6b4f"), cCard=cvar("--card","#fbfcfa");
  const W=600,H=190,padL=6,padR=6,padT=14,padB=22;
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  if(series.length < 2){ el.innerHTML = `<text class="axis" x="${W/2}" y="${H/2}" text-anchor="middle">Add entries to see the balance curve</text>`; return; }
  const max=Math.max(...series), min=Math.min(0,...series);
  const x = i => padL + i*(W-padL-padR)/(series.length-1);
  const y = val => padT + (1-(val-min)/((max-min)||1))*(H-padT-padB);
  const line = series.map((val,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length-1).toFixed(1)} ${y(min)} L${x(0)} ${y(min)} Z`;
  el.innerHTML = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${cBrass}" stop-opacity=".22"/><stop offset="1" stop-color="${cBrass}" stop-opacity="0"/></linearGradient></defs>
    <line x1="${padL}" y1="${y(min)}" x2="${W-padR}" y2="${y(min)}" stroke="${cLine}"/>
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="${cInk}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(series.length-1)}" cy="${y(closing)}" r="4" fill="${cCredit}" stroke="${cCard}" stroke-width="1"/>
    <text class="axis" x="${padL}" y="${H-6}">${rows.length?fmtDate(rows[0].date):''}</text>
    <text class="axis" x="${W-padR}" y="${H-6}" text-anchor="end">${rows.length?fmtDate(rows[rows.length-1].date):''}</text>
    <text class="axis" x="${W-padR}" y="${y(max)-4}" text-anchor="end">peak ${fmt(max)}</text>`;
}

// Build a CSV of the currently loaded year for spreadsheets / backup.
export function buildCSV(data){
  const v = computeView(data.meta, data.entries);
  const cell = x => {
    if(x===null||x===undefined) return "";
    if(typeof x==="number") return String(x);
    const t=String(x);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g,'""')}"` : t;
  };
  const L=[];
  L.push(cell(`${data.meta.name||"Society"} — Cash Book`));
  L.push(cell(`${data.meta.label||""}  ${data.meta.fy_start} to ${data.meta.fy_end}`));
  L.push("");
  L.push(["#","Date","Particulars","Category","Member","Mode","In","Out","Balance"].map(cell).join(","));
  v.rows.forEach((r,i)=>{
    L.push([ i+1, r.date, r.particulars, r.category||"", r.member||"", r.mode||"",
      r.type==="credit"?r.amount:"", r.type==="debit"?r.amount:"", r.bal ].map(cell).join(","));
  });
  L.push("");
  L.push(["","","Total","","","", v.totalIn, v.totalOut, v.closing].map(cell).join(","));
  return L.join("\r\n");
}

// Flag elapsed months in the selected year that are missing an expected recurring entry.
function renderGaps(meta, entries, monthlyCats){
  const el = document.getElementById("gapNotice");
  if(!el) return;
  if(!monthlyCats.length || !meta.fy_start){ el.hidden = true; el.innerHTML = ""; return; }
  const today = new Date().toISOString().slice(0,10);
  const months = [];
  let d = new Date(meta.fy_start.slice(0,7) + "-01T00:00:00Z");
  const endD = new Date(meta.fy_end.slice(0,7) + "-01T00:00:00Z");
  while(d <= endD){
    const ym = d.toISOString().slice(0,7);
    d.setUTCMonth(d.getUTCMonth() + 1);           // move to next month
    if(d.toISOString().slice(0,10) <= today) months.push(ym);   // include only if that month has fully ended
  }
  if(!months.length){ el.hidden = true; el.innerHTML = ""; return; }
  const present = new Set();
  entries.filter(e => e.type === "debit" && e.category && typeof e.date === "string").forEach(e => present.add(e.category + "|" + e.date.slice(0,7)));
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const label = ym => `${MON[+ym.slice(5,7)-1]} ${ym.slice(0,4)}`;
  const gaps = [];
  monthlyCats.forEach(cat => {
    const miss = months.filter(m => !present.has(cat + "|" + m));
    if(miss.length) gaps.push({ cat, miss });
  });
  if(!gaps.length){ el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  el.innerHTML = `<strong>Possibly missing entries</strong> — no record found for: `
    + gaps.map(g => `${esc(g.cat)} (${g.miss.map(label).join(", ")})`).join("; ") + ".";
}
