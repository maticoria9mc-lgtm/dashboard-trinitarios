// ─── Core metric calculations ────────────────────────────────────────────────
function metrics(r) {
  const eff = (pos, n1, n2, tot) => tot > 0 ? (pos - n1 - n2) / tot : null;
  const pct = (pos, tot)         => tot > 0 ? pos / tot : null;

  // Cálculos dinámicos de Acciones (sobreescriben a las columnas del CSV)
  const acc_g = (r['S #']||0) + (r['r GENERAL (#)']||0) + (r['d GENERAL (#)']||0) + (r['BLOQUEO']||0);
  const acc_p = (r['S =']||0) + (r['R =']||0) + (r['r GENERAL (=)']||0) + (r['r GENERAL (/)']||0) + (r['d GENERAL (=)']||0) + (r['d GENERAL (/)']||0);

  return {
    s_tot:           r['S TOT'] || 0,
    s_err:           r['S ='] || 0,
    s_ace:           r['S #'] || 0,
    eff_saque:       eff(r['S #'],            0,              r['S ='],              r['S TOT']),
    eficacia_saque:  pct(r['S #'],            r['S TOT']),

    r_tot:           r['R TOT'] || 0,
    r_err:           r['R ='] || 0,
    eficacia_rec:    pct(r['R #+'],           r['R TOT']),
    eff_rec:         eff(r['R #+'],           r['R /'],       r['R ='],              r['R TOT']),

    atq_tot:         r['r GENERAL (TOT)'] || 0,
    eficacia_atq:    pct(r['r GENERAL (#)'],  r['r GENERAL (TOT)']),
    eff_atq_rot:     eff(r['r GENERAL (#)'],  r['r GENERAL (/)'], r['r GENERAL (=)'], r['r GENERAL (TOT)']),

    contra_tot:      r['d GENERAL (TOT)'] || 0,
    eficacia_contra: pct(r['d GENERAL (#)'],  r['d GENERAL (TOT)']),
    eff_contra:      eff(r['d GENERAL (#)'],  r['d GENERAL (/)'], r['d GENERAL (=)'], r['d GENERAL (TOT)']),

    bloqueo:         r['BLOQUEO'] || 0,
    acc_g:           acc_g,
    acc_p:           acc_p,
    balance:         acc_g - acc_p,
  };
}

function calcAvgs(rows, keys) {
  const avgs = {};
  for (const k of keys) {
    const vals = rows.map(r => metrics(r)[k]).filter(v => v !== null && !isNaN(v));
    avgs[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return avgs;
}

function calcMedians(rows, keys) {
  const meds = {};
  for (const k of keys) {
    const sorted = rows.map(r => metrics(r)[k]).filter(v => v !== null && !isNaN(v)).sort((a, b) => a - b);
    meds[k] = sorted.length
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : null;
  }
  return meds;
}

// ─── Formatters ─────────────────────────────────────────────────────────────
function fmtPct(v)  { return (v === null || isNaN(v)) ? '–' : (v * 100).toFixed(1) + '%'; }
function fmtNum(v)  { return (v === null || v === undefined || isNaN(v)) ? '–' : Number.isInteger(v) ? String(v) : v.toFixed(1); }
function fmtDisp(v, isPct) { return isPct ? fmtPct(v) : fmtNum(v); }

// ─── Category tags ───────────────────────────────────────────────────────────
function catTags(cats) {
  if (!cats || !cats.length) return '';
  return cats.map(c => `<span class="tag ${c.toLowerCase().replace('-','')}">${c}</span>`).join('');
}

// ─── Above/below average cell ─────────────────────────────────────────────────
function abCell(val, avg, isPct = true, higherIsBetter = true) {
  const display = fmtDisp(val, isPct);
  if (val === null || isNaN(val) || avg === null) return `<td>${display}</td>`;
  const above = higherIsBetter ? val > avg : val < avg;
  const below = higherIsBetter ? val < avg : val > avg;
  const cls   = above ? 'cell-above arrow-up' : below ? 'cell-below arrow-down' : '';
  return `<td class="${cls}">${display}</td>`;
}

// ─── Stat block helper ───────────────────────────────────────────────────────
function statRow(label, val, avg, isPct = true) {
  const display = fmtDisp(val, isPct);
  let cls = '';
  if (val !== null && avg !== null && !isNaN(val) && !isNaN(avg)) {
    cls = val > avg ? 'cell-above' : val < avg ? 'cell-below' : '';
  }
  return `<div class="stat-row"><span class="stat-name">${label}</span><span class="stat-val ${cls}">${display}</span></div>`;
}