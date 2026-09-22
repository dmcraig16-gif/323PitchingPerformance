import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { programTypeMeta, exerciseTypeMeta } from '../../lib/facilityConfig.js'
import ExerciseLogger from '../../components/ExerciseLogger.jsx'

// Groups an athlete's exercise_logs by "the movement" (library_exercise_id
// when the exercise came from the library, otherwise the workout-instance
// id) so weight/velocity trends span every workout that reused it, not
// just one program.
function trendKey(exercise) {
  return exercise.library_exercise_id ?? exercise.id
}

function ProgramBlock({ program, workouts, exercisesByWorkout, athleteId, trendsByKey, onLogged }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-semibold">{program.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${programTypeMeta(program.type).badgeClass}`}>
          {programTypeMeta(program.type).label}
        </span>
      </div>
      {program.description && <p className="text-sm text-neutral-500 mb-4">{program.description}</p>}

      {workouts.length === 0 ? (
        <p className="text-sm text-neutral-400">No workouts added to this program yet.</p>
      ) : (
        <div className="space-y-4">
          {workouts.map((w) => (
            <div key={w.id} className="border-t border-neutral-100 pt-3">
              <p className="text-sm font-medium mb-2">
                {w.day_label ? `${w.day_label} — ` : ''}
                {w.name}
              </p>
              <ul className="space-y-3">
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
                          {ex.target_value ? (
                            <span className="text-neutral-400 font-normal"> · target {ex.target_value}{ex.target_unit}</span>
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
                    <ExerciseLogger
                      exercise={ex}
                      athleteId={athleteId}
                      trendLogs={trendsByKey[trendKey(ex)] ?? []}
                      onLogged={(log) => onLogged(trendKey(ex), log)}
                    />
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
  const [workoutsByProgram, setWorkoutsByProgram] = useState({})
  const [exercisesByWorkout, setExercisesByWorkout] = useState({})
  const [trendsByKey, setTrendsByKey] = useState({})
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.listAssignedPrograms(athleteId).then(async (progs) => {
      setPrograms(progs)

      const workoutEntries = await Promise.all(
        progs.map((p) => db.listWorkouts(p.id).then((ws) => [p.id, ws])),
      )
      const workoutsMap = Object.fromEntries(workoutEntries)
      setWorkoutsByProgram(workoutsMap)

      const allWorkouts = Object.values(workoutsMap).flat()
      const exerciseEntries = await Promise.all(
        allWorkouts.map((w) => db.listExercises(w.id).then((ex) => [w.id, ex])),
      )
      const exercisesMap = Object.fromEntries(exerciseEntries)
      setExercisesByWorkout(exercisesMap)

      const allExercises = Object.values(exercisesMap).flat()
      const logEntries = await Promise.all(
        allExercises.map((ex) => db.listExerciseLogsForExercise(ex.id).then((logs) => [ex, logs])),
      )
      const grouped = {}
      for (const [ex, logs] of logEntries) {
        const key = trendKey(ex)
        grouped[key] = [...(grouped[key] ?? []), ...logs].sort((a, b) => a.date.localeCompare(b.date))
      }
      setTrendsByKey(grouped)
    })
  }, [athleteId])

  function handleLogged(key, log) {
    setTrendsByKey((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), log] }))
  }

  const programBlocks = useMemo(() => {
    if (!programs) return null
    return programs.map((p) => ({
      program: p,
      workouts: workoutsByProgram[p.id] ?? [],
    }))
  }, [programs, workoutsByProgram])

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-6">My Program</h1>
      {programBlocks === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : programBlocks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm text-neutral-500">
            You haven't been assigned a program yet. Once your coach assigns lifting or throwing
            programming, it'll show up here.
          </p>
        </div>
      ) : (
        programBlocks.map(({ program, workouts }) => (
          <ProgramBlock
            key={program.id}
            program={program}
            workouts={workouts}
            exercisesByWorkout={exercisesByWorkout}
            athleteId={athleteId}
            trendsByKey={trendsByKey}
            onLogged={handleLogged}
          />
        ))
      )}
    </div>
  )
}
