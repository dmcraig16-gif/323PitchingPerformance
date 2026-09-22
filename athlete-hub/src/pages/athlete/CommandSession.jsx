import { useParams } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth.js'
import CommandSessionDetail from '../../components/CommandSessionDetail.jsx'

export default function CommandSession() {
  const { sessionId } = useParams()
  const { profile } = useAuth()

  if (!profile) return null

  return (
    <CommandSessionDetail
      sessionId={sessionId}
      athleteId={profile.id}
      basePath="/command"
      backLabel="All sessions"
    />
  )
}
