import { MLB_ZONE, missDistanceInches } from '../lib/commandMetrics'

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

// A regulation baseball is ~2.9" in diameter. Marker sizes are scaled off
// the plot's horizontal feet-per-pixel ratio (width is what these margins
// are measured in) so they read true-to-scale rather than as arbitrary
// dots: the intended target is a 2.5-ball-wide margin of error, the
// actual result is drawn at one ball's actual width.
const BASEBALL_DIAMETER_IN = 2.9
const PX_PER_FT = PLOT_W / (X_MAX - X_MIN)
const BASEBALL_RADIUS_PX = ((BASEBALL_DIAMETER_IN / 12) * PX_PER_FT) / 2
const INTENDED_RADIUS_PX = BASEBALL_RADIUS_PX * 2.5
const ACTUAL_RADIUS_PX = BASEBALL_RADIUS_PX

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

// The intended target, drawn as an open catcher's mitt rather than a bare
// circle — same margin-of-error sizing as before (r = INTENDED_RADIUS_PX,
// 2.5 baseballs wide), just reskinned. Shapes are authored in a 100-unit
// local design space and scaled to that radius via the transform.
function CatchersGlove({ cx, cy, r }) {
  const s = r / 45
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <ellipse
        cx={-30}
        cy={18}
        rx={15}
        ry={22}
        transform="rotate(-18 -30 18)"
        fill="#c68a45"
        stroke="#8b5a2b"
        strokeWidth={3}
      />
      <ellipse cx={2} cy={2} rx={38} ry={42} fill="#c68a45" stroke="#8b5a2b" strokeWidth={3} />
      <ellipse cx={4} cy={-4} rx={24} ry={28} fill="#8b5a2b" />
      <ellipse cx={4} cy={-8} rx={18} ry={20} fill="#6b431f" />
      <path d="M -10,-18 Q 4,-28 18,-16" fill="none" stroke="#4a2e14" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M -8,-6 Q 4,-14 16,-4" fill="none" stroke="#4a2e14" strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

export default function StrikeZoneTargetPicker({ intended, actual, phase, onPick, zone = MLB_ZONE }) {
  const zoneX1 = toSvgX(zone.left)
  const zoneX2 = toSvgX(zone.right)
  const zoneY1 = toSvgY(zone.top)
  const zoneY2 = toSvgY(zone.bottom)

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
          <CatchersGlove cx={toSvgX(intended.x)} cy={toSvgY(intended.y)} r={INTENDED_RADIUS_PX} />
        )}

        {actual && (
          <circle
            cx={toSvgX(actual.x)}
            cy={toSvgY(actual.y)}
            r={ACTUAL_RADIUS_PX}
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
