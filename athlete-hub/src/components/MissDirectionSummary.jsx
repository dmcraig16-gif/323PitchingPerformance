import { summarizeMissDirection, round1 } from '../lib/commandMetrics.js'

// Compact "which direction do misses cluster in" readout — not an
// average (a high-arm-side miss and a low-glove-side miss would just
// cancel each other out), but the most common miss-direction bucket and
// what share of pitches landed in it, alongside the plain average miss
// distance for context.
export default function MissDirectionSummary({ pitches, throws, avgMissIn }) {
  const direction = summarizeMissDirection(pitches, throws)

  if (!direction) {
    return <p className="text-sm text-neutral-500">No pitches logged yet.</p>
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">Most common miss</p>
          <p className="text-lg font-semibold text-neutral-900">{direction.label}</p>
          <p className="text-xs text-neutral-400">
            {direction.count} of {direction.total} pitches ({direction.pct}%)
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400 mb-0.5">Avg miss distance</p>
          <p className="text-lg font-semibold text-neutral-900">{round1(avgMissIn)}"</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {direction.breakdown.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-xs">
            <span className="w-24 text-neutral-500 shrink-0 truncate">{b.label}</span>
            <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
              <div className="bg-accent h-1.5 rounded-full" style={{ width: `${b.pct}%` }} />
            </div>
            <span className="w-16 text-right text-neutral-500 shrink-0">
              {b.count} ({b.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
