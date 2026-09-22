import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { computeReadiness, BAND_STYLES, FACTOR_LABELS } from '../../lib/readiness.js'
import { CHECKIN_INPUT_FIELDS } from '../../lib/facilityConfig.js'

const today = () => new Date().toISOString().slice(0, 10)

function ScaleInput({ label, hint, value, onChange }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-slate-400">{hint}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 rounded-md py-2 text-sm font-medium border ${
              value === n
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CheckIn() {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    sleepHours: 8,
    sleepQuality: 3,
    soreness: 3,
    mood: 3,
    energy: 3,
    nutrition: 3,
    prevDayWorkload: 3,
    notes: '',
  })
  const [history, setHistory] = useState([])
  const [saved, setSaved] = useState(false)
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.listCheckins(athleteId).then((rows) => {
      setHistory(rows)
      const todayRow = rows.find((r) => r.date === today())
      if (todayRow) {
        setForm({
          sleepHours: todayRow.sleep_hours,
          sleepQuality: todayRow.sleep_quality,
          soreness: todayRow.soreness,
          mood: todayRow.mood,
          energy: todayRow.energy,
          nutrition: todayRow.nutrition,
          prevDayWorkload: todayRow.prev_day_workload,
          notes: todayRow.notes ?? '',
        })
      }
    })
  }, [athleteId])

  const readiness = useMemo(() => computeReadiness(form), [form])
  const styles = BAND_STYLES[readiness.band.tone]

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const row = {
      athlete_id: athleteId,
      date: today(),
      sleep_hours: Number(form.sleepHours),
      sleep_quality: form.sleepQuality,
      soreness: form.soreness,
      mood: form.mood,
      energy: form.energy,
      nutrition: form.nutrition,
      prev_day_workload: form.prevDayWorkload,
      notes: form.notes,
      readiness_score: readiness.score,
    }
    const result = await db.upsertCheckin(row)
    setHistory((prev) => {
      const withoutToday = prev.filter((r) => r.date !== today())
      return [...withoutToday, result].sort((a, b) => a.date.localeCompare(b.date))
    })
    setSaved(true)
  }

  const chartData = history.slice(-14).map((r) => ({ date: r.date.slice(5), score: r.readiness_score }))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Daily Check-In</h1>
      <p className="text-sm text-slate-500 mb-6">
        Takes 30 seconds. Your readiness score factors in sleep, soreness, mood, energy, nutrition,
        and yesterday's training load.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-lg shadow-sm p-5">
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">Hours of sleep</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="14"
              value={form.sleepHours}
              onChange={(e) => setField('sleepHours', e.target.value)}
              className="w-32 border rounded-md px-3 py-2 text-sm"
            />
          </div>

          {CHECKIN_INPUT_FIELDS.map((f) => (
            <ScaleInput
              key={f.key}
              label={f.label}
              hint={f.hint}
              value={form[f.key]}
              onChange={(v) => setField(f.key, v)}
            />
          ))}

          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Anything your coach should know today?"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded-md py-2.5 text-sm font-medium"
          >
            Save check-in
          </button>
          {saved && <p className="text-xs text-emerald-600 mt-2 text-center">Saved for today.</p>}
        </form>

        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow-sm p-5 text-center">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Readiness score
            </p>
            <p className="text-5xl font-bold mb-2">{readiness.score}</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles.bg} ${styles.text}`}
            >
              {readiness.band.label}
            </span>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm font-semibold mb-3">Breakdown</p>
            {Object.entries(readiness.factors).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{FACTOR_LABELS[key]}</span>
                <div className="flex items-center gap-2 w-28">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-slate-900 h-1.5 rounded-full"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-6 text-right">{value.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>

          {chartData.length > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-5">
              <p className="text-sm font-semibold mb-3">Last 14 days</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
