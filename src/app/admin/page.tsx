'use client'
import { useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace('/admin/dashboard')
    } else {
      router.replace('/login')
    }
  }, [loading, user, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )
}
