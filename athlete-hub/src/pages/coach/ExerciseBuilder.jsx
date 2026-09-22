import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { EXERCISE_TYPES, exerciseTypeMeta } from '../../lib/facilityConfig.js'

const EMPTY_FORM = { name: '', type: EXERCISE_TYPES[0].value, description: '', video_url: '' }

function youtubeEmbedUrl(url) {
  if (!url) return null
  const watch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/)
  return watch ? `https://www.youtube.com/embed/${watch[1]}` : null
}

// Keyed by editing?.id in the parent, so switching between "new" and
// "edit an existing exercise" remounts this form with fresh initial state
// instead of syncing props into state via an effect.
function ExerciseForm({ coachId, editing, onSaved, onCancel }) {
  const [form, setForm] = useState(
    editing
      ? { name: editing.name, type: editing.type, description: editing.description ?? '', video_url: editing.video_url ?? '' }
      : EMPTY_FORM,
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) return
    const saved = editing
      ? await db.updateLibraryExercise(editing.id, form)
      : await db.createLibraryExercise({ ...form, coach_id: coachId })
    setForm(EMPTY_FORM)
    onSaved(saved)
  }

  const embedUrl = youtubeEmbedUrl(form.video_url)

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 mb-6">
      <h2 className="font-semibold mb-4">{editing ? 'Edit exercise' : 'New exercise'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Trap Bar Deadlift"
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
          >
            {EXERCISE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Coaching cue / description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          placeholder="What should the athlete focus on?"
          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Demo video URL</label>
        <input
          value={form.video_url}
          onChange={(e) => setForm({ ...form, video_url: e.target.value })}
          placeholder="https://youtube.com/watch?v=…"
          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
        />
        {embedUrl && (
          <div className="mt-3 aspect-video max-w-sm rounded-xl overflow-hidden border border-neutral-200">
            <iframe
              src={embedUrl}
              title="Exercise demo preview"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-5 py-2 text-sm font-medium"
        >
          {editing ? 'Save changes' : 'Add to library'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-neutral-200 rounded-xl px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default function ExerciseBuilder() {
  const { profile } = useAuth()
  const [exercises, setExercises] = useState(null)
  const [editing, setEditing] = useState(null)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (!profile?.id) return
    db.listExerciseLibrary(profile.id).then(setExercises)
  }, [profile?.id])

  function handleSaved(saved) {
    setExercises((prev) => {
      const rest = (prev ?? []).filter((e) => e.id !== saved.id)
      return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name))
    })
    setEditing(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this exercise from your library? Workouts that already use it keep their own copy.')) return
    await db.deleteLibraryExercise(id)
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  const visible = (exercises ?? []).filter((e) => filterType === 'all' || e.type === filterType)

  if (!profile) return null

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Exercise Builder</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Build a reusable library of strength, throwing, arm-care, and mobility exercises — each with
        its own video — then pull from it while building workouts.
      </p>

      <ExerciseForm
        key={editing?.id ?? 'new'}
        coachId={profile.id}
        editing={editing}
        onSaved={handleSaved}
        onCancel={() => setEditing(null)}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            filterType === 'all'
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
          }`}
        >
          All
        </button>
        {EXERCISE_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              filterType === t.value
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {exercises === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-6">
          <p className="text-sm text-neutral-500">No exercises here yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((ex) => (
            <div key={ex.id} className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm">{ex.name}</h3>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${exerciseTypeMeta(ex.type).badgeClass}`}>
                  {exerciseTypeMeta(ex.type).label}
                </span>
              </div>
              {ex.description && <p className="text-xs text-neutral-500 mb-3">{ex.description}</p>}
              {ex.video_url && (
                <a
                  href={ex.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:text-accent-700 font-medium inline-block mb-3"
                >
                  ▶ Watch demo
                </a>
              )}
              <div className="flex gap-3 text-xs pt-2 border-t border-neutral-100">
                <button onClick={() => setEditing(ex)} className="text-neutral-500 hover:text-neutral-900 font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(ex.id)} className="text-danger/80 hover:text-danger font-medium">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
