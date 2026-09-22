import { useParams } from 'react-router-dom'
import CommandSessionDetail from '../../components/CommandSessionDetail.jsx'

export default function AthleteCommandSession() {
  const { id, sessionId } = useParams()

  return (
    <CommandSessionDetail
      sessionId={sessionId}
      athleteId={id}
      basePath={`/coach/athletes/${id}`}
      backLabel="Athlete profile"
    />
  )
}
