import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import * as db from '../../lib/db.js'
import { formatFullDate, toISODate } from '../../lib/calendarDates.js'
import { deriveWorkoutStatus, workoutStatusMeta, workoutTypeMeta } from '../../lib/facilityConfig.js'

const todayISO = () => toISODate(new Date())

function WorkoutCard({ workout, itemCount, interactive, onOpen }) {
  const status = deriveWorkoutStatus(workout, todayISO())
  const meta = workoutStatusMeta(status)
  const Wrapper = interactive ? 'button' : 'div'

  return (
    <Wrapper
      onClick={interactive ? onOpen : undefined}
      className={`w-full flex items-center justify-between gap-3 bg-white rounded-2xl shadow-card p-4 mb-3 text-left ${
        interactive ? 'hover:shadow-elevated transition-shadow active:scale-[0.99]' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${workoutTypeMeta(workout.type).badgeClass}`}>
            {workoutTypeMeta(workout.type).label}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.badgeClass}`}>{meta.label}</span>
        </div>
        <p className="font-semibold text-neutral-900 truncate">{workout.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {itemCount == null ? 'Loading items…' : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
        </p>
      </div>
      {interactive && <ChevronRight size={18} className="text-neutral-300 shrink-0" />}
    </Wrapper>
  )
}

// The selected day's workouts, stacked. This is the athlete's landing
// content — visible immediately below the week strip with no extra taps.
// Tapping a card pushes into the full-screen workout view; in read-only
// (coach) mode, cards render as plain non-interactive summaries instead.
export default function DayView({ date, workouts, interactive = true, onOpenWorkout }) {
  const [itemCounts, setItemCounts] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all(workouts.map((w) => db.listAssignedItems(w.id).then((items) => [w.id, items.length]))).then((entries) => {
      if (cancelled) return
      setItemCounts(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [workouts])

  const iso = toISODate(date)
  const isToday = iso === todayISO()

  return (
    <div className="pt-4">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
        {isToday ? 'Today — ' : ''}
        {formatFullDate(date)}
      </p>

      {workouts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-6 text-center">
          <p className="text-sm text-neutral-500">Rest day — nothing scheduled.</p>
        </div>
      ) : (
        workouts.map((w) => (
          <WorkoutCard
            key={w.id}
            workout={w}
            itemCount={itemCounts[w.id]}
            interactive={interactive}
            onOpen={() => onOpenWorkout?.(w)}
          />
        ))
      )}
    </div>
  )
}
