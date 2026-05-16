'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'

const PUBLIC_ROUTES = ['/login']

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/join')
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
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

  return <>{children}</>
}
