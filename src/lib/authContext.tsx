'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured, supabase } from '@/lib/supabase'

type Profile = {
  id: string
  display_name: string | null
  role: 'owner' | 'admin'
  owner_id: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  activeUserId: string | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  activeUserId: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(uid: string) {
    const client = getSupabase()
    if (!client) return null
    const { data } = await client
      .from('user_profiles')
      .select('id, display_name, role, owner_id')
      .eq('id', uid)
      .maybeSingle()
    return data as Profile | null
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const client = getSupabase()
    if (!client) {
      setLoading(false)
      return
    }

    client.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await loadProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await loadProfile(session.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const client = getSupabase()
    if (!client) return { error: 'Supabase non configuré' }
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signUp(email: string, password: string, name: string): Promise<{ error: string | null }> {
    const client = getSupabase()
    if (!client) return { error: 'Supabase non configuré' }
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (data.user) {
      await client.from('user_profiles').upsert({
        id: data.user.id,
        display_name: name,
        role: 'owner',
        owner_id: null,
      })
    }
    return { error: null }
  }

  async function signOut(): Promise<void> {
    const client = getSupabase()
    if (!client) return
    await client.auth.signOut()
  }

  const isAdmin = profile?.role === 'admin'
  const activeUserId = profile
    ? isAdmin
      ? (profile.owner_id ?? null)
      : (user?.id ?? null)
    : null

  return (
    <AuthContext.Provider value={{ user, profile, activeUserId, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
