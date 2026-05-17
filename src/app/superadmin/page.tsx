'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saFetch } from '@/lib/superadminFetch'

type UserRow = {
  id: string
  display_name: string
  email: string
  global_role: string | null
  admin_count: number
  enabled_modules: number
  total_modules: number
  created_at: string
}

export default function SuperAdminPage() {
  const { isSuperAdmin, loading, impersonate } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/')
  }, [loading, isSuperAdmin, router])

  useEffect(() => {
    if (!isSuperAdmin) return
    saFetch('/api/superadmin/users')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setFetching(false) })
  }, [isSuperAdmin])

  const handleImpersonate = (user: UserRow) => {
    impersonate(user.id, user.display_name || user.email)
    router.push('/')
  }

  if (loading || !isSuperAdmin) return null

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">🛡️ Super Admin</h1>
          <p className="text-sm text-gray-400">{fetching ? '...' : `${users.length} compte(s) utilisateur(s)`}</p>
        </div>
      </div>

      {fetching ? (
        <div className="text-center text-gray-400 mt-20 text-xl">Chargement...</div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-xl">Aucun compte trouvé</p>
          <p className="text-sm mt-2">Vérifiez que SUPABASE_SERVICE_ROLE_KEY est bien configurée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-bold text-lg">
                  {(u.display_name || u.email || '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 truncate">{u.display_name || '(sans nom)'}</span>
                  {u.global_role === 'superadmin' && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">Super Admin</span>
                  )}
                </div>
                <div className="text-sm text-gray-400 truncate">{u.email}</div>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-gray-400">{u.enabled_modules}/{u.total_modules} modules</span>
                  <span className="text-xs text-gray-400">{u.admin_count} admin(s)</span>
                  <span className="text-xs text-gray-300">{new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link href={`/superadmin/users/${u.id}`} className="text-xs px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold active:scale-95 transition-all text-center">
                  ⚙️ Gérer
                </Link>
                <button onClick={() => handleImpersonate(u)} className="text-xs px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold active:scale-95 transition-all">
                  👁️ Voir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
