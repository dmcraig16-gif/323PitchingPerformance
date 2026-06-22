import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth.js'

const QUESTIONS = [
  { key: 'goals', label: 'What are your main goals this season?' },
  { key: 'experience', label: 'How many years have you been pitching competitively?' },
  { key: 'injury_history', label: 'Any current or past injuries we should know about?' },
  { key: 'availability', label: 'How many days per week can you train?' },
  { key: 'equipment', label: 'What equipment/facility access do you have?' },
]

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSupabaseConfigured && user) {
      await supabase.from('onboarding_forms').insert({
        athlete_id: user.id,
        answers,
      })
    }
    setSubmitted(true)
    setTimeout(() => navigate('/dashboard'), 1200)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Thanks! Your coach will review this and assign your program.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Welcome — let's get you set up</h1>
        {QUESTIONS.map((q) => (
          <div key={q.key} className="mb-5">
            <label className="block text-sm font-medium mb-1">{q.label}</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm"
              rows={2}
              value={answers[q.key] ?? ''}
              onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
              required
            />
          </div>
        ))}
        <button
          type="submit"
          className="w-full bg-slate-900 text-white rounded-md py-2 text-sm font-medium"
        >
          Submit
        </button>
      </form>
    </div>
  )
}
