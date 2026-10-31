import { useMemo } from 'react';
import { getNormalizedPitchColor } from '../utils/pitchTypes';

const PAD = 44;
const W = 360;
const H = 300;
const PLOT_W = W - PAD * 2;
const PLOT_H = H - PAD * 2;

// Release side: -3 to 3 ft, height: 4 to 8 ft
const X_MIN = -4, X_MAX = 4;
const Y_MIN = 3.5, Y_MAX = 8;

function toSvgX(x) {
  return PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}
function toSvgY(y) {
  return H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
}

export default function ReleasePointChart({ pitches, selectedPitchTypes }) {
  const visible = useMemo(() => {
    return pitches.filter(p =>
      p.relHeight !== null &&
      p.relSide !== null &&
      (selectedPitchTypes.length === 0 || selectedPitchTypes.includes(p.pitchType))
    );
  }, [pitches, selectedPitchTypes]);

  const xVals = [-3, -2, -1, 0, 1, 2, 3];
  const yVals = [4, 5, 6, 7, 8];

  return (
    <div className="chart-card">
      <h3 className="chart-title">Release Point</h3>
      <p className="chart-subtitle">Pitcher&apos;s perspective (ft) — {visible.length} pitches</p>
      <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
        {/* Grid */}
        {xVals.map(v => (
          <line key={v} x1={toSvgX(v)} y1={PAD} x2={toSvgX(v)} y2={H - PAD}
            stroke="#374151" strokeWidth={0.5} strokeDasharray="4,4" />
        ))}
        {yVals.map(v => (
          <line key={v} x1={PAD} y1={toSvgY(v)} x2={W - PAD} y2={toSvgY(v)}
            stroke="#374151" strokeWidth={0.5} strokeDasharray="4,4" />
        ))}

        {/* Axis labels */}
        {xVals.map(v => (
          <text key={v} x={toSvgX(v)} y={H - 6} textAnchor="middle" fontSize={10} fill="#9CA3AF">{v}</text>
        ))}
        {yVals.map(v => (
          <text key={v} x={14} y={toSvgY(v) + 4} textAnchor="middle" fontSize={10} fill="#9CA3AF">{v}</text>
        ))}
        <text x={W / 2} y={H} textAnchor="middle" fontSize={11} fill="#6B7280">Horizontal (ft)</text>
        <text x={6} y={H / 2} textAnchor="middle" fontSize={11} fill="#6B7280"
          transform={`rotate(-90, 6, ${H / 2})`}>Height (ft)</text>

        {/* Pitches */}
        {visible.map((p, i) => (
          <circle
            key={i}
            cx={toSvgX(p.relSide)}
            cy={toSvgY(p.relHeight)}
            r={4}
            fill={getNormalizedPitchColor(p.pitchType)}
            fillOpacity={0.7}
            stroke="#111827"
            strokeWidth={0.4}
          />
        ))}
      </svg>
    </div>
  );
}
