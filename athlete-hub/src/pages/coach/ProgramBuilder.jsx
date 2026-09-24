import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { WORKOUT_TYPES, workoutTypeMeta } from '../../lib/facilityConfig.js'

const today = () => new Date().toISOString().slice(0, 10)
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function NewProgramForm({ coachId, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    setCreating(true)
    const program = await db.createProgram({ coach_id: coachId, name, description })
    setName('')
    setDescription('')
    setCreating(false)
    onCreated(program)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <h2 className="font-semibold mb-1">New program</h2>
      <p className="text-xs text-neutral-500 mb-3">
        A reusable template — no dates yet. It's built out with 12 weeks you fill in as needed, and
        each day can hold any mix of Throwing, Lifting, Mobility, and Movement Prep workouts.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Program name"
        className="w-full border rounded-xl px-3 py-2 text-sm mb-3"
        required
      />
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

// Click-to-add item picker, pre-filtered to the workout's own type — a
// Lifting workout never sees throwing drills in its picker.
function ItemPicker({ coachId, workoutType, onAdd }) {
  const [library, setLibrary] = useState(null)

  useEffect(() => {
    db.listItemLibrary(coachId).then(setLibrary)
  }, [coachId])

  if (library === null) return <p className="text-xs text-neutral-400">Loading library…</p>

  const matching = library.filter((it) => it.type === workoutType)

  if (matching.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        No {workoutTypeMeta(workoutType).label} items in your library yet.{' '}
        <Link to="/coach/exercises" className="text-accent hover:text-accent-700 font-medium">
          Build one →
        </Link>
      </p>
    )
  }

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
      <p className="text-xs font-medium text-neutral-500 mb-2">Add an item from your library</p>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {matching.map((item) => (
          <button
            key={item.id}
            onClick={() => onAdd(item)}
            className="w-full flex items-center justify-between gap-2 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-left hover:border-accent transition-colors"
          >
            <span className="text-xs font-medium text-neutral-800 truncate">{item.name}</span>
            <span className="shrink-0 text-accent text-sm font-semibold">+</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Compact per-set reps@load editor for a lifting item, saved as one
// target_sets jsonb array whenever a row changes.
function InlineTargetSets({ sets, onChange }) {
  const rows = sets?.length ? sets : [{ reps: '', load: '' }]

  function updateRow(i, field, value) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    onChange(next)
  }
  function addRow() {
    onChange([...rows, { reps: '', load: '' }])
  }
  function removeRow(i) {
    onChange(rows.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rows.map((s, i) => (
        <div key={i} className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded-lg px-1.5 py-1">
          <input
            defaultValue={s.reps ?? ''}
            onBlur={(e) => updateRow(i, 'reps', e.target.value)}
            type="number"
            inputMode="numeric"
            placeholder="reps"
            className="w-10 text-xs text-center bg-transparent focus:outline-none"
          />
          <span className="text-neutral-300 text-[10px]">@</span>
          <input
            defaultValue={s.load ?? ''}
            onBlur={(e) => updateRow(i, 'load', e.target.value)}
            type="number"
            inputMode="decimal"
            placeholder="lb"
            className="w-12 text-xs text-center bg-transparent focus:outline-none"
          />
          <button onClick={() => removeRow(i)} className="text-neutral-300 hover:text-danger text-xs px-0.5" aria-label="Remove set">
            ✕
          </button>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-accent hover:text-accent-700 font-medium px-1">
        + Set
      </button>
    </div>
  )
}

// One item inside a workout, inline-editable — every field saves on blur,
// no separate "edit mode" needed. Draggable via the handle for reordering.
function ItemRow({ item, type, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const [cues, setCues] = useState(item.cues ?? '')

  async function saveField(field, value) {
    const updated = await db.updateTemplateItem(item.id, { [field]: value })
    onChange(updated)
  }

  return (
    <div ref={setNodeRef} style={style} className="border border-neutral-100 rounded-xl p-2.5 mb-2 bg-white">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing shrink-0 mt-0.5 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-medium text-neutral-800 truncate">{item.name}</span>
            <button onClick={() => onRemove(item.id)} className="text-neutral-300 hover:text-danger transition-colors text-sm px-1 shrink-0" aria-label="Remove item">
              ✕
            </button>
          </div>

          {type === 'throwing' && (
            <div className="flex flex-wrap gap-3 mb-1.5">
              <LabeledNumber label="oz" defaultValue={item.ball_weight_oz} onSave={(v) => saveField('ball_weight_oz', numOrNull(v))} />
              <LabeledNumber label="throws" defaultValue={item.num_throws} onSave={(v) => saveField('num_throws', numOrNull(v))} />
              <LabeledNumber label="intent %" defaultValue={item.intent_pct} onSave={(v) => saveField('intent_pct', numOrNull(v))} />
              <LabeledNumber label="ft" defaultValue={item.distance_target} onSave={(v) => saveField('distance_target', numOrNull(v))} />
            </div>
          )}

          {type === 'lifting' && (
            <div className="mb-1.5 space-y-1.5">
              <InlineTargetSets
                sets={item.target_sets}
                onChange={(sets) => saveField('target_sets', sets.filter((s) => s.reps !== '').map((s) => ({ reps: Number(s.reps), load: s.load === '' ? null : Number(s.load) })))}
              />
              <div className="flex flex-wrap gap-3">
                <LabeledNumber label="rest (s)" defaultValue={item.rest_seconds} onSave={(v) => saveField('rest_seconds', numOrNull(v))} />
                <LabeledText label="tempo" defaultValue={item.tempo} onSave={(v) => saveField('tempo', v || null)} />
              </div>
            </div>
          )}

          {(type === 'mobility' || type === 'movement_prep') && (
            <div className="flex flex-wrap gap-3 mb-1.5">
              <LabeledNumber label="sets" defaultValue={item.sets} onSave={(v) => saveField('sets', numOrNull(v))} />
              {item.duration_seconds != null ? (
                <LabeledNumber label="sec" defaultValue={item.duration_seconds} onSave={(v) => saveField('duration_seconds', numOrNull(v))} />
              ) : (
                <LabeledNumber label="reps" defaultValue={item.reps} onSave={(v) => saveField('reps', numOrNull(v))} />
              )}
              <label className="flex items-center gap-1 text-[11px] text-neutral-500">
                Side
                <select
                  defaultValue={item.side ?? 'both'}
                  onChange={(e) => saveField('side', e.target.value)}
                  className="border border-neutral-200 rounded px-1 py-0.5 text-[11px]"
                >
                  <option value="both">Both</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
          )}

          <input
            value={cues}
            onChange={(e) => setCues(e.target.value)}
            onBlur={() => saveField('cues', cues || null)}
            placeholder="Cues (optional)"
            className="w-full border border-neutral-200 rounded-lg px-2 py-1 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

function LabeledNumber({ label, defaultValue, onSave }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-neutral-500">
      <input
        defaultValue={defaultValue ?? ''}
        onBlur={(e) => onSave(e.target.value)}
        type="number"
        inputMode="decimal"
        className="w-14 border border-neutral-200 rounded-lg px-1.5 py-1 text-xs text-center"
      />
      {label}
    </label>
  )
}

function LabeledText({ label, defaultValue, onSave }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-neutral-500">
      <input
        defaultValue={defaultValue ?? ''}
        onBlur={(e) => onSave(e.target.value)}
        className="w-20 border border-neutral-200 rounded-lg px-1.5 py-1 text-xs"
      />
      {label}
    </label>
  )
}

function WorkoutCard({ workout, coachId, onDuplicated, onDeleted }) {
  const [items, setItems] = useState(null)
  const [title, setTitle] = useState(workout.title)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    db.listTemplateItems(workout.id).then(setItems)
  }, [workout.id])

  async function handleAdd(libraryItem) {
    const row = { workout_id: workout.id, library_item_id: libraryItem.id, order_index: items.length }
    for (const f of db.ITEM_FIELDS) row[f] = libraryItem[f]
    const item = await db.createTemplateItem(row)
    setItems((prev) => [...prev, item])
  }

  function handleChange(updated) {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)))
  }

  async function handleRemove(id) {
    await db.deleteTemplateItem(id)
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((it) => it.id === active.id)
    const newIndex = items.findIndex((it) => it.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    await Promise.all(reordered.map((it, i) => db.updateTemplateItem(it.id, { order_index: i })))
  }

  async function handleTitleBlur() {
    if (title === workout.title) return
    await db.updateTemplateWorkout(workout.id, { title })
  }

  async function handleDuplicate() {
    const copy = await db.createTemplateWorkout({
      week_id: workout.week_id,
      day_number: workout.day_number,
      type: workout.type,
      title: `${workout.title} (copy)`,
      order_index: workout.order_index + 1,
    })
    await Promise.all(
      items.map((it) => {
        const row = { workout_id: copy.id, library_item_id: it.library_item_id, order_index: it.order_index }
        for (const f of db.ITEM_FIELDS) row[f] = it[f]
        return db.createTemplateItem(row)
      }),
    )
    onDuplicated(copy)
  }

  async function handleDeleteWorkout() {
    if (!window.confirm(`Delete "${workout.title}"? This removes its items too.`)) return
    await db.deleteTemplateWorkout(workout.id)
    onDeleted(workout.id)
  }

  return (
    <div className="border border-neutral-100 rounded-xl p-3 mb-3 bg-neutral-50/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${workoutTypeMeta(workout.type).badgeClass}`}>
            {workoutTypeMeta(workout.type).label}
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-sm font-medium bg-transparent focus:outline-none focus:bg-white focus:border-neutral-200 border border-transparent rounded px-1 py-0.5 min-w-0 flex-1"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={handleDuplicate} className="text-xs text-neutral-500 hover:text-neutral-800 font-medium">
            Duplicate
          </button>
          <button onClick={handleDeleteWorkout} className="text-xs text-danger/80 hover:text-danger font-medium">
            Delete
          </button>
        </div>
      </div>

      {items === null ? (
        <p className="text-xs text-neutral-400">Loading…</p>
      ) : (
        <>
          {items.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <ItemRow key={item.id} item={item} type={workout.type} onChange={handleChange} onRemove={handleRemove} />
                ))}
              </SortableContext>
            </DndContext>
          )}
          <ItemPicker coachId={coachId} workoutType={workout.type} onAdd={handleAdd} />
        </>
      )}
    </div>
  )
}

function NewWorkoutForm({ weekId, dayNumber, nextOrderIndex, onCreated }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState(WORKOUT_TYPES[0].value)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title) return
    const workout = await db.createTemplateWorkout({ week_id: weekId, day_number: dayNumber, type, title, order_index: nextOrderIndex })
    setTitle('')
    onCreated(workout)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="border rounded-xl px-2 py-1.5 text-xs shrink-0"
      >
        {WORKOUT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Workout title (e.g. Lower Body — Heavy)"
        className="border rounded-xl px-2 py-1.5 text-xs flex-1 min-w-[10rem]"
        required
      />
      <button type="submit" className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0">
        + Add workout
      </button>
    </form>
  )
}

// A week's days, 1-7, as a strip of tabs — a dot marks a day that already
// has at least one workout. Multiple workouts can live on one day; that's
// how a "day" holds more than one workout without its own table.
function DayStrip({ workouts, selectedDay, onSelect }) {
  const daysWithContent = new Set(workouts.map((w) => w.day_number))
  return (
    <div className="flex gap-1.5 mb-4">
      {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => (
        <button
          key={day}
          onClick={() => onSelect(day)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
            selectedDay === day
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
          }`}
        >
          <span>{DAY_LABELS[day - 1]}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${daysWithContent.has(day) ? (selectedDay === day ? 'bg-white' : 'bg-accent') : 'bg-transparent'}`} />
        </button>
      ))}
    </div>
  )
}

function WeekPanel({ week, coachId }) {
  const [workouts, setWorkouts] = useState(null)
  const [selectedDay, setSelectedDay] = useState(1)

  useEffect(() => {
    db.listTemplateWorkouts(week.id).then(setWorkouts)
  }, [week.id])

  if (workouts === null) return <p className="text-xs text-neutral-400">Loading…</p>

  const dayWorkouts = workouts.filter((w) => w.day_number === selectedDay)

  return (
    <div>
      <DayStrip workouts={workouts} selectedDay={selectedDay} onSelect={setSelectedDay} />

      {dayWorkouts.length === 0 ? (
        <p className="text-sm text-neutral-500 mb-3">No workouts on {DAY_LABELS[selectedDay - 1]} yet.</p>
      ) : (
        dayWorkouts.map((w) => (
          <WorkoutCard
            key={w.id}
            workout={w}
            coachId={coachId}
            onDuplicated={(copy) => setWorkouts((prev) => [...prev, copy])}
            onDeleted={(id) => setWorkouts((prev) => prev.filter((w2) => w2.id !== id))}
          />
        ))
      )}

      <NewWorkoutForm
        weekId={week.id}
        dayNumber={selectedDay}
        nextOrderIndex={dayWorkouts.length}
        onCreated={(w) => setWorkouts((prev) => [...prev, w])}
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
      <h2 className="font-semibold mb-1">{program.name}</h2>
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
          Manage item library →
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
