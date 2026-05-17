'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export type Profile = {
  id: string
  display_name: string | null
  global_role: string | null
}

export type AdminAssignment = {
  id: string
  owner_id: string
  owner_name: string | null
  permission: 'read' | 'write'
}

type AuthContextType = {
  user: User | null
  profile: Profile | null           // propre profil utilisateur (null si pur admin)
  adminAssignments: AdminAssignment[]
  activeUserId: string | null       // compte actuellement géré
  adminTarget: string | null        // owner_id de l'aidé (si en mode admin)
  setAdminTarget: (ownerId: string | null) => void
  isAdmin: boolean                  // a au moins une assignment
  isSuperAdmin: boolean
  hasOwnAccount: boolean            // a un compte utilisateur SimplaVie
  impersonatedUserId: string | null
  impersonatedUserName: string | null
  impersonate: (userId: string | null, userName?: string) => void
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name?: string, asUser?: boolean) => Promise<{ error: string | null }>
  createOwnAccount: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, adminAssignments: [], activeUserId: null,
  adminTarget: null, setAdminTarget: () => {}, isAdmin: false, isSuperAdmin: false,
  hasOwnAccount: false, impersonatedUserId: null, impersonatedUserName: null,
  impersonate: () => {}, loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  createOwnAccount: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [adminTarget, setAdminTargetState] = useState<string | null>(null)
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null)
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null)

  useEffect(() => {
    // Restaurer depuis sessionStorage côté client uniquement
    setImpersonatedUserId(sessionStorage.getItem('simplavie_impersonate'))
    setImpersonatedUserName(sessionStorage.getItem('simplavie_impersonate_name'))
    setAdminTargetState(sessionStorage.getItem('simplavie_admin_target'))
  }, [])

  async function loadProfile(uid: string): Promise<Profile | null> {
    const client = getSupabase()
    if (!client) return null
    try {
      const { data } = await client
        .from('user_profile')
        .select('id, display_name, global_role')
        .eq('id', uid)
        .maybeSingle()
      return (data as Profile | null) ?? null
    } catch { return null }
  }

  async function loadAdminAssignments(uid: string): Promise<AdminAssignment[]> {
    const client = getSupabase()
    if (!client) return []
    try {
      const { data } = await client
        .from('admin_assignments')
        .select('id, owner_user_id, permission')
        .eq('admin_user_id', uid)
      if (!data || data.length === 0) return []

      // Récupérer le nom de chaque propriétaire depuis app_config
      const results = await Promise.all(data.map(async (a) => {
        const { data: cfg } = await client
          .from('app_config')
          .select('user_name')
          .eq('user_id', a.owner_user_id)
          .maybeSingle()
        return {
          id: a.id as string,
          owner_id: a.owner_user_id as string,
          owner_name: (cfg?.user_name as string | null) ?? null,
          permission: (a.permission as 'read' | 'write') ?? 'read',
        }
      }))
      return results
    } catch { return [] }
  }

  async function loadAll(uid: string) {
    const [p, assignments] = await Promise.all([
      loadProfile(uid),
      loadAdminAssignments(uid),
    ])
    setProfile(p)
    setAdminAssignments(assignments)
    // Si pur admin (pas de compte proprio) → auto-sélectionner le premier
    if (!p && assignments.length > 0) {
      const saved = sessionStorage.getItem('simplavie_admin_target')
      const validSaved = saved && assignments.find(a => a.owner_id === saved)
      setAdminTargetState(validSaved ? saved : assignments[0].owner_id)
      sessionStorage.setItem('simplavie_admin_target', validSaved ? saved : assignments[0].owner_id)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const client = getSupabase()
    if (!client) { setLoading(false); return }

    const timeout = setTimeout(() => setLoading(false), 5000)

    client.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      if (session?.user) await loadAll(session.user.id).catch(() => {})
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadAll(session.user.id).catch(() => {})
      } else {
        setProfile(null)
        setAdminAssignments([])
        impersonate(null)
        setAdminTarget(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  function setAdminTarget(ownerId: string | null) {
    setAdminTargetState(ownerId)
    if (ownerId) sessionStorage.setItem('simplavie_admin_target', ownerId)
    else sessionStorage.removeItem('simplavie_admin_target')
  }

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
        setTimeout(() => reject(new Error('Délai dépassé.')), 15000)
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

  async function signUp(email: string, password: string, name?: string, asUser = true): Promise<{ error: string | null }> {
    const client = getSupabase()
    if (!client) return { error: 'Supabase non configuré' }
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) return { error: error.message }
    // Créer un profil utilisateur uniquement si asUser = true (pas pour les admins)
    if (data.user && asUser) {
      await client.from('user_profile').upsert({
        id: data.user.id,
        display_name: name ?? '',
        global_role: 'user',
      })
    }
    return { error: null }
  }

  async function createOwnAccount(): Promise<{ error: string | null }> {
    const client = getSupabase()
    if (!client || !user) return { error: 'Non connecté' }
    const { error } = await client.from('user_profile').insert({
      id: user.id,
      display_name: '',
      global_role: 'user',
    })
    if (error) return { error: error.message }
    const p = await loadProfile(user.id)
    setProfile(p)
    return { error: null }
  }

  async function signOut(): Promise<void> {
    impersonate(null)
    setAdminTarget(null)
    const client = getSupabase()
    if (!client) return
    await client.auth.signOut()
  }

  const isSuperAdmin = profile?.global_role === 'superadmin'
  const isAdmin = adminAssignments.length > 0
  const hasOwnAccount = profile !== null && profile.global_role !== 'superadmin'

  const activeUserId = impersonatedUserId
    ?? adminTarget
    ?? user?.id
    ?? null

  return (
    <AuthContext.Provider value={{
      user, profile, adminAssignments, activeUserId,
      adminTarget, setAdminTarget,
      isAdmin, isSuperAdmin, hasOwnAccount,
      impersonatedUserId, impersonatedUserName, impersonate,
      loading, signIn, signUp, createOwnAccount, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
