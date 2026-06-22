import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { AuthContext } from './authContextObject.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) setProfile(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user) return

    let cancelled = false
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile(data)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
