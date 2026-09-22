import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { BAND_STYLES, bandFor } from '../../lib/readiness.js'
import { summarizeByPitchType, trendBySession, round1 } from '../../lib/commandMetrics.js'

function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function AthleteDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [athlete, setAthlete] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pitches, setPitches] = useState([])
  const [assignedPrograms, setAssignedPrograms] = useState([])
  const [coachPrograms, setCoachPrograms] = useState([])
  const [assigning, setAssigning] = useState('')

  useEffect(() => {
    db.getProfileById(id).then(setAthlete)
    db.listCheckins(id).then(setCheckins)
    db.listCommandPitches(id).then(setPitches)
    db.listAssignedPrograms(id).then(setAssignedPrograms)
  }, [id])

  useEffect(() => {
    if (!profile?.id) return
    db.listProgramsForCoach(profile.id).then(setCoachPrograms)
  }, [profile?.id])

  const readinessTrend = useMemo(
    () => checkins.slice(-21).map((c) => ({ date: c.date.slice(5), score: c.readiness_score })),
    [checkins],
  )
  const latestCheckin = checkins[checkins.length - 1] ?? null
  const band = latestCheckin ? bandFor(latestCheckin.readiness_score) : null
  const styles = band ? BAND_STYLES[band.tone] : null

  const commandSummary = useMemo(() => summarizeByPitchType(pitches), [pitches])
  const commandTrend = useMemo(() => trendBySession(pitches), [pitches])

  const unassignedPrograms = coachPrograms.filter(
    (p) => !assignedPrograms.some((ap) => ap.id === p.id),
  )

  async function handleAssign() {
    if (!assigning) return
    await db.assignProgram(assigning, id)
    const updated = await db.listAssignedPrograms(id)
    setAssignedPrograms(updated)
    setAssigning('')
  }

  if (!athlete) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div>
      <Link to="/coach/roster" className="text-xs text-blue-600 font-medium mb-2 inline-block">
        ← All athletes
      </Link>
      <h1 className="text-2xl font-semibold mb-1">{athlete.name}</h1>
      <p className="text-sm text-slate-500 mb-6">{athlete.email}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card title="Latest readiness">
          {latestCheckin ? (
            <>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl font-bold">{latestCheckin.readiness_score}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles.bg} ${styles.text}`}>
                  {band.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">as of {latestCheckin.date}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No check-ins yet.</p>
          )}
        </Card>

        <Card title="Command (all-time)">
          {commandSummary.overall.count ? (
            <>
              <p className="text-2xl font-bold">{round1(commandSummary.overall.avgMissIn)}"</p>
              <p className="text-xs text-slate-400">avg miss across {commandSummary.overall.count} pitches</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No pitches logged yet.</p>
          )}
        </Card>

        <Card title="Assigned programs" action={null}>
          {assignedPrograms.length === 0 ? (
            <p className="text-sm text-slate-500 mb-3">No programs assigned.</p>
          ) : (
            <ul className="text-sm space-y-1 mb-3">
              {assignedPrograms.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-xs text-slate-400 capitalize">{p.type}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <select
              value={assigning}
              onChange={(e) => setAssigning(e.target.value)}
              className="flex-1 border rounded-md px-2 py-1.5 text-xs"
            >
              <option value="">Assign a program…</option>
              {unassignedPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!assigning}
              className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              Assign
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Readiness — last 21 days">
          {readinessTrend.length < 2 ? (
            <p className="text-sm text-slate-500">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={readinessTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Miss distance by pitch type">
          {commandSummary.byType.length === 0 ? (
            <p className="text-sm text-slate-500">No pitches logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commandSummary.byType.map((t) => ({ ...t, avgMissIn: round1(t.avgMissIn) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="pitchType" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avgMissIn" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Velocity trend">
          {commandTrend.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={commandTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="avgVelocity" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Recent check-ins">
          {checkins.length === 0 ? (
            <p className="text-sm text-slate-500">None yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="pb-1">Date</th>
                  <th className="pb-1">Score</th>
                  <th className="pb-1">Sleep</th>
                  <th className="pb-1">Soreness</th>
                  <th className="pb-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...checkins].reverse().slice(0, 7).map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="py-1">{c.date}</td>
                    <td className="py-1">{c.readiness_score}</td>
                    <td className="py-1">{round1(c.sleep_hours)}h</td>
                    <td className="py-1">{c.soreness}/5</td>
                    <td className="py-1 text-slate-500">{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
