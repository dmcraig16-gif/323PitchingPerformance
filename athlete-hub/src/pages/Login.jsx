import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { FACILITY_NAME, LOGO_SQUARE } from '../lib/facilityConfig.js'

const ROLES = [
  { value: 'athlete', label: 'Athlete', blurb: 'Daily check-in, programming, command tracking' },
  { value: 'coach', label: 'Coach', blurb: 'Build programs, review athletes, assign workouts' },
]

const THROWS_OPTIONS = [
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
]

export default function Login() {
  const [mode, setMode] = useState('sign-in')
  const [name, setName] = useState('')
  const [role, setRole] = useState('athlete')
  const [throwsHand, setThrowsHand] = useState('R')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [confirmSent, setConfirmSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!isSupabaseConfigured) {
      navigate('/')
      return
    }

    setSubmitting(true)

    if (mode === 'sign-in') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      setSubmitting(false)
      if (authError) {
        setError(authError.message)
        return
      }
      navigate('/')
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, throws: role === 'athlete' ? throwsHand : undefined } },
    })
    setSubmitting(false)
    if (authError) {
      setError(authError.message)
      return
    }
    if (!data.session) {
      // Email confirmation required — the profile gets created on first
      // real sign-in (see AuthContext), once a session actually exists.
      setConfirmSent(true)
      return
    }
    navigate('/')
  }

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="bg-white p-8 rounded-2xl shadow-card w-full max-w-sm text-center">
          <img src={LOGO_SQUARE} alt={FACILITY_NAME} className="w-16 h-16 mx-auto mb-4" />
          <p className="font-semibold text-lg mb-2">Check your email</p>
          <p className="text-sm text-neutral-500 mb-6">
            Confirm your address, then sign in below to get started.
          </p>
          <button
            onClick={() => {
              setConfirmSent(false)
              setMode('sign-in')
            }}
            className="text-sm text-accent hover:text-accent-700 font-medium"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-card w-full max-w-sm">
        <img src={LOGO_SQUARE} alt={FACILITY_NAME} className="w-20 h-20 mx-auto mb-4" />
        <p className="text-sm text-neutral-500 mb-6 text-center">
          {mode === 'sign-in' ? 'Sign in to your account' : 'Create your account'}
        </p>

        {!isSupabaseConfigured && (
          <p className="text-sm text-amber-600 mb-4">
            Supabase not configured — running in preview mode.
          </p>
        )}

        {mode === 'sign-up' && (
          <>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 mb-4 text-sm"
              required
            />

            <label className="block text-sm font-medium mb-2">I am a…</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    role === r.value
                      ? 'border-accent bg-accent-50'
                      : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <p className={`text-sm font-semibold ${role === r.value ? 'text-accent' : 'text-neutral-900'}`}>
                    {r.label}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{r.blurb}</p>
                </button>
              ))}
            </div>

            {role === 'athlete' && (
              <>
                <label className="block text-sm font-medium mb-2">Throws</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {THROWS_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setThrowsHand(t.value)}
                      className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                        throwsHand === t.value
                          ? 'border-accent bg-accent-50 text-accent'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-neutral-200 rounded-xl px-3 py-2 mb-4 text-sm"
          required
        />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-neutral-200 rounded-xl px-3 py-2 mb-6 text-sm"
          required
          minLength={6}
        />
        {error && <p className="text-sm text-danger mb-4">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent text-white hover:bg-accent-600 transition-colors rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          className="w-full mt-3 text-sm text-neutral-500"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
