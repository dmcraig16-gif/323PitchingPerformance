import { ZONE, missDistanceInches } from '../lib/commandMetrics'

// Click-to-place strike zone target picker used by Command Training.
// First click places the intended target, second click places the actual
// pitch location — same feet-based coordinate system as the pitch
// visualizer's StrikeZoneChart so the geometry is familiar to coaches.

const PAD = 40
const W = 320
const H = 380
const PLOT_W = W - PAD * 2
const PLOT_H = H - PAD * 2
const X_MIN = -2.5
const X_MAX = 2.5
const Y_MIN = 0.5
const Y_MAX = 5.0

function toSvgX(x) {
  return PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W
}
function toSvgY(y) {
  return H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H
}
function fromSvg(px, py) {
  const x = X_MIN + ((px - PAD) / PLOT_W) * (X_MAX - X_MIN)
  const y = Y_MIN + ((H - PAD - py) / PLOT_H) * (Y_MAX - Y_MIN)
  return { x: clamp(x, X_MIN, X_MAX), y: clamp(y, Y_MIN, Y_MAX) }
}
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export default function StrikeZoneTargetPicker({ intended, actual, phase, onPick }) {
  const zoneX1 = toSvgX(ZONE.left)
  const zoneX2 = toSvgX(ZONE.right)
  const zoneY1 = toSvgY(ZONE.top)
  const zoneY2 = toSvgY(ZONE.bottom)

  const helperText =
    phase === 'intended'
      ? 'Click the strike zone to set your intended target.'
      : phase === 'actual'
        ? 'Click where the pitch actually crossed the plate.'
        : 'Pitch logged.'

  function handleClick(e) {
    if (phase !== 'intended' && phase !== 'actual') return
    const rect = e.currentTarget.getBoundingClientRect()
    // The SVG scales to fit narrow (phone) screens via viewBox, so convert
    // the click's rendered-pixel position back into the fixed W×H
    // coordinate space toSvgX/toSvgY and fromSvg operate in.
    const px = ((e.clientX - rect.left) / rect.width) * W
    const py = ((e.clientY - rect.top) / rect.height) * H
    onPick(fromSvg(px, py))
  }

  const missIn = intended && actual ? missDistanceInches(intended, actual) : null

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        className={phase === 'done' ? '' : 'cursor-crosshair'}
        style={{
          display: 'block',
          margin: '0 auto',
          width: '100%',
          maxWidth: W,
          height: 'auto',
          aspectRatio: `${W} / ${H}`,
          background: '#f5f5f7',
          borderRadius: 8,
        }}
      >
        {[-2, -1, 0, 1, 2].map((x) => (
          <line
            key={`vx${x}`}
            x1={toSvgX(x)}
            y1={PAD}
            x2={toSvgX(x)}
            y2={H - PAD}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        {[1, 2, 3, 4].map((y) => (
          <line
            key={`hy${y}`}
            x1={PAD}
            y1={toSvgY(y)}
            x2={W - PAD}
            y2={toSvgY(y)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}

        <rect
          x={zoneX1}
          y={zoneY1}
          width={zoneX2 - zoneX1}
          height={zoneY2 - zoneY1}
          fill="none"
          stroke="#0071e3"
          strokeWidth={2}
        />
        {[1, 2].map((i) => {
          const yw = (zoneY2 - zoneY1) / 3
          const xw = (zoneX2 - zoneX1) / 3
          return (
            <g key={i}>
              <line
                x1={zoneX1}
                y1={zoneY1 + yw * i}
                x2={zoneX2}
                y2={zoneY1 + yw * i}
                stroke="#0071e3"
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
              <line
                x1={zoneX1 + xw * i}
                y1={zoneY1}
                x2={zoneX1 + xw * i}
                y2={zoneY2}
                stroke="#0071e3"
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            </g>
          )
        })}

        {intended && actual && (
          <line
            x1={toSvgX(intended.x)}
            y1={toSvgY(intended.y)}
            x2={toSvgX(actual.x)}
            y2={toSvgY(actual.y)}
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
        )}

        {intended && (
          <g>
            <circle
              cx={toSvgX(intended.x)}
              cy={toSvgY(intended.y)}
              r={9}
              fill="none"
              stroke="#34c759"
              strokeWidth={2}
            />
            <line
              x1={toSvgX(intended.x) - 4}
              y1={toSvgY(intended.y)}
              x2={toSvgX(intended.x) + 4}
              y2={toSvgY(intended.y)}
              stroke="#34c759"
              strokeWidth={2}
            />
            <line
              x1={toSvgX(intended.x)}
              y1={toSvgY(intended.y) - 4}
              x2={toSvgX(intended.x)}
              y2={toSvgY(intended.y) + 4}
              stroke="#34c759"
              strokeWidth={2}
            />
          </g>
        )}

        {actual && (
          <circle
            cx={toSvgX(actual.x)}
            cy={toSvgY(actual.y)}
            r={6}
            fill="#ff3b30"
            fillOpacity={0.85}
            stroke="#b0271f"
            strokeWidth={1}
          />
        )}
      </svg>
      <p className="text-xs text-neutral-500 text-center mt-2">{helperText}</p>
      {missIn != null && (
        <p className="text-center text-sm font-medium mt-1">
          Miss distance: <span className="text-neutral-900">{missIn.toFixed(1)}"</span>
        </p>
      )}
    </div>
  )
}
