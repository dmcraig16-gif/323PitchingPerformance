import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import * as db from '../lib/db.js'
import { trendSummary } from '../lib/exerciseTrends.js'
import { THROWING_EXERCISE_TYPE, THROW_METRICS } from '../lib/facilityConfig.js'

const today = () => new Date().toISOString().slice(0, 10)

function DeltaBadge({ delta, unit }) {
  if (delta == null || delta === 0) return null
  const up = delta > 0
  return (
    <span className="text-xs text-neutral-500 ml-1.5">
      {up ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} {unit} vs last
    </span>
  )
}

// Inline result-logging control for one exercise inside My Program.
// Throwing-type exercises log velocity or distance — whichever the drill
// is targeting (its target_unit, set in Program Builder); everything
// else logs weight + reps. `trendLogs` is the athlete's full log history
// for this *library* exercise (across every workout that reused it),
// oldest first, so the trend/sparkline reflects real progress on the
// movement — not just this one workout instance.
export default function ExerciseLogger({ exercise, athleteId, trendLogs, onLogged }) {
  const [open, setOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [throwValue, setThrowValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const isThrowing = exercise.type === THROWING_EXERCISE_TYPE
  const isDistance = isThrowing && exercise.target_unit === 'ft'
  const metric = isThrowing ? (isDistance ? 'distance' : 'velocity') : 'weight'
  const unit = isThrowing ? (isDistance ? 'ft' : 'mph') : 'lb'
  const throwLabel = THROW_METRICS.find((m) => m.value === unit)?.label ?? 'Velocity'
  const summary = trendSummary(trendLogs, metric)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const row = {
      drill_id: exercise.id,
      athlete_id: athleteId,
      date: today(),
      notes: notes || null,
      ...(isThrowing
        ? isDistance
          ? { distance_ft: throwValue ? Number(throwValue) : null }
          : { velocity: throwValue ? Number(throwValue) : null }
        : { weight: weight ? Number(weight) : null, reps_completed: reps ? Number(reps) : null }),
    }
    const saved = await db.logExerciseResult(row)
    setWeight('')
    setReps('')
    setThrowValue('')
    setNotes('')
    setOpen(false)
    setSaving(false)
    onLogged(saved)
  }

  return (
    <div className="shrink-0 text-right">
      <div className="flex items-center justify-end mb-1">
        {summary ? (
          <span className="text-xs text-neutral-500">
            Last: <span className="font-medium text-neutral-700">{summary.latestValue} {unit}</span>
            <DeltaBadge delta={summary.delta} unit={unit} />
          </span>
        ) : (
          <span className="text-xs text-neutral-400">No results logged yet</span>
        )}
      </div>

      {summary && summary.series.length >= 2 && (
        <div className="w-24 h-8 ml-auto mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.series}>
              <Line type="monotone" dataKey="value" stroke="#0071e3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-3 py-1.5 rounded-xl font-medium bg-accent text-white hover:bg-accent-600 transition-colors"
        >
          Log result
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-left w-56">
          {isThrowing ? (
            <div className="mb-2">
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                {throwLabel} ({unit})
              </label>
              <input
                type="number"
                step={isDistance ? 1 : 0.1}
                value={throwValue}
                onChange={(e) => setThrowValue(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-2 py-1 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Weight (lb)</label>
                <input
                  type="number"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-2 py-1 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Reps</label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-2 py-1 text-sm"
                />
              </div>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={1}
            className="w-full border border-neutral-200 rounded-lg px-2 py-1 text-sm mb-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 text-xs py-1.5 rounded-lg font-medium text-neutral-500 border border-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 text-xs py-1.5 rounded-lg font-medium bg-accent text-white hover:bg-accent-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
