// Shared rendering + computation for the society ledger.
// Pure client-side: takes {meta, entries} from /api/ledger and paints the page.

export const fmt = n => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n || 0));

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtDate(iso){ if(!iso) return ""; const [y,m,d] = String(iso).split("-"); return d ? `${d} ${MON[+m-1]} ${y}` : iso; }
export function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

const $ = id => document.getElementById(id);

// Compute the balance sheet for the selected period.
export function computeView(meta, entries){
  const start = meta.fy_start, end = meta.fy_end;
  const opening = parseFloat(meta.opening || "0");
  const due = parseFloat(meta.due || "0");

  const inRange = entries
    .filter(e => e.date >= start && e.date <= end)
    .sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id - b.id));

  let bal = opening, totalIn = 0, totalOut = 0;
  const rows = inRange.map(e => {
    if(e.type === "credit"){ bal += e.amount; totalIn += e.amount; }
    else { bal -= e.amount; totalOut += e.amount; }
    return { ...e, bal };
  });

  const members = {};
  rows.filter(r=>r.type==="credit" && r.member).forEach(r => members[r.member] = (members[r.member]||0) + r.amount);
  const byMember = Object.entries(members).map(([name,amt])=>({name,amt})).sort((a,b)=>b.amt-a.amt);

  const cats = {};
  rows.filter(r=>r.type==="debit").forEach(r => { const k = r.category||"Other"; cats[k] = (cats[k]||0) + r.amount; });
  const byCategory = Object.entries(cats).map(([name,amt])=>({name,amt})).sort((a,b)=>b.amt-a.amt);

  const outside = entries.length - inRange.length;
  return { rows, opening, due, totalIn, totalOut, closing: opening + totalIn - totalOut, byMember, byCategory, outside };
}

const CAT_COLORS = { Electricity:"#c08a1e", Water:"#2f7d8a", Sweeper:"#a83f2b", Cleaning:"#5b7a5b", Repair:"#8a5b7a" };

// Paint everything. opts: { editable, filter, query }
export function renderLedger(data, opts = {}){
  const { meta } = data;
  const v = computeView(meta, data.entries);
  const editable = !!opts.editable, filter = opts.filter || "all", query = (opts.query||"").trim().toLowerCase();

  if($("socName")) $("socName").textContent = meta.name || "Society";
  if($("period")) $("period").textContent = `${fmtDate(meta.fy_start)} – ${fmtDate(meta.fy_end)}`;
  $("closing").textContent = fmt(v.closing);
  $("totalIn").textContent = fmt(v.totalIn);
  $("totalOut").textContent = fmt(v.totalOut);
  $("asOn").textContent = v.rows.length ? `As on last entry, ${fmtDate(v.rows[v.rows.length-1].date)}` : "No entries in this period yet";
  $("ledgerMeta").textContent = `${v.rows.length} entries in period` + (v.outside ? ` · ${v.outside} outside` : "");
  if($("computedNote")) $("computedNote").textContent = `${v.rows.length} entries · opening ${fmt(v.opening)}`;

  const paid = v.byMember.filter(m => v.due>0 && m.amt >= v.due).length;
  $("collMeta").textContent = `${paid}/${v.byMember.length} paid in full · ${fmt(v.totalIn)} in · ${fmt(v.totalOut)} out`;
  $("incomeBars").innerHTML = v.byMember.length ? v.byMember.map(m=>{
    const pct = v.due>0 ? Math.min(100, Math.round(m.amt/v.due*100)) : 100;
    const done = v.due>0 && m.amt >= v.due;
    return `<div class="bar${done?'':' pending'}"><div class="top"><span class="name">${esc(m.name)}</span>
      <span><span class="amt cr">${fmt(m.amt)}</span> · <span class="status">${done?'Paid':(v.due>0?pct+'%':'')}</span></span></div>
      <div class="trk"><div class="fill" style="width:${pct}%;background:var(--credit)"></div></div></div>`;
  }).join("") : `<div class="muted">No collections recorded in this period.</div>`;

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
    if(query && !(`${r.particulars} ${r.date} ${r.member||""} ${r.category||""}`.toLowerCase().includes(query))) return false;
    return true;
  });
  if($("empty")) $("empty").hidden = shown.length>0;
  let rowsHtml = shown.map((r,i)=>{
    const cr = r.type==="credit"?r.amount:0, db = r.type==="debit"?r.amount:0;
    const tag = r.category ? esc(r.category) : (r.mode?esc(r.mode):"");
    const tagHtml = tag ? `<div class="tag">${tag}${r.member?` · ${esc(r.member)}`:""}</div>` : (r.member?`<div class="tag">${esc(r.member)}</div>`:"");
    const act = editable ? `<td class="r"><span class="rowact">
        <button class="btn btn-sm" data-edit="${r.id}">Edit</button>
        <button class="btn btn-sm btn-danger" data-del="${r.id}">Delete</button></span></td>` : "";
    return `<tr>
      <td class="folio">${String(i+1).padStart(2,'0')}</td>
      <td class="date">${fmtDate(r.date)}</td>
      <td>${esc(r.particulars)}${tagHtml}</td>
      <td class="r num ${cr?'cr':''}">${cr?fmt(cr):'—'}</td>
      <td class="r num ${db?'db':''}">${db?fmt(db):'—'}</td>
      <td class="r num bal">${fmt(r.bal)}</td>${act}</tr>`;
  }).join("");

  if (shown.length) {
    const shownIn  = shown.reduce((s,r)=> s + (r.type==="credit"?r.amount:0), 0);
    const shownOut = shown.reduce((s,r)=> s + (r.type==="debit" ?r.amount:0), 0);
    const label = filter==="credit" ? `Total money in · ${shown.length}`
                : filter==="debit"  ? `Total money out · ${shown.length}`
                : `Total · ${shown.length} entries`;
    const actCell = editable ? "<td></td>" : "";
    rowsHtml += `<tr class="total-row">
      <td></td><td></td>
      <td>${label}</td>
      <td class="r num cr">${shownIn?fmt(shownIn):'—'}</td>
      <td class="r num db">${shownOut?fmt(shownOut):'—'}</td>
      <td class="r num bal">${fmt(v.closing)}</td>${actCell}</tr>`;
  }
  $("rows").innerHTML = rowsHtml;

  return v;
}

function drawChart(series, rows, closing){
  const el = $("chart"); if(!el) return;
  const W=600,H=190,padL=6,padR=6,padT=14,padB=22;
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  if(series.length < 2){ el.innerHTML = `<text class="axis" x="${W/2}" y="${H/2}" text-anchor="middle">Add entries to see the balance curve</text>`; return; }
  const max=Math.max(...series), min=Math.min(0,...series);
  const x = i => padL + i*(W-padL-padR)/(series.length-1);
  const y = val => padT + (1-(val-min)/((max-min)||1))*(H-padT-padB);
  const line = series.map((val,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length-1).toFixed(1)} ${y(min)} L${x(0)} ${y(min)} Z`;
  el.innerHTML = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#a9822f" stop-opacity=".22"/><stop offset="1" stop-color="#a9822f" stop-opacity="0"/></linearGradient></defs>
    <line x1="${padL}" y1="${y(min)}" x2="${W-padR}" y2="${y(min)}" stroke="#dbe2db"/>
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="#12302b" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(series.length-1)}" cy="${y(closing)}" r="4" fill="#0f6b4f"/>
    <text class="axis" x="${padL}" y="${H-6}">${rows.length?fmtDate(rows[0].date):''}</text>
    <text class="axis" x="${W-padR}" y="${H-6}" text-anchor="end">${rows.length?fmtDate(rows[rows.length-1].date):''}</text>
    <text class="axis" x="${W-padR}" y="${y(max)-4}" text-anchor="end">peak ${fmt(max)}</text>`;
}
