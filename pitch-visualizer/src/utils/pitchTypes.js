export const PITCH_COLORS = {
  'Fastball': '#EF4444',
  'Four-Seam': '#EF4444',
  'FourSeamFastBall': '#EF4444',
  'FF': '#EF4444',
  'Sinker': '#F97316',
  'SI': '#F97316',
  'TwoSeamFastBall': '#F97316',
  'Cutter': '#EAB308',
  'FC': '#EAB308',
  'Slider': '#22C55E',
  'SL': '#22C55E',
  'Sweeper': '#16A34A',
  'Curveball': '#3B82F6',
  'CB': '#3B82F6',
  'CurveBall': '#3B82F6',
  'KC': '#3B82F6',
  'Changeup': '#A855F7',
  'CH': '#A855F7',
  'ChangeUp': '#A855F7',
  'Splitter': '#EC4899',
  'FS': '#EC4899',
  'Knuckleball': '#14B8A6',
  'KN': '#14B8A6',
  'Other': '#94A3B8',
};

export const PITCH_DISPLAY_NAMES = {
  'FourSeamFastBall': 'Four-Seam',
  'TwoSeamFastBall': 'Two-Seam',
  'CurveBall': 'Curveball',
  'ChangeUp': 'Changeup',
  'FF': 'Four-Seam',
  'SI': 'Sinker',
  'FC': 'Cutter',
  'SL': 'Slider',
  'CB': 'Curveball',
  'CH': 'Changeup',
  'FS': 'Splitter',
  'KN': 'Knuckleball',
};

export function getPitchColor(pitchType) {
  return PITCH_COLORS[pitchType] || '#94A3B8';
}

export function getPitchDisplayName(pitchType) {
  return PITCH_DISPLAY_NAMES[pitchType] || pitchType || 'Unknown';
}

export function normalizePitchType(pitchType) {
  if (!pitchType) return 'Other';
  const trimmed = pitchType.trim();
  const map = {
    // ── Trackman abbreviations & full names ──────────────────────────────
    'FF': 'Four-Seam',
    'FA': 'Four-Seam',
    'FourSeamFastBall': 'Four-Seam',
    'Four-Seam': 'Four-Seam',
    'Fastball': 'Four-Seam',
    'SI': 'Sinker',
    'FT': 'Sinker',
    'Sinker': 'Sinker',
    'TwoSeamFastBall': 'Sinker',
    'Two-Seam': 'Sinker',
    'FC': 'Cutter',
    'Cutter': 'Cutter',
    'SL': 'Slider',
    'Slider': 'Slider',
    'ST': 'Sweeper',
    'Sweeper': 'Sweeper',
    'CB': 'Curveball',
    'CU': 'Curveball',
    'KC': 'Curveball',
    'CurveBall': 'Curveball',
    'Curveball': 'Curveball',
    'CH': 'Changeup',
    'ChangeUp': 'Changeup',
    'Changeup': 'Changeup',
    'FS': 'Splitter',
    'Splitter': 'Splitter',
    'KN': 'Knuckleball',
    'Knuckleball': 'Knuckleball',
    // ── Baseball Savant pitch_name full names ────────────────────────────
    '4-Seam Fastball': 'Four-Seam',
    '2-Seam Fastball': 'Sinker',
    'Split-Finger': 'Splitter',
    'Knuckle Curve': 'Curveball',
    'Slow Curve': 'Curveball',
    'Eephus': 'Other',
    'Pitch Out': 'Other',
  };
  return map[trimmed] || trimmed;
}

export const PITCH_TYPE_ORDER = [
  'Four-Seam', 'Sinker', 'Cutter', 'Slider', 'Sweeper',
  'Curveball', 'Changeup', 'Splitter', 'Knuckleball', 'Other',
];

export const NORMALIZED_PITCH_COLORS = {
  'Four-Seam': '#EF4444',
  'Sinker': '#F97316',
  'Cutter': '#EAB308',
  'Slider': '#22C55E',
  'Sweeper': '#16A34A',
  'Curveball': '#3B82F6',
  'Changeup': '#A855F7',
  'Splitter': '#EC4899',
  'Knuckleball': '#14B8A6',
  'Other': '#94A3B8',
};

export function getNormalizedPitchColor(pitchType) {
  return NORMALIZED_PITCH_COLORS[pitchType] || '#94A3B8';
}
