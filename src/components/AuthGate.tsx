'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/profileContext'

const PUBLIC_ROUTES = ['/login', '/forgot-password']

function isPublic(pathname: string) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/reset-password')
  )
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, isSuperAdmin, impersonatedUserId, impersonatedUserName, impersonate } = useAuth()
  const { profile } = useProfile()
  const pathname = usePathname()
  const router = useRouter()
  const [showEscape, setShowEscape] = useState(false)

  // Redirection si non connecté
  useEffect(() => {
    if (!loading && !user && !isPublic(pathname)) router.replace('/login')
  }, [loading, user, pathname, router])

  // Superadmin → /superadmin (sauf s'il y est déjà)
  useEffect(() => {
    if (!loading && user && isSuperAdmin && !impersonatedUserId && !pathname.startsWith('/superadmin')) {
      router.replace('/superadmin')
    }
  }, [loading, user, isSuperAdmin, impersonatedUserId, pathname, router])

  // Admin → /admin (sauf s'il navigue dans /admin ou /modules)
  useEffect(() => {
    if (!loading && user && isAdmin && pathname === '/') {
      router.replace('/admin')
    }
  }, [loading, user, isAdmin, pathname, router])

  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setShowEscape(true), 4000)
    return () => clearTimeout(t)
  }, [loading])

  if (isPublic(pathname)) return <>{children}</>

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-6">
        <p className="text-2xl text-gray-400">Chargement...</p>
        {showEscape && (
          <button onClick={() => router.replace('/login')} className="text-indigo-500 font-semibold text-lg underline">
            Aller à la page de connexion
          </button>
        )}
      </div>
    )
  }

  if (!user) return null

  const showSuperBanner = isSuperAdmin && !!impersonatedUserId
  const showAdminBanner = !showSuperBanner && isAdmin && !!profile.firstName

  return (
    <>
      {showSuperBanner && (
        <div className="fixed top-12 left-0 right-0 z-50 bg-violet-600 text-white text-center text-sm py-2 px-4 font-medium flex items-center justify-center gap-3">
          <span>🛡️ Mode Super Admin — Compte de <strong>{impersonatedUserName}</strong></span>
          <button
            onClick={() => { impersonate(null); router.push('/superadmin') }}
            className="bg-white/20 hover:bg-white/30 px-3 py-0.5 rounded-full text-xs font-semibold transition-all"
          >
            Quitter
          </button>
        </div>
      )}
      {showAdminBanner && (
        <div className="fixed top-12 left-0 right-0 z-50 bg-indigo-600 text-white text-center text-sm py-2 px-4 font-medium">
          Vous gérez le compte de <strong>{profile.firstName} {profile.lastName}</strong>
        </div>
      )}
      <div className={(showSuperBanner || showAdminBanner) ? 'pt-9' : ''}>
        {children}
      </div>
    </>
  )
}
