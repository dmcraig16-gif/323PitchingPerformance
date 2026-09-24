import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as db from '../../lib/db.js'
import { startOfMonth, toISODate } from '../../lib/calendarDates.js'
import WeekStrip from './WeekStrip.jsx'
import MonthView from './MonthView.jsx'
import DayView from './DayView.jsx'
import LoadingState from '../LoadingState.jsx'

// The whole calendar screen: a persistent week strip pinned above the
// selected day's workouts, with the month grid available as a bottom
// sheet rather than a separate tab — the standard mobile-calendar
// pattern, and it keeps "today" one tap away from anywhere. Shared
// between the athlete's own /program screen and a coach's read-only view
// of one athlete (AthleteDetail's Programs tab) via the interactive prop.
export default function AthleteCalendar({ athleteId, interactive = true, basePath = '/program', stickyHeader = interactive }) {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [monthSheetOpen, setMonthSheetOpen] = useState(false)

  useEffect(() => {
    if (!athleteId) return
    db.listAssignedWorkouts(athleteId).then(setWorkouts)
  }, [athleteId])

  const workoutsByDate = useMemo(() => {
    const map = new Map()
    for (const w of workouts ?? []) {
      const list = map.get(w.date) ?? []
      list.push(w)
      map.set(w.date, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.order_index - b.order_index)
    return map
  }, [workouts])

  const dayWorkouts = workoutsByDate.get(toISODate(selectedDate)) ?? []

  if (workouts === null) return <LoadingState />

  return (
    <div>
      <WeekStrip
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        workoutsByDate={workoutsByDate}
        onOpenMonth={() => setMonthSheetOpen(true)}
        sticky={stickyHeader}
      />
      <DayView
        key={toISODate(selectedDate)}
        date={selectedDate}
        workouts={dayWorkouts}
        interactive={interactive}
        onOpenWorkout={(w) => navigate(`${basePath}/${w.id}`)}
      />
      {monthSheetOpen && (
        <MonthView
          initialMonth={startOfMonth(selectedDate)}
          selectedDate={selectedDate}
          workoutsByDate={workoutsByDate}
          onSelectDate={setSelectedDate}
          onClose={() => setMonthSheetOpen(false)}
        />
      )}
    </div>
  )
}
