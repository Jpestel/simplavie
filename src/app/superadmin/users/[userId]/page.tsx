'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { saFetch } from '@/lib/superadminFetch'

type Module = { id: string; label: string; icon: string; enabled: boolean; order: number; name: string; description: string }
type Admin = { id: string; display_name: string | null; email: string; permission: 'read' | 'write' }
type UserDetail = {
  profile: { display_name: string | null; global_role: string | null } | null
  config: { user_name: string; modules: Module[] } | null
  admins: Admin[]
  email: string
}

export default function SuperAdminUserPage() {
  const { isSuperAdmin, loading, impersonate, signOut } = useAuth()
  const router = useRouter()
  const { userId } = useParams<{ userId: string }>()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }
  const [data, setData] = useState<UserDetail | null>(null)
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/')
  }, [loading, isSuperAdmin, router])

  const load = () => {
    saFetch(`/api/superadmin/users/${userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setFetching(false) })
  }

  useEffect(() => { if (isSuperAdmin && userId) load() }, [isSuperAdmin, userId])

  const toggleModule = async (module: Module) => {
    if (!data?.config) return
    setSaving(module.id)
    const updated = data.config.modules.map(m => m.id === module.id ? { ...m, enabled: !m.enabled } : m)
    await saFetch(`/api/superadmin/users/${userId}/modules`, {
      method: 'PATCH',
      body: JSON.stringify({ modules: updated }),
    })
    setData(d => d && d.config ? { ...d, config: { ...d.config, modules: updated } } : d)
    setSaving(null)
  }

  const changePermission = async (adminId: string, permission: 'read' | 'write') => {
    setSaving(adminId)
    await saFetch(`/api/superadmin/users/${userId}/admins/${adminId}`, {
      method: 'PATCH',
      body: JSON.stringify({ permission }),
    })
    setData(d => d ? { ...d, admins: d.admins.map(a => a.id === adminId ? { ...a, permission } : a) } : d)
    setSaving(null)
  }

  const revokeAdmin = async (adminId: string) => {
    if (!confirm('Révoquer cet administrateur ?')) return
    setSaving(adminId)
    await saFetch(`/api/superadmin/users/${userId}/admins/${adminId}`, { method: 'DELETE' })
    setData(d => d ? { ...d, admins: d.admins.filter(a => a.id !== adminId) } : d)
    setSaving(null)
  }

  const handleImpersonate = () => {
    const name = data?.config?.user_name || data?.profile?.display_name || data?.email || ''
    impersonate(userId, name)
    router.push('/')
  }

  if (loading || !isSuperAdmin) return null

  const userName = data?.config?.user_name || data?.profile?.display_name || data?.email || 'Utilisateur'

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/superadmin" className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{fetching ? '...' : userName}</h1>
          <p className="text-sm text-gray-400">{data?.email}</p>
        </div>
        <button onClick={handleImpersonate} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold text-sm">
          <span>👁️</span><span>Voir le compte</span>
        </button>
        <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-semibold text-sm">
          <span>🔒</span><span>Déconnexion</span>
        </button>
      </div>

      {fetching ? (
        <div className="text-center text-gray-400 mt-20">Chargement...</div>
      ) : (
        <>
          <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Modules</h2>
            <div className="space-y-3">
              {(data?.config?.modules ?? []).sort((a, b) => a.order - b.order).map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className="font-medium text-gray-700">{m.label}</div>
                      <div className="text-xs text-gray-400">{m.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleModule(m)}
                    disabled={saving === m.id}
                    className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${m.enabled ? 'bg-indigo-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${m.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Administrateurs <span className="text-gray-300 text-base font-normal">({data?.admins.length ?? 0})</span>
            </h2>
            {data?.admins.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun administrateur lié à ce compte.</p>
            ) : (
              <div className="space-y-3">
                {data?.admins.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-500 font-bold text-sm">{(a.display_name || a.email || '?')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700 truncate">{a.display_name || a.email}</div>
                      <div className="text-xs text-gray-400 truncate">{a.email}</div>
                    </div>
                    <select
                      value={a.permission}
                      onChange={e => changePermission(a.id, e.target.value as 'read' | 'write')}
                      disabled={saving === a.id}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                    >
                      <option value="read">Lecture</option>
                      <option value="write">Édition</option>
                    </select>
                    <button
                      onClick={() => revokeAdmin(a.id)}
                      disabled={saving === a.id}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 active:scale-95 transition-all disabled:opacity-50"
                    >🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
