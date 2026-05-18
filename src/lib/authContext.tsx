'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'

export type Profile = {
  id: string
  display_name: string | null
  global_role: string | null
}

export type AdminAssignment = {
  id: string
  owner_id: string
  owner_name: string | null
  permission: 'read' | 'write' | 'admin'
}

// Type simplifié pour l'utilisateur (remplace User de Supabase)
export type AuthUser = {
  id: string
  email: string
  name?: string | null
  globalRole: string
}

type AuthContextType = {
  user: AuthUser | null
  profile: Profile | null           // profil utilisateur (null si pur admin)
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
  const { data: session, status } = useSession()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([])
  const [adminTarget, setAdminTargetState] = useState<string | null>(null)
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null)
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const loading = status === 'loading' || profileLoading

  // Restaurer depuis sessionStorage côté client uniquement
  useEffect(() => {
    setImpersonatedUserId(sessionStorage.getItem('simplavie_impersonate'))
    setImpersonatedUserName(sessionStorage.getItem('simplavie_impersonate_name'))
    setAdminTargetState(sessionStorage.getItem('simplavie_admin_target'))
  }, [])

  async function loadProfile(uid: string): Promise<Profile | null> {
    try {
      const res = await fetch(`/api/auth/profile?userId=${uid}`)
      if (!res.ok) return null
      const data = await res.json()
      return data ?? null
    } catch { return null }
  }

  async function loadAdminAssignments(): Promise<AdminAssignment[]> {
    try {
      const res = await fetch('/api/auth/assignments')
      if (!res.ok) return []
      return await res.json()
    } catch { return [] }
  }

  async function loadAll(uid: string) {
    const [p, assignments] = await Promise.all([
      loadProfile(uid),
      loadAdminAssignments(),
    ])
    setProfile(p)
    setAdminAssignments(assignments)
    // Si pur admin (pas de compte proprio) → auto-sélectionner le premier
    if (!p && assignments.length > 0) {
      const saved = sessionStorage.getItem('simplavie_admin_target')
      const validSaved = saved && assignments.find((a: AdminAssignment) => a.owner_id === saved)
      const target = validSaved ? saved : assignments[0].owner_id
      setAdminTargetState(target)
      sessionStorage.setItem('simplavie_admin_target', target)
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user) {
      const uid = session.user.id
      // Si un nouvel utilisateur se connecte, vider toute impersonation résiduelle
      const storedImpersonate = sessionStorage.getItem('simplavie_impersonate')
      if (storedImpersonate && storedImpersonate !== uid) {
        impersonate(null)
      }
      setProfileLoading(true)
      Promise.race([
        loadAll(uid).catch(() => {}),
        new Promise<void>(r => setTimeout(r, 4000)),
      ]).finally(() => setProfileLoading(false))
    } else {
      setProfile(null)
      setAdminAssignments([])
      impersonate(null)
      setAdminTarget(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, status])

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
    try {
      const { signIn: nextAuthSignIn } = await import('next-auth/react')
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé.')), 15000)
      )
      const result = await Promise.race([
        nextAuthSignIn('credentials', { email, password, redirect: false }),
        timeout,
      ])
      if (result?.error) return { error: 'Email ou mot de passe incorrect' }
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Erreur de connexion' }
    }
  }

  async function signUp(email: string, password: string, name?: string, asUser = true): Promise<{ error: string | null }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, asUser }),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error ?? 'Erreur lors de la création du compte' }
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Erreur lors de la création du compte' }
    }
  }

  async function createOwnAccount(): Promise<{ error: string | null }> {
    if (!session?.user?.id) return { error: 'Non connecté' }
    try {
      const res = await fetch('/api/auth/create-own-account', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) return { error: data.error ?? 'Erreur lors de la création du compte' }
      const p = await loadProfile(session.user.id)
      setProfile(p)
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Erreur lors de la création du compte' }
    }
  }

  async function signOut(): Promise<void> {
    impersonate(null)
    setAdminTarget(null)
    await nextAuthSignOut({ redirect: false })
  }

  // Construire l'objet user depuis la session NextAuth
  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        globalRole: session.user.globalRole,
      }
    : null

  const isSuperAdmin = user?.globalRole === 'superadmin' || profile?.global_role === 'superadmin'
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
