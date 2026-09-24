import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { round1 } from '../../lib/commandMetrics.js'

function Card({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {subtitle && <p className="text-xs text-neutral-400 mb-3">{subtitle}</p>}
      {children}
    </div>
  )
}

function EmptyState({ label }) {
  return <p className="text-sm text-neutral-500 py-8 text-center">{label}</p>
}

function tickDate(d) {
  return d.slice(5)
}

function SingleLineChart({ data, dataKey, unit, color = '#0071e3' }) {
  if (data.length < 2) return <EmptyState label="Not enough data yet." />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={tickDate} />
        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} width={36} />
        <Tooltip formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, undefined]} labelFormatter={(d) => d} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Groups repeated instances of the same library item (assigned into a
// program week after week) into one continuous trend key — same pattern
// the old drill logger used (library_exercise_id ?? id), so progress
// spans every time an exercise was ever assigned, not just its most
// recent appearance.
function exerciseKey(item) {
  return item.library_item_id ?? item.id
}

// A mobility/movement-prep item is configured as either timed or
// rep-based, never both, so whichever field its logs actually carry
// tells us which metric to trend.
function mobilityMetricKind(logs) {
  if (logs.some((l) => l.actual_duration_seconds != null)) return 'duration'
  if (logs.some((l) => l.actual_reps != null)) return 'reps'
  return null
}

export default function Progress() {
  const { profile } = useAuth()
  const [checkins, setCheckins] = useState([])
  const [itemLogs, setItemLogs] = useState([])
  const [assignedItems, setAssignedItems] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [selectedKey, setSelectedKey] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    db.listCheckins(profile.id).then(setCheckins)
    db.listItemLogsForAthlete(profile.id).then(setItemLogs)
    db.listAssignedItemsForAthlete(profile.id).then(setAssignedItems)
    db.listAssignedWorkouts(profile.id).then(setWorkouts)
  }, [profile?.id])

  // Every assigned_items row knows its own prescription, but not its own
  // type — that's inherited from its parent workout (see schema.sql) —
  // so this joins the two to answer "what kind of exercise logged this".
  const itemMeta = useMemo(() => {
    const workoutById = Object.fromEntries(workouts.map((w) => [w.id, w]))
    return Object.fromEntries(
      assignedItems.map((it) => [it.id, { ...it, type: workoutById[it.assigned_workout_id]?.type }]),
    )
  }, [assignedItems, workouts])

  const weightTrend = useMemo(
    () =>
      checkins
        .filter((c) => c.weight_lb != null)
        .map((c) => ({ date: c.date, weight: round1(c.weight_lb) })),
    [checkins],
  )

  const velocityTrend = useMemo(() => {
    const byDate = {}
    for (const log of itemLogs) {
      if (log.velocity == null) continue
      if (itemMeta[log.assigned_item_id]?.type !== 'throwing') continue
      byDate[log.date] = [...(byDate[log.date] ?? []), log.velocity]
    }
    return Object.entries(byDate)
      .map(([date, vals]) => ({ date, velocity: round1(vals.reduce((a, b) => a + b, 0) / vals.length) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [itemLogs, itemMeta])

  const sleepTrend = useMemo(() => {
    const sorted = checkins.filter((c) => c.sleep_hours != null)
    return sorted.map((c, i) => {
      const window = sorted.slice(Math.max(0, i - 6), i + 1)
      const avg7 = window.reduce((sum, w) => sum + w.sleep_hours, 0) / window.length
      return { date: c.date, sleep: round1(c.sleep_hours), avg7: round1(avg7) }
    })
  }, [checkins])

  const exerciseOptions = useMemo(() => {
    const byKey = new Map()
    for (const it of assignedItems) {
      const key = exerciseKey(it)
      const hasLog = itemLogs.some((l) => l.assigned_item_id === it.id)
      if (!hasLog) continue
      if (!byKey.has(key)) byKey.set(key, { key, name: it.name, type: itemMeta[it.id]?.type })
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [assignedItems, itemLogs, itemMeta])

  // Falls back to the first option until the athlete actually picks one,
  // without needing an effect just to seed selectedKey's initial value.
  const effectiveKey = selectedKey || exerciseOptions[0]?.key || ''

  const exerciseTrend = useMemo(() => {
    const option = exerciseOptions.find((o) => o.key === effectiveKey)
    if (!option) return { label: '', unit: '', points: [] }

    const itemIds = new Set(assignedItems.filter((it) => exerciseKey(it) === effectiveKey).map((it) => it.id))
    const logs = itemLogs.filter((l) => itemIds.has(l.assigned_item_id))

    let metric, label, unit
    if (option.type === 'lifting') {
      metric = (l) => l.actual_weight
      label = 'value'
      unit = 'lb'
    } else if (option.type === 'throwing') {
      metric = (l) => l.velocity
      label = 'value'
      unit = 'mph'
    } else {
      const kind = mobilityMetricKind(logs)
      metric = kind === 'duration' ? (l) => l.actual_duration_seconds : (l) => l.actual_reps
      unit = kind === 'duration' ? 'sec' : 'reps'
      label = 'value'
    }

    const byDate = {}
    for (const log of logs) {
      const value = metric(log)
      if (value == null) continue
      byDate[log.date] = byDate[log.date] != null ? Math.max(byDate[log.date], value) : value
    }
    const points = Object.entries(byDate)
      .map(([date, value]) => ({ date, value: round1(value) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return { label, unit, points }
  }, [effectiveKey, exerciseOptions, assignedItems, itemLogs])

  if (!profile) return null

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Progress</h1>
      <p className="text-sm text-neutral-500 mb-6">Trends built from what you've logged — check-ins and workout entries.</p>

      <Card title="Body weight">
        {weightTrend.length < 2 ? <EmptyState label="Log your weight on a check-in to start a trend." /> : <SingleLineChart data={weightTrend} dataKey="weight" unit="lb" color="#0071e3" />}
      </Card>

      <Card title="Velocity" subtitle="Average logged throwing velocity per day">
        {velocityTrend.length < 2 ? <EmptyState label="Log velocity on a throwing item to start a trend." /> : <SingleLineChart data={velocityTrend} dataKey="velocity" unit="mph" color="#ff9f0a" />}
      </Card>

      <Card title="Sleep averages" subtitle="Nightly hours, with a 7-day rolling average">
        {sleepTrend.length < 2 ? (
          <EmptyState label="Log sleep hours on a check-in to start a trend." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sleepTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={tickDate} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} width={30} />
              <Tooltip />
              <Line type="monotone" dataKey="sleep" name="Nightly" stroke="#c7d2e0" strokeWidth={1.5} dot={{ r: 1.5 }} />
              <Line type="monotone" dataKey="avg7" name="7-day avg" stroke="#34c759" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card
        title="Exercise progress"
        subtitle="Top-set weight, peak velocity, or time/reps per session — whichever this exercise tracks"
        action={
          exerciseOptions.length > 0 && (
            <select
              value={effectiveKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="border border-neutral-200 rounded-lg px-2 py-1.5 text-xs max-w-[55%]"
            >
              {exerciseOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.name}
                </option>
              ))}
            </select>
          )
        }
      >
        {exerciseOptions.length === 0 ? (
          <EmptyState label="Log a set on any exercise to start a trend." />
        ) : (
          <SingleLineChart data={exerciseTrend.points} dataKey="value" unit={exerciseTrend.unit} color="#8e44ec" />
        )}
      </Card>
    </div>
  )
}
