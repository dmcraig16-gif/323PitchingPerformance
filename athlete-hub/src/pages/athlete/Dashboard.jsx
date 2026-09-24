import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Target, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { bandFor } from '../../lib/readiness.js'
import { toISODate } from '../../lib/calendarDates.js'
import { deriveWorkoutStatus, workoutStatusMeta, workoutTypeMeta } from '../../lib/facilityConfig.js'
import ReadinessGauge from '../../components/ReadinessGauge.jsx'
import WeekStrip from '../../components/calendar/WeekStrip.jsx'

function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

const todayISO = () => toISODate(new Date())

// More quick actions can just be appended here as the app grows — each
// one is a destination + a one-line reason to tap it.
const QUICK_ACTIONS = [
  { to: '/progress', label: 'View Progress', description: 'Trend reports', icon: TrendingUp },
  { to: '/command', label: 'Log Bullpens', description: 'Command Tracker', icon: Target },
]

function QuickActionsRow() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
      {QUICK_ACTIONS.map((a) => {
        const Icon = a.icon
        return (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-3 bg-white rounded-2xl shadow-card px-4 py-3 shrink-0 min-w-[180px] hover:shadow-elevated transition-shadow"
          >
            <span className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{a.label}</p>
              <p className="text-xs text-neutral-400 truncate">{a.description}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// A glanceable "today" preview of the calendar — the week strip for
// visual context, plus today's actual workout cards to tap straight
// into. Any interaction beyond that (another day, the month sheet) just
// hands off to the full Calendar screen rather than duplicating its
// state here.
function TodayScheduleCard({ workouts }) {
  const navigate = useNavigate()
  const isoToday = todayISO()

  const workoutsByDate = useMemo(() => {
    const map = new Map()
    for (const w of workouts) {
      const list = map.get(w.date) ?? []
      list.push(w)
      map.set(w.date, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.order_index - b.order_index)
    return map
  }, [workouts])

  const todaysWorkouts = workoutsByDate.get(isoToday) ?? []

  return (
    <Card
      title="Today's Schedule"
      action={
        <Link to="/program" className="text-xs text-accent hover:text-accent-700 font-medium">
          Full calendar
        </Link>
      }
    >
      <WeekStrip
        selectedDate={new Date()}
        onSelect={() => navigate('/program')}
        workoutsByDate={workoutsByDate}
        onOpenMonth={() => navigate('/program')}
        sticky={false}
      />
      <div className="mt-3 space-y-2">
        {todaysWorkouts.length === 0 ? (
          <p className="text-sm text-neutral-500">Rest day — nothing scheduled.</p>
        ) : (
          todaysWorkouts.map((w) => {
            const meta = workoutStatusMeta(deriveWorkoutStatus(w, isoToday))
            return (
              <button
                key={w.id}
                onClick={() => navigate(`/program/${w.id}`)}
                className="w-full flex items-center justify-between gap-2 border border-neutral-100 rounded-xl px-3 py-2 text-left hover:border-accent transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${workoutTypeMeta(w.type).badgeClass}`}>
                      {workoutTypeMeta(w.type).label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.badgeClass}`}>{meta.label}</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-800 truncate">{w.title}</p>
                </div>
                <ChevronRight size={16} className="text-neutral-300 shrink-0" />
              </button>
            )
          })
        )}
      </div>
    </Card>
  )
}

// Edits today's entry in place (upsert-by-day in application logic, not
// a DB constraint) so revisiting the dashboard continues today's
// reflection instead of appending a new row each time. The full Journal
// page keeps its own always-append behavior for multiple entries a day.
function JournalCard({ athleteId }) {
  const [entryId, setEntryId] = useState(null)
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!athleteId) return
    db.getJournalEntryForDate(athleteId, todayISO()).then((entry) => {
      if (entry) {
        setEntryId(entry.id)
        setContent(entry.content)
      }
      setLoaded(true)
    })
  }, [athleteId])

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    if (entryId) {
      await db.updateJournalEntry(entryId, { content: content.trim() })
    } else {
      const created = await db.createJournalEntry({ athlete_id: athleteId, content: content.trim() })
      setEntryId(created.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card
      title="Today's Journal"
      action={
        <Link to="/journal" className="text-xs text-accent hover:text-accent-700 font-medium">
          All entries
        </Link>
      }
    >
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setSaved(false)
        }}
        rows={4}
        disabled={!loaded}
        placeholder="What's on your mind? What helped you feel ready today — or got in the way?"
        className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
      />
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={saving || !loaded || !content.trim()}
          className="bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : entryId ? 'Update entry' : 'Save entry'}
        </button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [checkin, setCheckin] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const athleteId = profile?.id

  useEffect(() => {
    if (!athleteId) return
    db.getCheckinForDate(athleteId, todayISO()).then(setCheckin)
    db.listAssignedWorkouts(athleteId).then(setWorkouts)
  }, [athleteId])

  const band = checkin ? bandFor(checkin.readiness_score) : null

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-5">Today</h1>

      <QuickActionsRow />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <Card
          title="Readiness"
          action={
            <Link to="/check-in" className="text-xs text-accent hover:text-accent-700 font-medium">
              {checkin ? 'Update' : 'Check in'}
            </Link>
          }
        >
          {checkin ? (
            <div className="flex items-center gap-3">
              <ReadinessGauge score={checkin.readiness_score} tone={band.tone} size={64} strokeWidth={7} />
              <p className="text-sm font-semibold">{band.label}</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">You haven't checked in today yet.</p>
          )}
        </Card>

        <TodayScheduleCard workouts={workouts} />
      </div>

      <JournalCard athleteId={athleteId} />
    </div>
  )
}
