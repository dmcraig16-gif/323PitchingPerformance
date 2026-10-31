import Papa from 'papaparse';
import { normalizePitchType } from './pitchTypes';

// Column candidates — Trackman names first, then Baseball Savant equivalents.
// pitch_name (full Savant name e.g. "4-Seam Fastball") is preferred over
// pitch_type (abbreviation e.g. "FF") because it normalizes more reliably.
const FIELD_MAP = {
  pitchType:      ['TaggedPitchType', 'AutoPitchType', 'PitchType', 'pitch_name', 'pitch_type'],
  velocity:       ['RelSpeed', 'PitchSpeed', 'Velocity', 'Speed', 'release_speed', 'effective_speed'],
  spinRate:       ['SpinRate', 'Spin Rate', 'SpinRateAxis', 'release_spin_rate'],
  spinAxis:       ['SpinAxis', 'Spin Axis', 'spin_axis'],
  // pfx_x / pfx_z are in feet in Savant; HorzBreak / InducedVertBreak are in
  // inches in Trackman. Format detection below applies ×12 when needed.
  horzBreak:      ['HorzBreak', 'HorizontalBreak', 'HBreak', 'pfx_x'],
  vertBreak:      ['InducedVertBreak', 'VertBreak', 'VBreak', 'pfx_z'],
  plateLocHeight: ['PlateLocHeight', 'pz', 'PlateHeight', 'plate_z'],
  plateLocSide:   ['PlateLocSide', 'px', 'PlateSide', 'plate_x'],
  relHeight:      ['RelHeight', 'RelativeHeight', 'ReleaseHeight', 'release_pos_z'],
  relSide:        ['RelSide', 'RelativeSide', 'ReleaseSide', 'release_pos_x'],
  extension:      ['Extension', 'ReleaseExtension', 'release_extension'],
  vertApprAngle:  ['VertApprAngle', 'VerticalApproachAngle', 'VAA'],
  horzApprAngle:  ['HorzApprAngle', 'HorizontalApproachAngle', 'HAA'],
  // Savant: player_name is "Last, First"; pitcher is the numeric MLBAM ID.
  // Put player_name after Trackman names so Trackman files prefer 'Pitcher'.
  pitcher:        ['Pitcher', 'PitcherName', 'pitcher_name', 'player_name'],
  pitcherId:      ['PitcherId', 'PitcherID', 'pitcher_id', 'pitcher'],
  pitcherTeam:    ['PitcherTeam', 'pitcher_team', 'p_throws'],
  batter:         ['Batter', 'BatterName', 'batter_name', 'batter'],
  date:           ['Date', 'GameDate', 'game_date'],
  inning:         ['Inning', 'inning'],
  // Savant: description has values like "called_strike", "ball", "swinging_strike"
  pitchCall:      ['PitchCall', 'pitch_call', 'CallOfPitch', 'description'],
  taggedHitType:  ['TaggedHitType', 'hit_type', 'bb_type'],
  exitSpeed:      ['ExitSpeed', 'ExitVelocity', 'launch_speed'],
  launchAngle:    ['Angle', 'LaunchAngle', 'launch_angle'],
};

// ── Format detection ─────────────────────────────────────────────────────────
// Savant exports contain pfx_x/pfx_z (feet) and release_speed.
// Trackman exports contain RelSpeed, TaggedPitchType, HorzBreak, etc.
const SAVANT_MARKERS  = ['pfx_x', 'pfx_z', 'release_speed', 'plate_x', 'plate_z'];
const TRACKMAN_MARKERS = ['RelSpeed', 'TaggedPitchType', 'HorzBreak', 'InducedVertBreak'];

function detectFormat(headers) {
  const lower = new Set(headers.map(h => h.trim().toLowerCase()));
  const savantHits   = SAVANT_MARKERS.filter(m => lower.has(m.toLowerCase())).length;
  const trackmanHits = TRACKMAN_MARKERS.filter(m => lower.has(m.toLowerCase())).length;
  return savantHits > trackmanHits ? 'savant' : 'trackman';
}

// ── Column mapping ───────────────────────────────────────────────────────────
function findColumn(headers, candidates) {
  for (const candidate of candidates) {
    const found = headers.find(h => h.trim() === candidate);
    if (found) return found;
  }
  const lower = candidates.map(c => c.toLowerCase());
  return headers.find(h => lower.includes(h.trim().toLowerCase())) || null;
}

function buildColumnMapping(headers) {
  const mapping = {};
  for (const [field, candidates] of Object.entries(FIELD_MAP)) {
    mapping[field] = findColumn(headers, candidates);
  }
  return mapping;
}

// ── Row parsing ──────────────────────────────────────────────────────────────
function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// Savant player_name is "Last, First" — keep as-is for display;
// strip numeric-only values (i.e. the pitcher ID column accidentally matched).
function parsePitcherName(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  // If the matched column is purely numeric it's the MLBAM ID, not a name
  if (/^\d+$/.test(str)) return '';
  return str;
}

function parseRow(row, colMap, isSavant) {
  const get = field => (colMap[field] ? row[colMap[field]] : null);

  const rawPitchType = get('pitchType') || '';
  const pitchType = normalizePitchType(rawPitchType);

  // pfx_x / pfx_z come in feet from Savant; multiply by 12 to get inches.
  const breakScale = isSavant ? 12 : 1;

  return {
    pitchType,
    rawPitchType: rawPitchType.trim(),
    velocity:       parseNum(get('velocity')),
    spinRate:       parseNum(get('spinRate')),
    spinAxis:       parseNum(get('spinAxis')),
    horzBreak:      parseNum(get('horzBreak')) !== null ? parseNum(get('horzBreak')) * breakScale : null,
    vertBreak:      parseNum(get('vertBreak')) !== null ? parseNum(get('vertBreak')) * breakScale : null,
    plateLocHeight: parseNum(get('plateLocHeight')),
    plateLocSide:   parseNum(get('plateLocSide')),
    relHeight:      parseNum(get('relHeight')),
    relSide:        parseNum(get('relSide')),
    extension:      parseNum(get('extension')),
    vertApprAngle:  parseNum(get('vertApprAngle')),
    horzApprAngle:  parseNum(get('horzApprAngle')),
    pitcher:        parsePitcherName(get('pitcher')),
    pitcherId:      get('pitcherId') || '',
    pitcherTeam:    get('pitcherTeam') || '',
    batter:         get('batter') || '',
    date:           get('date') || '',
    inning:         get('inning') || '',
    pitchCall:      get('pitchCall') || '',
    exitSpeed:      parseNum(get('exitSpeed')),
    launchAngle:    parseNum(get('launchAngle')),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────
export function parseTrackmanCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error('No data found in CSV'));
          return;
        }
        const headers = results.meta.fields || [];
        const format = detectFormat(headers);
        const isSavant = format === 'savant';
        const colMap = buildColumnMapping(headers);
        const pitches = results.data
          .map(row => parseRow(row, colMap, isSavant))
          .filter(p => p.pitchType && p.pitchType !== '');
        resolve({ pitches, headers, colMap, format });
      },
      error: (err) => reject(err),
    });
  });
}

export function filterPitches(pitches, { pitchTypes, pitchers }) {
  return pitches.filter(p => {
    if (pitchTypes && pitchTypes.length > 0 && !pitchTypes.includes(p.pitchType)) return false;
    if (pitchers && pitchers.length > 0 && !pitchers.includes(p.pitcher)) return false;
    return true;
  });
}

export function getUnique(pitches, field) {
  const vals = [...new Set(pitches.map(p => p[field]).filter(Boolean))];
  return vals.sort();
}

export function computeStats(pitches) {
  const byType = {};
  for (const p of pitches) {
    if (!byType[p.pitchType]) byType[p.pitchType] = [];
    byType[p.pitchType].push(p);
  }

  const stats = [];
  for (const [type, group] of Object.entries(byType)) {
    const avg = field => {
      const vals = group.map(p => p[field]).filter(v => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    stats.push({
      pitchType: type,
      count: group.length,
      avgVelo:      avg('velocity'),
      avgSpin:      avg('spinRate'),
      avgHorzBreak: avg('horzBreak'),
      avgVertBreak: avg('vertBreak'),
      avgVAA:       avg('vertApprAngle'),
      avgExtension: avg('extension'),
    });
  }

  return stats.sort((a, b) => b.count - a.count);
}
