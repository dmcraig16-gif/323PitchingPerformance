import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth.js'
import * as db from '../../lib/db.js'
import { summarizeByPitchType } from '../../lib/commandMetrics.js'
import CommandSessionList from '../../components/CommandSessionList.jsx'
import MissDirectionSummary from '../../components/MissDirectionSummary.jsx'

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function CommandTraining() {
  const { profile } = useAuth()
  const [pitches, setPitches] = useState([])

  useEffect(() => {
    if (!profile?.id) return
    db.listCommandPitches(profile.id).then(setPitches)
  }, [profile?.id])

  const avgMissIn = summarizeByPitchType(pitches).overall.avgMissIn

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
          {pitches.length > 0 && (
            <Card title="Miss direction (all-time)">
              <MissDirectionSummary pitches={pitches} throws={profile.throws} avgMissIn={avgMissIn} />
            </Card>
          )}
          <CommandSessionList athleteId={profile.id} loggedByProfileId={profile.id} basePath="/command" />
        </>
      )}
    </div>
  )
}
