// ─── Evolution (timeline) tab ────────────────────────────────────────────────

if (!State.evolSelectedMetrics) State.evolSelectedMetrics = new Set(['eff_rec', 'eff_atq_rot']);
if (!State.evolPlayer) State.evolPlayer = null;

function renderEvolucion() {
  const f = getFilters();
  const filtered = filterData({ ...f, showTotals: true });
  const matches = getMatchListFromData(filtered);

  // 1. Cargar el Select del Jugador / Equipo
  const playerSel = document.getElementById('evol-player-select');
  const teams = [...new Set(filtered.filter(r => r.IS_TOTAL).map(r => r.JUGADOR))].sort();
  const inds  = [...new Set(filtered.filter(r => !r.IS_TOTAL).map(r => r.JUGADOR))].sort();
  
  const prevPlayer = State.evolPlayer || playerSel.value || inds[0] || '';
  
  let opts = '';
  if (teams.length) opts += `<optgroup label="Equipos">${teams.map(p => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('')}</optgroup>`;
  if (inds.length)  opts += `<optgroup label="Jugadores">${inds.map(p => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('')}</optgroup>`;
  
  playerSel.innerHTML = opts;
  if (prevPlayer) playerSel.value = prevPlayer;
  State.evolPlayer = playerSel.value;

  // 2. Cargar Checkboxes de Métricas
  const checkContainer = document.getElementById('evol-metric-checks');
  if (checkContainer.dataset.rendered !== 'true') {
    checkContainer.innerHTML = '';
    METRIC_OPTIONS.forEach((m) => {
      const lbl = document.createElement('label');
      lbl.className = 'player-check-item';
      const checked = State.evolSelectedMetrics.has(m.value) ? 'checked' : '';
      lbl.innerHTML = `<input type="checkbox" value="${m.value}" ${checked} onchange="onEvolMetricToggle(this)"> ${m.label}`;
      checkContainer.appendChild(lbl);
    });
    checkContainer.dataset.rendered = 'true';
  }

  buildEvolChart(matches);
}

function onEvolPlayerChange() {
  State.evolPlayer = document.getElementById('evol-player-select').value;
  const f = getFilters();
  const matches = getMatchListFromData(filterData({ ...f, showTotals: true }));
  buildEvolChart(matches);
}

function onEvolMetricToggle(checkbox) {
  if (checkbox.checked) State.evolSelectedMetrics.add(checkbox.value);
  else State.evolSelectedMetrics.delete(checkbox.value);
  const f = getFilters();
  const matches = getMatchListFromData(filterData({ ...f, showTotals: true }));
  buildEvolChart(matches);
}

function buildEvolChart(matches) {
  destroyChart('chart-evolucion');
  const ctx = document.getElementById('chart-evolucion');
  if (!ctx) return;

  const xLabels = matches.map(m => `${m.rival}\n(${formatDateShort(m.fecha)})`);
  const selectedMetrics = [...State.evolSelectedMetrics].map(val => METRIC_OPTIONS.find(o => o.value === val)).filter(Boolean);
  
  const f = getFilters();
  const allFiltered = filterData({ ...f, showTotals: true });
  const playerName = State.evolPlayer;

  let colorIdx = 0;
  const datasets = selectedMetrics.map(opt => {
    const color = LINE_PALETTE[colorIdx++ % LINE_PALETTE.length];
    const data = matches.map(m => {
      const row = allFiltered.find(r => r.JUGADOR === playerName && r.FECHA_RAW === m.fecha && (r.RIVAL || '') === m.rival);
      if (!row) return null;
      const v = metrics(row)[opt.value];
      return v !== null ? (opt.isPct ? +(v * 100).toFixed(2) : +v.toFixed(2)) : null;
    });
    return {
      label: opt.label,
      data,
      borderColor: color,
      backgroundColor: color + '33',
      borderWidth: 3,
      pointRadius: 5, pointHoverRadius: 7,
      pointBackgroundColor: color,
      fill: false, spanGaps: false, tension: 0.3,
    };
  });

  State.activeCharts['chart-evolucion'] = new Chart(ctx, {
    type: 'line',
    data: { labels: xLabels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: '#dde8f5', font: { size: 11 }, boxWidth: 16, padding: 10 } },
        tooltip: {
          callbacks: {
            label: c => {
              const v = c.parsed.y;
              if (v === null || v === undefined) return `${c.dataset.label}: –`;
              const isPct = selectedMetrics[c.datasetIndex].isPct;
              return `${c.dataset.label}: ${isPct ? v.toFixed(1)+'%' : v.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#7a9cc0', font: { size: 10 } }, grid: { color: '#1a3a6a' } },
        y: { ticks: { color: '#7a9cc0' }, grid: { color: '#1a3a6a' } }
      }
    }
  });
}

function getMatchListFromData(data) {
  const seen = new Set(); const list = [];
  for (const r of data) {
    const k = `${r.FECHA_RAW}||${r.RIVAL||''}`;
    if (!seen.has(k)) { seen.add(k); list.push({ fecha: r.FECHA_RAW, rival: r.RIVAL||'', key: k }); }
  }
  return list.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function formatDateShort(dateStr) {
  if (!dateStr) return '?';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  } catch { return dateStr; }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}