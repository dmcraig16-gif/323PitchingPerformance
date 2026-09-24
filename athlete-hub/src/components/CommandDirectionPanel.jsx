import { useMemo, useState } from 'react'
import { summarizeMissDirectionByPitchType, summarizeByPitchType, ZONE_LEVELS } from '../lib/commandMetrics.js'
import MissDirectionSummary from './MissDirectionSummary.jsx'
import MissDirectionTrend from './MissDirectionTrend.jsx'
import ZoneHeatmap from './ZoneHeatmap.jsx'

function Card({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {subtitle && <p className="text-xs text-neutral-400 mb-3">{subtitle}</p>}
      {children}
    </div>
  )
}

// Command Tracker's aggregate direction/zone analysis: miss direction
// (overall, and broken out per pitch type so a slider's tendency isn't
// blended into a fastball's), how that tendency trends across sessions,
// and a count-per-zone-cell heatmap. Shared between the athlete's own
// Command Training overview and a coach's view of one athlete — both
// just pass in that athlete's full pitch history.
export default function CommandDirectionPanel({ pitches, throws }) {
  const [pitchTypeFilter, setPitchTypeFilter] = useState('All')
  const [zoneLevel, setZoneLevel] = useState(ZONE_LEVELS[0].value)

  const pitchTypes = useMemo(() => [...new Set(pitches.map((p) => p.pitch_type).filter(Boolean))].sort(), [pitches])

  const filteredPitches = useMemo(
    () => (pitchTypeFilter === 'All' ? pitches : pitches.filter((p) => p.pitch_type === pitchTypeFilter)),
    [pitches, pitchTypeFilter],
  )

  const byPitchType = useMemo(() => summarizeMissDirectionByPitchType(pitches, throws), [pitches, throws])
  const avgMissIn = useMemo(() => summarizeByPitchType(filteredPitches).overall.avgMissIn, [filteredPitches])
  const zone = ZONE_LEVELS.find((l) => l.value === zoneLevel).zone

  if (pitches.length === 0) {
    return <p className="text-sm text-neutral-500">No pitches logged yet.</p>
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <label className="text-xs font-medium text-neutral-500">Pitch type</label>
        <select
          value={pitchTypeFilter}
          onChange={(e) => setPitchTypeFilter(e.target.value)}
          className="border border-neutral-200 rounded-lg px-2 py-1.5 text-xs"
        >
          <option value="All">All pitches</option>
          {pitchTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <Card title="Miss direction">
        <MissDirectionSummary pitches={filteredPitches} throws={throws} avgMissIn={avgMissIn} />
      </Card>

      {byPitchType.length > 1 && (
        <Card title="Miss direction by pitch type" subtitle="Dominant miss direction for every pitch you've logged">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-400">
                  <th className="pb-1 pr-3">Pitch</th>
                  <th className="pb-1 pr-3">Count</th>
                  <th className="pb-1 pr-3">Dominant miss</th>
                  <th className="pb-1">Share</th>
                </tr>
              </thead>
              <tbody>
                {byPitchType.map((t) => (
                  <tr key={t.pitchType} className="border-t border-neutral-100">
                    <td className="py-1.5 pr-3 font-medium">{t.pitchType}</td>
                    <td className="py-1.5 pr-3">{t.count}</td>
                    <td className="py-1.5 pr-3">{t.direction.label}</td>
                    <td className="py-1.5">{t.direction.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card
        title="Miss direction over time"
        subtitle={pitchTypeFilter === 'All' ? 'All pitch types, by session' : `${pitchTypeFilter}, by session`}
      >
        <MissDirectionTrend pitches={filteredPitches} throws={throws} />
      </Card>

      <Card
        title="Zone heatmap"
        subtitle="How often each part of the zone gets hit — actual pitch locations"
        action={
          <div className="flex items-center gap-1 shrink-0">
            {ZONE_LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setZoneLevel(l.value)}
                className={`text-[10px] px-2 py-1 rounded-full font-medium border ${
                  zoneLevel === l.value
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        }
      >
        <ZoneHeatmap pitches={filteredPitches} zone={zone} />
      </Card>
    </div>
  )
}
