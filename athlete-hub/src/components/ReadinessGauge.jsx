// A WHOOP/4APP-style circular readiness gauge: a ring that fills clockwise
// from the top in proportion to the score, colored by band. Hand-rolled
// SVG (stroke-dasharray trick) rather than a chart-library radial bar, so
// it stays crisp and simple at any size.

const TONE_COLOR = {
  green: '#34c759',
  yellow: '#ff9f0a',
  red: '#ff3b30',
}

export default function ReadinessGauge({ score, tone, size = 160, strokeWidth = 14, label, sublabel }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score)) / 100
  const offset = circumference * (1 - pct)
  const color = TONE_COLOR[tone] ?? TONE_COLOR.yellow

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5ea"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold tabular-nums text-neutral-900" style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
        {label && (
          <span className="text-neutral-500 font-medium" style={{ fontSize: size * 0.08 }}>
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-neutral-400 mt-0.5" style={{ fontSize: size * 0.065 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
