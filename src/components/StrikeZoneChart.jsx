import { useMemo } from 'react';
import { getNormalizedPitchColor } from '../utils/pitchTypes';

// Strike zone dimensions in feet
const ZONE = { left: -0.7083, right: 0.7083, bottom: 1.5, top: 3.5 };

// SVG viewport mapping
const PAD = 40;
const W = 320;
const H = 380;
const PLOT_W = W - PAD * 2;
const PLOT_H = H - PAD * 2;

// World space range shown in chart
const X_MIN = -2.5;
const X_MAX = 2.5;
const Y_MIN = 0.5;
const Y_MAX = 5.0;

function toSvgX(x) {
  return PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}
function toSvgY(y) {
  return H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
}

export default function StrikeZoneChart({ pitches, selectedPitchTypes }) {
  const visible = useMemo(() => {
    return pitches.filter(p =>
      p.plateLocHeight !== null &&
      p.plateLocSide !== null &&
      (selectedPitchTypes.length === 0 || selectedPitchTypes.includes(p.pitchType))
    );
  }, [pitches, selectedPitchTypes]);

  const zoneX1 = toSvgX(ZONE.left);
  const zoneX2 = toSvgX(ZONE.right);
  const zoneY1 = toSvgY(ZONE.top);
  const zoneY2 = toSvgY(ZONE.bottom);
  const homeX = toSvgX(0);
  const plateY = toSvgY(Y_MIN + 0.1);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Strike Zone</h3>
      <p className="chart-subtitle">Catcher&apos;s perspective — {visible.length} pitches</p>
      <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
        {/* Grid lines */}
        {[-2, -1, 0, 1, 2].map(x => (
          <line key={x}
            x1={toSvgX(x)} y1={PAD}
            x2={toSvgX(x)} y2={H - PAD}
            stroke="#374151" strokeWidth={0.5} strokeDasharray="4,4"
          />
        ))}
        {[1, 2, 3, 4].map(y => (
          <line key={y}
            x1={PAD} y1={toSvgY(y)}
            x2={W - PAD} y2={toSvgY(y)}
            stroke="#374151" strokeWidth={0.5} strokeDasharray="4,4"
          />
        ))}

        {/* Strike zone */}
        <rect
          x={zoneX1} y={zoneY1}
          width={zoneX2 - zoneX1} height={zoneY2 - zoneY1}
          fill="none" stroke="#60A5FA" strokeWidth={2}
        />

        {/* Zone thirds */}
        {[1, 2].map(i => {
          const yw = (zoneY2 - zoneY1) / 3;
          const xw = (zoneX2 - zoneX1) / 3;
          return (
            <g key={i}>
              <line x1={zoneX1} y1={zoneY1 + yw * i} x2={zoneX2} y2={zoneY1 + yw * i}
                stroke="#60A5FA" strokeWidth={0.5} strokeOpacity={0.5} />
              <line x1={zoneX1 + xw * i} y1={zoneY1} x2={zoneX1 + xw * i} y2={zoneY2}
                stroke="#60A5FA" strokeWidth={0.5} strokeOpacity={0.5} />
            </g>
          );
        })}

        {/* Home plate */}
        <polygon
          points={[
            [homeX - 10, plateY],
            [homeX + 10, plateY],
            [homeX + 10, plateY + 8],
            [homeX, plateY + 14],
            [homeX - 10, plateY + 8],
          ].map(([x, y]) => `${x},${y}`).join(' ')}
          fill="#E5E7EB" stroke="#9CA3AF" strokeWidth={1}
        />

        {/* Pitches */}
        {visible.map((p, i) => (
          <circle
            key={i}
            cx={toSvgX(p.plateLocSide)}
            cy={toSvgY(p.plateLocHeight)}
            r={5}
            fill={getNormalizedPitchColor(p.pitchType)}
            fillOpacity={0.75}
            stroke="#111827"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis labels */}
        {[-2, -1, 0, 1, 2].map(x => (
          <text key={x} x={toSvgX(x)} y={H - 8}
            textAnchor="middle" fontSize={10} fill="#9CA3AF">{x}</text>
        ))}
        {[1, 2, 3, 4].map(y => (
          <text key={y} x={14} y={toSvgY(y) + 4}
            textAnchor="middle" fontSize={10} fill="#9CA3AF">{y}</text>
        ))}
      </svg>
    </div>
  );
}
