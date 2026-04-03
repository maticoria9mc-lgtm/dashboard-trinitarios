const State = {
  rawData: [],           // all parsed rows
  currentGrouped: [],    // rows after filter + group (for current tab)
  activeCharts: {},      // Chart.js instances keyed by canvasId
  refLineStates: {},     // { canvasId: { mean: bool, median: bool, ... } }
  evolSelectedPlayers: new Set(), // player keys selected in evolution tab
  evolMetric: 'eff_rec',          // active metric in evolution tab
  evolRefStates: { matchMean: true, matchMedian: false }, // evolution ref toggles
};
