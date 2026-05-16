'use client'
import { useEffect } from 'react'
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

  useEffect(() => {
    if (!loading && !user && !isPublic(pathname)) {
      router.replace('/login')
    }
  }, [loading, user, pathname, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-2xl text-gray-400">Chargement...</p>
      </div>
    )
  }

  if (!user && !isPublic(pathname)) {
    return null
  }

  return <>{children}</>
}
