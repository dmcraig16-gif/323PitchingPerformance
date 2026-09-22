import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { computeReadiness, FACTOR_LABELS, bandFor } from '../../lib/readiness.js'
import { CHECKIN_SLIDERS, WHOOP_FIELDS, WHOOP_RECOVERY_WEIGHT } from '../../lib/facilityConfig.js'
import Slider from '../../components/Slider.jsx'
import ReadinessGauge from '../../components/ReadinessGauge.jsx'

const today = () => new Date().toISOString().slice(0, 10)

const TONE_HEX = { green: '#34c759', yellow: '#ff9f0a', red: '#ff3b30' }

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
  whoopRecovery: '',
  whoopStrain: '',
  whoopSleepPerformance: '',
  whoopHrv: '',
  whoopRestingHr: '',
}

// camelCase form key -> snake_case db column, for the WHOOP fields only
// (the sliders/notes/weight are mapped individually below since there are
// few enough to just write out).
function whoopColumn(key) {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase()
}

export default function CheckIn() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [history, setHistory] = useState([])
  const [saved, setSaved] = useState(false)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [showWhoop, setShowWhoop] = useState(false)
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.listCheckins(athleteId).then((rows) => {
      setHistory(rows)
      const todayRow = rows.find((r) => r.date === today())
      if (todayRow) {
        setAlreadyCheckedIn(true)
        const whoopValues = Object.fromEntries(
          WHOOP_FIELDS.map((f) => [f.key, todayRow[whoopColumn(f.key)] ?? '']),
        )
        const hasWhoop = WHOOP_FIELDS.some((f) => whoopValues[f.key] !== '')
        if (hasWhoop) setShowWhoop(true)
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
          ...whoopValues,
        })
      }
    })
  }, [athleteId])

  const readiness = useMemo(() => computeReadiness(form), [form])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const whoopRow = Object.fromEntries(
      WHOOP_FIELDS.map((f) => [whoopColumn(f.key), form[f.key] === '' ? null : Number(form[f.key])]),
    )
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
      ...whoopRow,
    }
    const result = await db.upsertCheckin(row)
    setHistory((prev) => {
      const withoutToday = prev.filter((r) => r.date !== today())
      return [...withoutToday, result].sort((a, b) => a.date.localeCompare(b.date))
    })
    setSaved(true)
    setAlreadyCheckedIn(true)
  }

  const trendData = useMemo(
    () =>
      history.slice(-14).map((r) => ({
        date: r.date.slice(5),
        score: r.readiness_score,
        tone: bandFor(r.readiness_score).tone,
      })),
    [history],
  )

  const sevenDayAvg = useMemo(() => {
    const last7 = history.slice(-7)
    if (last7.length === 0) return null
    return Math.round(last7.reduce((sum, r) => sum + r.readiness_score, 0) / last7.length)
  }, [history])

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Readiness</h1>
      <p className="text-sm text-neutral-500 mb-6">
        30 seconds, every morning. Strain, soreness, sleep, energy, nutrition, hydration — plus your
        WHOOP data if you've got it — calculate how ready you are for a high-intensity day.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl shadow-card p-6 order-2 lg:order-1">
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

          <div className="mb-6 border border-neutral-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowWhoop((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-neutral-50 hover:bg-neutral-100 transition-colors"
            >
              <span>WHOOP data <span className="text-neutral-400 font-normal">(optional)</span></span>
              <span className="text-neutral-400 text-xs">{showWhoop ? 'Hide −' : 'Add +'}</span>
            </button>
            {showWhoop && (
              <div className="p-4">
                <p className="text-xs text-neutral-500 mb-3">
                  Enter these from your WHOOP app. Recovery blends into your Sleep & Recovery factor
                  below ({Math.round(WHOOP_RECOVERY_WEIGHT * 100)}% weight, alongside sleep hours and
                  quality); the rest are tracked for trends only.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {WHOOP_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        {f.label} {f.unit && <span className="text-neutral-400">({f.unit})</span>}
                      </label>
                      <input
                        type="number"
                        step={f.step}
                        min={f.min}
                        max={f.max}
                        value={form[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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

        <div className="space-y-5 order-1 lg:order-2">
          <div className="bg-white rounded-2xl shadow-card p-6 flex flex-col items-center">
            <ReadinessGauge
              score={readiness.score}
              tone={readiness.band.tone}
              label={readiness.band.label}
              sublabel={sevenDayAvg != null ? `7-day avg ${sevenDayAvg}` : null}
            />
            {readiness.whoopBlended && (
              <p className="text-[11px] text-neutral-400 mt-3 text-center">
                WHOOP Recovery blended into Sleep & Recovery below ({Math.round(WHOOP_RECOVERY_WEIGHT * 100)}%)
              </p>
            )}
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

          {trendData.length > 1 && (
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="text-sm font-semibold mb-3">Last 14 days</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {trendData.map((d, i) => (
                      <Cell key={i} fill={TONE_HEX[d.tone]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
