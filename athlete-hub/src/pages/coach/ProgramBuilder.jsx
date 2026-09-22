import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import {
  PROGRAM_TYPES,
  programTypeMeta,
  EXERCISE_TYPES,
  exerciseTypeMeta,
  THROWING_EXERCISE_TYPE,
} from '../../lib/facilityConfig.js'

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

function NewWorkoutForm({ programId, onCreated, nextOrderIndex }) {
  const [name, setName] = useState('')
  const [dayLabel, setDayLabel] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    const workout = await db.createWorkout({
      program_id: programId,
      name,
      day_label: dayLabel,
      order_index: nextOrderIndex,
    })
    setName('')
    setDayLabel('')
    onCreated(workout)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
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
      <button type="submit" className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap">
        + Add day
      </button>
    </form>
  )
}

// Click-to-add exercise picker, filterable by type — the "browse your
// library while building a workout" half of the Trainerize-style layout.
function ExerciseLibraryPicker({ coachId, onAdd }) {
  const [library, setLibrary] = useState(null)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    db.listExerciseLibrary(coachId).then(setLibrary)
  }, [coachId])

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

  const visible = library.filter((ex) => filterType === 'all' || ex.type === filterType)

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
      <p className="text-xs font-medium text-neutral-500 mb-2">Add from your library</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button
          onClick={() => setFilterType('all')}
          className={`text-[11px] px-2 py-1 rounded-full font-medium border ${
            filterType === 'all' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200'
          }`}
        >
          All
        </button>
        {EXERCISE_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`text-[11px] px-2 py-1 rounded-full font-medium border ${
              filterType === t.value ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {visible.map((ex) => (
          <button
            key={ex.id}
            onClick={() => onAdd(ex)}
            className="w-full flex items-center justify-between gap-2 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-left hover:border-accent transition-colors"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exerciseTypeMeta(ex.type).badgeClass}`}>
                {exerciseTypeMeta(ex.type).label}
              </span>
              <span className="text-xs font-medium text-neutral-800 truncate">{ex.name}</span>
            </span>
            <span className="shrink-0 text-accent text-sm font-semibold">+</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// One exercise row inside a workout, inline-editable — sets/reps/target
// save on blur, no separate "edit mode" needed. Up/down reorder swaps
// order_index with the neighboring row.
function ExerciseRow({ exercise, canMoveUp, canMoveDown, onMove, onRemove, onChange }) {
  const [sets, setSets] = useState(exercise.sets ?? '')
  const [reps, setReps] = useState(exercise.reps ?? '')
  const [target, setTarget] = useState(exercise.target_value ?? '')
  const targetUnit = exercise.type === THROWING_EXERCISE_TYPE ? 'mph' : 'lb'

  async function saveField(field, value) {
    const patch = { [field]: value === '' ? null : Number(value) }
    const updated = await db.updateExercise(exercise.id, patch)
    onChange(updated)
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex flex-col -my-1">
        <button
          onClick={() => onMove(-1)}
          disabled={!canMoveUp}
          className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 leading-none text-xs"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={!canMoveDown}
          className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 leading-none text-xs"
          aria-label="Move down"
        >
          ▼
        </button>
      </div>

      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exerciseTypeMeta(exercise.type).badgeClass}`}>
        {exerciseTypeMeta(exercise.type).label}
      </span>
      <span className="text-sm font-medium text-neutral-800 flex-1 truncate">{exercise.name}</span>

      <input
        value={sets}
        onChange={(e) => setSets(e.target.value)}
        onBlur={() => saveField('sets', sets)}
        placeholder="Sets"
        type="number"
        className="w-14 border border-neutral-200 rounded-lg px-1.5 py-1 text-xs text-center"
      />
      <span className="text-neutral-300 text-xs">×</span>
      <input
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={() => saveField('reps', reps)}
        placeholder="Reps"
        type="number"
        className="w-14 border border-neutral-200 rounded-lg px-1.5 py-1 text-xs text-center"
      />
      <div className="flex items-center gap-1">
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onBlur={() => saveField('target_value', target)}
          placeholder="Target"
          type="number"
          className="w-16 border border-neutral-200 rounded-lg px-1.5 py-1 text-xs text-center"
        />
        <span className="text-[10px] text-neutral-400 w-8">{targetUnit}</span>
      </div>

      <button
        onClick={onRemove}
        className="text-neutral-300 hover:text-danger transition-colors text-sm px-1"
        aria-label="Remove exercise"
      >
        ✕
      </button>
    </div>
  )
}

function WorkoutBlock({ workout, coachId, workoutCount, onDuplicated, onDeleted }) {
  const [exercises, setExercises] = useState(null)

  useEffect(() => {
    db.listExercises(workout.id).then(setExercises)
  }, [workout.id])

  async function handleAdd(libraryExercise) {
    const exercise = await db.createExercise({
      workout_id: workout.id,
      library_exercise_id: libraryExercise.id,
      name: libraryExercise.name,
      type: libraryExercise.type,
      description: libraryExercise.description,
      youtube_url: libraryExercise.video_url,
      sets: 3,
      reps: 10,
      order_index: exercises.length,
    })
    setExercises((prev) => [...prev, exercise])
  }

  function handleChange(updated) {
    setExercises((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)))
  }

  async function handleRemove(id) {
    await db.deleteExercise(id)
    setExercises((prev) => prev.filter((ex) => ex.id !== id))
  }

  async function handleMove(index, direction) {
    const target = exercises[index + direction]
    const current = exercises[index]
    if (!target) return
    const [updatedCurrent, updatedTarget] = await Promise.all([
      db.updateExercise(current.id, { order_index: target.order_index }),
      db.updateExercise(target.id, { order_index: current.order_index }),
    ])
    const next = [...exercises]
    next[index] = updatedTarget
    next[index + direction] = updatedCurrent
    setExercises(next.sort((a, b) => a.order_index - b.order_index))
  }

  async function handleDuplicate() {
    const copy = await db.createWorkout({
      program_id: workout.program_id,
      name: `${workout.name} (copy)`,
      day_label: workout.day_label,
      order_index: workoutCount,
    })
    await Promise.all(
      exercises.map((ex) =>
        db.createExercise({
          workout_id: copy.id,
          library_exercise_id: ex.library_exercise_id,
          name: ex.name,
          type: ex.type,
          description: ex.description,
          youtube_url: ex.youtube_url,
          sets: ex.sets,
          reps: ex.reps,
          target_value: ex.target_value,
          target_unit: ex.target_unit,
          order_index: ex.order_index,
        }),
      ),
    )
    // The new WorkoutBlock mounts from this and fetches its own exercises
    // (already persisted above), so nothing more to pass up.
    onDuplicated(copy)
  }

  async function handleDeleteWorkout() {
    if (!window.confirm(`Delete "${workout.name}"? This removes its exercises too.`)) return
    await db.deleteWorkout(workout.id)
    onDeleted(workout.id)
  }

  return (
    <div className="border border-neutral-100 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          {workout.day_label ? `${workout.day_label} — ` : ''}
          {workout.name}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleDuplicate} className="text-xs text-neutral-500 hover:text-neutral-800 font-medium">
            Duplicate
          </button>
          <button onClick={handleDeleteWorkout} className="text-xs text-danger/80 hover:text-danger font-medium">
            Delete
          </button>
        </div>
      </div>

      {exercises === null ? (
        <p className="text-xs text-neutral-400">Loading…</p>
      ) : (
        <>
          {exercises.length > 0 && (
            <div className="divide-y divide-neutral-100 mb-2">
              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  canMoveUp={i > 0}
                  canMoveDown={i < exercises.length - 1}
                  onMove={(direction) => handleMove(i, direction)}
                  onRemove={() => handleRemove(ex.id)}
                  onChange={handleChange}
                />
              ))}
            </div>
          )}
          <ExerciseLibraryPicker coachId={coachId} onAdd={handleAdd} />
        </>
      )}
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

      {workouts === null ? (
        <p className="text-xs text-neutral-400">Loading…</p>
      ) : (
        <>
          {workouts.map((w) => (
            <WorkoutBlock
              key={w.id}
              workout={w}
              coachId={coachId}
              workoutCount={workouts.length}
              onDuplicated={(copy) => setWorkouts((prev) => [...prev, copy])}
              onDeleted={(id) => setWorkouts((prev) => prev.filter((w2) => w2.id !== id))}
            />
          ))}
          <div className="mt-2">
            <NewWorkoutForm
              programId={program.id}
              nextOrderIndex={workouts.length}
              onCreated={(w) => setWorkouts((prev) => [...prev, w])}
            />
          </div>
        </>
      )}

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
