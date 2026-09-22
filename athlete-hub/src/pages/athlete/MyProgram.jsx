import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { programTypeMeta, exerciseTypeMeta } from '../../lib/facilityConfig.js'

function ProgramCard({ program, athleteId, completedToday }) {
  const [workouts, setWorkouts] = useState(null)
  const [exercisesByWorkout, setExercisesByWorkout] = useState({})
  const [doneIds, setDoneIds] = useState(completedToday)

  useEffect(() => {
    db.listWorkouts(program.id).then(async (ws) => {
      setWorkouts(ws)
      const entries = await Promise.all(ws.map((w) => db.listExercises(w.id).then((ex) => [w.id, ex])))
      setExercisesByWorkout(Object.fromEntries(entries))
    })
  }, [program.id])

  async function markDone(exerciseId) {
    await db.logExerciseComplete(exerciseId, athleteId)
    setDoneIds((prev) => new Set(prev).add(exerciseId))
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-semibold">{program.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${programTypeMeta(program.type).badgeClass}`}>
          {programTypeMeta(program.type).label}
        </span>
      </div>
      {program.description && <p className="text-sm text-neutral-500 mb-4">{program.description}</p>}

      {workouts === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : workouts.length === 0 ? (
        <p className="text-sm text-neutral-400">No workouts added to this program yet.</p>
      ) : (
        <div className="space-y-4">
          {workouts.map((w) => (
            <div key={w.id} className="border-t border-neutral-100 pt-3">
              <p className="text-sm font-medium mb-2">
                {w.day_label ? `${w.day_label} — ` : ''}
                {w.name}
              </p>
              <ul className="space-y-2">
                {(exercisesByWorkout[w.id] ?? []).map((ex) => (
                  <li key={ex.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {ex.type && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exerciseTypeMeta(ex.type).badgeClass}`}>
                            {exerciseTypeMeta(ex.type).label}
                          </span>
                        )}
                        <p className="font-medium text-neutral-800">
                          {ex.name}
                          {ex.sets && ex.reps ? (
                            <span className="text-neutral-400 font-normal"> — {ex.sets}x{ex.reps}</span>
                          ) : null}
                        </p>
                      </div>
                      {ex.description && <p className="text-neutral-500 text-xs mt-0.5">{ex.description}</p>}
                      {ex.youtube_url && (
                        <a
                          href={ex.youtube_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent hover:text-accent-700 underline"
                        >
                          Watch demo
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => markDone(ex.id)}
                      disabled={doneIds.has(ex.id)}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium ${
                        doneIds.has(ex.id)
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-accent text-white hover:bg-accent-600 transition-colors'
                      }`}
                    >
                      {doneIds.has(ex.id) ? 'Done ✓' : 'Mark done'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyProgram() {
  const { profile } = useAuth()
  const [programs, setPrograms] = useState(null)
  const [completedToday, setCompletedToday] = useState(new Set())
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.listAssignedPrograms(athleteId).then(setPrograms)
    db.listExerciseLogsForDate(athleteId, new Date().toISOString().slice(0, 10)).then((logs) =>
      setCompletedToday(new Set(logs.map((l) => l.exercise_id))),
    )
  }, [athleteId])

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-6">My Program</h1>
      {programs === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm text-neutral-500">
            You haven't been assigned a program yet. Once your coach assigns lifting or throwing
            programming, it'll show up here.
          </p>
        </div>
      ) : (
        programs.map((p) => (
          <ProgramCard key={p.id} program={p} athleteId={athleteId} completedToday={completedToday} />
        ))
      )}
    </div>
  )
}
