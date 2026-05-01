import { useMemo } from 'react';
import { getNormalizedPitchColor } from '../utils/pitchTypes';

const PAD = 44;
const W = 360;
const H = 360;
const PLOT_W = W - PAD * 2;
const PLOT_H = H - PAD * 2;
const X_RANGE = 25; // inches
const Y_RANGE = 25;

function toSvgX(x) {
  return PAD + ((x + X_RANGE) / (X_RANGE * 2)) * PLOT_W;
}
function toSvgY(y) {
  return H - PAD - ((y + Y_RANGE) / (Y_RANGE * 2)) * PLOT_H;
}

export default function MovementChart({ pitches, selectedPitchTypes }) {
  const visible = useMemo(() => {
    return pitches.filter(p =>
      p.horzBreak !== null &&
      p.vertBreak !== null &&
      (selectedPitchTypes.length === 0 || selectedPitchTypes.includes(p.pitchType))
    );
  }, [pitches, selectedPitchTypes]);

  const cx = toSvgX(0);
  const cy = toSvgY(0);

  const gridVals = [-20, -10, 0, 10, 20];

  return (
    <div className="chart-card">
      <h3 className="chart-title">Pitch Movement</h3>
      <p className="chart-subtitle">Horizontal vs. Induced Vertical Break (inches) — {visible.length} pitches</p>
      <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
        {/* Grid */}
        {gridVals.map(v => (
          <g key={v}>
            <line x1={toSvgX(v)} y1={PAD} x2={toSvgX(v)} y2={H - PAD}
              stroke="#374151" strokeWidth={v === 0 ? 1 : 0.5}
              strokeDasharray={v === 0 ? 'none' : '4,4'} />
            <line x1={PAD} y1={toSvgY(v)} x2={W - PAD} y2={toSvgY(v)}
              stroke="#374151" strokeWidth={v === 0 ? 1 : 0.5}
              strokeDasharray={v === 0 ? 'none' : '4,4'} />
          </g>
        ))}

        {/* Axis labels */}
        {gridVals.map(v => (
          <g key={v}>
            <text x={toSvgX(v)} y={H - 8} textAnchor="middle" fontSize={10} fill="#9CA3AF">{v}&quot;</text>
            {v !== 0 && (
              <text x={10} y={toSvgY(v) + 4} textAnchor="middle" fontSize={10} fill="#9CA3AF">{v}</text>
            )}
          </g>
        ))}

        {/* Axis labels text */}
        <text x={W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="#6B7280">← Arm Side | Glove Side →</text>
        <text x={6} y={H / 2} textAnchor="middle" fontSize={11} fill="#6B7280"
          transform={`rotate(-90, 6, ${H / 2})`}>Vertical Break (in)</text>

        {/* Pitches */}
        {visible.map((p, i) => (
          <circle
            key={i}
            cx={toSvgX(p.horzBreak)}
            cy={toSvgY(p.vertBreak)}
            r={5}
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
