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
  THROW_METRICS,
} from '../../lib/facilityConfig.js'

const today = () => new Date().toISOString().slice(0, 10)

function NewProgramForm({ coachId, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState(PROGRAM_TYPES[0].value)
  const [creating, setCreating] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    setCreating(true)
    const program = await db.createProgram({ coach_id: coachId, name, description, type })
    setName('')
    setDescription('')
    setCreating(false)
    onCreated(program)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <h2 className="font-semibold mb-1">New program</h2>
      <p className="text-xs text-neutral-500 mb-3">
        A reusable template — no dates yet. It's built out with 12 weeks you fill in as needed.
      </p>
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
      <button
        type="submit"
        disabled={creating}
        className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {creating ? 'Creating…' : 'Create program'}
      </button>
    </form>
  )
}

function NewSessionForm({ weekId, onCreated, nextOrderIndex }) {
  const [name, setName] = useState('')
  const [dayNumber, setDayNumber] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name || !dayNumber) return
    const session = await db.createTemplateSession({
      week_id: weekId,
      day_number: Number(dayNumber),
      name,
      order_index: nextOrderIndex,
    })
    setName('')
    setDayNumber('')
    onCreated(session)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        value={dayNumber}
        onChange={(e) => setDayNumber(e.target.value)}
        placeholder="Day #"
        type="number"
        min={1}
        max={7}
        className="border rounded-xl px-2 py-1.5 text-xs w-20 shrink-0"
        required
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Session name (e.g. Lower Body — Heavy)"
        className="border rounded-xl px-2 py-1.5 text-xs flex-1 min-w-[10rem]"
        required
      />
      <button type="submit" className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0">
        + Add session
      </button>
    </form>
  )
}

// Click-to-add exercise picker, filterable by type — the "browse your
// library while building a session" half of the Trainerize-style layout.
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
      <p className="text-xs font-medium text-neutral-500 mb-2">Add a drill from your library</p>
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

// One drill row inside a session, inline-editable — sets/reps/intent/
// target save on blur, no separate "edit mode" needed. Up/down reorder
// swaps order_index with the neighboring row.
function DrillRow({ drill, canMoveUp, canMoveDown, onMove, onRemove, onChange }) {
  const [sets, setSets] = useState(drill.sets ?? '')
  const [reps, setReps] = useState(drill.reps ?? '')
  const [intent, setIntent] = useState(drill.intent ?? '')
  const [target, setTarget] = useState(drill.target_value ?? '')
  const isThrowing = drill.type === THROWING_EXERCISE_TYPE
  const targetUnit = isThrowing ? (drill.target_unit ?? 'mph') : 'lb'

  async function saveField(field, value, numeric = true) {
    const patch = { [field]: value === '' ? null : numeric ? Number(value) : value }
    const updated = await db.updateTemplateDrill(drill.id, patch)
    onChange(updated)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
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

      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exerciseTypeMeta(drill.type).badgeClass}`}>
        {exerciseTypeMeta(drill.type).label}
      </span>
      <span className="text-sm font-medium text-neutral-800 flex-1 min-w-[8rem] truncate">{drill.name}</span>

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
      <input
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        onBlur={() => saveField('intent', intent, false)}
        placeholder="Intent"
        className="w-24 border border-neutral-200 rounded-lg px-1.5 py-1 text-xs"
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
        {isThrowing ? (
          <select
            value={targetUnit}
            onChange={(e) => saveField('target_unit', e.target.value, false)}
            className="text-[10px] text-neutral-500 border border-neutral-200 rounded-lg px-1 py-1 bg-white"
          >
            {THROW_METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.unit}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-neutral-400 w-8">{targetUnit}</span>
        )}
      </div>

      <button
        onClick={onRemove}
        className="text-neutral-300 hover:text-danger transition-colors text-sm px-1"
        aria-label="Remove drill"
      >
        ✕
      </button>
    </div>
  )
}

function SessionBlock({ session, coachId, sessionCount, onDuplicated, onDeleted }) {
  const [drills, setDrills] = useState(null)

  useEffect(() => {
    db.listTemplateDrills(session.id).then(setDrills)
  }, [session.id])

  async function handleAdd(libraryExercise) {
    const drill = await db.createTemplateDrill({
      session_id: session.id,
      library_exercise_id: libraryExercise.id,
      name: libraryExercise.name,
      type: libraryExercise.type,
      description: libraryExercise.description,
      youtube_url: libraryExercise.video_url,
      sets: 3,
      reps: 10,
      target_unit: libraryExercise.type === THROWING_EXERCISE_TYPE ? THROW_METRICS[0].value : 'lb',
      order_index: drills.length,
    })
    setDrills((prev) => [...prev, drill])
  }

  function handleChange(updated) {
    setDrills((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  async function handleRemove(id) {
    await db.deleteTemplateDrill(id)
    setDrills((prev) => prev.filter((d) => d.id !== id))
  }

  async function handleMove(index, direction) {
    const target = drills[index + direction]
    const current = drills[index]
    if (!target) return
    const [updatedCurrent, updatedTarget] = await Promise.all([
      db.updateTemplateDrill(current.id, { order_index: target.order_index }),
      db.updateTemplateDrill(target.id, { order_index: current.order_index }),
    ])
    const next = [...drills]
    next[index] = updatedTarget
    next[index + direction] = updatedCurrent
    setDrills(next.sort((a, b) => a.order_index - b.order_index))
  }

  async function handleDuplicate() {
    const copy = await db.createTemplateSession({
      week_id: session.week_id,
      day_number: session.day_number,
      name: `${session.name} (copy)`,
      order_index: sessionCount,
    })
    await Promise.all(
      drills.map((d) =>
        db.createTemplateDrill({
          session_id: copy.id,
          library_exercise_id: d.library_exercise_id,
          name: d.name,
          type: d.type,
          description: d.description,
          intent: d.intent,
          youtube_url: d.youtube_url,
          sets: d.sets,
          reps: d.reps,
          target_value: d.target_value,
          target_unit: d.target_unit,
          order_index: d.order_index,
        }),
      ),
    )
    onDuplicated(copy)
  }

  async function handleDeleteSession() {
    if (!window.confirm(`Delete "${session.name}"? This removes its drills too.`)) return
    await db.deleteTemplateSession(session.id)
    onDeleted(session.id)
  }

  return (
    <div className="border border-neutral-100 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          Day {session.day_number} — {session.name}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleDuplicate} className="text-xs text-neutral-500 hover:text-neutral-800 font-medium">
            Duplicate
          </button>
          <button onClick={handleDeleteSession} className="text-xs text-danger/80 hover:text-danger font-medium">
            Delete
          </button>
        </div>
      </div>

      {drills === null ? (
        <p className="text-xs text-neutral-400">Loading…</p>
      ) : (
        <>
          {drills.length > 0 && (
            <div className="divide-y divide-neutral-100 mb-2">
              {drills.map((d, i) => (
                <DrillRow
                  key={d.id}
                  drill={d}
                  canMoveUp={i > 0}
                  canMoveDown={i < drills.length - 1}
                  onMove={(direction) => handleMove(i, direction)}
                  onRemove={() => handleRemove(d.id)}
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

function WeekPanel({ week, coachId }) {
  const [sessions, setSessions] = useState(null)

  useEffect(() => {
    db.listTemplateSessions(week.id).then(setSessions)
  }, [week.id])

  if (sessions === null) return <p className="text-xs text-neutral-400">Loading…</p>

  return (
    <div>
      {sessions.length === 0 ? (
        <p className="text-sm text-neutral-500 mb-3">No sessions in week {week.week_number} yet.</p>
      ) : (
        sessions.map((s) => (
          <SessionBlock
            key={s.id}
            session={s}
            coachId={coachId}
            sessionCount={sessions.length}
            onDuplicated={(copy) => setSessions((prev) => [...prev, copy])}
            onDeleted={(id) => setSessions((prev) => prev.filter((s2) => s2.id !== id))}
          />
        ))
      )}
      <NewSessionForm
        weekId={week.id}
        nextOrderIndex={sessions.length}
        onCreated={(s) => setSessions((prev) => [...prev, s])}
      />
    </div>
  )
}

function AssignPanel({ programId, coachId }) {
  const [athletes, setAthletes] = useState([])
  const [assignedIds, setAssignedIds] = useState(new Set())
  const [assigningId, setAssigningId] = useState(null)
  const [startDate, setStartDate] = useState(today())

  useEffect(() => {
    db.listAthletesForCoach(coachId).then(setAthletes)
    db.listAssignmentsForProgram(programId).then((rows) =>
      setAssignedIds(new Set(rows.map((r) => r.athlete_id))),
    )
  }, [coachId, programId])

  async function toggleAssign(athleteId) {
    if (assignedIds.has(athleteId) || assigningId) return
    setAssigningId(athleteId)
    await db.assignProgram(programId, athleteId, startDate)
    setAssignedIds((prev) => new Set(prev).add(athleteId))
    setAssigningId(null)
  }

  if (athletes.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <p className="text-xs font-medium text-neutral-500">Assign to athletes, starting</p>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-neutral-200 rounded-lg px-2 py-1 text-xs max-w-full"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {athletes.map((a) => (
          <button
            key={a.id}
            onClick={() => toggleAssign(a.id)}
            disabled={assignedIds.has(a.id) || assigningId === a.id}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              assignedIds.has(a.id)
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {assignedIds.has(a.id) ? `✓ ${a.name}` : assigningId === a.id ? 'Scheduling…' : a.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProgramBlock({ program, coachId }) {
  const [weeks, setWeeks] = useState(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1)

  useEffect(() => {
    db.listProgramWeeks(program.id).then(setWeeks)
  }, [program.id])

  const selectedWeek = weeks?.find((w) => w.week_number === selectedWeekNumber)

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

      <div className="flex flex-wrap gap-1.5 mb-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setSelectedWeekNumber(n)}
            className={`text-xs w-9 h-9 rounded-full font-medium border ${
              selectedWeekNumber === n
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {selectedWeek ? (
        <WeekPanel key={selectedWeek.id} week={selectedWeek} coachId={coachId} />
      ) : (
        <p className="text-xs text-neutral-400">Loading week…</p>
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
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
