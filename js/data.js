// ─── Parse ─────────────────────────────────────────────────────────────────
function parseRow(row) {
  const r = {};
  for (const k in row) r[k.trim()] = row[k];
  for (const col of NUM_COLS) r[col] = parseFloat(r[col]) || 0;
  r.FECHA_RAW = (r.FECHA || '').toString().trim();
  try { r.FECHA_DATE = r.FECHA_RAW ? new Date(r.FECHA_RAW) : null; } catch { r.FECHA_DATE = null; }
  r.IS_TOTAL = r.JUGADOR && r.JUGADOR.toUpperCase().includes('TRINITARIOS');
  return r;
}

// ─── Filters ────────────────────────────────────────────────────────────────
function getFilters() {
  const cats = [...document.querySelectorAll('#cat-checkboxes input:checked')].map(el => el.value);
  const allMatchInputs   = [...document.querySelectorAll('#match-checks input')];
  const checkedMatchKeys = [...document.querySelectorAll('#match-checks input:checked')].map(el => el.value);
  // null = all selected (no match filter); Set = explicit subset
  const selectedMatches  = (checkedMatchKeys.length === allMatchInputs.length || allMatchInputs.length === 0)
    ? null : new Set(checkedMatchKeys);
  return {
    cats,
    dateFrom: document.getElementById('filter-date-from').value,
    dateTo:   document.getElementById('filter-date-to').value,
    search:   document.getElementById('filter-search').value.toLowerCase().trim(),
    showTotals:    document.getElementById('filter-show-totals').checked,
    groupBy:       document.getElementById('filter-group-by').value,
    selectedMatches,
    minAttempts:   parseInt(document.getElementById('filter-min-attempts')?.value) || 0,
  };
}

function filterData(f) {
  return State.rawData.filter(r => {
    if (!f.showTotals && r.IS_TOTAL) return false;
    if (f.cats.length && !f.cats.includes(r.CATEGORIA)) return false;
    if (f.dateFrom && r.FECHA_RAW < f.dateFrom) return false;
    if (f.dateTo   && r.FECHA_RAW > f.dateTo)   return false;
    if (f.search   && !r.JUGADOR.toLowerCase().includes(f.search)) return false;
    if (f.selectedMatches) {
      const mk = `${r.FECHA_RAW}||${r.RIVAL || ''}`;
      if (!f.selectedMatches.has(mk)) return false;
    }
    return true;
  });
}

// ─── Grouping ───────────────────────────────────────────────────────────────
function groupData(data, groupBy) {
  if (groupBy === 'match') {
    return data.map(r => ({
      ...r,
      _key: `${r.FECHA_RAW}|${r.RIVAL}|${r.JUGADOR}`,
      _label: `${r.JUGADOR} – ${r.RIVAL || '?'} (${r.FECHA_RAW})`,
      _cats: [r.CATEGORIA],
      _matches: 1,
    }));
  }
  if (groupBy === 'category') return aggregateBy(data, r => r.CATEGORIA, r => r.CATEGORIA);
  if (groupBy === 'player')   return aggregateBy(data, r => r.JUGADOR,   r => r.JUGADOR);
  if (groupBy === 'player-cat') return aggregateBy(data, r => `${r.JUGADOR}||${r.CATEGORIA}`, r => r.JUGADOR);
  return data;
}

function aggregateBy(data, keyFn, labelFn) {
  const map = {};
  for (const r of data) {
    const key = keyFn(r);
    if (!map[key]) {
      map[key] = { JUGADOR: labelFn(r), CATEGORIA: r.CATEGORIA, _key: key, _cats: [], _matches: 0, IS_TOTAL: r.IS_TOTAL };
      for (const col of NUM_COLS) map[key][col] = 0;
    }
    map[key]._matches++;
    if (r.CATEGORIA && !map[key]._cats.includes(r.CATEGORIA)) map[key]._cats.push(r.CATEGORIA);
    for (const col of NUM_COLS) map[key][col] += (r[col] || 0);
  }
  return Object.values(map);
}

// ─── Unique matches (for evolution chart) ───────────────────────────────────
function getMatchList() {
  const seen = new Set();
  const list = [];
  for (const r of State.rawData) {
    const key = `${r.FECHA_RAW}||${r.RIVAL || ''}`;
    if (!seen.has(key)) { seen.add(key); list.push({ fecha: r.FECHA_RAW, rival: r.RIVAL || '', key }); }
  }
  return list.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ─── Populate filter UI ──────────────────────────────────────────────────────
function populateFilters() {
  // categories
  const cats = [...new Set(State.rawData.map(r => r.CATEGORIA).filter(Boolean))].sort();
  const catContainer = document.getElementById('cat-checkboxes');
  catContainer.innerHTML = '';
  cats.forEach(cat => {
    const lbl = document.createElement('label');
    lbl.className = 'cat-check';
    lbl.innerHTML = `<input type="checkbox" value="${cat}" checked onchange="applyFiltersAndRender()"> ${cat}`;
    catContainer.appendChild(lbl);
  });

  // matches
  populateMatchSelector();
}

function populateMatchSelector() {
  const container = document.getElementById('match-checks');
  if (!container) return;
  container.innerHTML = '';

  // group rows by match key to gather categories per match
  const matchMap = {};
  for (const r of State.rawData) {
    const key = `${r.FECHA_RAW}||${r.RIVAL || ''}`;
    if (!matchMap[key]) matchMap[key] = { fecha: r.FECHA_RAW, rival: r.RIVAL || '', cats: new Set() };
    if (r.CATEGORIA) matchMap[key].cats.add(r.CATEGORIA);
  }
  const matches = Object.entries(matchMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  matches.forEach(m => {
    const dateDisp = formatMatchDate(m.fecha);
    const catDisp  = [...m.cats].sort().join(', ');
    const label    = `${m.rival} · ${dateDisp} <span class="match-cats">(${catDisp})</span>`;
    const lbl = document.createElement('label');
    lbl.className = 'match-check-item';
    lbl.innerHTML = `<input type="checkbox" value="${escapeVal(m.key)}" checked onchange="onMatchToggle()"> ${label}`;
    container.appendChild(lbl);
  });
  updateMatchCount();
}

function formatMatchDate(s) {
  if (!s) return '?';
  try {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  } catch { return s; }
}
function escapeVal(s) { return s.replace(/"/g, '&quot;'); }

function onMatchToggle() { updateMatchCount(); applyFiltersAndRender(); }
function updateMatchCount() {
  const all  = document.querySelectorAll('#match-checks input').length;
  const chk  = document.querySelectorAll('#match-checks input:checked').length;
  const el   = document.getElementById('match-sel-count');
  if (el) el.textContent = chk < all ? `${chk}/${all}` : `${all}`;
}
function selectAllMatches()  { document.querySelectorAll('#match-checks input').forEach(i => i.checked = true);  onMatchToggle(); }
function clearAllMatches()   { document.querySelectorAll('#match-checks input').forEach(i => i.checked = false); onMatchToggle(); }
function toggleMatchPanel()  {
  const p = document.getElementById('match-panel');
  if (p) { p.style.display = p.style.display === 'none' ? 'block' : 'none'; }
  const arr = document.getElementById('match-sel-arrow');
  if (arr) arr.textContent = (document.getElementById('match-panel')?.style.display === 'none') ? '▼' : '▲';
}

// ─── Data loading ────────────────────────────────────────────────────────────
function loadData() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('error-box').style.display = 'none';
  Papa.parse(CSV_URL + '&_=' + Date.now(), {
    download: true, header: true, skipEmptyLines: true,
    complete(results) {
      State.rawData = results.data
        .map(parseRow)
        .filter(r => r.JUGADOR && r.JUGADOR.trim() !== '');
      populateFilters();
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('last-update').textContent =
        'Actualizado: ' + new Date().toLocaleString('es-AR');
      applyFiltersAndRender();
    },
    error(err) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error-box').style.display = 'block';
      document.getElementById('error-msg').textContent = err.message || 'Error de red';
    }
  });
}
