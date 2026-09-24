import { useAuth } from '../../lib/useAuth.js'
import AthleteCalendar from '../../components/calendar/AthleteCalendar.jsx'

export default function Calendar() {
  const { profile } = useAuth()

  if (!profile) return null

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Calendar</h1>
      <p className="text-sm text-neutral-500 mb-2">Your assigned throwing, lifting, mobility, and movement prep — day by day.</p>
      <AthleteCalendar athleteId={profile.id} basePath="/program" />
    </div>
  )
}
