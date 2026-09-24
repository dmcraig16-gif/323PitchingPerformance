import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as db from '../lib/db.js'
import StrikeZoneTargetPicker from './StrikeZoneTargetPicker.jsx'
import MissDirectionSummary from './MissDirectionSummary.jsx'
import { summarizeByPitchType, round1, ZONE_LEVELS } from '../lib/commandMetrics.js'
import { PITCH_TYPES } from '../lib/facilityConfig.js'
import LoadingState from './LoadingState.jsx'

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}

// Pitch-by-pitch entry for one bullpen session, plus the live pitch list
// and pitch-type breakdown (avg miss distance / velocity) for that pen.
// Used both from the athlete's own Command Tracker and embedded in a
// coach's view of an athlete's profile (so a coach can chart live too).
export default function CommandSessionDetail({ sessionId, athleteId, basePath, backLabel }) {
  const [session, setSession] = useState(null)
  const [pitches, setPitches] = useState(null)
  const [athleteThrows, setAthleteThrows] = useState('R')
  const [pitchType, setPitchType] = useState(PITCH_TYPES[0])
  const [velocity, setVelocity] = useState('')
  const [zoneLevel, setZoneLevel] = useState(ZONE_LEVELS[0].value)
  const [intended, setIntended] = useState(null)
  const [actual, setActual] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.getCommandSession(sessionId).then(setSession)
    db.listPitchesForSession(sessionId).then(setPitches)
    db.getProfileById(athleteId).then((a) => setAthleteThrows(a?.throws ?? 'R'))
  }, [sessionId, athleteId])

  const phase = !intended ? 'intended' : !actual ? 'actual' : 'done'

  function handlePick(point) {
    if (phase === 'intended') setIntended(point)
    else if (phase === 'actual') setActual(point)
  }

  async function logPitch() {
    if (!intended || !actual) return
    setSaving(true)
    const missDistanceIn = Math.hypot(actual.x - intended.x, actual.y - intended.y) * 12
    const row = {
      session_id: sessionId,
      athlete_id: athleteId,
      session_date: session?.date ?? new Date().toISOString().slice(0, 10),
      pitch_type: pitchType,
      velocity: velocity ? Number(velocity) : null,
      intended_x: intended.x,
      intended_y: intended.y,
      actual_x: actual.x,
      actual_y: actual.y,
      miss_distance_in: missDistanceIn,
    }
    const saved = await db.insertCommandPitch(row)
    setPitches((prev) => [...(prev ?? []), saved])
    setIntended(null)
    setActual(null)
    setSaving(false)
  }

  const summary = useMemo(() => summarizeByPitchType(pitches ?? []), [pitches])
  const zone = ZONE_LEVELS.find((l) => l.value === zoneLevel).zone

  if (!session || pitches === null) return <LoadingState />

  return (
    <div>
      <Link to={basePath} className="text-xs text-accent hover:text-accent-700 font-medium mb-2 inline-block">
        ← {backLabel ?? 'All sessions'}
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">{session.label || 'Bullpen'}</h1>
      <p className="text-sm text-neutral-500 mb-6">{session.date}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card title="Log a pitch">
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Pitch type</label>
              <select
                value={pitchType}
                onChange={(e) => setPitchType(e.target.value)}
                className="w-full border rounded-xl px-2 py-1.5 text-sm"
              >
                {PITCH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Velo (mph)</label>
              <input
                type="number"
                step="0.1"
                value={velocity}
                onChange={(e) => setVelocity(e.target.value)}
                className="w-full border rounded-xl px-2 py-1.5 text-sm"
                placeholder="e.g. 91.4"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-3">
            {ZONE_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setZoneLevel(l.value)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                  zoneLevel === l.value
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {l.label} zone
              </button>
            ))}
          </div>

          <StrikeZoneTargetPicker
            intended={intended}
            actual={actual}
            phase={phase}
            onPick={handlePick}
            zone={zone}
          />

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setIntended(null)
                setActual(null)
              }}
              disabled={!intended}
              className="flex-1 border rounded-xl py-2 text-sm font-medium text-neutral-600 disabled:opacity-40"
            >
              Reset
            </button>
            <button
              onClick={logPitch}
              disabled={!intended || !actual || saving}
              className="flex-1 bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl py-2 text-sm font-medium disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Log pitch'}
            </button>
          </div>
        </Card>

        <Card title="Pitch type breakdown (this pen)">
          {summary.byType.length === 0 ? (
            <p className="text-sm text-neutral-500">No pitches logged yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={summary.byType.map((t) => ({ ...t, avgMissIn: round1(t.avgMissIn) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="pitchType" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avgMissIn" fill="#0071e3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-3">
                  <thead>
                    <tr className="text-left text-xs text-neutral-400">
                      <th className="pb-1">Pitch</th>
                      <th className="pb-1">Count</th>
                      <th className="pb-1">Avg miss</th>
                      <th className="pb-1">Avg velo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byType.map((t) => (
                      <tr key={t.pitchType} className="border-t border-neutral-100">
                        <td className="py-1">{t.pitchType}</td>
                        <td className="py-1">{t.count}</td>
                        <td className="py-1">{round1(t.avgMissIn)}"</td>
                        <td className="py-1">{t.avgVelocity ? `${round1(t.avgVelocity)} mph` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-400 mt-3">
                Pen avg: {round1(summary.overall.avgMissIn)}" across {summary.overall.count} pitches
              </p>
            </>
          )}
        </Card>

        <Card title="Pitch list — this pen">
          {pitches.length === 0 ? (
            <p className="text-sm text-neutral-500">Log the first pitch to start the list.</p>
          ) : (
            <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="pb-1">#</th>
                    <th className="pb-1">Pitch</th>
                    <th className="pb-1">Velo</th>
                    <th className="pb-1">Miss</th>
                  </tr>
                </thead>
                <tbody>
                  {pitches.map((p, i) => (
                    <tr key={p.id} className="border-t border-neutral-100">
                      <td className="py-1">{i + 1}</td>
                      <td className="py-1">{p.pitch_type}</td>
                      <td className="py-1">{p.velocity ? `${round1(p.velocity)}` : '—'}</td>
                      <td className="py-1">{round1(p.miss_distance_in)}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Miss direction (this pen)">
        <MissDirectionSummary pitches={pitches} throws={athleteThrows} avgMissIn={summary.overall.avgMissIn} />
      </Card>
    </div>
  )
}
