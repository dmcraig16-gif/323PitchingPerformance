import Papa from 'papaparse';
import { normalizePitchType } from './pitchTypes';

// Trackman CSV column name mappings (handles different export formats)
const FIELD_MAP = {
  pitchType: ['TaggedPitchType', 'AutoPitchType', 'PitchType'],
  velocity: ['RelSpeed', 'PitchSpeed', 'Velocity', 'Speed'],
  spinRate: ['SpinRate', 'Spin Rate', 'SpinRateAxis'],
  spinAxis: ['SpinAxis', 'Spin Axis'],
  horzBreak: ['HorzBreak', 'HorizontalBreak', 'pfx_x', 'HBreak'],
  vertBreak: ['InducedVertBreak', 'VertBreak', 'pfx_z', 'VBreak'],
  totalVertBreak: ['VertBreak', 'TotalVertBreak'],
  plateLocHeight: ['PlateLocHeight', 'pz', 'PlateHeight'],
  plateLocSide: ['PlateLocSide', 'px', 'PlateSide'],
  relHeight: ['RelHeight', 'RelativeHeight', 'ReleaseHeight'],
  relSide: ['RelSide', 'RelativeSide', 'ReleaseSide'],
  extension: ['Extension', 'ReleaseExtension'],
  vertApprAngle: ['VertApprAngle', 'VerticalApproachAngle', 'VAA'],
  horzApprAngle: ['HorzApprAngle', 'HorizontalApproachAngle', 'HAA'],
  pitcher: ['Pitcher', 'PitcherName', 'pitcher_name'],
  pitcherId: ['PitcherId', 'pitcher_id', 'PitcherID'],
  pitcherTeam: ['PitcherTeam', 'pitcher_team'],
  batter: ['Batter', 'BatterName', 'batter_name'],
  date: ['Date', 'GameDate', 'game_date'],
  inning: ['Inning', 'inning'],
  pitchCall: ['PitchCall', 'pitch_call', 'CallOfPitch'],
  taggedHitType: ['TaggedHitType', 'hit_type'],
  exitSpeed: ['ExitSpeed', 'ExitVelocity', 'launch_speed'],
  launchAngle: ['Angle', 'LaunchAngle', 'launch_angle'],
};

function findColumn(headers, candidates) {
  for (const candidate of candidates) {
    const found = headers.find(h => h.trim() === candidate);
    if (found) return found;
  }
  // Case-insensitive fallback
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

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseRow(row, colMap) {
  const get = (field) => colMap[field] ? row[colMap[field]] : null;

  const rawPitchType = get('pitchType') || '';
  const pitchType = normalizePitchType(rawPitchType);

  return {
    pitchType,
    rawPitchType: rawPitchType.trim(),
    velocity: parseNum(get('velocity')),
    spinRate: parseNum(get('spinRate')),
    spinAxis: parseNum(get('spinAxis')),
    horzBreak: parseNum(get('horzBreak')),
    vertBreak: parseNum(get('vertBreak')),
    plateLocHeight: parseNum(get('plateLocHeight')),
    plateLocSide: parseNum(get('plateLocSide')),
    relHeight: parseNum(get('relHeight')),
    relSide: parseNum(get('relSide')),
    extension: parseNum(get('extension')),
    vertApprAngle: parseNum(get('vertApprAngle')),
    horzApprAngle: parseNum(get('horzApprAngle')),
    pitcher: get('pitcher') || '',
    pitcherId: get('pitcherId') || '',
    pitcherTeam: get('pitcherTeam') || '',
    batter: get('batter') || '',
    date: get('date') || '',
    inning: get('inning') || '',
    pitchCall: get('pitchCall') || '',
    exitSpeed: parseNum(get('exitSpeed')),
    launchAngle: parseNum(get('launchAngle')),
  };
}

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
        const colMap = buildColumnMapping(headers);
        const pitches = results.data
          .map(row => parseRow(row, colMap))
          .filter(p => p.pitchType && p.pitchType !== '');
        resolve({ pitches, headers, colMap });
      },
      error: (err) => reject(err),
    });
  });
}

export function filterPitches(pitches, { pitchTypes, pitchers, dateRange }) {
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
    const count = group.length;
    const avg = (field) => {
      const vals = group.map(p => p[field]).filter(v => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const fmt = (v, d = 1) => v !== null ? v.toFixed(d) : '-';

    stats.push({
      pitchType: type,
      count,
      pct: count,
      avgVelo: avg('velocity'),
      avgSpin: avg('spinRate'),
      avgHorzBreak: avg('horzBreak'),
      avgVertBreak: avg('vertBreak'),
      avgVAA: avg('vertApprAngle'),
      avgExtension: avg('extension'),
    });
  }

  return stats.sort((a, b) => b.count - a.count);
}
