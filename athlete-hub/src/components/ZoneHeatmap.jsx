import { zoneHeatmap } from '../lib/commandMetrics.js'

// A count-per-cell heatmap of actual pitch locations, on the same 3x3
// zone grid the target picker draws while logging — the center 3x3 is
// the strike zone, the outer ring is "just off the zone" in each of the
// 8 directions, so a corner that's consistently missed just off the
// plate still shows up instead of being lumped into one "ball" bucket.
export default function ZoneHeatmap({ pitches, zone }) {
  if (pitches.length === 0) {
    return <p className="text-sm text-neutral-500">No pitches logged yet.</p>
  }

  const counts = zoneHeatmap(pitches, zone)
  const max = Math.max(1, ...counts.flat())

  return (
    <div>
      <div className="grid grid-cols-5 gap-1 max-w-[280px] mx-auto">
        {counts.map((rowCounts, row) =>
          rowCounts.map((count, col) => {
            const inZone = row >= 1 && row <= 3 && col >= 1 && col <= 3
            const intensity = count / max
            return (
              <div
                key={`${row}-${col}`}
                className={`aspect-square flex items-center justify-center rounded-md text-sm font-semibold ${
                  inZone ? 'border-2 border-accent/50' : 'border border-neutral-200'
                }`}
                style={{
                  backgroundColor: count === 0 ? '#f5f5f7' : `rgba(255, 59, 48, ${0.15 + intensity * 0.65})`,
                  color: intensity > 0.55 ? '#fff' : '#1d1d1f',
                }}
              >
                {count > 0 ? count : ''}
              </div>
            )
          }),
        )}
      </div>
      <p className="text-xs text-neutral-400 text-center mt-2">
        {pitches.length} pitch{pitches.length === 1 ? '' : 'es'} · inner 3×3 outlined in blue is the strike zone
      </p>
    </div>
  )
}
