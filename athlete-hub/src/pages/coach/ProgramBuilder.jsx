import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { PROGRAM_TYPES, programTypeMeta } from '../../lib/facilityConfig.js'

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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-5 mb-5">
      <h2 className="font-semibold mb-3">New program</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Program name"
          className="border rounded-md px-3 py-2 text-sm md:col-span-2"
          required
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
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
        className="w-full border rounded-md px-3 py-2 text-sm mb-3"
      />
      <button type="submit" className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium">
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
        className="border rounded-md px-2 py-1.5 text-xs w-32"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name"
        className="border rounded-md px-2 py-1.5 text-xs flex-1"
        required
      />
      <button type="submit" className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-xs font-medium">
        Add workout
      </button>
    </form>
  )
}

function NewExerciseForm({ workoutId, onCreated }) {
  const [form, setForm] = useState({ name: '', sets: '', reps: '', description: '', youtube_url: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) return
    const exercise = await db.createExercise({
      workout_id: workoutId,
      name: form.name,
      sets: form.sets ? Number(form.sets) : null,
      reps: form.reps ? Number(form.reps) : null,
      description: form.description,
      youtube_url: form.youtube_url,
      order_index: 0,
    })
    setForm({ name: '', sets: '', reps: '', description: '', youtube_url: '' })
    onCreated(exercise)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-2 mb-2">
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Exercise name"
        className="border rounded-md px-2 py-1 text-xs col-span-2"
        required
      />
      <input
        value={form.sets}
        onChange={(e) => setForm({ ...form, sets: e.target.value })}
        placeholder="Sets"
        type="number"
        className="border rounded-md px-2 py-1 text-xs"
      />
      <input
        value={form.reps}
        onChange={(e) => setForm({ ...form, reps: e.target.value })}
        placeholder="Reps"
        type="number"
        className="border rounded-md px-2 py-1 text-xs"
      />
      <input
        value={form.youtube_url}
        onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
        placeholder="Video URL"
        className="border rounded-md px-2 py-1 text-xs"
      />
      <button type="submit" className="bg-slate-900 text-white rounded-md px-2 py-1 text-xs font-medium">
        Add
      </button>
      <input
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Coaching cue / description"
        className="border rounded-md px-2 py-1 text-xs col-span-6"
      />
    </form>
  )
}

function WorkoutBlock({ workout }) {
  const [exercises, setExercises] = useState([])

  useEffect(() => {
    db.listExercises(workout.id).then(setExercises)
  }, [workout.id])

  return (
    <div className="border border-slate-100 rounded-md p-3 mb-2">
      <p className="text-sm font-medium mb-2">
        {workout.day_label ? `${workout.day_label} — ` : ''}
        {workout.name}
      </p>
      {exercises.length > 0 && (
        <ul className="text-xs text-slate-600 mb-2 space-y-1">
          {exercises.map((ex) => (
            <li key={ex.id}>
              {ex.name}
              {ex.sets && ex.reps ? ` — ${ex.sets}x${ex.reps}` : ''}
            </li>
          ))}
        </ul>
      )}
      <NewExerciseForm workoutId={workout.id} onCreated={(ex) => setExercises((prev) => [...prev, ex])} />
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
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-2">Assign to athletes</p>
      <div className="flex flex-wrap gap-2">
        {athletes.map((a) => (
          <button
            key={a.id}
            onClick={() => toggleAssign(a.id)}
            disabled={assignedIds.has(a.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              assignedIds.has(a.id)
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
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
    <div className="bg-white rounded-lg shadow-sm p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-semibold">{program.name}</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${programTypeMeta(program.type).badgeClass}`}
        >
          {programTypeMeta(program.type).label}
        </span>
      </div>
      {program.description && <p className="text-sm text-slate-500 mb-3">{program.description}</p>}

      {workouts?.map((w) => (
        <WorkoutBlock key={w.id} workout={w} />
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
      <h1 className="text-2xl font-semibold mb-6">Program Builder</h1>
      <NewProgramForm
        coachId={profile.id}
        onCreated={(p) => setPrograms((prev) => [...(prev ?? []), p])}
      />
      {programs === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : programs.length === 0 ? (
        <p className="text-sm text-slate-500">No programs yet — create one above.</p>
      ) : (
        programs.map((p) => <ProgramBlock key={p.id} program={p} coachId={profile.id} />)
      )}
    </div>
  )
}
