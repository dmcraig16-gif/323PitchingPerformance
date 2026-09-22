import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { BAND_STYLES, bandFor } from '../../lib/readiness.js'
import { summarizeByPitchType, round1 } from '../../lib/commandMetrics.js'

function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

export default function Dashboard() {
  const { profile } = useAuth()
  const [checkin, setCheckin] = useState(null)
  const [programs, setPrograms] = useState([])
  const [pitches, setPitches] = useState([])
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.getCheckinForDate(athleteId, today()).then(setCheckin)
    db.listAssignedPrograms(athleteId).then(setPrograms)
    db.listCommandPitches(athleteId).then(setPitches)
  }, [athleteId])

  const commandSummary = useMemo(() => summarizeByPitchType(pitches.slice(-20)), [pitches])
  const band = checkin ? bandFor(checkin.readiness_score) : null
  const styles = band ? BAND_STYLES[band.tone] : null

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Today</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card
          title="Readiness"
          action={
            <Link to="/check-in" className="text-xs text-blue-600 font-medium">
              {checkin ? 'Update' : 'Check in'}
            </Link>
          }
        >
          {checkin ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">{checkin.readiness_score}</span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${styles.bg} ${styles.text}`}
              >
                {band.label}
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500">You haven't checked in today yet.</p>
          )}
        </Card>

        <Card title="Assigned Programs" action={<Link to="/program" className="text-xs text-blue-600 font-medium">View all</Link>}>
          {programs.length === 0 ? (
            <p className="text-sm text-slate-500">No program assigned yet.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {programs.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-xs text-slate-400 capitalize">{p.type}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Command Training"
          action={
            <Link to="/command" className="text-xs text-blue-600 font-medium">
              Log pitches
            </Link>
          }
        >
          {commandSummary.overall.count === 0 ? (
            <p className="text-sm text-slate-500">No pitches logged yet.</p>
          ) : (
            <p className="text-sm text-slate-600">
              Last {commandSummary.overall.count} pitches: avg miss{' '}
              <span className="font-semibold">{round1(commandSummary.overall.avgMissIn)}"</span>
            </p>
          )}
        </Card>

        <Card title="Journal Prompt">
          <p className="text-sm text-slate-500">No prompt yet — check back after your coach sets one up.</p>
        </Card>
      </div>
    </div>
  )
}
