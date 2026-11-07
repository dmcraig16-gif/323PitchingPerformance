import { useState, useMemo } from 'react';
import { getNormalizedPitchColor, PITCH_TYPE_ORDER } from '../utils/pitchTypes';
import {
  airDensityFull,
  movementScaleFactorFull,
  factorBreakdown,
  totalDensityChangePct,
  isaPressureInHg,
  isaTemperatureF,
  VENUE_PRESETS,
  TIME_OF_DAY_PRESETS,
} from '../utils/elevation';

// ── SVG chart ─────────────────────────────────────────────────────────────────
const PAD = 44, W = 400, H = 380;
const PLOT_W = W - PAD * 2, PLOT_H = H - PAD * 2;
const X_RANGE = 25, Y_RANGE = 25;
const toSvgX = x => PAD + ((x + X_RANGE) / (X_RANGE * 2)) * PLOT_W;
const toSvgY = y => H - PAD - ((y + Y_RANGE) / (Y_RANGE * 2)) * PLOT_H;
const GRID_VALS = [-20, -10, 0, 10, 20];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v, d = 1) => v !== null && v !== undefined ? Number(v).toFixed(d) : '—';
const sign = v => (v >= 0 ? '+' : '') + v.toFixed(2);
const deltaColor = v => Math.abs(v) < 0.05 ? '#9CA3AF' : v < 0 ? '#F87171' : '#34D399';

function avg(arr) {
  const f = arr.filter(v => v !== null && !isNaN(v));
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
}

function defaultCond(altFt = 0) {
  return {
    altFt,
    tempF: Math.round(isaTemperatureF(altFt)),
    pressureInHg: parseFloat(isaPressureInHg(altFt).toFixed(2)),
    humidity: 50,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step, unit, onChange, hint, accentColor = '#60A5FA' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#9CA3AF', fontSize: 12 }}>{label}</span>
        <span style={{ color: '#F9FAFB', fontWeight: 700, fontSize: 13 }}>
          {typeof value === 'number' ? (Number.isInteger(step) ? value.toLocaleString() : value.toFixed(2)) : value}
          {' '}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor, cursor: 'pointer' }}
      />
      {hint && <div style={{ color: '#4B5563', fontSize: 10, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function ConditionPanel({ label, cond, onChange, accentColor }) {
  const density = airDensityFull(cond.altFt, cond.tempF, cond.pressureInHg, cond.humidity);
  const stdDensity = airDensityFull(0, 59, 29.921, 0);
  const densityPct = (density / stdDensity * 100).toFixed(1);

  const set = (key, val) => onChange({ ...cond, [key]: val });
  const setAlt = val => onChange({
    ...cond,
    altFt: val,
    pressureInHg: parseFloat(isaPressureInHg(val).toFixed(2)),
  });

  const matchPreset = VENUE_PRESETS.find(v => Math.abs(v.alt - cond.altFt) < 50);

  return (
    <div style={{ flex: 1, minWidth: 260, padding: '16px', background: '#0D1117', borderRadius: 8, border: `1px solid ${accentColor}33` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: accentColor, fontWeight: 600, fontSize: 13 }}>{label}</span>
        <span style={{ color: densityPct < 95 ? '#F87171' : densityPct > 100 ? '#34D399' : '#9CA3AF', fontSize: 12, fontWeight: 600 }}>
          ρ = {densityPct}% std
        </span>
      </div>

      {/* Time of day presets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#6B7280', fontSize: 10, marginBottom: 5 }}>TIME OF DAY</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TIME_OF_DAY_PRESETS.map(tod => {
            const active = Math.abs(cond.tempF - tod.tempF) < 4 && Math.abs(cond.humidity - tod.humidity) < 6;
            return (
              <button key={tod.label} onClick={() => onChange({ ...cond, tempF: tod.tempF, humidity: tod.humidity })}
                style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  background: active ? `${accentColor}22` : '#1F2937',
                  border: `1px solid ${active ? accentColor : '#374151'}`,
                  color: active ? accentColor : '#6B7280',
                }}>
                {tod.icon} {tod.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Altitude */}
      <SliderRow label="Altitude" value={cond.altFt} min={0} max={10000} step={50} unit="ft"
        onChange={setAlt} accentColor={accentColor}
        hint={matchPreset ? `📍 ${matchPreset.name}` : undefined}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 12, marginTop: -6 }}>
        {VENUE_PRESETS.map(v => (
          <button key={v.name} onClick={() => setAlt(v.alt)}
            style={{
              padding: '1px 6px', borderRadius: 999, fontSize: 10, cursor: 'pointer',
              border: `1px solid ${Math.abs(v.alt - cond.altFt) < 50 ? accentColor : '#374151'}`,
              background: Math.abs(v.alt - cond.altFt) < 50 ? `${accentColor}22` : '#1F2937',
              color: Math.abs(v.alt - cond.altFt) < 50 ? accentColor : '#6B7280',
            }}>{v.name}</button>
        ))}
      </div>

      {/* Temperature */}
      <SliderRow label="Temperature" value={cond.tempF} min={20} max={110} step={1} unit="°F"
        onChange={v => set('tempF', v)} accentColor="#F97316"
        hint={`ISA at ${cond.altFt.toLocaleString()} ft: ${Math.round(isaTemperatureF(cond.altFt))}°F`}
      />

      {/* Barometric Pressure */}
      <SliderRow label="Barometric Pressure" value={cond.pressureInHg} min={27.0} max={31.0} step={0.01} unit="inHg"
        onChange={v => set('pressureInHg', v)} accentColor="#A78BFA"
        hint={`ISA at ${cond.altFt.toLocaleString()} ft: ${isaPressureInHg(cond.altFt).toFixed(2)} inHg`}
      />

      {/* Humidity */}
      <SliderRow label="Relative Humidity" value={cond.humidity} min={0} max={100} step={1} unit="%"
        onChange={v => set('humidity', v)} accentColor="#34D399"
        hint="Higher humidity → less dense air (H₂O lighter than N₂/O₂)"
      />
    </div>
  );
}

function FactorBar({ label, value, maxAbs }) {
  const pct = maxAbs > 0 ? Math.abs(value) / maxAbs * 100 : 0;
  const color = deltaColor(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ color: '#6B7280', fontSize: 11, width: 76, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 10, background: '#1F2937', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 0.2s' }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 600, width: 48, textAlign: 'right' }}>
        {value >= 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (delta === null || isNaN(delta)) return <span style={{ color: '#6B7280' }}>—</span>;
  return <span style={{ color: deltaColor(delta), fontWeight: 600 }}>{sign(delta)}"</span>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ElevationAdjustment({ pitches, selectedPitchTypes }) {
  const [refCond, setRefCond] = useState(defaultCond(0));
  const [targetCond, setTargetCond] = useState(defaultCond(5280));

  const scale = movementScaleFactorFull(refCond, targetCond);
  const totalDelta = totalDensityChangePct(refCond, targetCond);
  const breakdown = factorBreakdown(refCond, targetCond);
  const noChange = Math.abs(totalDelta) < 0.05;

  const visible = useMemo(() => pitches.filter(p =>
    p.horzBreak !== null && p.vertBreak !== null &&
    (selectedPitchTypes.length === 0 || selectedPitchTypes.includes(p.pitchType))
  ), [pitches, selectedPitchTypes]);

  // Per-pitch-type stats
  const typeStats = useMemo(() => {
    const byType = {};
    for (const p of visible) {
      if (!byType[p.pitchType]) byType[p.pitchType] = { ivb: [], hb: [] };
      if (p.vertBreak !== null) byType[p.pitchType].ivb.push(p.vertBreak);
      if (p.horzBreak !== null) byType[p.pitchType].hb.push(p.horzBreak);
    }
    return PITCH_TYPE_ORDER.filter(t => byType[t]).map(t => {
      const origIVB = avg(byType[t].ivb);
      const origHB  = avg(byType[t].hb);
      return {
        pitchType: t, count: byType[t].ivb.length,
        origIVB,  adjIVB:  origIVB !== null ? origIVB * scale : null, deltaIVB: origIVB !== null ? origIVB * (scale - 1) : null,
        origHB,   adjHB:   origHB  !== null ? origHB  * scale : null, deltaHB:  origHB  !== null ? origHB  * (scale - 1) : null,
        color: getNormalizedPitchColor(t),
      };
    });
  }, [visible, scale]);

  // ── Factor sensitivity per pitch type ─────────────────────────────────────
  // Shows expected Δ for a standard unit change in each factor,
  // applied to this pitcher's actual average break values.
  const sensitivityStats = useMemo(() => {
    const BASE = { altFt: 0, tempF: 72, pressureInHg: 29.92, humidity: 50 };
    const scaleDelta = (refC, targetC) => movementScaleFactorFull(refC, targetC) - 1;
    return typeStats.map(s => {
      if (s.origIVB === null) return null;
      const ivb = s.origIVB;
      const hb  = s.origHB;
      return {
        ...s,
        // Δ iVB / HB per standard unit change, all computed from BASE
        altSens:   { ivb: ivb * scaleDelta(BASE, { ...BASE, altFt:        BASE.altFt + 1000 }),
                     hb:  hb  * scaleDelta(BASE, { ...BASE, altFt:        BASE.altFt + 1000 }) },
        tempSens:  { ivb: ivb * scaleDelta(BASE, { ...BASE, tempF:        BASE.tempF + 10   }),
                     hb:  hb  * scaleDelta(BASE, { ...BASE, tempF:        BASE.tempF + 10   }) },
        pressSens: { ivb: ivb * scaleDelta(BASE, { ...BASE, pressureInHg: BASE.pressureInHg - 0.5 }),
                     hb:  hb  * scaleDelta(BASE, { ...BASE, pressureInHg: BASE.pressureInHg - 0.5 }) },
        humSens:   { ivb: ivb * scaleDelta(BASE, { ...BASE, humidity:     BASE.humidity + 10  }),
                     hb:  hb  * scaleDelta(BASE, { ...BASE, humidity:     BASE.humidity + 10  }) },
      };
    }).filter(Boolean);
  }, [typeStats]);

  // ── Outing comparison (group by date) ────────────────────────────────────
  const outings = useMemo(() => {
    const byDate = {};
    for (const p of pitches) {
      if (!p.date) continue;
      if (!byDate[p.date]) byDate[p.date] = {};
      if (!byDate[p.date][p.pitchType]) byDate[p.date][p.pitchType] = { ivb: [], hb: [], n: 0 };
      byDate[p.date][p.pitchType].n++;
      if (p.vertBreak !== null) byDate[p.date][p.pitchType].ivb.push(p.vertBreak);
      if (p.horzBreak !== null) byDate[p.date][p.pitchType].hb.push(p.horzBreak);
    }
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, types]) => ({
        date,
        types: PITCH_TYPE_ORDER.filter(t => types[t]).map(t => ({
          pitchType: t,
          n: types[t].n,
          avgIVB: avg(types[t].ivb),
          avgHB:  avg(types[t].hb),
          color: getNormalizedPitchColor(t),
        })),
      }));
  }, [pitches]);

  const maxFactorAbs = Math.max(...Object.values(breakdown).map(Math.abs), 0.001);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── 1. Environmental condition panels ─────────────────────────── */}
      <div className="chart-card">
        <h3 className="chart-title">Environmental Conditions</h3>
        <p className="chart-subtitle">
          Magnus force (iVB &amp; HorzBreak) ∝ air density — set both environments to project break changes.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <ConditionPanel label="Reference (data collected at)" cond={refCond} onChange={setRefCond} accentColor="#60A5FA" />
          <ConditionPanel label="Target (project to)" cond={targetCond} onChange={setTargetCond} accentColor="#34D399" />
        </div>

        {/* Combined summary + factor breakdown */}
        <div style={{ marginTop: 16, padding: '14px 16px', background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ color: '#9CA3AF', fontSize: 13 }}>Density scale:</span>
            <span style={{ color: '#F9FAFB', fontWeight: 700, fontSize: 16 }}>{(scale * 100).toFixed(1)}%</span>
            <span style={{ color: '#6B7280', fontSize: 13 }}>→ break change</span>
            <span style={{ color: deltaColor(totalDelta), fontWeight: 700, fontSize: 16 }}>
              {totalDelta >= 0 ? '+' : ''}{totalDelta.toFixed(2)}%
            </span>
          </div>
          <div style={{ color: '#6B7280', fontSize: 10, marginBottom: 8 }}>FACTOR CONTRIBUTIONS (independent, additive approximation)</div>
          <FactorBar label="Altitude"     value={breakdown.altitude}    maxAbs={maxFactorAbs} />
          <FactorBar label="Temperature"  value={breakdown.temperature}  maxAbs={maxFactorAbs} />
          <FactorBar label="Pressure"     value={breakdown.pressure}     maxAbs={maxFactorAbs} />
          <FactorBar label="Humidity"     value={breakdown.humidity}     maxAbs={maxFactorAbs} />
        </div>
      </div>

      {/* ── 2. Movement chart + break table ───────────────────────────── */}
      <div className="chart-grid chart-grid-2">
        <div className="chart-card">
          <h3 className="chart-title">Movement Profile</h3>
          <p className="chart-subtitle">
            <span style={{ color: '#6B7280' }}>◌ Original</span> · <span style={{ color: '#D1D5DB' }}>● Adjusted</span>
            {' '}· arrows = Δ per pitch type — {visible.length} pitches
          </p>
          <svg width={W} height={H} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}>
            <defs>
              {typeStats.map(s => {
                const id = `arrow-${s.pitchType.replace(/[\s/]/g, '-')}`;
                return <marker key={id} id={id} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 z" fill={s.color} />
                </marker>;
              })}
            </defs>
            {GRID_VALS.map(v => (
              <g key={v}>
                <line x1={toSvgX(v)} y1={PAD} x2={toSvgX(v)} y2={H - PAD} stroke="#374151" strokeWidth={v === 0 ? 1 : 0.5} strokeDasharray={v === 0 ? 'none' : '4,4'} />
                <line x1={PAD} y1={toSvgY(v)} x2={W - PAD} y2={toSvgY(v)} stroke="#374151" strokeWidth={v === 0 ? 1 : 0.5} strokeDasharray={v === 0 ? 'none' : '4,4'} />
                <text x={toSvgX(v)} y={H - 6} textAnchor="middle" fontSize={10} fill="#6B7280">{v}"</text>
                {v !== 0 && <text x={12} y={toSvgY(v) + 4} textAnchor="middle" fontSize={10} fill="#6B7280">{v}</text>}
              </g>
            ))}
            <text x={W / 2} y={H} textAnchor="middle" fontSize={11} fill="#4B5563">← Arm Side | Glove Side →</text>
            <text x={6} y={H / 2} textAnchor="middle" fontSize={11} fill="#4B5563" transform={`rotate(-90,6,${H/2})`}>iVB (in)</text>
            {visible.map((p, i) => (
              <circle key={`o-${i}`} cx={toSvgX(p.horzBreak)} cy={toSvgY(p.vertBreak)} r={4}
                fill="none" stroke={getNormalizedPitchColor(p.pitchType)} strokeWidth={0.8} strokeOpacity={0.2} />
            ))}
            {visible.map((p, i) => (
              <circle key={`a-${i}`} cx={toSvgX(p.horzBreak * scale)} cy={toSvgY(p.vertBreak * scale)} r={4}
                fill={getNormalizedPitchColor(p.pitchType)} fillOpacity={0.55} stroke="#111827" strokeWidth={0.3} />
            ))}
            {typeStats.map(s => {
              if (s.origIVB === null || s.origHB === null) return null;
              const x1 = toSvgX(s.origHB), y1 = toSvgY(s.origIVB);
              const x2 = toSvgX(s.adjHB),  y2 = toSvgY(s.adjIVB);
              const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx*dx + dy*dy);
              const shrink = dist > 14 ? 10/dist : 0;
              const nx = dist > 0 ? -dy/dist : 0, ny = dist > 0 ? dx/dist : 0;
              const ux = dist > 0 ?  dx/dist : 1, uy = dist > 0 ? dy/dist : 0;
              const bx = x2 + ux*14 + nx*12, by = y2 + uy*14 + ny*12;
              const markerId = `arrow-${s.pitchType.replace(/[\s/]/g, '-')}`;
              return (
                <g key={s.pitchType}>
                  <circle cx={x1} cy={y1} r={9} fill="none" stroke={s.color} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="3,2" />
                  {dist > 3 && <line x1={x1} y1={y1} x2={x2 - dx*shrink} y2={y2 - dy*shrink} stroke={s.color} strokeWidth={2} markerEnd={`url(#${markerId})`} />}
                  <circle cx={x2} cy={y2} r={9} fill={s.color} fillOpacity={0.9} stroke="#111827" strokeWidth={1} />
                  {s.deltaIVB !== null && (
                    <g>
                      <rect x={bx-28} y={by-18} width={56} height={28} rx={4} fill="#0D1117" stroke={s.color} strokeWidth={1} strokeOpacity={0.7} fillOpacity={0.92} />
                      <text x={bx} y={by-6} textAnchor="middle" fontSize={10} fontWeight={700} fill={deltaColor(s.deltaIVB)}>iVB {sign(s.deltaIVB)}"</text>
                      {s.deltaHB !== null && <text x={bx} y={by+7} textAnchor="middle" fontSize={10} fontWeight={700} fill={deltaColor(s.deltaHB)}>HB {sign(s.deltaHB)}"</text>}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="chart-card" style={{ overflowX: 'auto' }}>
          <h3 className="chart-title">Break Change by Pitch Type</h3>
          <p className="chart-subtitle">Reference → Target</p>
          {typeStats.length === 0 ? <p style={{ color: '#6B7280', fontSize: 13 }}>No movement data.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151' }}>
                  {['Type','n','iVB orig','iVB adj','Δ iVB','HB orig','HB adj','Δ HB'].map(h => (
                    <th key={h} style={{ padding: '5px 7px', textAlign: 'right', color: '#6B7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {h === 'Type' ? <span style={{ display: 'block', textAlign: 'left' }}>{h}</span> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {typeStats.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                    <td style={{ padding: '6px 7px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                        <span style={{ color: '#F9FAFB', fontWeight: 500 }}>{s.pitchType}</span>
                      </div>
                    </td>
                    <td style={{ padding: '6px 7px', textAlign: 'right', color: '#6B7280' }}>{s.count}</td>
                    <td style={{ padding: '6px 7px', textAlign: 'right', color: '#9CA3AF' }}>{fmt(s.origIVB)}"</td>
                    <td style={{ padding: '6px 7px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.adjIVB)}"</td>
                    <td style={{ padding: '6px 7px', textAlign: 'right' }}><DeltaBadge delta={s.deltaIVB} /></td>
                    <td style={{ padding: '6px 7px', textAlign: 'right', color: '#9CA3AF' }}>{fmt(s.origHB)}"</td>
                    <td style={{ padding: '6px 7px', textAlign: 'right', color: '#D1D5DB' }}>{fmt(s.adjHB)}"</td>
                    <td style={{ padding: '6px 7px', textAlign: 'right' }}><DeltaBadge delta={s.deltaHB} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 3. Factor sensitivity per pitch type ──────────────────────── */}
      {sensitivityStats.length > 0 && (
        <div className="chart-card" style={{ overflowX: 'auto' }}>
          <h3 className="chart-title">Environmental Sensitivity by Pitch Type</h3>
          <p className="chart-subtitle">
            Expected Δ iVB / HB (inches) for a standard unit change in each factor, based on this arsenal's average break values.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 500 }}>Pitch Type</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#6B7280', fontWeight: 500, whiteSpace: 'nowrap' }}>Avg iVB</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#60A5FA', fontWeight: 500, whiteSpace: 'nowrap' }}>+1,000 ft alt</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#F97316', fontWeight: 500, whiteSpace: 'nowrap' }}>+10°F temp</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#A78BFA', fontWeight: 500, whiteSpace: 'nowrap' }}>−0.5 inHg</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#34D399', fontWeight: 500, whiteSpace: 'nowrap' }}>+10% RH</th>
              </tr>
            </thead>
            <tbody>
              {sensitivityStats.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      <span style={{ color: '#F9FAFB', fontWeight: 500 }}>{s.pitchType}</span>
                    </div>
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9CA3AF' }}>{fmt(s.origIVB)}"</td>
                  {[s.altSens, s.tempSens, s.pressSens, s.humSens].map((sens, j) => (
                    <td key={j} style={{ padding: '6px 8px', textAlign: 'right' }}>
                      <div style={{ color: deltaColor(sens.ivb), fontWeight: 600 }}>{sign(sens.ivb)}"</div>
                      <div style={{ color: '#4B5563', fontSize: 10 }}>HB {sign(sens.hb)}"</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: '#4B5563', fontSize: 10, marginTop: 8 }}>
            Computed from ISA moist-air density model. Sensitivities are independent (each factor varied from 72°F / 29.92 inHg / 50% RH / sea level baseline). Values scale linearly with actual break magnitude.
          </p>
        </div>
      )}

      {/* ── 4. Outing comparison (only shown when data has multiple dates) */}
      {outings.length > 1 && (
        <div className="chart-card" style={{ overflowX: 'auto' }}>
          <h3 className="chart-title">Outing Comparison</h3>
          <p className="chart-subtitle">
            Average movement per pitch type across {outings.length} outings — use the environmental controls above to explain differences between games.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 500 }}>Date</th>
                {PITCH_TYPE_ORDER.filter(t =>
                  outings.some(o => o.types.find(pt => pt.pitchType === t))
                ).map(t => (
                  <th key={t} style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{ color: getNormalizedPitchColor(t), fontWeight: 600 }}>{t}</span>
                    <div style={{ color: '#6B7280', fontWeight: 400 }}>iVB / HB</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outings.map((o, i) => {
                const activePitchTypes = PITCH_TYPE_ORDER.filter(t =>
                  outings.some(oo => oo.types.find(pt => pt.pitchType === t))
                );
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                    <td style={{ padding: '6px 8px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{o.date}</td>
                    {activePitchTypes.map(t => {
                      const pt = o.types.find(x => x.pitchType === t);
                      return (
                        <td key={t} style={{ padding: '6px 8px', textAlign: 'right' }}>
                          {pt ? (
                            <div>
                              <span style={{ color: '#D1D5DB' }}>{fmt(pt.avgIVB)}"</span>
                              <span style={{ color: '#6B7280', marginLeft: 4 }}>{fmt(pt.avgHB)}"</span>
                              <div style={{ color: '#4B5563', fontSize: 10 }}>n={pt.n}</div>
                            </div>
                          ) : <span style={{ color: '#374151' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ color: '#4B5563', fontSize: 10, marginTop: 8 }}>
            Differences between outings reflect a combination of environmental conditions, fatigue, sequencing, and sample size. Set the reference conditions to one outing's environment and the target to another's to isolate the expected environmental contribution.
          </p>
        </div>
      )}

      {/* ── Physics note ───────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', borderRadius: 8, background: '#111827', border: '1px solid #1F2937', color: '#6B7280', fontSize: 11, lineHeight: 1.7 }}>
        <strong style={{ color: '#9CA3AF' }}>Model:</strong>{' '}
        Moist-air density ρ = P<sub>d</sub>/(R<sub>d</sub>T) + P<sub>v</sub>/(R<sub>v</sub>T) where
        P<sub>d</sub> = P − P<sub>v</sub>, P<sub>v</sub> = RH · P<sub>sat</sub>(T) via Tetens formula.
        Magnus force ∝ ρ, so iVB and HorzBreak scale with the density ratio.
        Gravity (drop) is unaffected. Altitude sets ISA base pressure when adjusted;
        barometric and temperature sliders override ISA defaults independently.
      </div>
    </div>
  );
}
