import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as db from '../lib/db.js'
import { summarizeByPitchType, round1 } from '../lib/commandMetrics.js'
import LoadingState from './LoadingState.jsx'

const today = () => new Date().toISOString().slice(0, 10)

function SessionRow({ session, basePath }) {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    db.listPitchesForSession(session.id).then((pitches) => setSummary(summarizeByPitchType(pitches)))
  }, [session.id])

  return (
    <tr className="border-t border-neutral-100">
      <td className="py-2 pr-4">{session.date}</td>
      <td className="py-2 pr-4">
        <Link to={`${basePath}/${session.id}`} className="font-medium text-neutral-900 hover:underline">
          {session.label || 'Bullpen'}
        </Link>
      </td>
      <td className="py-2 pr-4 text-sm text-neutral-500">{summary ? summary.overall.count : '…'}</td>
      <td className="py-2 pr-4 text-sm text-neutral-500">
        {summary?.overall.count ? `${round1(summary.overall.avgMissIn)}"` : '—'}
      </td>
      <td className="py-2">
        <Link to={`${basePath}/${session.id}`} className="text-xs text-accent hover:text-accent-700 font-medium">
          Open →
        </Link>
      </td>
    </tr>
  )
}

// Lists an athlete's bullpen sessions and lets a coach or the athlete
// start a new one. `basePath` is where session detail links point (e.g.
// `/command` for the athlete's own view, `/coach/athletes/:id/sessions`
// when embedded in a coach's view of an athlete's profile).
export default function CommandSessionList({ athleteId, loggedByProfileId, basePath, allowCreate = true }) {
  const [sessions, setSessions] = useState(null)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!athleteId) return
    db.listCommandSessions(athleteId).then(setSessions)
  }, [athleteId])

  async function startSession(e) {
    e.preventDefault()
    const session = await db.createCommandSession({
      athlete_id: athleteId,
      logged_by: loggedByProfileId,
      date: today(),
      label: label || null,
    })
    navigate(`${basePath}/${session.id}`)
  }

  return (
    <div>
      {allowCreate && (
        <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
          {creating ? (
            <form onSubmit={startSession} className="flex gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Session label (e.g. Fastball Command)"
                className="flex-1 border rounded-xl px-3 py-2 text-sm"
                autoFocus
              />
              <button type="submit" className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-4 py-2 text-sm font-medium">
                Start
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="border rounded-xl px-4 py-2 text-sm font-medium text-neutral-600"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-4 py-2 text-sm font-medium"
            >
              + Start new bullpen session
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card p-5">
        {sessions === null ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No bullpen sessions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-400">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Session</th>
                  <th className="pb-2">Pitches</th>
                  <th className="pb-2">Avg miss</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <SessionRow key={s.id} session={s} basePath={basePath} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
