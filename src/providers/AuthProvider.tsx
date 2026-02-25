import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  session: import('@supabase/supabase-js').Session | null
  loading: boolean
  sessionExpiredOrSignedOut: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as Record<string, unknown>
  return {
    id: userId,
    email: (row.email as string) ?? '',
    full_name: (row.full_name as string) ?? '',
    role: (row.role as User['role']) ?? 'bd',
    manager_id: (row.manager_id as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_active: (row.is_active as boolean) ?? true,
    created_at: (row.created_at as string) ?? '',
    updated_at: (row.updated_at as string) ?? '',
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpiredOrSignedOut, setSessionExpiredOrSignedOut] = useState(false)
  const hadSessionRef = React.useRef(false)

  const refreshUser = useCallback(async (userId: string) => {
    const profile = await fetchUserProfile(userId)
    setUser(profile)
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (s?.user?.id) {
      const profile = await fetchUserProfile(s.user.id)
      setUser(profile)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let done = false

    const setDone = () => {
      if (!done && mounted) {
        done = true
        setLoading(false)
      }
    }

    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(s)
        if (s?.user?.id) {
          hadSessionRef.current = true
          await refreshUser(s.user.id)
        } else {
          setUser(null)
        }
      } catch (err) {
        if (mounted) {
          setSession(null)
          setUser(null)
        }
        console.warn('[Auth] init failed:', err instanceof Error ? err.message : err)
      } finally {
        setDone()
      }
    }

    init()

    const timeout = window.setTimeout(setDone, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return
      try {
        const hadSession = hadSessionRef.current
        setSession(s)
        if (s?.user?.id) {
          hadSessionRef.current = true
          setSessionExpiredOrSignedOut(false)
          await refreshUser(s.user.id)
        } else {
          setUser(null)
          if (hadSession) setSessionExpiredOrSignedOut(true)
          hadSessionRef.current = false
        }
      } catch {
        if (mounted) setUser(null)
      }
    })

    const REFRESH_INTERVAL_MS = 50 * 60 * 1000
    const refreshInterval = window.setInterval(async () => {
      if (!mounted) return
      try {
        const { data: { session: s }, error } = await supabase.auth.refreshSession()
        if (!error && s?.user?.id) {
          setSession(s)
          setSessionExpiredOrSignedOut(false)
          await refreshUser(s.user.id)
        }
      } catch {
        /* ignore */
      }
    }, REFRESH_INTERVAL_MS)

    return () => {
      mounted = false
      window.clearTimeout(timeout)
      window.clearInterval(refreshInterval)
      subscription.unsubscribe()
    }
  }, [refreshUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const { data: { session: s } } = await supabase.auth.getSession()
    if (s?.user?.id) await refreshUser(s.user.id)
  }, [refreshUser])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    const { data: { session: s } } = await supabase.auth.getSession()
    if (s?.user?.id) await refreshUser(s.user.id)
  }, [refreshUser])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setSessionExpiredOrSignedOut(true)
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    sessionExpiredOrSignedOut,
    refreshProfile,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
