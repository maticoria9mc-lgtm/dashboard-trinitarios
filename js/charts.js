// ─── Utilities ───────────────────────────────────────────────────────────────
function destroyChart(id) {
  if (State.activeCharts[id]) { State.activeCharts[id].destroy(); delete State.activeCharts[id]; }
}

// ─── Custom plugin: draw n=X labels inside bars ──────────────────────────────
Chart.register({
  id: 'attemptsLabel',
  afterDatasetsDraw(chart) {
    const opts = chart.options.plugins?.attemptsLabel;
    if (!opts?.data?.length) return;
    const { ctx } = chart;
    const isHBar = chart.options.indexAxis === 'y';
    const meta   = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    meta.data.forEach((bar, i) => {
      const n = opts.data[i];
      if (!n && n !== 0) return;
      ctx.save();
      ctx.font = 'bold 9px Segoe UI, sans-serif';
      ctx.fillStyle = opts.lowSample?.[i] ? 'rgba(255,160,80,0.9)' : 'rgba(180,210,255,0.75)';
      if (isHBar) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`n=${n}`, bar.x + 5, bar.y);
      } else {
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const y = Math.min(bar.y + 3, chart.scales.y.bottom - 14);
        ctx.fillText(`n=${n}`, bar.x, y);
      }
      ctx.restore();
    });
  }
});

function computeRefs(values) {
  const clean = values.filter(v => v !== null && !isNaN(v));
  if (!clean.length) return { mean: null, median: null, max: null, min: null };
  const sorted = [...clean].sort((a, b) => a - b);
  return {
    mean:   clean.reduce((a, b) => a + b, 0) / clean.length,
    median: sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
    min: sorted[0],
  };
}

// ─── Reference line control ───────────────────────────────────────────────────
function initRefControl(containerId, chartId, defaults = ['mean']) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!State.refLineStates[chartId]) {
    State.refLineStates[chartId] = {};
    for (const d of REF_LINE_DEFS) State.refLineStates[chartId][d.key] = defaults.includes(d.key);
  }
  el.innerHTML = '<span class="ref-label">Referencia:</span>' +
    REF_LINE_DEFS.map(d =>
      `<button class="ref-btn ${State.refLineStates[chartId][d.key] ? 'active' : ''}"
        style="--ref-color:${d.color}"
        onclick="toggleRef('${chartId}','${d.key}',this)">${d.label}</button>`
    ).join('');
}

function toggleRef(chartId, refKey, btn) {
  const chart = State.activeCharts[chartId];
  if (!chart) return;
  if (!State.refLineStates[chartId]) State.refLineStates[chartId] = {};
  State.refLineStates[chartId][refKey] = !State.refLineStates[chartId][refKey];
  btn.classList.toggle('active');
  const ds = chart.data.datasets.find(d => d._refType === refKey);
  if (ds) { ds.hidden = !State.refLineStates[chartId][refKey]; chart.update(); }
}

function buildRefDatasets(rawVals, labels, isPct) {
  const refs = computeRefs(rawVals);
  return REF_LINE_DEFS.map(def => {
    const v = refs[def.key];
    const disp = v !== null ? (isPct ? +(v * 100).toFixed(2) : +v.toFixed(2)) : null;
    return {
      label: def.label,
      data: labels.map(() => disp),
      type: 'line', borderColor: def.color, borderWidth: 2,
      borderDash: def.dash, pointRadius: 0, fill: false,
      _refType: def.key,
      hidden: !(State.refLineStates[chartId] || {})[def.key], // will be fixed per-chart
    };
  });
}

// ─── Bar chart (vertical) ────────────────────────────────────────────────────
function makeBarChart(canvasId, labels, rawVals, label, isPct, refContainerId, attempts = null, minAttempts = 0) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (!State.refLineStates[canvasId]) State.refLineStates[canvasId] = { mean: true, median: false, max: false, min: false };
  const rs = State.refLineStates[canvasId];

  const refs  = computeRefs(rawVals);
  const avg   = refs.mean;
  const lowSample = attempts ? attempts.map(n => minAttempts > 0 && n < minAttempts) : null;

  const disp   = rawVals.map(v => v !== null ? (isPct ? +(v * 100).toFixed(2) : +v.toFixed(2)) : null);
  const colors = rawVals.map((v, i) => {
    if (lowSample?.[i]) return 'rgba(120,140,170,0.35)';
    return v !== null && avg !== null ? (v >= avg ? '#00c853' : '#f44336') : '#3a7bd5';
  });

  const refDs = REF_LINE_DEFS.map(def => {
    const v = refs[def.key];
    const d = v !== null ? (isPct ? +(v * 100).toFixed(2) : +v.toFixed(2)) : null;
    return { label: def.label, data: labels.map(() => d), type: 'line',
      borderColor: def.color, borderWidth: 2, borderDash: def.dash,
      pointRadius: 0, fill: false, _refType: def.key, hidden: !rs[def.key] };
  });

  State.activeCharts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data: disp, backgroundColor: colors, borderRadius: 4 }, ...refDs] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        attemptsLabel: attempts ? { data: attempts, lowSample } : {},
        tooltip: {
          callbacks: {
            label(c) {
              if (c.datasetIndex > 0) return `${c.dataset.label}: ${isPct ? c.parsed.y.toFixed(1)+'%' : c.parsed.y.toFixed(2)}`;
              const n = attempts?.[c.dataIndex];
              const low = lowSample?.[c.dataIndex];
              const base = isPct ? c.parsed.y.toFixed(1) + '%' : c.parsed.y.toFixed(2);
              return n != null ? `${label}: ${base}  (n=${n} intentos${low ? ' ⚠ bajo' : ''})` : `${label}: ${base}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#7a9cc0', maxRotation: 38, font: { size: 10 } }, grid: { color: '#1a3a6a' } },
        y: { ticks: { color: '#7a9cc0', callback: v => isPct ? v + '%' : v }, grid: { color: '#1a3a6a' } }
      }
    }
  });
  if (refContainerId) initRefControl(refContainerId, canvasId);
}

// ─── Horizontal bar chart (comparison tab) ───────────────────────────────────
function makeHBarChart(canvasId, labels, rawVals, label, isPct, refContainerId, attempts = null, minAttempts = 0) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (!State.refLineStates[canvasId]) State.refLineStates[canvasId] = { mean: true, median: false, max: false, min: false };
  const rs = State.refLineStates[canvasId];

  const refs     = computeRefs(rawVals);
  const avg      = refs.mean;
  const lowSample = attempts ? attempts.map(n => minAttempts > 0 && n < minAttempts) : null;
  const disp     = rawVals.map(v => v !== null ? (isPct ? +(v * 100).toFixed(2) : +v.toFixed(2)) : null);
  const colors   = rawVals.map((v, i) => {
    if (lowSample?.[i]) return 'rgba(120,140,170,0.35)';
    return v !== null && avg !== null ? (v >= avg ? '#00c853' : '#f44336') : '#3a7bd5';
  });

  const refDs = REF_LINE_DEFS.map(def => {
    const v = refs[def.key];
    const d = v !== null ? (isPct ? +(v * 100).toFixed(2) : +v.toFixed(2)) : null;
    return { label: def.label, data: labels.map(() => d), type: 'line',
      borderColor: def.color, borderWidth: 2, borderDash: def.dash,
      pointRadius: 0, fill: false, _refType: def.key, hidden: !rs[def.key] };
  });

  State.activeCharts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data: disp, backgroundColor: colors, borderRadius: 4 }, ...refDs] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        attemptsLabel: attempts ? { data: attempts, lowSample } : {},
        tooltip: {
          callbacks: {
            label(c) {
              if (c.datasetIndex > 0) return `${c.dataset.label}: ${isPct ? c.parsed.x.toFixed(1)+'%' : c.parsed.x.toFixed(2)}`;
              const n = attempts?.[c.dataIndex];
              const low = lowSample?.[c.dataIndex];
              const base = isPct ? c.parsed.x.toFixed(1) + '%' : c.parsed.x.toFixed(2);
              return n != null ? `${label}: ${base}  (n=${n} intentos${low ? ' ⚠ bajo' : ''})` : `${label}: ${base}`;
            }
          }
        }
      },
      scales: {
        y: { ticks: { color: '#dde8f5', font: { size: 11 } }, grid: { color: '#1a3a6a' } },
        x: { ticks: { color: '#7a9cc0', callback: v => isPct ? v + '%' : v }, grid: { color: '#1a3a6a' } }
      }
    }
  });
  if (refContainerId) initRefControl(refContainerId, canvasId);
}

// ─── Radar chart ─────────────────────────────────────────────────────────────
function makeRadarChart(canvasId, radarLabels, playerVals, avgVals, playerName) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  State.activeCharts[canvasId] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: radarLabels,
      datasets: [
        { label: playerName, data: playerVals,
          borderColor: '#ffc107', backgroundColor: 'rgba(255,193,7,0.18)',
          borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#ffc107' },
        { label: 'Promedio grupo', data: avgVals,
          borderColor: '#64b5f6', backgroundColor: 'rgba(100,181,246,0.08)',
          borderWidth: 2, borderDash: [5, 3], pointRadius: 3, pointBackgroundColor: '#64b5f6' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { min: 0, max: 100, ticks: { display: false },
        grid: { color: '#1a3a6a' }, pointLabels: { color: '#dde8f5', font: { size: 11 } },
        angleLines: { color: '#1a3a6a' } } },
      plugins: { legend: { labels: { color: '#dde8f5', font: { size: 11 } } } }
    }
  });
}
