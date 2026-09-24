import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import CommandSessionList from '../../components/CommandSessionList.jsx'
import CommandDirectionPanel from '../../components/CommandDirectionPanel.jsx'

export default function CommandTraining() {
  const { profile } = useAuth()
  const [pitches, setPitches] = useState([])

  useEffect(() => {
    if (!profile?.id) return
    db.listCommandPitches(profile.id).then(setPitches)
  }, [profile?.id])

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-1">Command Training</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Start a bullpen session, then log each pitch — pitch type, velocity, intended target, and
        actual result — to build a pitch-by-pitch list and a miss-distance/velocity breakdown by
        pitch type.
      </p>
      {profile && (
        <>
          <CommandDirectionPanel pitches={pitches} throws={profile.throws} />
          <CommandSessionList athleteId={profile.id} loggedByProfileId={profile.id} basePath="/command" />
        </>
      )}
    </div>
  )
}
