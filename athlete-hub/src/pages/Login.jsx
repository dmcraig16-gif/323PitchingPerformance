import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('sign-in')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!isSupabaseConfigured) {
      navigate('/dashboard')
      return
    }

    const action =
      mode === 'sign-in'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

    const { error: authError } = await action
    if (authError) {
      setError(authError.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6">Athlete Hub</h1>
        {!isSupabaseConfigured && (
          <p className="text-sm text-amber-600 mb-4">
            Supabase not configured — running in preview mode.
          </p>
        )}
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-md px-3 py-2 mb-4 text-sm"
          required
        />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-md px-3 py-2 mb-6 text-sm"
          required
        />
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-slate-900 text-white rounded-md py-2 text-sm font-medium"
        >
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          className="w-full mt-3 text-sm text-slate-500"
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
