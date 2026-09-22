import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth.js'
import { isSupabaseConfigured } from './lib/supabaseClient'
import Login from './pages/Login.jsx'
import Landing from './pages/Landing.jsx'
import AppShell from './components/AppShell.jsx'
import AthleteDashboard from './pages/athlete/Dashboard.jsx'
import CheckIn from './pages/athlete/CheckIn.jsx'
import MyProgram from './pages/athlete/MyProgram.jsx'
import CommandTraining from './pages/athlete/CommandTraining.jsx'
import CommandSession from './pages/athlete/CommandSession.jsx'
import Journal from './pages/athlete/Journal.jsx'
import Devotionals from './pages/athlete/Devotionals.jsx'
import Habits from './pages/athlete/Habits.jsx'
import MentalGame from './pages/athlete/MentalGame.jsx'
import CoachRoster from './pages/coach/Roster.jsx'
import AthleteDetail from './pages/coach/AthleteDetail.jsx'
import AthleteCommandSession from './pages/coach/AthleteCommandSession.jsx'
import ProgramBuilder from './pages/coach/ProgramBuilder.jsx'
import ExerciseBuilder from './pages/coach/ExerciseBuilder.jsx'
import ContentLibrary from './pages/coach/ContentLibrary.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (!isSupabaseConfigured) return children
  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Landing />} />
        <Route path="dashboard" element={<AthleteDashboard />} />
        <Route path="check-in" element={<CheckIn />} />
        <Route path="program" element={<MyProgram />} />
        <Route path="command" element={<CommandTraining />} />
        <Route path="command/:sessionId" element={<CommandSession />} />
        <Route path="journal" element={<Journal />} />
        <Route path="devotionals" element={<Devotionals />} />
        <Route path="habits" element={<Habits />} />
        <Route path="mental-game" element={<MentalGame />} />
        <Route path="coach/roster" element={<CoachRoster />} />
        <Route path="coach/athletes/:id" element={<AthleteDetail />} />
        <Route path="coach/athletes/:id/sessions/:sessionId" element={<AthleteCommandSession />} />
        <Route path="coach/programs" element={<ProgramBuilder />} />
        <Route path="coach/exercises" element={<ExerciseBuilder />} />
        <Route path="coach/content" element={<ContentLibrary />} />
      </Route>
    </Routes>
  )
}
