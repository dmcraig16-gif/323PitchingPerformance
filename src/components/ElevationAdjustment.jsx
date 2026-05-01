import { useState, useMemo } from 'react';
import { getNormalizedPitchColor, PITCH_TYPE_ORDER } from '../utils/pitchTypes';
import {
  airDensityRatio,
  movementScaleFactor,
  densityChangePct,
  VENUE_PRESETS,
} from '../utils/elevation';

// ── Movement chart constants ──────────────────────────────────────────────────
const PAD = 44;
const W = 400;
const H = 380;
const PLOT_W = W - PAD * 2;
const PLOT_H = H - PAD * 2;
const X_RANGE = 25;
const Y_RANGE = 25;

function toSvgX(x) {
  return PAD + ((x + X_RANGE) / (X_RANGE * 2)) * PLOT_W;
}
function toSvgY(y) {
  return H - PAD - ((y + Y_RANGE) / (Y_RANGE * 2)) * PLOT_H;
}

const GRID_VALS = [-20, -10, 0, 10, 20];

// ── Elevation slider ──────────────────────────────────────────────────────────
function ElevSlider({ label, value, onChange }) {
  const preset = VENUE_PRESETS.find(v => Math.abs(v.alt - value) < 50) || null;
  const density = (airDensityRatio(value) * 100).toFixed(1);

  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ color: '#F9FAFB', fontSize: 15, fontWeight: 700 }}>
          {value.toLocaleString()} ft
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={10000}
        step={50}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#60A5FA', cursor: 'pointer' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ color: '#6B7280', fontSize: 11 }}>
          {preset
            ? <span style={{ color: '#60A5FA' }}>{preset.name}</span>
            : <span style={{ color: '#6B7280' }}>—</span>}
        </span>
        <span style={{ color: '#6B7280', fontSize: 11 }}>
          ρ = {density}% of sea level
        </span>
      </div>

      {/* Venue quick-select */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
        {VENUE_PRESETS.map(v => (
          <button
            key={v.name}
            onClick={() => onChange(v.alt)}
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 11,
              cursor: 'pointer',
              border: `1px solid ${Math.abs(v.alt - value) < 50 ? '#60A5FA' : '#374151'}`,
              background: Math.abs(v.alt - value) < 50 ? '#1E3A5F' : '#1F2937',
              color: Math.abs(v.alt - value) < 50 ? '#93C5FD' : '#6B7280',
              transition: 'all 0.12s',
            }}
          >
            {v.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function DeltaBadge({ delta, unit = '"' }) {
  if (delta === null || isNaN(delta)) return <span style={{ color: '#6B7280' }}>—</span>;
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0.05 ? '#34D399' : delta < -0.05 ? '#F87171' : '#9CA3AF';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {sign}{delta.toFixed(1)}{unit}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ElevationAdjustment({ pitches, selectedPitchTypes }) {
  const [refAlt, setRefAlt] = useState(0);
  const [targetAlt, setTargetAlt] = useState(5280);

  const scale = movementScaleFactor(refAlt, targetAlt);
  const densityDelta = densityChangePct(refAlt, targetAlt);
  const noChange = Math.abs(densityDelta) < 0.05;

  const visible = useMemo(() => pitches.filter(p =>
    p.horzBreak !== null &&
    p.vertBreak !== null &&
    (selectedPitchTypes.length === 0 || selectedPitchTypes.includes(p.pitchType))
  ), [pitches, selectedPitchTypes]);

  // Per-pitch-type average stats for the breakdown table
  const typeStats = useMemo(() => {
    const byType = {};
    for (const p of visible) {
      if (!byType[p.pitchType]) byType[p.pitchType] = { ivb: [], hb: [] };
      if (p.vertBreak !== null) byType[p.pitchType].ivb.push(p.vertBreak);
      if (p.horzBreak !== null) byType[p.pitchType].hb.push(p.horzBreak);
    }
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return PITCH_TYPE_ORDER.filter(t => byType[t]).map(t => {
      const origIVB = avg(byType[t].ivb);
      const origHB = avg(byType[t].hb);
      return {
        pitchType: t,
        count: byType[t].ivb.length,
        origIVB,
        adjIVB: origIVB !== null ? origIVB * scale : null,
        deltaIVB: origIVB !== null ? origIVB * scale - origIVB : null,
        origHB,
        adjHB: origHB !== null ? origHB * scale : null,
        deltaHB: origHB !== null ? origHB * scale - origHB : null,
        color: getNormalizedPitchColor(t),
      };
    });
  }, [visible, scale]);

  const fmt = (v, d = 1) => v !== null ? v.toFixed(d) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Controls card ─────────────────────────────────────────────────── */}
      <div className="chart-card">
        <h3 className="chart-title">Elevation Break Adjustment</h3>
        <p className="chart-subtitle">
          Magnus force (iVB &amp; HorzBreak) scales with air density — adjust to project
          how a pitch arsenal would perform at a different altitude.
        </p>

        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 20 }}>
          <ElevSlider label="Data collected at (reference)" value={refAlt} onChange={setRefAlt} />
          <ElevSlider label="Project to (target)" value={targetAlt} onChange={setTargetAlt} />
        </div>

        {/* Summary pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '8px 16px', borderRadius: 8,
          background: noChange ? '#1F2937' : densityDelta < 0 ? '#450A0A' : '#052e16',
          border: `1px solid ${noChange ? '#374151' : densityDelta < 0 ? '#7F1D1D' : '#14532D'}`,
        }}>
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>Density ratio:</span>
          <span style={{ color: '#F9FAFB', fontWeight: 700, fontSize: 14 }}>
            {(scale * 100).toFixed(1)}%
          </span>
          <span style={{ color: '#6B7280', fontSize: 13 }}>→ break changes</span>
          <span style={{
            fontWeight: 700, fontSize: 14,
            color: noChange ? '#9CA3AF' : densityDelta < 0 ? '#F87171' : '#34D399',
          }}>
            {densityDelta >= 0 ? '+' : ''}{densityDelta.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="chart-grid chart-grid-2">

        {/* Movement overlay chart */}
        <div className="chart-card">
          <h3 className="chart-title">Movement Profile</h3>
          <p className="chart-subtitle">
            <span style={{ color: '#6B7280' }}>◌ Original centroid / dots</span>
            &nbsp;·&nbsp;
            <span style={{ color: '#D1D5DB' }}>● Adjusted</span>
            &nbsp;· arrow = Δ per pitch type &nbsp;— {visible.length} pitches
          </p>
          <svg width={W} height={H} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}>
            <defs>
              {/* One arrowhead marker per pitch type, in that type's color */}
              {typeStats.map(s => {
                const id = `arrow-${s.pitchType.replace(/[\s/]/g, '-')}`;
                return (
                  <marker key={id} id={id}
                    markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                    <path d="M0,0 L0,7 L7,3.5 z" fill={s.color} />
                  </marker>
                );
              })}
            </defs>

            {/* Grid */}
            {GRID_VALS.map(v => (
              <g key={v}>
                <line x1={toSvgX(v)} y1={PAD} x2={toSvgX(v)} y2={H - PAD}
                  stroke="#374151" strokeWidth={v === 0 ? 1 : 0.5}
                  strokeDasharray={v === 0 ? 'none' : '4,4'} />
                <line x1={PAD} y1={toSvgY(v)} x2={W - PAD} y2={toSvgY(v)}
                  stroke="#374151" strokeWidth={v === 0 ? 1 : 0.5}
                  strokeDasharray={v === 0 ? 'none' : '4,4'} />
              </g>
            ))}
            {GRID_VALS.map(v => (
              <g key={v}>
                <text x={toSvgX(v)} y={H - 6} textAnchor="middle" fontSize={10} fill="#6B7280">{v}&quot;</text>
                {v !== 0 && (
                  <text x={12} y={toSvgY(v) + 4} textAnchor="middle" fontSize={10} fill="#6B7280">{v}</text>
                )}
              </g>
            ))}
            <text x={W / 2} y={H} textAnchor="middle" fontSize={11} fill="#4B5563">← Arm Side | Glove Side →</text>
            <text x={6} y={H / 2} textAnchor="middle" fontSize={11} fill="#4B5563"
              transform={`rotate(-90, 6, ${H / 2})`}>iVB (in)</text>

            {/* Ghost layer — original individual pitches */}
            {visible.map((p, i) => (
              <circle key={`orig-${i}`}
                cx={toSvgX(p.horzBreak)} cy={toSvgY(p.vertBreak)}
                r={4} fill="none"
                stroke={getNormalizedPitchColor(p.pitchType)}
                strokeWidth={0.8} strokeOpacity={0.25}
              />
            ))}

            {/* Adjusted individual pitches */}
            {visible.map((p, i) => (
              <circle key={`adj-${i}`}
                cx={toSvgX(p.horzBreak * scale)} cy={toSvgY(p.vertBreak * scale)}
                r={4}
                fill={getNormalizedPitchColor(p.pitchType)}
                fillOpacity={0.55}
                stroke="#111827" strokeWidth={0.3}
              />
            ))}

            {/* Per-pitch-type centroid arrows + Δ callout badges */}
            {typeStats.map(s => {
              if (s.origIVB === null || s.origHB === null) return null;
              const x1 = toSvgX(s.origHB);
              const y1 = toSvgY(s.origIVB);
              const x2 = toSvgX(s.adjHB);
              const y2 = toSvgY(s.adjIVB);
              const dx = x2 - x1;
              const dy = y2 - y1;
              const dist = Math.sqrt(dx * dx + dy * dy);

              // Shorten line so it ends before the arrowhead marker
              const shrink = dist > 14 ? 10 / dist : 0;
              const lx2 = x2 - dx * shrink;
              const ly2 = y2 - dy * shrink;

              // Badge offset: perpendicular-right of the arrow direction, then forward
              const nx = dist > 0 ? -dy / dist : 0;   // perpendicular
              const ny = dist > 0 ?  dx / dist : 0;
              const ux = dist > 0 ?  dx / dist : 1;   // forward unit
              const uy = dist > 0 ?  dy / dist : 0;
              const bx = x2 + ux * 14 + nx * 12;
              const by = y2 + uy * 14 + ny * 12;

              const sign = v => (v >= 0 ? '+' : '') + v.toFixed(1);
              const dIVB = s.deltaIVB;
              const dHB  = s.deltaHB;
              const markerId = `arrow-${s.pitchType.replace(/[\s/]/g, '-')}`;

              return (
                <g key={s.pitchType}>
                  {/* Original centroid — larger ring */}
                  <circle cx={x1} cy={y1} r={9}
                    fill="none" stroke={s.color} strokeWidth={1.5} strokeOpacity={0.5}
                    strokeDasharray="3,2"
                  />

                  {/* Arrow from original to adjusted centroid */}
                  {dist > 3 && (
                    <line x1={x1} y1={y1} x2={lx2} y2={ly2}
                      stroke={s.color} strokeWidth={2}
                      markerEnd={`url(#${markerId})`}
                    />
                  )}

                  {/* Adjusted centroid — solid filled circle */}
                  <circle cx={x2} cy={y2} r={9}
                    fill={s.color} fillOpacity={0.9}
                    stroke="#111827" strokeWidth={1}
                  />

                  {/* Δ callout badge */}
                  {dIVB !== null && (
                    <g>
                      <rect
                        x={bx - 28} y={by - 18}
                        width={56} height={dHB !== null ? 28 : 16}
                        rx={4} ry={4}
                        fill="#0D1117" stroke={s.color}
                        strokeWidth={1} strokeOpacity={0.7}
                        fillOpacity={0.92}
                      />
                      <text x={bx} y={by - 6}
                        textAnchor="middle" fontSize={10} fontWeight={700}
                        fill={dIVB < -0.05 ? '#F87171' : dIVB > 0.05 ? '#34D399' : '#9CA3AF'}>
                        iVB {sign(dIVB)}&quot;
                      </text>
                      {dHB !== null && (
                        <text x={bx} y={by + 7}
                          textAnchor="middle" fontSize={10} fontWeight={700}
                          fill={dHB < -0.05 ? '#F87171' : dHB > 0.05 ? '#34D399' : '#9CA3AF'}>
                          HB {sign(dHB)}&quot;
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Per-type breakdown table */}
        <div className="chart-card" style={{ overflowX: 'auto' }}>
          <h3 className="chart-title">Break Change by Pitch Type</h3>
          <p className="chart-subtitle">
            {refAlt.toLocaleString()} ft → {targetAlt.toLocaleString()} ft
            &nbsp;({densityDelta >= 0 ? '+' : ''}{densityDelta.toFixed(1)}% density)
          </p>

          {typeStats.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: 13 }}>No movement data available.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151' }}>
                  {['Type', 'n', 'iVB orig', 'iVB adj', 'Δ iVB', 'HB orig', 'HB adj', 'Δ HB'].map(h => (
                    <th key={h} style={{
                      padding: '6px 8px', textAlign: 'right',
                      color: '#6B7280', fontWeight: 500, fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}>
                      {h === 'Type'
                        ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span>
                        : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {typeStats.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                    <td style={{ padding: '7px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: s.color, display: 'inline-block', flexShrink: 0,
                        }} />
                        <span style={{ color: '#F9FAFB', fontWeight: 500 }}>{s.pitchType}</span>
                      </div>
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: '#6B7280' }}>{s.count}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: '#9CA3AF' }}>{fmt(s.origIVB)}"</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.adjIVB)}"</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}><DeltaBadge delta={s.deltaIVB} /></td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: '#9CA3AF' }}>{fmt(s.origHB)}"</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.adjHB)}"</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}><DeltaBadge delta={s.deltaHB} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Visual iVB delta bar chart */}
          {typeStats.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: '#6B7280', fontSize: 11, marginBottom: 10 }}>Induced Vertical Break: original vs. adjusted (avg per pitch type)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {typeStats.filter(s => s.origIVB !== null).map(s => {
                  const maxVal = Math.max(...typeStats.map(t => Math.abs(t.origIVB || 0))) || 1;
                  const origPct = Math.abs(s.origIVB) / maxVal * 100;
                  const adjPct = Math.abs(s.adjIVB) / maxVal * 100;
                  const isPos = s.origIVB >= 0;
                  return (
                    <div key={s.pitchType}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ color: '#9CA3AF', fontSize: 11, width: 74, flexShrink: 0 }}>{s.pitchType}</span>
                        <div style={{ flex: 1, position: 'relative', height: 16 }}>
                          {/* Original bar */}
                          <div style={{
                            position: 'absolute', top: 0, left: 0,
                            width: `${origPct}%`, height: '100%',
                            background: s.color, opacity: 0.25, borderRadius: 3,
                          }} />
                          {/* Adjusted bar */}
                          <div style={{
                            position: 'absolute', top: 2, left: 0,
                            width: `${adjPct}%`, height: 'calc(100% - 4px)',
                            background: s.color, opacity: 0.9, borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ color: '#9CA3AF', fontSize: 11, width: 34, textAlign: 'right' }}>
                          {fmt(s.origIVB)}"
                        </span>
                        <span style={{ color: '#6B7280', fontSize: 11 }}>→</span>
                        <span style={{ color: '#F9FAFB', fontSize: 11, width: 34 }}>
                          {fmt(s.adjIVB)}"
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Physics note ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px', borderRadius: 8,
        background: '#111827', border: '1px solid #1F2937',
        color: '#6B7280', fontSize: 12, lineHeight: 1.6,
      }}>
        <strong style={{ color: '#9CA3AF' }}>Physics note:</strong>{' '}
        Induced vertical break (iVB) and horizontal break both arise from the Magnus force,
        which is proportional to air density. Using the International Standard Atmosphere (ISA)
        troposphere model, density at altitude <em>h</em> (ft) is
        &nbsp;ρ(h) = ρ₀ × (1 − 6.876×10⁻⁶ · h)^5.256.
        At Denver (5,280 ft) air density is ≈{(airDensityRatio(5280) * 100).toFixed(1)}% of sea level,
        so a 15" riser thrown at sea level would produce
        ≈{(15 * movementScaleFactor(0, 5280)).toFixed(1)}" at Coors Field.
        Gravitational drop is unaffected by altitude and is not adjusted.
      </div>
    </div>
  );
}
