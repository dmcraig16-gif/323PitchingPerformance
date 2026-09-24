import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.js'
import * as db from '../lib/db.js'
import LoadingState from '../components/LoadingState.jsx'

const today = () => new Date().toISOString().slice(0, 10)

// The index route. Coaches go straight to their roster — a coach's own
// check-in/program data isn't the point of their account. Athletes go to
// today's check-in first if they haven't done it yet, otherwise straight
// to their programming for the day.
export default function Landing() {
  const { profile, role } = useAuth()
  const [athleteTarget, setAthleteTarget] = useState(null)

  useEffect(() => {
    if (!profile || role !== 'athlete') return
    db.getCheckinForDate(profile.id, today()).then((checkin) => {
      setAthleteTarget(checkin ? '/dashboard' : '/check-in')
    })
  }, [profile, role])

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingState />
      </div>
    )
  }

  if (role === 'coach') return <Navigate to="/coach/roster" replace />

  if (!athleteTarget) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingState />
      </div>
    )
  }

  return <Navigate to={athleteTarget} replace />
}
