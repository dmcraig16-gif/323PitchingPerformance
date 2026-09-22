import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { BAND_STYLES, bandFor } from '../../lib/readiness.js'
import { summarizeByPitchType, round1 } from '../../lib/commandMetrics.js'

const today = () => new Date().toISOString().slice(0, 10)

function RosterRow({ athlete }) {
  const [checkin, setCheckin] = useState(null)
  const [commandSummary, setCommandSummary] = useState(null)

  useEffect(() => {
    db.getCheckinForDate(athlete.id, today()).then(setCheckin)
    db.listCommandPitches(athlete.id).then((pitches) =>
      setCommandSummary(summarizeByPitchType(pitches.slice(-20))),
    )
  }, [athlete.id])

  const band = checkin ? bandFor(checkin.readiness_score) : null
  const styles = band ? BAND_STYLES[band.tone] : null

  return (
    <tr className="border-t border-neutral-100">
      <td className="py-3 pr-4">
        <Link to={`/coach/athletes/${athlete.id}`} className="font-medium text-neutral-900 hover:underline">
          {athlete.name}
        </Link>
        <p className="text-xs text-neutral-400">{athlete.email}</p>
      </td>
      <td className="py-3 pr-4">
        {checkin ? (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles.bg} ${styles.text}`}>
            {checkin.readiness_score} · {band.label}
          </span>
        ) : (
          <span className="text-xs text-neutral-400">No check-in today</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm">
        {commandSummary?.overall.count ? (
          <>
            {round1(commandSummary.overall.avgMissIn)}" avg miss
            <span className="text-neutral-400"> ({commandSummary.overall.count} pitches)</span>
          </>
        ) : (
          <span className="text-neutral-400">No pitches logged</span>
        )}
      </td>
      <td className="py-3">
        <Link
          to={`/coach/athletes/${athlete.id}`}
          className="text-xs text-accent hover:text-accent-700 font-medium"
        >
          View profile →
        </Link>
      </td>
    </tr>
  )
}

export default function Roster() {
  const { profile } = useAuth()
  const [athletes, setAthletes] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    db.listAthletesForCoach(profile.id).then(setAthletes)
  }, [profile?.id])

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-6">Athletes</h1>
      <div className="bg-white rounded-2xl shadow-card p-5">
        {athletes === null ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : athletes.length === 0 ? (
          <p className="text-sm text-neutral-500">No athletes assigned yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="pb-2">Athlete</th>
                <th className="pb-2">Today's readiness</th>
                <th className="pb-2">Command (last 20)</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <RosterRow key={a.id} athlete={a} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
