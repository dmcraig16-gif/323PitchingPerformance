import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { programTypeMeta, exerciseTypeMeta } from '../../lib/facilityConfig.js'
import ExerciseLogger from '../../components/ExerciseLogger.jsx'

const todayStr = () => new Date().toISOString().slice(0, 10)

// Groups an athlete's exercise_logs by "the movement" (library_exercise_id
// when the drill came from the library, otherwise the drill-instance id)
// so weight/velocity trends span every session that reused it, not just
// one week.
function trendKey(drill) {
  return drill.library_exercise_id ?? drill.id
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function DrillItem({ drill, athleteId, trendLogs, onLogged }) {
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {drill.type && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${exerciseTypeMeta(drill.type).badgeClass}`}>
              {exerciseTypeMeta(drill.type).label}
            </span>
          )}
          <p className="font-medium text-neutral-800">
            {drill.name}
            {drill.sets && drill.reps ? (
              <span className="text-neutral-400 font-normal"> — {drill.sets}x{drill.reps}</span>
            ) : null}
            {drill.target_value ? (
              <span className="text-neutral-400 font-normal"> · target {drill.target_value}{drill.target_unit}</span>
            ) : null}
          </p>
        </div>
        {drill.intent && <p className="text-neutral-500 text-xs mt-0.5 italic">{drill.intent}</p>}
        {drill.description && <p className="text-neutral-500 text-xs mt-0.5">{drill.description}</p>}
        {drill.youtube_url && (
          <a
            href={drill.youtube_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:text-accent-700 underline"
          >
            Watch demo
          </a>
        )}
      </div>
      <ExerciseLogger
        exercise={drill}
        athleteId={athleteId}
        trendLogs={trendLogs}
        onLogged={onLogged}
      />
    </li>
  )
}

function SessionCard({ session, program, drills, athleteId, trendsByKey, onLogged, highlighted, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`bg-white rounded-2xl shadow-card p-5 mb-4 ${highlighted ? 'ring-2 ring-accent' : ''}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {highlighted && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-accent text-white">Today</span>
            )}
            <span className="text-xs text-neutral-400">{formatDate(session.date)}</span>
            {program && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${programTypeMeta(program.type).badgeClass}`}>
                {programTypeMeta(program.type).label}
              </span>
            )}
          </div>
          <h3 className="font-semibold mt-0.5">{session.name}</h3>
          {session.notes && <p className="text-xs text-neutral-400 mt-0.5">{session.notes}</p>}
        </div>
        <span className="text-neutral-400 text-lg leading-none shrink-0">{open ? '−' : '+'}</span>
      </button>

      {open && (
        drills.length === 0 ? (
          <p className="text-sm text-neutral-400 mt-3">No drills in this session.</p>
        ) : (
          <ul className="space-y-3 mt-4 pt-3 border-t border-neutral-100">
            {drills.map((d) => (
              <DrillItem
                key={d.id}
                drill={d}
                athleteId={athleteId}
                trendLogs={trendsByKey[trendKey(d)] ?? []}
                onLogged={(log) => onLogged(trendKey(d), log)}
              />
            ))}
          </ul>
        )
      )}
    </div>
  )
}

export default function MyProgram() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [drillsBySession, setDrillsBySession] = useState({})
  const [programByAssignment, setProgramByAssignment] = useState({})
  const [trendsByKey, setTrendsByKey] = useState({})
  const athleteId = profile?.id
  const coachId = profile?.coach_id

  useEffect(() => {
    if (!athleteId) return
    let cancelled = false

    async function load() {
      const [assignments, sess, programs] = await Promise.all([
        db.listAssignmentsForAthlete(athleteId),
        db.listAthleteSessions(athleteId),
        coachId ? db.listProgramsForCoach(coachId) : Promise.resolve([]),
      ])
      const programById = Object.fromEntries(programs.map((p) => [p.id, p]))
      const progByAssignment = Object.fromEntries(
        assignments.map((a) => [a.id, programById[a.program_id] ?? null]),
      )

      const drillEntries = await Promise.all(
        sess.map((s) => db.listAthleteDrills(s.id).then((drills) => [s.id, drills])),
      )
      const drillsMap = Object.fromEntries(drillEntries)

      const allDrills = Object.values(drillsMap).flat()
      const logEntries = await Promise.all(
        allDrills.map((d) => db.listExerciseLogsForDrill(d.id).then((logs) => [d, logs])),
      )
      const grouped = {}
      for (const [d, logs] of logEntries) {
        const key = trendKey(d)
        grouped[key] = [...(grouped[key] ?? []), ...logs].sort((a, b) => a.date.localeCompare(b.date))
      }

      if (cancelled) return
      setSessions(sess)
      setDrillsBySession(drillsMap)
      setProgramByAssignment(progByAssignment)
      setTrendsByKey(grouped)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [athleteId, coachId])

  function handleLogged(key, log) {
    setTrendsByKey((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), log] }))
  }

  const today = todayStr()

  const { todaySession, weeks } = useMemo(() => {
    if (!sessions) return { todaySession: null, weeks: [] }
    const byWeek = {}
    for (const s of sessions) {
      byWeek[s.week_number] = [...(byWeek[s.week_number] ?? []), s]
    }
    const weekNumbers = Object.keys(byWeek).map(Number).sort((a, b) => a - b)
    return {
      todaySession: sessions.find((s) => s.date === today) ?? null,
      weeks: weekNumbers.map((n) => ({ weekNumber: n, sessions: byWeek[n] })),
    }
  }, [sessions, today])

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-6">My Program</h1>

      {sessions === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm text-neutral-500">
            You haven't been assigned a program yet. Once your coach assigns lifting or throwing
            programming, it'll show up here.
          </p>
        </div>
      ) : (
        <>
          {todaySession && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Today</p>
              <SessionCard
                session={todaySession}
                program={programByAssignment[todaySession.assignment_id]}
                drills={drillsBySession[todaySession.id] ?? []}
                athleteId={athleteId}
                trendsByKey={trendsByKey}
                onLogged={handleLogged}
                highlighted
                defaultOpen
              />
            </div>
          )}

          {weeks.map(({ weekNumber, sessions: weekSessions }) => {
            // Today's session already has its own card above — don't show
            // it a second time in the week it belongs to.
            const rest = weekSessions.filter((s) => s.id !== todaySession?.id)
            if (rest.length === 0) return null
            return (
              <div key={weekNumber} className="mb-6">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Week {weekNumber}</p>
                {rest.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    program={programByAssignment[s.assignment_id]}
                    drills={drillsBySession[s.id] ?? []}
                    athleteId={athleteId}
                    trendsByKey={trendsByKey}
                    onLogged={handleLogged}
                  />
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
