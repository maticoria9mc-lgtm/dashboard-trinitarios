const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5jzvgzcTcozB_bOe6hawIwcv9QvtV4_w_1AEjpcX68O8Ujw6Ff8e8_mgDCf0NTq3KmAtLIGtjFQrl/pub?output=csv';

const NUM_COLS = [
  'S TOT','S #','S /','S =',
  'R TOT','R #+','R /','R =',
  'r GENERAL (TOT)','r GENERAL (#)','r GENERAL (/)','r GENERAL (=)',
  'r CON # (TOT)','r CON # (#)','r CON # (/)','r CON # (=)',
  'r CON + (TOT)','r CON + (#)','r CON + (/)','r CON + (=)',
  'r CON ! (TOT)','r CON ! (#)','r CON ! (/)','r CON ! (=)',
  'r CON - (TOT)','r CON - (#)','r CON - (/)','r CON - (=)',
  'd GENERAL (TOT)','d GENERAL (#)','d GENERAL (/)','d GENERAL (=)',
  'd PRIMEROS TIEMPOS (TOT)','d PRIMEROS TIEMPOS (#)','d PRIMEROS TIEMPOS (/)','d PRIMEROS TIEMPOS (=)',
  'd TENDIDA (TOT)','d TENDIDA (#)','d TENDIDA (/)','d TENDIDA (=)',
  'd ALTA (TOT)','d ALTA (#)','d ALTA (/)','d ALTA (=)',
  'BLOQUEO','ACC GANADAS','ACC PERDIDAS'
];

const METRIC_OPTIONS = [
  { value: 'eff_saque',      label: 'Eficiencia Saque %',            isPct: true  },
  { value: 'eficacia_saque', label: 'Eficacia Saque %',              isPct: true  },
  { value: 's_ace',          label: 'Aces de Saque',                 isPct: false },
  { value: 's_tot',          label: 'Intentos de Saque',             isPct: false },
  { value: 'eficacia_rec',   label: 'Eficacia Recepción %',          isPct: true  },
  { value: 'eff_rec',        label: 'Eficiencia Recepción %',        isPct: true  },
  { value: 'r_tot',          label: 'Intentos de Recepción',         isPct: false },
  { value: 'eficacia_atq',   label: 'Eficacia Ataque Rotación %',    isPct: true  },
  { value: 'eff_atq_rot',    label: 'Eficiencia Ataque Rotación %',  isPct: true  },
  { value: 'atq_tot',        label: 'Intentos Ataque Rot.',          isPct: false },
  { value: 'eficacia_contra',label: 'Eficacia Contraataque %',       isPct: true  },
  { value: 'eff_contra',     label: 'Eficiencia Contraataque %',     isPct: true  },
  { value: 'contra_tot',     label: 'Intentos Contraataque',         isPct: false },
  { value: 'bloqueo',        label: 'Bloqueos',                      isPct: false },
  { value: 'acc_g',          label: 'Acciones Ganadas',              isPct: false },
  { value: 'acc_p',          label: 'Acciones Perdidas',             isPct: false },
  { value: 'balance',        label: 'Balance (Acc G – Acc P)',       isPct: false },
];

const REF_LINE_DEFS = [
  { key: 'mean',   label: 'Media',    color: '#ffc107', dash: [6, 3] },
  { key: 'median', label: 'Mediana',  color: '#64b5f6', dash: [4, 4] },
  { key: 'max',    label: 'Máximo',   color: '#ff7043', dash: [8, 2] },
  { key: 'min',    label: 'Mínimo',   color: '#ab47bc', dash: [3, 6] },
];

const CAT_COLORS = {
  'S-16': '#1565c0',
  'S-18': '#6a1b9a',
  'S-21': '#b71c1c',
};

const LINE_PALETTE = [
  '#ffc107','#00c853','#64b5f6','#ff7043','#ab47bc','#00bcd4',
  '#8bc34a','#ff5252','#40c4ff','#ff6d00','#e040fb','#69f0ae',
  '#ffab40','#80d8ff','#b9f6ca','#ea80fc',
];