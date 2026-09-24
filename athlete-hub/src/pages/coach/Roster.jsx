import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { BAND_STYLES, bandFor } from '../../lib/readiness.js'
import { summarizeByPitchType, round1 } from '../../lib/commandMetrics.js'
import LoadingState from '../../components/LoadingState.jsx'

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

function UnassignedPanel({ coachId, onClaimed }) {
  const [unassigned, setUnassigned] = useState([])

  useEffect(() => {
    db.listUnassignedAthletes().then(setUnassigned)
  }, [])

  async function claim(athleteId) {
    await db.claimAthlete(athleteId, coachId)
    setUnassigned((prev) => prev.filter((a) => a.id !== athleteId))
    onClaimed()
  }

  if (unassigned.length === 0) return null

  return (
    <div className="bg-accent-50 border border-accent/20 rounded-2xl p-5 mb-5">
      <p className="text-sm font-semibold text-neutral-900 mb-3">
        New athletes waiting for a coach ({unassigned.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {unassigned.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-neutral-200 px-3 py-2 flex items-center gap-3">
            <div>
              <p className="text-sm font-medium">{a.name}</p>
              <p className="text-xs text-neutral-400">{a.email}</p>
            </div>
            <button
              onClick={() => claim(a.id)}
              className="text-xs bg-accent text-white hover:bg-accent-600 transition-colors rounded-full px-3 py-1.5 font-medium"
            >
              Add to roster
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Roster() {
  const { profile } = useAuth()
  const [athletes, setAthletes] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    db.listAthletesForCoach(profile.id).then(setAthletes)
  }, [profile?.id])

  function refresh() {
    if (profile?.id) db.listAthletesForCoach(profile.id).then(setAthletes)
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-6">Athletes</h1>
      {profile?.id && <UnassignedPanel coachId={profile.id} onClaimed={refresh} />}
      <div className="bg-white rounded-2xl shadow-card p-5">
        {athletes === null ? (
          <LoadingState />
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
