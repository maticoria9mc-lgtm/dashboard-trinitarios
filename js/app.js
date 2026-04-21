// ─── Filter + Render ─────────────────────────────────────────────────────────
function applyFiltersAndRender() {
  const f = getFilters();
  State.currentGrouped = groupData(filterData(f), f.groupBy);
  renderActiveTab();
}

function renderActiveTab() {
  const active = document.querySelector('.tab-btn.active')?.dataset.tab || 'resumen';
  if      (active === 'resumen')     renderResumen();
  else if (active === 'partido')     renderPartido();
  else if (active === 'saque')       renderSaque();
  else if (active === 'recepcion')   renderRecepcion();
  else if (active === 'ataque')      renderAtaque();
  else if (active === 'comparacion') renderComparacion();
  else if (active === 'evolucion')   renderEvolucion();
  else if (active === 'detalle')     renderDetalle();
  else if (active === 'asistencia')  renderAsistencia();
}

// ─── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    renderActiveTab();
  });
});

// ─── Compare metric + team toggle ────────────────────────────────────────────
document.getElementById('compare-metric').addEventListener('change', renderComparacion);
document.getElementById('compare-show-teams').addEventListener('change', renderComparacion);

// ─── Bootstrap ───────────────────────────────────────────────────────────────
loadData();