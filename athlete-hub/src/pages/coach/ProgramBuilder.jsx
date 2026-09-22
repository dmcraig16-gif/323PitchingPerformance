import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { PROGRAM_TYPES, programTypeMeta, EXERCISE_TYPES, exerciseTypeMeta } from '../../lib/facilityConfig.js'

function NewProgramForm({ coachId, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState(PROGRAM_TYPES[0].value)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    const program = await db.createProgram({ coach_id: coachId, name, description, type })
    setName('')
    setDescription('')
    onCreated(program)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <h2 className="font-semibold mb-3">New program</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Program name"
          className="border rounded-xl px-3 py-2 text-sm md:col-span-2"
          required
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm"
        >
          {PROGRAM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full border rounded-xl px-3 py-2 text-sm mb-3"
      />
      <button type="submit" className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-4 py-2 text-sm font-medium">
        Create program
      </button>
    </form>
  )
}

function NewWorkoutForm({ programId, onCreated }) {
  const [name, setName] = useState('')
  const [dayLabel, setDayLabel] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    const workout = await db.createWorkout({ program_id: programId, name, day_label: dayLabel, order_index: 0 })
    setName('')
    setDayLabel('')
    onCreated(workout)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
      <input
        value={dayLabel}
        onChange={(e) => setDayLabel(e.target.value)}
        placeholder="Day (e.g. Monday)"
        className="border rounded-xl px-2 py-1.5 text-xs w-32"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name"
        className="border rounded-xl px-2 py-1.5 text-xs flex-1"
        required
      />
      <button type="submit" className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-3 py-1.5 text-xs font-medium">
        Add workout
      </button>
    </form>
  )
}

// Workout Builder: pulls from the coach's exercise library (built in the
// Exercise Builder) rather than typing a new exercise from scratch each
// time. sets/reps/notes are specific to this workout — the library entry
// itself (name/type/video) is untouched.
function AddExerciseToWorkout({ workoutId, coachId, onCreated }) {
  const [library, setLibrary] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    db.listExerciseLibrary(coachId).then(setLibrary)
  }, [coachId])

  async function handleSubmit(e) {
    e.preventDefault()
    const source = library.find((ex) => ex.id === selectedId)
    if (!source) return
    const exercise = await db.createExercise({
      workout_id: workoutId,
      library_exercise_id: source.id,
      name: source.name,
      type: source.type,
      sets: sets ? Number(sets) : null,
      reps: reps ? Number(reps) : null,
      description: notes || source.description,
      youtube_url: source.video_url,
      order_index: 0,
    })
    setSelectedId('')
    setSets('')
    setReps('')
    setNotes('')
    onCreated(exercise)
  }

  if (library === null) return <p className="text-xs text-neutral-400">Loading library…</p>

  if (library.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        No exercises in your library yet.{' '}
        <Link to="/coach/exercises" className="text-accent hover:text-accent-700 font-medium">
          Build one in Exercise Builder →
        </Link>
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-2 mb-2">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="border border-neutral-200 rounded-xl px-2 py-1.5 text-xs col-span-3"
        required
      >
        <option value="">Choose an exercise…</option>
        {EXERCISE_TYPES.map((t) => {
          const options = library.filter((ex) => ex.type === t.value)
          if (options.length === 0) return null
          return (
            <optgroup key={t.value} label={t.label}>
              {options.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
      <input
        value={sets}
        onChange={(e) => setSets(e.target.value)}
        placeholder="Sets"
        type="number"
        className="border border-neutral-200 rounded-xl px-2 py-1.5 text-xs"
      />
      <input
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        placeholder="Reps"
        type="number"
        className="border border-neutral-200 rounded-xl px-2 py-1.5 text-xs"
      />
      <button
        type="submit"
        disabled={!selectedId}
        className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-2 py-1.5 text-xs font-medium disabled:opacity-40"
      >
        Add
      </button>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes for this workout (optional — overrides the library description)"
        className="border border-neutral-200 rounded-xl px-2 py-1.5 text-xs col-span-6"
      />
    </form>
  )
}

function WorkoutBlock({ workout, coachId }) {
  const [exercises, setExercises] = useState([])

  useEffect(() => {
    db.listExercises(workout.id).then(setExercises)
  }, [workout.id])

  return (
    <div className="border border-neutral-100 rounded-xl p-3 mb-2">
      <p className="text-sm font-medium mb-2">
        {workout.day_label ? `${workout.day_label} — ` : ''}
        {workout.name}
      </p>
      {exercises.length > 0 && (
        <ul className="text-xs text-neutral-600 mb-2 space-y-1">
          {exercises.map((ex) => (
            <li key={ex.id} className="flex items-center gap-2">
              {ex.type && (
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exerciseTypeMeta(ex.type).badgeClass}`}>
                  {exerciseTypeMeta(ex.type).label}
                </span>
              )}
              <span>
                {ex.name}
                {ex.sets && ex.reps ? ` — ${ex.sets}x${ex.reps}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddExerciseToWorkout
        workoutId={workout.id}
        coachId={coachId}
        onCreated={(ex) => setExercises((prev) => [...prev, ex])}
      />
    </div>
  )
}

function AssignPanel({ programId, coachId }) {
  const [athletes, setAthletes] = useState([])
  const [assignedIds, setAssignedIds] = useState(new Set())

  useEffect(() => {
    db.listAthletesForCoach(coachId).then(setAthletes)
    db.listAssignmentsForProgram(programId).then((rows) =>
      setAssignedIds(new Set(rows.map((r) => r.athlete_id))),
    )
  }, [coachId, programId])

  async function toggleAssign(athleteId) {
    if (assignedIds.has(athleteId)) return
    await db.assignProgram(programId, athleteId)
    setAssignedIds((prev) => new Set(prev).add(athleteId))
  }

  if (athletes.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100">
      <p className="text-xs font-medium text-neutral-500 mb-2">Assign to athletes</p>
      <div className="flex flex-wrap gap-2">
        {athletes.map((a) => (
          <button
            key={a.id}
            onClick={() => toggleAssign(a.id)}
            disabled={assignedIds.has(a.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              assignedIds.has(a.id)
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {assignedIds.has(a.id) ? `✓ ${a.name}` : a.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProgramBlock({ program, coachId }) {
  const [workouts, setWorkouts] = useState(null)

  useEffect(() => {
    db.listWorkouts(program.id).then(setWorkouts)
  }, [program.id])

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-semibold">{program.name}</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${programTypeMeta(program.type).badgeClass}`}
        >
          {programTypeMeta(program.type).label}
        </span>
      </div>
      {program.description && <p className="text-sm text-neutral-500 mb-3">{program.description}</p>}

      {workouts?.map((w) => (
        <WorkoutBlock key={w.id} workout={w} coachId={coachId} />
      ))}
      <NewWorkoutForm
        programId={program.id}
        onCreated={(w) => setWorkouts((prev) => [...(prev ?? []), w])}
      />

      <AssignPanel programId={program.id} coachId={coachId} />
    </div>
  )
}

export default function ProgramBuilder() {
  const { profile } = useAuth()
  const [programs, setPrograms] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    db.listProgramsForCoach(profile.id).then(setPrograms)
  }, [profile?.id])

  if (!profile) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">Program Builder</h1>
        <Link to="/coach/exercises" className="text-sm text-accent hover:text-accent-700 font-medium">
          Manage exercise library →
        </Link>
      </div>
      <NewProgramForm
        coachId={profile.id}
        onCreated={(p) => setPrograms((prev) => [...(prev ?? []), p])}
      />
      {programs === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : programs.length === 0 ? (
        <p className="text-sm text-neutral-500">No programs yet — create one above.</p>
      ) : (
        programs.map((p) => <ProgramBlock key={p.id} program={p} coachId={profile.id} />)
      )}
    </div>
  )
}
