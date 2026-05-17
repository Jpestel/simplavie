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
  global_role: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  activeUserId: string | null
  isAdmin: boolean
  isSuperAdmin: boolean
  impersonatedUserId: string | null
  impersonatedUserName: string | null
  impersonate: (userId: string | null, userName?: string) => void
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
  isSuperAdmin: false,
  impersonatedUserId: null,
  impersonatedUserName: null,
  impersonate: () => {},
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('[auth] AuthProvider init')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('simplavie_impersonate')
  })
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('simplavie_impersonate_name')
  })

  async function loadProfile(uid: string): Promise<Profile> {
    const client = getSupabase()
    if (!client) return { id: uid, display_name: null, role: 'owner', owner_id: null, permission: null, global_role: null }
    try {
      const { data } = await client
        .from('user_profile')
        .select('id, display_name, role, owner_id, permission, global_role')
        .eq('id', uid)
        .maybeSingle()
      console.log('[auth] profil chargé:', data)
      if (data) return data as Profile
      await client.from('user_profile').upsert({ id: uid, display_name: '', role: 'owner', owner_id: null, permission: null, global_role: 'user' })
    } catch { /* ignore */ }
    return { id: uid, display_name: null, role: 'owner', owner_id: null, permission: null, global_role: null }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const client = getSupabase()
    if (!client) { setLoading(false); return }

    const timeout = setTimeout(() => setLoading(false), 5000)

    client.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) loadProfile(session.user.id).then(setProfile).catch(() => {})
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) loadProfile(session.user.id).then(setProfile).catch(() => {})
      else { setProfile(null); impersonate(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  function impersonate(userId: string | null, userName?: string) {
    setImpersonatedUserId(userId)
    setImpersonatedUserName(userName ?? null)
    if (userId) {
      sessionStorage.setItem('simplavie_impersonate', userId)
      sessionStorage.setItem('simplavie_impersonate_name', userName ?? '')
    } else {
      sessionStorage.removeItem('simplavie_impersonate')
      sessionStorage.removeItem('simplavie_impersonate_name')
    }
  }

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
        global_role: 'user',
      })
    }
    return { error: null }
  }

  async function signOut(): Promise<void> {
    impersonate(null)
    const client = getSupabase()
    if (!client) return
    await client.auth.signOut()
  }

  const isAdmin = profile?.role === 'admin'
  const isSuperAdmin = profile?.role === 'owner' && profile?.global_role === 'superadmin'

  // Priorité d'activeUserId : impersonation (superadmin) > admin classique > propre compte
  const activeUserId = impersonatedUserId
    ?? (isAdmin && profile?.owner_id ? profile.owner_id : (user?.id ?? null))

  return (
    <AuthContext.Provider value={{
      user, profile, activeUserId,
      isAdmin, isSuperAdmin,
      impersonatedUserId, impersonatedUserName, impersonate,
      loading, signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
