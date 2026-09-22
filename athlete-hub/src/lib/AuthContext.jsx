import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { AuthContext } from './authContextObject.js'
import * as db from './db.js'
import { ensureSeedData, getCurrentDemoProfileId, setCurrentDemoProfileId } from './localStore.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [demoProfiles, setDemoProfiles] = useState([])

  // --- Supabase mode ---
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
    db.getProfileByUserId(session.user.id).then(async (p) => {
      if (cancelled) return
      if (p) {
        setProfile(p)
        return
      }
      // First sign-in after signup: no profiles row exists yet. The
      // role/name chosen at signup travels in auth metadata (set via
      // supabase.auth.signUp's `options.data`) since — when email
      // confirmation is required — there's no authenticated session (and
      // so no RLS-permitted insert) available at signup time itself.
      const meta = session.user.user_metadata ?? {}
      const created = await db.createProfile({
        user_id: session.user.id,
        role: meta.role === 'coach' ? 'coach' : 'athlete',
        name: meta.name || session.user.email,
        email: session.user.email,
      })
      if (!cancelled) setProfile(created)
    })
    return () => {
      cancelled = true
    }
  }, [session])

  // --- Demo/preview mode (no Supabase project configured) ---
  const loadDemoProfile = useCallback(() => {
    ensureSeedData()
    setDemoProfiles(db.listDemoProfiles())
    const id = getCurrentDemoProfileId()
    db.getProfileById(id).then(setProfile)
  }, [])

  useEffect(() => {
    if (isSupabaseConfigured) return
    // Defer to a microtask so the initial demo-profile load doesn't set
    // state synchronously within the effect body.
    Promise.resolve().then(loadDemoProfile)
  }, [loadDemoProfile])

  const switchDemoProfile = useCallback(
    (profileId) => {
      setCurrentDemoProfileId(profileId)
      loadDemoProfile()
    },
    [loadDemoProfile],
  )

  const value = {
    session,
    user: isSupabaseConfigured ? (session?.user ?? null) : { id: 'demo' },
    profile,
    role: profile?.role ?? null,
    loading,
    signOut: () => (isSupabaseConfigured ? supabase.auth.signOut() : null),
    isDemoMode: !isSupabaseConfigured,
    demoProfiles,
    switchDemoProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
