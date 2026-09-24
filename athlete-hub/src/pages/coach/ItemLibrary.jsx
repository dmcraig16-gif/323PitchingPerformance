import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { WORKOUT_TYPES, workoutTypeMeta } from '../../lib/facilityConfig.js'
import { parseYoutubeUrl } from '../../lib/youtube.js'
import YouTubeEmbed from '../../components/YouTubeEmbed.jsx'

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

const EMPTY_FORM = {
  name: '',
  type: WORKOUT_TYPES[0].value,
  cues: '',
  youtube_url: '',
  ball_weight_oz: '',
  num_throws: '',
  intent_pct: '',
  distance_target: '',
  target_sets: [{ reps: '', load: '' }],
  rest_seconds: '',
  tempo: '',
  sets: '',
  repMode: 'reps',
  reps: '',
  duration_seconds: '',
  side: 'both',
}

// Builds the row db.js expects — only the columns that matter for the
// selected type are populated, everything else nulled out, so a library
// item never carries stale prescription data from a type it used to be.
function buildItemRow(form) {
  const base = { name: form.name, type: form.type, cues: form.cues || null, youtube_url: form.youtube_url || null }
  const blank = {
    ball_weight_oz: null, num_throws: null, intent_pct: null, distance_target: null,
    target_sets: null, rest_seconds: null, tempo: null,
    sets: null, reps: null, duration_seconds: null, side: null,
  }
  if (form.type === 'throwing') {
    return {
      ...base, ...blank,
      ball_weight_oz: numOrNull(form.ball_weight_oz),
      num_throws: numOrNull(form.num_throws),
      intent_pct: numOrNull(form.intent_pct),
      distance_target: numOrNull(form.distance_target),
    }
  }
  if (form.type === 'lifting') {
    const sets = form.target_sets
      .filter((s) => s.reps !== '')
      .map((s) => ({ reps: Number(s.reps), load: s.load === '' ? null : Number(s.load) }))
    return {
      ...base, ...blank,
      target_sets: sets.length ? sets : null,
      rest_seconds: numOrNull(form.rest_seconds),
      tempo: form.tempo || null,
    }
  }
  // mobility / movement_prep
  return {
    ...base, ...blank,
    sets: numOrNull(form.sets),
    reps: form.repMode === 'reps' ? numOrNull(form.reps) : null,
    duration_seconds: form.repMode === 'duration' ? numOrNull(form.duration_seconds) : null,
    side: form.side,
  }
}

function formFromItem(item) {
  return {
    ...EMPTY_FORM,
    name: item.name,
    type: item.type,
    cues: item.cues ?? '',
    youtube_url: item.youtube_url ?? '',
    ball_weight_oz: item.ball_weight_oz ?? '',
    num_throws: item.num_throws ?? '',
    intent_pct: item.intent_pct ?? '',
    distance_target: item.distance_target ?? '',
    target_sets: item.target_sets?.length
      ? item.target_sets.map((s) => ({ reps: s.reps ?? '', load: s.load ?? '' }))
      : [{ reps: '', load: '' }],
    rest_seconds: item.rest_seconds ?? '',
    tempo: item.tempo ?? '',
    sets: item.sets ?? '',
    repMode: item.duration_seconds != null ? 'duration' : 'reps',
    reps: item.reps ?? '',
    duration_seconds: item.duration_seconds ?? '',
    side: item.side ?? 'both',
  }
}

// Repeatable reps/load rows for a lifting item's per-set targets — the
// one place a prescription varies set to set (a pyramid, a wave-loaded
// scheme), so it's edited as a small list rather than one pair of fields.
function TargetSetsEditor({ sets, onChange }) {
  function updateSet(i, field, value) {
    onChange(sets.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }
  function addSet() {
    onChange([...sets, { reps: '', load: '' }])
  }
  function removeSet(i) {
    onChange(sets.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 mb-1">Target sets (reps @ load)</label>
      <div className="space-y-2">
        {sets.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 w-10 shrink-0">Set {i + 1}</span>
            <input
              value={s.reps}
              onChange={(e) => updateSet(i, 'reps', e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="Reps"
              className="w-20 border border-neutral-200 rounded-lg px-2 py-1.5 text-sm text-center"
            />
            <span className="text-neutral-300 text-xs">@</span>
            <input
              value={s.load}
              onChange={(e) => updateSet(i, 'load', e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="Load (lb, optional)"
              className="flex-1 border border-neutral-200 rounded-lg px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => removeSet(i)}
              disabled={sets.length === 1}
              className="text-neutral-300 hover:text-danger transition-colors text-sm px-1 disabled:opacity-20"
              aria-label="Remove set"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addSet}
        className="mt-2 text-xs text-accent hover:text-accent-700 font-medium"
      >
        + Add set
      </button>
    </div>
  )
}

// Keyed by editing?.id in the parent, so switching between "new" and
// "edit an existing item" remounts this form with fresh initial state
// instead of syncing props into state via an effect.
function ItemForm({ coachId, editing, onSaved, onCancel }) {
  const [form, setForm] = useState(editing ? formFromItem(editing) : EMPTY_FORM)
  const [urlError, setUrlError] = useState(false)

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const parsedVideo = form.youtube_url ? parseYoutubeUrl(form.youtube_url) : null

  function handleUrlBlur() {
    setUrlError(Boolean(form.youtube_url) && !parsedVideo)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) return
    if (form.youtube_url && !parsedVideo) {
      setUrlError(true)
      return
    }
    const row = buildItemRow(form)
    const saved = editing
      ? await db.updateLibraryItem(editing.id, row)
      : await db.createLibraryItem({ ...row, coach_id: coachId })
    if (!editing) setForm(EMPTY_FORM)
    onSaved(saved)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 mb-6">
      <h2 className="font-semibold mb-4">{editing ? 'Edit item' : 'New item'}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Trap Bar Deadlift"
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setField('type', e.target.value)}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
          >
            {WORKOUT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.type === 'throwing' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Ball weight (oz)</label>
            <input
              value={form.ball_weight_oz}
              onChange={(e) => setField('ball_weight_oz', e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="5"
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1"># Throws</label>
            <input
              value={form.num_throws}
              onChange={(e) => setField('num_throws', e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="15"
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Intent %</label>
            <input
              value={form.intent_pct}
              onChange={(e) => setField('intent_pct', e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="90"
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Distance (ft, optional)</label>
            <input
              value={form.distance_target}
              onChange={(e) => setField('distance_target', e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="180"
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {form.type === 'lifting' && (
        <div className="mb-4 space-y-3">
          <TargetSetsEditor sets={form.target_sets} onChange={(sets) => setField('target_sets', sets)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Rest (seconds)</label>
              <input
                value={form.rest_seconds}
                onChange={(e) => setField('rest_seconds', e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="120"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Tempo (optional)</label>
              <input
                value={form.tempo}
                onChange={(e) => setField('tempo', e.target.value)}
                placeholder="2-1-1"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {(form.type === 'mobility' || form.type === 'movement_prep') && (
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Sets</label>
              <input
                value={form.sets}
                onChange={(e) => setField('sets', e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="2"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Side</label>
              <select
                value={form.side}
                onChange={(e) => setField('side', e.target.value)}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              >
                <option value="both">Both</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs">
              {['reps', 'duration'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setField('repMode', mode)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    form.repMode === mode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {mode === 'reps' ? 'Reps' : 'Duration'}
                </button>
              ))}
            </div>
          </div>
          {form.repMode === 'reps' ? (
            <div className="max-w-[10rem]">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Reps per set</label>
              <input
                value={form.reps}
                onChange={(e) => setField('reps', e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="10"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <div className="max-w-[10rem]">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Duration per set (sec)</label>
              <input
                value={form.duration_seconds}
                onChange={(e) => setField('duration_seconds', e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="30"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Coaching cue / description</label>
        <textarea
          value={form.cues}
          onChange={(e) => setField('cues', e.target.value)}
          rows={2}
          placeholder="What should the athlete focus on?"
          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Demo video URL</label>
        <input
          value={form.youtube_url}
          onChange={(e) => {
            setField('youtube_url', e.target.value)
            setUrlError(false)
          }}
          onBlur={handleUrlBlur}
          placeholder="https://youtube.com/watch?v=… or youtu.be/…"
          className={`w-full border rounded-xl px-3 py-2 text-sm ${urlError ? 'border-danger' : 'border-neutral-200'}`}
        />
        {urlError && (
          <p className="text-xs text-danger mt-1">That doesn't look like a YouTube link — check it and try again.</p>
        )}
        {parsedVideo && (
          <div className="mt-3 max-w-sm">
            <YouTubeEmbed videoId={parsedVideo.videoId} startSeconds={parsedVideo.startSeconds} title="Demo preview" />
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

// Compact, type-aware summary line for a library card — "3 sets @ 275/295/315",
// "15 throws @ 90% intent", "2x10, both sides", etc.
function itemSummary(item) {
  if (item.type === 'throwing') {
    const parts = []
    if (item.num_throws) parts.push(`${item.num_throws} throws`)
    if (item.ball_weight_oz) parts.push(`${item.ball_weight_oz}oz ball`)
    if (item.intent_pct) parts.push(`${item.intent_pct}% intent`)
    if (item.distance_target) parts.push(`${item.distance_target}ft target`)
    return parts.join(' · ') || null
  }
  if (item.type === 'lifting') {
    if (!item.target_sets?.length) return null
    const loads = item.target_sets.map((s) => (s.load != null ? `${s.reps}@${s.load}` : `${s.reps}`))
    return `${item.target_sets.length} sets: ${loads.join(', ')}`
  }
  // mobility / movement_prep
  const unit = item.duration_seconds != null ? `${item.duration_seconds}s` : `${item.reps ?? '—'} reps`
  const sideLabel = item.side && item.side !== 'both' ? `, ${item.side}` : ''
  return `${item.sets ?? '—'} sets × ${unit}${sideLabel}`
}

export default function ItemLibrary() {
  const { profile } = useAuth()
  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(null)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (!profile?.id) return
    db.listItemLibrary(profile.id).then(setItems)
  }, [profile?.id])

  function handleSaved(saved) {
    setItems((prev) => {
      const rest = (prev ?? []).filter((it) => it.id !== saved.id)
      return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name))
    })
    setEditing(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this item from your library? Workouts that already use it keep their own copy.')) return
    await db.deleteLibraryItem(id)
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const visible = (items ?? []).filter((it) => filterType === 'all' || it.type === filterType)

  if (!profile) return null

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Item Library</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Build a reusable library of throwing drills, lifting exercises, mobility, and movement-prep
        items — each with its own prescription defaults and video — then pull from it while building
        programs.
      </p>

      <ItemForm
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
        {WORKOUT_TYPES.map((t) => (
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

      {items === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-6">
          <p className="text-sm text-neutral-500">No items here yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm">{item.name}</h3>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${workoutTypeMeta(item.type).badgeClass}`}>
                  {workoutTypeMeta(item.type).label}
                </span>
              </div>
              {itemSummary(item) && <p className="text-xs text-neutral-500 mb-2">{itemSummary(item)}</p>}
              {item.cues && <p className="text-xs text-neutral-500 mb-3">{item.cues}</p>}
              {item.youtube_url && (
                <a
                  href={item.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:text-accent-700 font-medium inline-block mb-3"
                >
                  ▶ Watch demo
                </a>
              )}
              <div className="flex gap-3 text-xs pt-2 border-t border-neutral-100">
                <button onClick={() => setEditing(item)} className="text-neutral-500 hover:text-neutral-900 font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-danger/80 hover:text-danger font-medium">
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
