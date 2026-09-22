import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { BAND_STYLES, bandFor } from '../../lib/readiness.js'
import { summarizeByPitchType, trendBySession, round1 } from '../../lib/commandMetrics.js'
import { programTypeMeta } from '../../lib/facilityConfig.js'
import CommandSessionList from '../../components/CommandSessionList.jsx'

function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// Each of these is its own category within the athlete's profile, matching
// how the data is actually captured (a daily check-in, a bullpen session,
// assigned programming) rather than one long scrolling page.
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'checkins', label: 'Check-Ins' },
  { key: 'command', label: 'Command Tracker' },
  { key: 'programs', label: 'Programs' },
]

function OverviewTab({ latestCheckin, band, styles, commandSummary, assignedPrograms, onGoTo }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card title="Latest readiness" action={<button onClick={() => onGoTo('checkins')} className="text-xs text-accent hover:text-accent-700 font-medium">Details →</button>}>
        {latestCheckin ? (
          <>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl font-bold">{latestCheckin.readiness_score}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles.bg} ${styles.text}`}>
                {band.label}
              </span>
            </div>
            <p className="text-xs text-neutral-400">as of {latestCheckin.date}</p>
          </>
        ) : (
          <p className="text-sm text-neutral-500">No check-ins yet.</p>
        )}
      </Card>

      <Card title="Command (all-time)" action={<button onClick={() => onGoTo('command')} className="text-xs text-accent hover:text-accent-700 font-medium">Details →</button>}>
        {commandSummary.overall.count ? (
          <>
            <p className="text-2xl font-bold">{round1(commandSummary.overall.avgMissIn)}"</p>
            <p className="text-xs text-neutral-400">avg miss across {commandSummary.overall.count} pitches</p>
          </>
        ) : (
          <p className="text-sm text-neutral-500">No pitches logged yet.</p>
        )}
      </Card>

      <Card title="Assigned programs" action={<button onClick={() => onGoTo('programs')} className="text-xs text-accent hover:text-accent-700 font-medium">Manage →</button>}>
        {assignedPrograms.length === 0 ? (
          <p className="text-sm text-neutral-500">No programs assigned.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {assignedPrograms.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${programTypeMeta(p.type).badgeClass}`}>
                  {programTypeMeta(p.type).label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function CheckinsTab({ checkins }) {
  const readinessTrend = useMemo(
    () => checkins.slice(-21).map((c) => ({ date: c.date.slice(5), score: c.readiness_score })),
    [checkins],
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Readiness — last 21 days">
        {readinessTrend.length < 2 ? (
          <p className="text-sm text-neutral-500">Not enough data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={readinessTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#0071e3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Recent check-ins">
        {checkins.length === 0 ? (
          <p className="text-sm text-neutral-500">None yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="pb-1">Date</th>
                <th className="pb-1">Score</th>
                <th className="pb-1">Weight</th>
                <th className="pb-1">Sleep</th>
                <th className="pb-1">Soreness</th>
                <th className="pb-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[...checkins].reverse().slice(0, 10).map((c) => (
                <tr key={c.id} className="border-t border-neutral-100">
                  <td className="py-1">{c.date}</td>
                  <td className="py-1">{c.readiness_score}</td>
                  <td className="py-1">{c.weight_lb ? `${round1(c.weight_lb)} lb` : '—'}</td>
                  <td className="py-1">{round1(c.sleep_hours)}h</td>
                  <td className="py-1">{c.soreness}/5</td>
                  <td className="py-1 text-neutral-500">{c.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function CommandTab({ athleteId, coachProfileId, pitches }) {
  const commandSummary = useMemo(() => summarizeByPitchType(pitches), [pitches])
  const commandTrend = useMemo(() => trendBySession(pitches), [pitches])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Miss distance by pitch type (all-time)">
          {commandSummary.byType.length === 0 ? (
            <p className="text-sm text-neutral-500">No pitches logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commandSummary.byType.map((t) => ({ ...t, avgMissIn: round1(t.avgMissIn) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="pitchType" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avgMissIn" fill="#0071e3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Velocity trend">
          {commandTrend.length === 0 ? (
            <p className="text-sm text-neutral-500">No sessions logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={commandTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="avgVelocity" stroke="#34c759" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-600 mb-2">Bullpen sessions</h3>
        <CommandSessionList
          athleteId={athleteId}
          loggedByProfileId={coachProfileId}
          basePath={`/coach/athletes/${athleteId}/sessions`}
        />
      </div>
    </div>
  )
}

function ProgramsTab({ athleteId, coachId, assignedPrograms, setAssignedPrograms }) {
  const [coachPrograms, setCoachPrograms] = useState([])
  const [assigning, setAssigning] = useState('')

  useEffect(() => {
    if (!coachId) return
    db.listProgramsForCoach(coachId).then(setCoachPrograms)
  }, [coachId])

  const unassignedPrograms = coachPrograms.filter((p) => !assignedPrograms.some((ap) => ap.id === p.id))

  async function handleAssign() {
    if (!assigning) return
    await db.assignProgram(assigning, athleteId)
    setAssignedPrograms(await db.listAssignedPrograms(athleteId))
    setAssigning('')
  }

  return (
    <Card title="Assigned programs">
      {assignedPrograms.length === 0 ? (
        <p className="text-sm text-neutral-500 mb-4">No programs assigned yet.</p>
      ) : (
        <ul className="text-sm space-y-2 mb-4">
          {assignedPrograms.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b border-neutral-50 pb-2">
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && <p className="text-xs text-neutral-400">{p.description}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${programTypeMeta(p.type).badgeClass}`}>
                {programTypeMeta(p.type).label}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <select
          value={assigning}
          onChange={(e) => setAssigning(e.target.value)}
          className="flex-1 border rounded-xl px-2 py-1.5 text-sm"
        >
          <option value="">Assign a program…</option>
          {unassignedPrograms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({programTypeMeta(p.type).label})
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={!assigning}
          className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-4 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Assign
        </button>
      </div>
      <Link to="/coach/programs" className="text-xs text-accent hover:text-accent-700 font-medium mt-4 inline-block">
        Build a new program →
      </Link>
    </Card>
  )
}

export default function AthleteDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [tab, setTab] = useState('overview')
  const [athlete, setAthlete] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pitches, setPitches] = useState([])
  const [assignedPrograms, setAssignedPrograms] = useState([])

  useEffect(() => {
    db.getProfileById(id).then(setAthlete)
    db.listCheckins(id).then(setCheckins)
    db.listCommandPitches(id).then(setPitches)
    db.listAssignedPrograms(id).then(setAssignedPrograms)
  }, [id])

  const latestCheckin = checkins[checkins.length - 1] ?? null
  const band = latestCheckin ? bandFor(latestCheckin.readiness_score) : null
  const styles = band ? BAND_STYLES[band.tone] : null
  const commandSummary = useMemo(() => summarizeByPitchType(pitches), [pitches])

  if (!athlete) return <p className="text-sm text-neutral-400">Loading…</p>

  return (
    <div>
      <Link to="/coach/roster" className="text-xs text-accent hover:text-accent-700 font-medium mb-2 inline-block">
        ← All athletes
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">{athlete.name}</h1>
      <p className="text-sm text-neutral-500 mb-5">{athlete.email}</p>

      <div className="flex gap-1 mb-5 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          latestCheckin={latestCheckin}
          band={band}
          styles={styles}
          commandSummary={commandSummary}
          assignedPrograms={assignedPrograms}
          onGoTo={setTab}
        />
      )}
      {tab === 'checkins' && <CheckinsTab checkins={checkins} />}
      {tab === 'command' && (
        <CommandTab athleteId={id} coachProfileId={profile?.id} pitches={pitches} />
      )}
      {tab === 'programs' && (
        <ProgramsTab
          athleteId={id}
          coachId={profile?.id}
          assignedPrograms={assignedPrograms}
          setAssignedPrograms={setAssignedPrograms}
        />
      )}
    </div>
  )
}
