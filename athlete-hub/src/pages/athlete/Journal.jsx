import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'

export default function Journal() {
  const { profile } = useAuth()
  const [entry, setEntry] = useState('')
  const [entries, setEntries] = useState(null)
  const [saving, setSaving] = useState(false)
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.listJournalEntries(athleteId).then(setEntries)
  }, [athleteId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!entry.trim()) return
    setSaving(true)
    const saved = await db.createJournalEntry({ athlete_id: athleteId, content: entry.trim() })
    setEntries((prev) => [saved, ...(prev ?? [])])
    setEntry('')
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Journal</h1>
      <p className="text-sm text-neutral-500 mb-6">
        A space to reflect — what made today feel good, what didn't, what you're learning about
        what gets you ready to perform.
      </p>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 mb-6">
          <textarea
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
            rows={5}
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="What's on your mind? What helped you feel ready today — or got in the way?"
          />
          <button
            type="submit"
            disabled={saving || !entry.trim()}
            className="mt-3 bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </form>

        {entries === null ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-neutral-400">No entries yet — your first one will show up here.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl shadow-card p-5">
                <p className="text-xs text-neutral-400 mb-1.5">{e.date}</p>
                <p className="text-sm text-neutral-800 whitespace-pre-wrap">{e.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
