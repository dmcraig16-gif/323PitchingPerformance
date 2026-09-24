import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import * as db from '../../lib/db.js'
import { useAuth } from '../../lib/useAuth.js'
import { formatFullDate, parseISODate, toISODate } from '../../lib/calendarDates.js'
import { deriveWorkoutStatus, workoutStatusMeta, workoutTypeMeta } from '../../lib/facilityConfig.js'
import LoadingState from '../../components/LoadingState.jsx'

// A prescribed-but-not-yet-logged summary line, so the target stays
// visible even once the athlete's actual entry differs from it.
function prescriptionSummary(item) {
  switch (item.workoutType) {
    case 'throwing': {
      const parts = []
      if (item.num_throws) parts.push(`${item.num_throws} throws`)
      if (item.ball_weight_oz) parts.push(`${item.ball_weight_oz} oz`)
      if (item.intent_pct) parts.push(`${item.intent_pct}% intent`)
      if (item.distance_target) parts.push(`${item.distance_target} ft`)
      return parts.join(' · ')
    }
    case 'lifting': {
      const sets = item.target_sets ?? []
      if (sets.length === 0) return null
      return sets.map((s) => (s.load != null ? `${s.reps}@${s.load}` : `${s.reps}`)).join(', ')
    }
    case 'mobility':
    case 'movement_prep': {
      const parts = []
      if (item.sets) parts.push(`${item.sets} sets`)
      if (item.duration_seconds) parts.push(`${item.duration_seconds}s`)
      else if (item.reps) parts.push(`${item.reps} reps`)
      if (item.side && item.side !== 'both') parts.push(item.side)
      return parts.join(' · ')
    }
    default:
      return null
  }
}

// One editable entry field, saved on blur — mirrors the save-on-blur
// pattern already used across the coach builder, with its own inline
// saving/saved/failed state so a bad connection mid-set doesn't lose
// what was typed or block the rest of the workout.
function SetField({ label, defaultValue, onSave }) {
  const [status, setStatus] = useState('idle')

  async function handleBlur(e) {
    const raw = e.target.value
    const value = raw === '' ? null : Number(raw)
    setStatus('saving')
    try {
      await onSave(value)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[11px] text-neutral-400 w-14 shrink-0">{label}</span>
      <input
        defaultValue={defaultValue ?? ''}
        onFocus={() => setStatus('idle')}
        onBlur={handleBlur}
        type="number"
        inputMode="decimal"
        className={`w-16 border rounded-lg px-2 py-1.5 text-sm text-center min-h-[36px] ${
          status === 'error' ? 'border-danger text-danger' : 'border-neutral-200'
        }`}
      />
      <span className="text-[10px] w-10 shrink-0">
        {status === 'saving' && <span className="text-neutral-400">Saving…</span>}
        {status === 'saved' && <span className="text-emerald-600">Saved</span>}
        {status === 'error' && <span className="text-danger">Failed</span>}
      </span>
    </label>
  )
}

function ThrowingLogger({ item, log, onSaveSet }) {
  return (
    <div className="flex flex-wrap gap-4 mt-3">
      <SetField label="Throws" defaultValue={log?.throws_completed ?? item.num_throws} onSave={(v) => onSaveSet(null, { throws_completed: v })} />
      <SetField label="Velo (mph)" defaultValue={log?.velocity} onSave={(v) => onSaveSet(null, { velocity: v })} />
    </div>
  )
}

function LiftingLogger({ item, logsBySet, onSaveSet }) {
  const sets = item.target_sets ?? []
  if (sets.length === 0) return null
  return (
    <div className="mt-3 space-y-2">
      {sets.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-400 w-10 shrink-0">Set {i + 1}</span>
          <SetField label="Reps" defaultValue={logsBySet[i]?.actual_reps ?? s.reps} onSave={(v) => onSaveSet(i, { actual_reps: v })} />
          <SetField label="Weight" defaultValue={logsBySet[i]?.actual_weight ?? s.load} onSave={(v) => onSaveSet(i, { actual_weight: v })} />
        </div>
      ))}
    </div>
  )
}

function MobilityLogger({ item, logsBySet, onSaveSet }) {
  const setCount = item.sets ?? 0
  if (setCount === 0) return null
  const isTimed = item.duration_seconds != null

  return (
    <div className="mt-3 space-y-2">
      {Array.from({ length: setCount }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-400 w-10 shrink-0">Set {i + 1}</span>
          {isTimed ? (
            <SetField
              label="Time (s)"
              defaultValue={logsBySet[i]?.actual_duration_seconds ?? item.duration_seconds}
              onSave={(v) => onSaveSet(i, { actual_duration_seconds: v })}
            />
          ) : (
            <SetField label="Reps" defaultValue={logsBySet[i]?.actual_reps ?? item.reps} onSave={(v) => onSaveSet(i, { actual_reps: v })} />
          )}
        </div>
      ))}
    </div>
  )
}

function ItemCard({ item, logs, onSaveSet }) {
  const summary = prescriptionSummary(item)
  const logsBySet = Object.fromEntries(logs.map((l) => [l.set_index, l]))
  const lastLog = logs[logs.length - 1]

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
      <p className="font-semibold text-neutral-900">{item.name}</p>
      {summary && <p className="text-sm text-neutral-500 mt-0.5">Target: {summary}</p>}
      {item.cues && <p className="text-xs text-neutral-400 mt-1">{item.cues}</p>}

      {item.workoutType === 'throwing' && <ThrowingLogger item={item} log={lastLog} onSaveSet={onSaveSet} />}
      {item.workoutType === 'lifting' && <LiftingLogger item={item} logsBySet={logsBySet} onSaveSet={onSaveSet} />}
      {(item.workoutType === 'mobility' || item.workoutType === 'movement_prep') && (
        <MobilityLogger item={item} logsBySet={logsBySet} onSaveSet={onSaveSet} />
      )}
    </div>
  )
}

export default function WorkoutView() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [workout, setWorkout] = useState(null)
  const [items, setItems] = useState(null)
  const [logsByItem, setLogsByItem] = useState({})

  useEffect(() => {
    let cancelled = false
    db.getAssignedWorkout(workoutId).then((w) => {
      if (!cancelled) setWorkout(w)
    })
    db.listAssignedItems(workoutId).then((its) => {
      if (cancelled) return
      setItems(its)
      Promise.all(its.map((it) => db.listLogsForItem(it.id).then((logs) => [it.id, logs]))).then((entries) => {
        if (!cancelled) setLogsByItem(Object.fromEntries(entries))
      })
    })
    return () => {
      cancelled = true
    }
  }, [workoutId])

  async function handleSaveSet(item, setIndex, patch) {
    const saved = await db.logItemSet({
      assigned_workout_id: workoutId,
      assigned_item_id: item.id,
      athlete_id: profile.id,
      set_index: setIndex,
      ...patch,
    })
    setLogsByItem((prev) => ({
      ...prev,
      [item.id]: [...(prev[item.id] ?? []).filter((l) => l.set_index !== setIndex), saved],
    }))
    db.getAssignedWorkout(workoutId).then(setWorkout)
  }

  if (!profile || workout === null || items === null) return <LoadingState />
  if (!workout) return <p className="text-sm text-neutral-500">Workout not found.</p>

  const status = deriveWorkoutStatus(workout, toISODate(new Date()))
  const meta = workoutStatusMeta(status)

  return (
    <div>
      <button
        onClick={() => navigate('/program')}
        className="flex items-center gap-1 text-xs text-accent hover:text-accent-700 font-medium mb-3"
      >
        <ChevronLeft size={14} /> Calendar
      </button>

      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${workoutTypeMeta(workout.type).badgeClass}`}>
          {workoutTypeMeta(workout.type).label}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.badgeClass}`}>{meta.label}</span>
      </div>
      <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">{workout.title}</h1>
      <p className="text-sm text-neutral-500 mb-6">{formatFullDate(parseISODate(workout.date))}</p>

      {workout.notes && <p className="text-sm text-neutral-600 mb-4">{workout.notes}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">No items in this workout.</p>
      ) : (
        items.map((item) => (
          <ItemCard
            key={item.id}
            item={{ ...item, workoutType: workout.type }}
            logs={logsByItem[item.id] ?? []}
            onSaveSet={(setIndex, patch) => handleSaveSet(item, setIndex, patch)}
          />
        ))
      )}
    </div>
  )
}
