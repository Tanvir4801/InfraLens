export const T = {
  bgPrimary:   '#0d1117',
  bgCard:      '#161b22',
  bgCardAlt:   '#1f2937',
  border:      '#30363d',
  textPrimary: '#e6edf3',
  textMuted:   '#8b949e',
  textHint:    '#484f58',
  green:       '#1D9E75',
  greenLight:  '#5DCAA5',
  amber:       '#EF9F27',
  red:         '#E24B4A',
  blue:        '#378ADD',
  blueLight:   '#85B7EB',
  purple:      '#8957E5',
};

export const glass = {
  background: 'rgba(22,27,34,0.85)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(48,54,61,0.7)',
  borderRadius: 12,
};

export const severityColor = (s) => {
  s = (s || '').toLowerCase();
  if (s === 'critical' || s === 'p1') return T.red;
  if (s === 'warning'  || s === 'p2') return T.amber;
  if (s === 'info'     || s === 'p3') return T.blue;
  return T.textMuted;
};

export const metricColor = (v) => {
  if (v >= 80) return T.red;
  if (v >= 60) return T.amber;
  return T.green;
};
