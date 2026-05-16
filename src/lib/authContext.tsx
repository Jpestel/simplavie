'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured, supabase } from '@/lib/supabase'

type Profile = {
  id: string
  display_name: string | null
  role: 'owner' | 'admin'
  owner_id: string | null
  permission: 'read' | 'write' | null
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

  async function loadProfile(uid: string): Promise<Profile> {
    const client = getSupabase()
    if (!client) return { id: uid, display_name: null, role: 'owner' as const, owner_id: null, permission: null }
    try {
      const { data } = await client
        .from('user_profile')
        .select('id, display_name, role, owner_id, permission')
        .eq('id', uid)
        .maybeSingle()
      if (data) return data as Profile
      // Profil absent (trigger non exécuté) → on le crée
      await client.from('user_profile').upsert({ id: uid, display_name: '', role: 'owner', owner_id: null, permission: null })
    } catch { /* ignore */ }
    return { id: uid, display_name: null, role: 'owner' as const, owner_id: null, permission: null }
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

    const timeout = setTimeout(() => setLoading(false), 5000)

    client.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        loadProfile(session.user.id).then(setProfile).catch(() => {})
      }
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        loadProfile(session.user.id).then(setProfile).catch(() => {})
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const client = getSupabase()
    if (!client) return { error: 'Supabase non configuré' }
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé. Vérifiez votre connexion et réessayez.')), 15000)
      )
      const { error } = await Promise.race([
        client.auth.signInWithPassword({ email, password }),
        timeout,
      ])
      if (error) return { error: error.message }
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Erreur de connexion' }
    }
  }

  async function signUp(email: string, password: string, name: string): Promise<{ error: string | null }> {
    const client = getSupabase()
    if (!client) return { error: 'Supabase non configuré' }
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (data.user) {
      await client.from('user_profile').upsert({
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
  // Si pas de profil chargé mais user connecté → on utilise user.id directement
  const activeUserId = isAdmin && profile?.owner_id
    ? profile.owner_id
    : (user?.id ?? null)

  return (
    <AuthContext.Provider value={{ user, profile, activeUserId, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
