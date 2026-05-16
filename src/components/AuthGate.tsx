'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/profileContext'

const PUBLIC_ROUTES = ['/login']

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/join')
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  const { profile } = useProfile()
  const pathname = usePathname()
  const router = useRouter()
  const [showEscape, setShowEscape] = useState(false)

  useEffect(() => {
    if (!loading && !user && !isPublic(pathname)) {
      router.replace('/login')
    }
  }, [loading, user, pathname, router])

  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setShowEscape(true), 4000)
    return () => clearTimeout(t)
  }, [loading])

  if (isPublic(pathname)) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-6">
        <p className="text-2xl text-gray-400">Chargement...</p>
        {showEscape && (
          <button
            onClick={() => router.replace('/login')}
            className="text-indigo-500 font-semibold text-lg underline"
          >
            Aller à la page de connexion
          </button>
        )}
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      {isAdmin && profile.firstName && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white text-center text-sm py-2 px-4 font-medium">
          Vous consultez le compte de <strong>{profile.firstName} {profile.lastName}</strong>
        </div>
      )}
      <div className={isAdmin && profile.firstName ? 'pt-9' : ''}>
        {children}
      </div>
    </>
  )
}
