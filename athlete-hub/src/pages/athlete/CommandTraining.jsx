import { useAuth } from '../../lib/useAuth.js'
import CommandSessionList from '../../components/CommandSessionList.jsx'

export default function CommandTraining() {
  const { profile } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Command Training</h1>
      <p className="text-sm text-slate-500 mb-6">
        Start a bullpen session, then log each pitch — pitch type, velocity, intended target, and
        actual result — to build a pitch-by-pitch list and a miss-distance/velocity breakdown by
        pitch type.
      </p>
      {profile && (
        <CommandSessionList athleteId={profile.id} loggedByProfileId={profile.id} basePath="/command" />
      )}
    </div>
  )
}
