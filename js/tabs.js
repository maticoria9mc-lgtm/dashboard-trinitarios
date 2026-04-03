// ─── Shared helpers ──────────────────────────────────────────────────────────
function makeSortable(table) {
  if (!table) return;
  table.querySelectorAll('thead th').forEach((th, col) => {
    let asc = true;
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      const rows = [...tbody.querySelectorAll('tr')];
      rows.sort((a, b) => {
        const aT = a.cells[col]?.textContent.trim() || '';
        const bT = b.cells[col]?.textContent.trim() || '';
        const an = parseFloat(aT.replace('%', ''));
        const bn = parseFloat(bT.replace('%', ''));
        if (!isNaN(an) && !isNaN(bn)) return asc ? an - bn : bn - an;
        return asc ? aT.localeCompare(bT) : bT.localeCompare(aT);
      });
      asc = !asc;
      rows.forEach(r => tbody.appendChild(r));
    });
  });
}

function toggleSub(id) { document.getElementById(id).classList.toggle('open'); }

function chartCard(title, refId, canvasId, extraClass = '') {
  return `<div class="chart-card">
    <h3>${title}</h3>
    <div class="ref-control" id="${refId}"></div>
    <div class="chart-wrap ${extraClass}"><canvas id="${canvasId}"></canvas></div>
  </div>`;
}

// ─── RESUMEN ─────────────────────────────────────────────────────────────────
function renderResumen() {
  const data    = State.currentGrouped;
  const players = data.filter(r => !r.IS_TOTAL);
  const avgs    = calcAvgs(players, ['eff_saque','eficacia_rec','eff_rec','eff_atq_rot','eficacia_atq','eff_contra','eficacia_contra','bloqueo','balance']);

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card accent"><div class="kpi-label">Jugadores</div><div class="kpi-value">${players.length}</div><div class="kpi-sub">en la selección actual</div></div>
    <div class="kpi-card blue"><div class="kpi-label">Ef. Recepción (prom.)</div><div class="kpi-value">${fmtPct(avgs.eff_rec)}</div><div class="kpi-sub">Total / Eficacia: ${fmtPct(avgs.eficacia_rec)}</div></div>
    <div class="kpi-card green"><div class="kpi-label">Ef. Ataque Rot. (prom.)</div><div class="kpi-value">${fmtPct(avgs.eff_atq_rot)}</div><div class="kpi-sub">Total / Eficacia: ${fmtPct(avgs.eficacia_atq)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Ef. Saque (prom.)</div><div class="kpi-value" style="color:#ce93d8">${fmtPct(avgs.eff_saque)}</div><div class="kpi-sub">S # – S = / STOT</div></div>
    <div class="kpi-card"><div class="kpi-label">Ef. Contraataque (prom.)</div><div class="kpi-value" style="color:#80cbc4">${fmtPct(avgs.eff_contra)}</div><div class="kpi-sub">Total / Eficacia: ${fmtPct(avgs.eficacia_contra)}</div></div>
  `;

  let html = `<table><thead><tr>
    <th>Jugador</th><th>Cat.</th>
    <th title="Cant. Saques">S Tot</th><th title="Aces">Aces</th><th title="Errores de Saque">S Err</th>
    <th title="Cant. Recepciones">R Tot</th><th title="Eficacia Recepción">Efic. Rec.</th><th title="Eficiencia Recepción">Ef. Rec.</th>
    <th title="Cant. Ataques Rotación">Atq Tot</th><th title="Eficacia Ataque Rotación">Efic. Atq.</th><th title="Eficiencia Ataque Rotación">Ef. Atq.</th>
    <th title="Cant. Contraataques">Contra Tot</th><th title="Eficacia Contraataque">Efic. Contra</th><th title="Eficiencia Contraataque">Ef. Contra</th>
    <th>Bloq.</th><th>Acc G</th><th>Acc P</th><th>Balance</th>
  </tr></thead><tbody>`;

  for (const r of [...data].sort((a, b) => a.JUGADOR.localeCompare(b.JUGADOR))) {
    const m = metrics(r);
    const a = r.IS_TOTAL ? {} : avgs;
    html += `<tr class="${r.IS_TOTAL ? 'team-total' : ''}">
      <td><strong>${r.JUGADOR}</strong></td><td>${catTags(r._cats)}</td>
      <td>${fmtNum(m.s_tot)}</td><td>${fmtNum(m.s_ace)}</td><td class="cell-below">${fmtNum(m.s_err)}</td>
      <td>${fmtNum(m.r_tot)}</td>${abCell(m.eficacia_rec, a.eficacia_rec)}${abCell(m.eff_rec, a.eff_rec)}
      <td>${fmtNum(m.atq_tot)}</td>${abCell(m.eficacia_atq, a.eficacia_atq)}${abCell(m.eff_atq_rot, a.eff_atq_rot)}
      <td>${fmtNum(m.contra_tot)}</td>${abCell(m.eficacia_contra, a.eficacia_contra)}${abCell(m.eff_contra, a.eff_contra)}
      ${abCell(m.bloqueo, a.bloqueo, false)}${abCell(m.acc_g, null, false)}<td class="cell-below">${fmtNum(m.acc_p)}</td>${abCell(m.balance, a.balance, false)}
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('resumen-table').innerHTML = html;
  makeSortable(document.querySelector('#resumen-table table'));
}

// ─── PARTIDO X PARTIDO ───────────────────────────────────────────────────────

// Función para transformar fechas estilo "DD/MM/YYYY" o "YYYY-MM-DD" en algo ordenable
function getSortableDate(dStr) {
  if(!dStr) return '00000000';
  const parts = dStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}${parts[1].padStart(2,'0')}${parts[2].padStart(2,'0')}`;
    if (parts[2].length === 4) return `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
  }
  return dStr;
}

// Función global para manejar el click en las tarjetas de partido
function togglePartidoMatch(key) {
   if (!State.partidoSelectedMatches) State.partidoSelectedMatches = new Set();
   if (State.partidoSelectedMatches.has(key)) State.partidoSelectedMatches.delete(key);
   else State.partidoSelectedMatches.add(key);
   renderPartido();
}

function renderPartido() {
  if (!State.partidoSelectedMatches) State.partidoSelectedMatches = new Set();

  const catSelect = document.getElementById('partido-cat-select');

  // Llenar select de categorías
  if (catSelect.options.length <= 1) {
    const cats = [...new Set(State.rawData.map(r => r.CATEGORIA).filter(Boolean))].sort();
    catSelect.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // Ordenar los partidos del más nuevo al más viejo
  const matches = getMatchList().sort((a,b) => getSortableDate(b.fecha).localeCompare(getSortableDate(a.fecha)));

  // Auto-seleccionar el partido más nuevo la primera vez que se entra
  if (State.partidoSelectedMatches.size === 0 && matches.length > 0 && !State.partidoInitialized) {
     State.partidoSelectedMatches.add(matches[0].key);
     State.partidoInitialized = true;
  }

  // Renderizar las Tarjetas de los Partidos
  const rowEl = document.getElementById('partido-match-row');
  rowEl.innerHTML = matches.map(m => {
    const isActive = State.partidoSelectedMatches.has(m.key);
    return `<div class="match-card ${isActive ? 'active' : ''}" onclick="togglePartidoMatch('${m.key}')">
      <div class="match-card-icon">🏐</div>
      <div class="match-card-title">${m.rival || 'Sin Rival'}</div>
      <div class="match-card-date">${m.fecha}</div>
    </div>`;
  }).join('');

  if (State.partidoSelectedMatches.size === 0) {
    document.getElementById('partido-kpi-row').innerHTML = '';
    document.getElementById('partido-table').innerHTML = '<div class="no-data">Por favor, selecciona al menos un partido tocando las tarjetas de arriba.</div>';
    return;
  }

  const catKey = catSelect.value;

  // Filtrar datos según los partidos seleccionados
  let players = State.rawData.filter(r => !r.IS_TOTAL && State.partidoSelectedMatches.has(`${r.FECHA_RAW}||${r.RIVAL || ''}`));
  
  if (catKey) players = players.filter(r => r.CATEGORIA === catKey);

  // Como podemos seleccionar varios partidos, un mismo jugador puede aparecer 2 veces. Lo sumamos.
  let aggregatedPlayers = aggregateBy(players, r => r.JUGADOR, r => r.JUGADOR);

  if (!aggregatedPlayers.length) {
    document.getElementById('partido-kpi-row').innerHTML = '';
    document.getElementById('partido-table').innerHTML = '<div class="no-data">No hay datos para esta selección o categoría en estos partidos.</div>';
    return;
  }

  // Calcular el total colectivo
  const teamTotal = { 'S TOT':0, 'S #':0, 'S /':0, 'S =':0, 'R TOT':0, 'R #+':0, 'R /':0, 'R =':0, 'r GENERAL (TOT)':0, 'r GENERAL (#)':0, 'r GENERAL (/)':0, 'r GENERAL (=)':0, 'd GENERAL (TOT)':0, 'd GENERAL (#)':0, 'd GENERAL (/)':0, 'd GENERAL (=)':0, 'BLOQUEO':0 };
  aggregatedPlayers.forEach(p => { for (let k in teamTotal) { teamTotal[k] += (p[k] || 0); } });

  // Renderizar las Tarjetas Colectivas Superiores
  const tm = metrics(teamTotal);
  const makeMiniCard = (lbl, val, clr) =>
    `<div style="background:var(--card2); border:1px solid var(--border); border-radius:8px; padding:10px 14px; text-align:center; flex: 1; min-width: 100px;">
       <div style="font-size:0.75rem; color:var(--muted); text-transform:uppercase; margin-bottom:4px; font-weight: 600;">${lbl}</div>
       <div style="font-size:1.45rem; font-weight:800; color:${clr || 'var(--text)'}">${val}</div>
     </div>`;

  document.getElementById('partido-kpi-row').innerHTML =
    makeMiniCard('Aces', fmtNum(tm.s_ace), '#ce93d8') +
    makeMiniCard('Bloqueos', fmtNum(tm.bloqueo), 'var(--accent)') +
    makeMiniCard('Ef. Rec.', fmtPct(tm.eff_rec), '#64b5f6') +
    makeMiniCard('Ef. Atq.', fmtPct(tm.eff_atq_rot), 'var(--above)') +
    makeMiniCard('Acc. Ganadas', fmtNum(tm.acc_g), '#8bc34a') +
    makeMiniCard('Balance', (tm.balance > 0 ? '+' : '') + fmtNum(tm.balance), tm.balance >= 0 ? 'var(--above)' : 'var(--below)');

  // Renderizar la tabla exactamente con las mismas 18 columnas del Resumen
  let html = `<table><thead><tr>
    <th>Jugador</th><th>Cat.</th>
    <th title="Cant. Saques">S Tot</th><th title="Aces">Aces</th><th title="Errores de Saque">S Err</th>
    <th title="Cant. Recepciones">R Tot</th><th title="Eficacia Recepción">Efic. Rec.</th><th title="Eficiencia Recepción">Ef. Rec.</th>
    <th title="Cant. Ataques Rotación">Atq Tot</th><th title="Eficacia Ataque Rotación">Efic. Atq.</th><th title="Eficiencia Ataque Rotación">Ef. Atq.</th>
    <th title="Cant. Contraataques">Contra Tot</th><th title="Eficacia Contraataque">Efic. Contra</th><th title="Eficiencia Contraataque">Ef. Contra</th>
    <th>Bloq.</th><th>Acc G</th><th>Acc P</th><th>Balance</th>
  </tr></thead><tbody>`;

  for (const r of [...aggregatedPlayers].sort((a, b) => a.JUGADOR.localeCompare(b.JUGADOR))) {
    const m = metrics(r);
    html += `<tr>
      <td><strong>${r.JUGADOR}</strong></td><td>${catTags(r._cats)}</td>
      <td>${fmtNum(m.s_tot)}</td><td>${fmtNum(m.s_ace)}</td><td class="cell-below">${fmtNum(m.s_err)}</td>
      <td>${fmtNum(m.r_tot)}</td><td>${fmtPct(m.eficacia_rec)}</td><td>${fmtPct(m.eff_rec)}</td>
      <td>${fmtNum(m.atq_tot)}</td><td>${fmtPct(m.eficacia_atq)}</td><td>${fmtPct(m.eff_atq_rot)}</td>
      <td>${fmtNum(m.contra_tot)}</td><td>${fmtPct(m.eficacia_contra)}</td><td>${fmtPct(m.eff_contra)}</td>
      <td>${fmtNum(m.bloqueo)}</td><td>${fmtNum(m.acc_g)}</td><td class="cell-below">${fmtNum(m.acc_p)}</td>
      <td class="${m.balance > 0 ? 'cell-above' : m.balance < 0 ? 'cell-below' : ''}">${m.balance > 0 ? '+' : ''}${fmtNum(m.balance)}</td>
    </tr>`;
  }

  // Fila del total del equipo
  html += `<tr class="team-total" style="border-top: 2px solid var(--accent);">
      <td><strong>TOTAL COLECTIVO</strong></td><td>-</td>
      <td><strong>${fmtNum(tm.s_tot)}</strong></td><td><strong>${fmtNum(tm.s_ace)}</strong></td><td class="cell-below"><strong>${fmtNum(tm.s_err)}</strong></td>
      <td><strong>${fmtNum(tm.r_tot)}</strong></td><td><strong>${fmtPct(tm.eficacia_rec)}</strong></td><td><strong>${fmtPct(tm.eff_rec)}</strong></td>
      <td><strong>${fmtNum(tm.atq_tot)}</strong></td><td><strong>${fmtPct(tm.eficacia_atq)}</strong></td><td><strong>${fmtPct(tm.eff_atq_rot)}</strong></td>
      <td><strong>${fmtNum(tm.contra_tot)}</strong></td><td><strong>${fmtPct(tm.eficacia_contra)}</strong></td><td><strong>${fmtPct(tm.eff_contra)}</strong></td>
      <td><strong>${fmtNum(tm.bloqueo)}</strong></td><td><strong>${fmtNum(tm.acc_g)}</strong></td><td class="cell-below"><strong>${fmtNum(tm.acc_p)}</strong></td>
      <td class="${tm.balance > 0 ? 'cell-above' : tm.balance < 0 ? 'cell-below' : ''}"><strong>${tm.balance > 0 ? '+' : ''}${fmtNum(tm.balance)}</strong></td>
    </tr>`;

  html += '</tbody></table>';
  document.getElementById('partido-table').innerHTML = html;
  makeSortable(document.querySelector('#partido-table table'));
}

// ─── SAQUE ───────────────────────────────────────────────────────────────────
function renderSaque() {
  const data    = State.currentGrouped;
  const players = data.filter(r => !r.IS_TOTAL);
  const labels  = players.map(r => r.JUGADOR);
  makeBarChart('chart-serve-ace', labels, players.map(r => metrics(r).s_ace), 'Aces', false, 'ref-serve-ace');
  makeBarChart('chart-serve-eff', labels, players.map(r => metrics(r).eff_saque), 'Ef. Saque', true, 'ref-serve-eff');

  const avgs = calcAvgs(players, ['eff_saque']);
  let html = `<table><thead><tr>
    <th>Jugador</th><th>Cat.</th><th>S Tot</th><th>S # (Aces)</th><th>S / (Medio)</th>
    <th>S = (Error)</th><th>Ef. Saque %</th>
  </tr></thead><tbody>`;
  for (const r of [...data].sort((a, b) => (metrics(b).eff_saque || -99) - (metrics(a).eff_saque || -99))) {
    const m = metrics(r);
    html += `<tr class="${r.IS_TOTAL ? 'team-total' : ''}">
      <td><strong>${r.JUGADOR}</strong></td><td>${catTags(r._cats)}</td>
      <td>${fmtNum(r['S TOT'])}</td><td>${fmtNum(r['S #'])}</td>
      <td>${fmtNum(r['S /'])}</td><td>${fmtNum(r['S ='])}</td>
      ${abCell(m.eff_saque, r.IS_TOTAL ? null : avgs.eff_saque)}
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('saque-table').innerHTML = html;
}

// ─── RECEPCIÓN ───────────────────────────────────────────────────────────────
function renderRecepcion() {
  const data    = State.currentGrouped;
  const players = data.filter(r => !r.IS_TOTAL);
  const labels  = players.map(r => r.JUGADOR);
  const avgs    = calcAvgs(players, ['eficacia_rec', 'eff_rec']);
  makeBarChart('chart-rec-eficacia', labels, players.map(r => metrics(r).eficacia_rec), 'Eficacia Rec.', true, 'ref-rec-eficacia');
  makeBarChart('chart-rec-eficiencia', labels, players.map(r => metrics(r).eff_rec), 'Eficiencia Rec.', true, 'ref-rec-eficiencia');

  let html = `<table><thead><tr>
    <th>Jugador</th><th>Cat.</th><th>R Tot</th><th>R #+ (Perf+Pos)</th>
    <th>R / (Vendida)</th><th>R = (Error)</th>
    <th>Eficacia % <small>(R#+/RTOT)</small></th>
    <th>Eficiencia % <small>((R#+–R/–R=)/RTOT)</small></th>
  </tr></thead><tbody>`;
  for (const r of [...data].sort((a, b) => (metrics(b).eff_rec || -99) - (metrics(a).eff_rec || -99))) {
    const m = metrics(r);
    html += `<tr class="${r.IS_TOTAL ? 'team-total' : ''}">
      <td><strong>${r.JUGADOR}</strong></td><td>${catTags(r._cats)}</td>
      <td>${fmtNum(r['R TOT'])}</td><td>${fmtNum(r['R #+'])}</td>
      <td>${fmtNum(r['R /'])}</td><td>${fmtNum(r['R ='])}</td>
      ${abCell(m.eficacia_rec, r.IS_TOTAL ? null : avgs.eficacia_rec)}
      ${abCell(m.eff_rec, r.IS_TOTAL ? null : avgs.eff_rec)}
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('recepcion-table').innerHTML = html;

  const rTypes = [
    { key: 'r CON #', label: 'r CON # (recepción perfecta)' },
    { key: 'r CON +', label: 'r CON + (recepción positiva)' },
    { key: 'r CON !', label: 'r CON ! (recepción media)' },
    { key: 'r CON -', label: 'r CON - (recepción mala)' },
  ];
  let rHtml = `<table><thead><tr><th>Jugador</th><th>Cat.</th>`;
  for (const t of rTypes) rHtml += `<th>${t.label}<br><small>TOT | # | / | = | Ef.%</small></th>`;
  rHtml += `</tr></thead><tbody>`;
  for (const r of data) {
    rHtml += `<tr class="${r.IS_TOTAL ? 'team-total' : ''}"><td><strong>${r.JUGADOR}</strong></td><td>${catTags(r._cats)}</td>`;
    for (const t of rTypes) {
      const tot = r[`${t.key} (TOT)`] || 0, pt = r[`${t.key} (#)`] || 0;
      const bl = r[`${t.key} (/)`] || 0,  err = r[`${t.key} (=)`] || 0;
      const ef = tot > 0 ? ((pt - bl - err) / tot * 100).toFixed(1) + '%' : '–';
      rHtml += `<td>${tot} | ${pt} | ${bl} | ${err} | <strong>${ef}</strong></td>`;
    }
    rHtml += '</tr>';
  }
  rHtml += '</tbody></table>';
  document.getElementById('r-detail-table').innerHTML = rHtml;
}

// ─── ATAQUE ───────────────────────────────────────────────────────────────────
function renderAtaque() {
  const data    = State.currentGrouped;
  const players = data.filter(r => !r.IS_TOTAL);
  const labels  = players.map(r => r.JUGADOR);
  const avgs    = calcAvgs(players, ['eff_atq_rot', 'eff_contra', 'eficacia_atq', 'eficacia_contra']);
  makeBarChart('chart-atq-rot',    labels, players.map(r => metrics(r).eff_atq_rot), 'Ef. Atq. Rot.',  true, 'ref-atq-rot');
  makeBarChart('chart-atq-contra', labels, players.map(r => metrics(r).eff_contra),  'Ef. Contraataque', true, 'ref-atq-contra');

  const eff = (pos, n1, n2, tot) => tot > 0 ? ((pos - n1 - n2) / tot * 100).toFixed(1) + '%' : '–';
  const pct = (pos, tot)         => tot > 0 ? (pos / tot * 100).toFixed(1) + '%' : '–';

  let html = `<table><thead><tr>
    <th>Jugador</th><th>Cat.</th><th>r Tot</th><th>r # (Puntos)</th>
    <th>r / (Bloq.)</th><th>r = (Error)</th>
    <th>Eficacia % <small>(r#/rTOT)</small></th>
    <th>Eficiencia % <small>((r#–r/–r=)/rTOT)</small></th>
  </tr></thead><tbody>`;
  for (const r of [...data].sort((a, b) => (metrics(b).eff_atq_rot || -99) - (metrics(a).eff_atq_rot || -99))) {
    const m = metrics(r);
    html += `<tr class="${r.IS_TOTAL ? 'team-total' : ''}">
      <td><strong>${r.JUGADOR}</strong></td><td>${catTags(r._cats)}</td>
      <td>${fmtNum(r['r GENERAL (TOT)'])}</td><td>${fmtNum(r['r GENERAL (#)'])}</td>
      <td>${fmtNum(r['r GENERAL (/)'])}</td><td>${fmtNum(r['r GENERAL (=)'])}</td>
      ${abCell(m.eficacia_atq, r.IS_TOTAL ? null : avgs.eficacia_atq)}
      ${abCell(m.eff_atq_rot,  r.IS_TOTAL ? null : avgs.eff_atq_rot)}
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('ataque-rot-table').innerHTML = html;

  const dTypes = [
    { key: 'd GENERAL',         label: 'd General (total)'       },
    { key: 'd PRIMEROS TIEMPOS',label: 'd Primeros Tiempos (central)' },
    { key: 'd TENDIDA',         label: 'd Tendida (rápidas)'     },
    { key: 'd ALTA',            label: 'd Alta (puntas)'         },
  ];
  let dHtml = `<table><thead><tr><th>Jugador</th><th>Cat.</th>`;
  for (const t of dTypes) dHtml += `<th>${t.label}<br><small>TOT | # | / | = | Efic.% | Ef.%</small></th>`;
  dHtml += `</tr></thead><tbody>`;
  for (const r of data) {
    dHtml += `<tr class="${r.IS_TOTAL ? 'team-total' : ''}"><td><strong>${r.JUGADOR}</strong></td><td>${catTags(r._cats)}</td>`;
    for (const t of dTypes) {
      const tot = r[`${t.key} (TOT)`]||0, pt = r[`${t.key} (#)`]||0;
      const bl = r[`${t.key} (/)`]||0,   er = r[`${t.key} (=)`]||0;
      dHtml += `<td>${tot} | ${pt} | ${bl} | ${er} | <strong>${pct(pt,tot)}</strong> | <strong>${eff(pt,bl,er,tot)}</strong></td>`;
    }
    dHtml += '</tr>';
  }
  dHtml += '</tbody></table>';
  document.getElementById('ataque-contra-table').innerHTML = dHtml;
}

// ─── COMPARACIÓN ─────────────────────────────────────────────────────────────

function getAttempts(row, metricValue) {
  if (!row) return 0;
  switch(metricValue) {
    case 'eff_saque': case 'eficacia_saque': case 's_ace': case 's_tot': return row['S TOT'] || 0;
    case 'eficacia_rec': case 'eff_rec': case 'r_tot': return row['R TOT'] || 0;
    case 'eff_atq_rot': case 'eficacia_atq': case 'atq_tot': return row['r GENERAL (TOT)'] || 0;
    case 'eff_contra': case 'eficacia_contra': case 'contra_tot': return row['d GENERAL (TOT)'] || 0;
    default: return (row['S TOT']||0) + (row['R TOT']||0) + (row['r GENERAL (TOT)']||0) + (row['d GENERAL (TOT)']||0);
  }
}

function renderComparacion() {
  const metKey = document.getElementById('compare-metric').value;
  const opt    = METRIC_OPTIONS.find(o => o.value === metKey) || METRIC_OPTIONS[0];
  document.getElementById('compare-title').textContent = 'Comparación: ' + opt.label;

  const showTeams = document.getElementById('compare-show-teams').checked;
  const minAttempts = parseInt(document.getElementById('compare-min-attempts').value) || 0;

  const rows = State.currentGrouped.filter(r => showTeams || !r.IS_TOTAL);
  
  const sorted = [...rows].map(r => {
    return { 
      r, 
      v: metrics(r)[metKey], 
      attempts: getAttempts(r, metKey) 
    };
  })
  .filter(x => x.v !== null && !isNaN(x.v) && x.attempts >= minAttempts)
  .sort((a, b) => b.v - a.v);

  const labels = sorted.map(x => x.r.IS_TOTAL ? `[EQUIPO] ${x.r.JUGADOR}` : x.r.JUGADOR);
  const vals   = sorted.map(x => x.v);
  const atts   = sorted.map(x => x.attempts);

  makeHBarChart('chart-compare', labels, vals, opt.label, opt.isPct, 'ref-compare', atts, minAttempts);
}

// ─── DETALLE JUGADOR ─────────────────────────────────────────────────────────
function renderDetalle() {
  const sel = document.getElementById('detail-player-select');
  const allRows = State.rawData.filter(r => r.JUGADOR && r.JUGADOR.trim());
  const players = [...new Set(allRows.map(r => r.JUGADOR))].sort((a, b) => {
    const aT = allRows.find(r => r.JUGADOR === a)?.IS_TOTAL ? 1 : 0;
    const bT = allRows.find(r => r.JUGADOR === b)?.IS_TOTAL ? 1 : 0;
    return aT - bT || a.localeCompare(b);
  });

  const prev = sel.value;
  sel.innerHTML = '<option value="">-- Seleccionar --</option>' +
    players.map(p => `<option value="${p}">${p}</option>`).join('');
  if (prev) sel.value = prev;

  const chosen = sel.value;
  const container = document.getElementById('detalle-content');
  if (!chosen) { container.innerHTML = '<div class="no-data">Selecciona un jugador para ver su detalle.</div>'; return; }

  const f = getFilters();
  const filtered = filterData({ ...f, showTotals: true });
  const grouped  = groupData(filtered, 'player');
  const row      = grouped.find(r => r.JUGADOR === chosen);
  if (!row) { container.innerHTML = '<div class="no-data">Sin datos con los filtros actuales.</div>'; return; }

  const m       = metrics(row);
  const peers   = grouped.filter(r => !r.IS_TOTAL);
  const avgs    = calcAvgs(peers, Object.keys(m));

  const radarDefs = [
    { key: 'eff_saque',       label: 'Ef. Saque',   range: [-0.5, 0.8] },
    { key: 'eficacia_rec',    label: 'Efic. Rec.',  range: [0, 1]      },
    { key: 'eff_rec',         label: 'Ef. Rec.',    range: [-0.5, 1]   },
    { key: 'eficacia_atq',    label: 'Efic. Atq.',  range: [0, 1]      },
    { key: 'eff_atq_rot',     label: 'Ef. Atq.',    range: [-0.5, 1]  },
    { key: 'eficacia_contra', label: 'Efic. Contra',range: [0, 1]      },
    { key: 'eff_contra',      label: 'Ef. Contra.', range: [-0.5, 1]   },
    { key: 'bloqueo',         label: 'Bloqueos',    range: [0, null]   },
  ];
  const allValsMap = Object.fromEntries(radarDefs.map(d => [d.key, peers.map(r => metrics(r)[d.key])]));
  const norm = (v, range, allVals) => {
    if (v === null || isNaN(v)) return 0;
    const [rMin, rMax] = range;
    const mn = rMin !== null ? rMin : Math.min(...allVals.filter(x => x !== null));
    const mx = rMax !== null ? rMax : Math.max(...allVals.filter(x => x !== null));
    if (mx === mn) return 50;
    return Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100));
  };
  const pN = radarDefs.map(d => norm(m[d.key],   d.range, allValsMap[d.key]));
  const aN = radarDefs.map(d => norm(avgs[d.key], d.range, allValsMap[d.key]));

  const history = State.rawData.filter(r => r.JUGADOR === chosen).sort((a, b) => getSortableDate(b.FECHA_RAW).localeCompare(getSortableDate(a.FECHA_RAW)));

  container.innerHTML = `
    <div class="player-detail-grid">
      <div class="chart-card">
        <h3>Perfil de rendimiento vs. promedio del grupo</h3>
        <div class="chart-wrap" style="height:480px"><canvas id="chart-radar-player"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Estadísticas – ${chosen} ${catTags(row._cats)}</h3>
        ${statRow('Partidos Jugados', row._matches || 1, null, false)}
        <div style="margin: 10px 0; border-top: 1px dashed var(--border);"></div>
        ${statRow('Intentos de Saque', m.s_tot, null, false)}
        ${statRow('Aces de Saque', m.s_ace, null, false)}
        ${statRow('Errores de Saque', m.s_err, null, false)}
        ${statRow('Eficiencia Saque', m.eff_saque, avgs.eff_saque)}
        <div style="margin: 10px 0; border-top: 1px dashed var(--border);"></div>
        ${statRow('Intentos Recepción', m.r_tot, null, false)}
        ${statRow('Eficacia Recepción', m.eficacia_rec, avgs.eficacia_rec)}
        ${statRow('Eficiencia Recepción', m.eff_rec, avgs.eff_rec)}
        <div style="margin: 10px 0; border-top: 1px dashed var(--border);"></div>
        ${statRow('Intentos Ataque Rot.', m.atq_tot, null, false)}
        ${statRow('Eficacia Ataque Rot.', m.eficacia_atq, avgs.eficacia_atq)}
        ${statRow('Eficiencia Ataque Rot.', m.eff_atq_rot, avgs.eff_atq_rot)}
        <div style="margin: 10px 0; border-top: 1px dashed var(--border);"></div>
        ${statRow('Intentos Contraataque', m.contra_tot, null, false)}
        ${statRow('Eficacia Contraataque', m.eficacia_contra, avgs.eficacia_contra)}
        ${statRow('Eficiencia Contraataque', m.eff_contra, avgs.eff_contra)}
        <div style="margin: 10px 0; border-top: 1px dashed var(--border);"></div>
        ${statRow('Bloqueos', m.bloqueo, avgs.bloqueo, false)}
        ${statRow('Acciones Ganadas', m.acc_g, null, false)}
        ${statRow('Acciones Perdidas', m.acc_p, null, false)}
        ${statRow('Balance', m.balance, avgs.balance, false)}
      </div>
    </div>
    ${history.length > 1 ? `
    <div class="chart-card" style="margin-top:20px">
      <h3>Historial por partido – ${chosen}</h3>
      <div class="table-wrap"><table><thead><tr>
        <th>Fecha</th><th>Rival</th><th>Cat.</th>
        <th title="Cant. Saques">S Tot</th><th title="Aces">Aces</th><th title="Errores de Saque">S Err</th>
        <th title="Cant. Recepciones">R Tot</th><th title="Eficacia Recepción">Efic. Rec.</th><th title="Eficiencia Recepción">Ef. Rec.</th>
        <th title="Cant. Ataques Rotación">Atq Tot</th><th title="Eficacia Ataque Rotación">Efic. Atq.</th><th title="Eficiencia Ataque Rotación">Ef. Atq.</th>
        <th title="Cant. Contraataques">Contra Tot</th><th title="Eficacia Contraataque">Efic. Contra</th><th title="Eficiencia Contraataque">Ef. Contra</th>
        <th>Bloq.</th><th>Acc G</th><th>Acc P</th><th>Balance</th>
      </tr></thead><tbody>
      ${history.map(r => { const hm = metrics(r); return `<tr>
        <td>${r.FECHA_RAW}</td><td>${r.RIVAL||'–'}</td><td>${catTags([r.CATEGORIA])}</td>
        <td>${fmtNum(hm.s_tot)}</td><td>${fmtNum(hm.s_ace)}</td><td class="cell-below">${fmtNum(hm.s_err)}</td>
        <td>${fmtNum(hm.r_tot)}</td><td>${fmtPct(hm.eficacia_rec)}</td><td>${fmtPct(hm.eff_rec)}</td>
        <td>${fmtNum(hm.atq_tot)}</td><td>${fmtPct(hm.eficacia_atq)}</td><td>${fmtPct(hm.eff_atq_rot)}</td>
        <td>${fmtNum(hm.contra_tot)}</td><td>${fmtPct(hm.eficacia_contra)}</td><td>${fmtPct(hm.eff_contra)}</td>
        <td>${fmtNum(hm.bloqueo)}</td><td>${fmtNum(hm.acc_g)}</td><td class="cell-below">${fmtNum(hm.acc_p)}</td>
        <td class="${hm.balance > 0 ? 'cell-above' : hm.balance < 0 ? 'cell-below' : ''}">${hm.balance > 0 ? '+' : ''}${fmtNum(hm.balance)}</td>
      </tr>`; }).join('')}
      </tbody></table></div>
    </div>` : ''}`;

  makeRadarChart('chart-radar-player', radarDefs.map(d => d.label), pN, aN, chosen);
}