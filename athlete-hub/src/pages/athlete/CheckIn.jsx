import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { computeReadiness, BAND_STYLES, FACTOR_LABELS } from '../../lib/readiness.js'
import { CHECKIN_SLIDERS } from '../../lib/facilityConfig.js'
import Slider from '../../components/Slider.jsx'

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_FORM = {
  weight: '',
  sleepHours: 8,
  sleepQuality: 3,
  strain: 3,
  armSoreness: 3,
  lowerSoreness: 3,
  energy: 3,
  mood: 3,
  nutrition: 3,
  hydration: 3,
  notes: '',
}

export default function CheckIn() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [history, setHistory] = useState([])
  const [saved, setSaved] = useState(false)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.listCheckins(athleteId).then((rows) => {
      setHistory(rows)
      const todayRow = rows.find((r) => r.date === today())
      if (todayRow) {
        setAlreadyCheckedIn(true)
        setForm({
          weight: todayRow.weight_lb ?? '',
          sleepHours: todayRow.sleep_hours,
          sleepQuality: todayRow.sleep_quality,
          strain: todayRow.strain,
          armSoreness: todayRow.arm_soreness,
          lowerSoreness: todayRow.lower_soreness,
          energy: todayRow.energy,
          mood: todayRow.mood,
          nutrition: todayRow.nutrition,
          hydration: todayRow.hydration,
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
      weight_lb: form.weight === '' ? null : Number(form.weight),
      sleep_hours: Number(form.sleepHours),
      sleep_quality: form.sleepQuality,
      strain: form.strain,
      arm_soreness: form.armSoreness,
      lower_soreness: form.lowerSoreness,
      energy: form.energy,
      mood: form.mood,
      nutrition: form.nutrition,
      hydration: form.hydration,
      notes: form.notes,
      readiness_score: readiness.score,
    }
    const result = await db.upsertCheckin(row)
    setHistory((prev) => {
      const withoutToday = prev.filter((r) => r.date !== today())
      return [...withoutToday, result].sort((a, b) => a.date.localeCompare(b.date))
    })
    setSaved(true)
    setAlreadyCheckedIn(true)
  }

  const chartData = history.slice(-14).map((r) => ({ date: r.date.slice(5), score: r.readiness_score }))

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Daily Check-In</h1>
      <p className="text-sm text-neutral-500 mb-6">
        30 seconds, every morning. These sliders — strain, soreness, sleep, energy, nutrition,
        hydration — calculate how ready you are to handle a high-intensity day.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl shadow-card p-6">
          <div className="flex gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Hours of sleep</label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="14"
                value={form.sleepHours}
                onChange={(e) => setField('sleepHours', e.target.value)}
                className="w-28 border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Body weight (lb)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.weight}
                onChange={(e) => setField('weight', e.target.value)}
                placeholder="optional"
                className="w-28 border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          {CHECKIN_SLIDERS.map((f) => (
            <Slider
              key={f.key}
              label={f.label}
              low={f.low}
              high={f.high}
              value={form[f.key]}
              onChange={(v) => setField(f.key, v)}
            />
          ))}

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={2}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm"
              placeholder="Anything your coach should know today?"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl py-2.5 text-sm font-medium"
          >
            {alreadyCheckedIn ? 'Update check-in' : 'Save check-in'}
          </button>
          {saved && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-emerald-600">Saved for today.</p>
              <button
                type="button"
                onClick={() => navigate('/program')}
                className="text-xs text-accent hover:text-accent-700 font-medium"
              >
                View today's programming →
              </button>
            </div>
          )}
        </form>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-card p-5 text-center">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
              Readiness score
            </p>
            <p className="text-5xl font-bold mb-2">{readiness.score}</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles.bg} ${styles.text}`}
            >
              {readiness.band.label}
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-sm font-semibold mb-3">Breakdown</p>
            {Object.entries(readiness.factors).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500">{FACTOR_LABELS[key]}</span>
                <div className="flex items-center gap-2 w-28">
                  <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
                    <div
                      className="bg-accent h-1.5 rounded-full"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-neutral-500 w-6 text-right">{value.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>

          {chartData.length > 1 && (
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="text-sm font-semibold mb-3">Last 14 days</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#0071e3" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
