import { useMemo } from 'react';
import { computeStats, filterPitches } from '../utils/parseTrackman';
import { getNormalizedPitchColor } from '../utils/pitchTypes';

const fmt = (v, d = 1) => (v !== null && v !== undefined) ? Number(v).toFixed(d) : '—';

export default function StatsTable({ pitches, selectedPitchTypes }) {
  const filtered = useMemo(() => {
    return selectedPitchTypes.length > 0
      ? pitches.filter(p => selectedPitchTypes.includes(p.pitchType))
      : pitches;
  }, [pitches, selectedPitchTypes]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const total = filtered.length;

  if (!stats.length) return null;

  return (
    <div className="chart-card" style={{ overflowX: 'auto' }}>
      <h3 className="chart-title">Pitch Summary</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #374151' }}>
            {['Pitch Type', 'Count', 'Usage%', 'Avg Velo', 'Avg Spin', 'HB (in)', 'iVB (in)', 'VAA', 'Ext (ft)'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'right', color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {h === 'Pitch Type' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
              <td style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: getNormalizedPitchColor(s.pitchType),
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ color: '#F9FAFB', fontWeight: 500 }}>{s.pitchType}</span>
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>{s.count}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>
                {total > 0 ? ((s.count / total) * 100).toFixed(1) + '%' : '—'}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.avgVelo)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.avgSpin, 0)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.avgHorzBreak)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.avgVertBreak)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.avgVAA)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.avgExtension)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
