import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import StrikeZoneTargetPicker from '../../components/StrikeZoneTargetPicker.jsx'
import { summarizeByPitchType, trendBySession, round1 } from '../../lib/commandMetrics.js'

const PITCH_TYPES = ['Fastball', 'Sinker', 'Cutter', 'Slider', 'Curveball', 'Changeup', 'Splitter']

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function CommandTraining() {
  const { profile } = useAuth()
  const [pitches, setPitches] = useState([])
  const [pitchType, setPitchType] = useState('Fastball')
  const [velocity, setVelocity] = useState('')
  const [intended, setIntended] = useState(null)
  const [actual, setActual] = useState(null)
  const [saving, setSaving] = useState(false)

  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.listCommandPitches(athleteId).then(setPitches)
  }, [athleteId])

  const phase = !intended ? 'intended' : !actual ? 'actual' : 'done'

  function handlePick(point) {
    if (phase === 'intended') setIntended(point)
    else if (phase === 'actual') setActual(point)
  }

  async function logPitch() {
    if (!athleteId || !intended || !actual) return
    setSaving(true)
    const missDistanceIn = Math.hypot(actual.x - intended.x, actual.y - intended.y) * 12
    const row = {
      athlete_id: athleteId,
      session_date: new Date().toISOString().slice(0, 10),
      pitch_type: pitchType,
      velocity: velocity ? Number(velocity) : null,
      intended_x: intended.x,
      intended_y: intended.y,
      actual_x: actual.x,
      actual_y: actual.y,
      miss_distance_in: missDistanceIn,
    }
    const saved = await db.insertCommandPitch(row)
    setPitches((prev) => [...prev, saved])
    setIntended(null)
    setActual(null)
    setSaving(false)
  }

  function resetPitch() {
    setIntended(null)
    setActual(null)
  }

  const summary = useMemo(() => summarizeByPitchType(pitches), [pitches])
  const trend = useMemo(() => trendBySession(pitches), [pitches])
  const recent = useMemo(() => [...pitches].reverse().slice(0, 10), [pitches])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Command Training</h1>
      <p className="text-sm text-slate-500 mb-6">
        Set an intended target, log where the pitch actually crossed the plate, and track your
        average miss distance and velocity by pitch type.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card title="Log a pitch">
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Pitch type</label>
              <select
                value={pitchType}
                onChange={(e) => setPitchType(e.target.value)}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              >
                {PITCH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-slate-500 mb-1">Velo (mph)</label>
              <input
                type="number"
                step="0.1"
                value={velocity}
                onChange={(e) => setVelocity(e.target.value)}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
                placeholder="e.g. 91.4"
              />
            </div>
          </div>

          <StrikeZoneTargetPicker
            intended={intended}
            actual={actual}
            phase={phase}
            onPick={handlePick}
          />

          <div className="flex gap-2 mt-4">
            <button
              onClick={resetPitch}
              disabled={!intended}
              className="flex-1 border rounded-md py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
            >
              Reset
            </button>
            <button
              onClick={logPitch}
              disabled={!intended || !actual || saving}
              className="flex-1 bg-slate-900 text-white rounded-md py-2 text-sm font-medium disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Log pitch'}
            </button>
          </div>
        </Card>

        <Card title="Average miss distance by pitch">
          {summary.byType.length === 0 ? (
            <p className="text-sm text-slate-500">No pitches logged yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.byType.map((t) => ({ ...t, avgMissIn: round1(t.avgMissIn) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="pitchType" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: 'inches', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="avgMissIn" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-sm mt-3">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="pb-1">Pitch</th>
                    <th className="pb-1">Count</th>
                    <th className="pb-1">Avg miss</th>
                    <th className="pb-1">Avg velo</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byType.map((t) => (
                    <tr key={t.pitchType} className="border-t border-slate-100">
                      <td className="py-1">{t.pitchType}</td>
                      <td className="py-1">{t.count}</td>
                      <td className="py-1">{round1(t.avgMissIn)}"</td>
                      <td className="py-1">{t.avgVelocity ? `${round1(t.avgVelocity)} mph` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-3">
                Overall avg miss: {round1(summary.overall.avgMissIn)}" across {summary.overall.count}{' '}
                pitches
              </p>
            </>
          )}
        </Card>

        <Card title="Trend by session">
          {trend.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend.map((t) => ({ ...t, avgMissIn: round1(t.avgMissIn) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="miss" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="velo" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  yAxisId="miss"
                  type="monotone"
                  dataKey="avgMissIn"
                  name="Avg miss (in)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="velo"
                  type="monotone"
                  dataKey="avgVelocity"
                  name="Avg velo (mph)"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Recent pitches">
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing logged yet — throw a bullpen and log it above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-1">Date</th>
                <th className="pb-1">Pitch</th>
                <th className="pb-1">Velo</th>
                <th className="pb-1">Miss distance</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-1">{p.session_date}</td>
                  <td className="py-1">{p.pitch_type}</td>
                  <td className="py-1">{p.velocity ? `${round1(p.velocity)} mph` : '—'}</td>
                  <td className="py-1">{round1(p.miss_distance_in)}"</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
