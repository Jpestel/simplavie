'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { saFetch } from '@/lib/superadminFetch'
import BackBar from '@/components/BackBar'
import { AgendaCategoryDef } from '@/types'
import { allCategories, colorOf, AGENDA_COLORS, genCategoryId } from '@/lib/agendaCategories'

type Module = { id: string; label: string; icon: string; enabled: boolean; order: number; name: string; description: string; locked?: boolean }
type Admin = { id: string; display_name: string | null; email: string; permission: 'read' | 'write' }
type UserDetail = {
  profile: { display_name: string | null; global_role: string | null } | null
  config: { user_name: string; modules: Module[]; agendaCategories?: AgendaCategoryDef[] } | null
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    const nowEnabled = !module.enabled
    const updated = data.config.modules.map(m =>
      m.id === module.id ? { ...m, enabled: nowEnabled, locked: !nowEnabled } : m
    )
    await saFetch(`/api/superadmin/users/${userId}/modules`, {
      method: 'PATCH',
      body: JSON.stringify({ modules: updated }),
    })
    setData(d => d && d.config ? { ...d, config: { ...d.config, modules: updated } } : d)
    setSaving(null)
  }

  // ── Catégories d'agenda (réservé au Super Admin) ──
  const agendaCats = allCategories(data?.config?.agendaCategories)

  const saveCats = async (next: AgendaCategoryDef[]) => {
    setData(d => (d && d.config ? { ...d, config: { ...d.config, agendaCategories: next } } : d))
    await saFetch(`/api/superadmin/users/${userId}/agenda-categories`, {
      method: 'PATCH',
      body: JSON.stringify({ agendaCategories: next }),
    })
  }
  const updateCat = (id: string, patch: Partial<AgendaCategoryDef>) =>
    saveCats(agendaCats.map(c => (c.id === id ? { ...c, ...patch } : c)))
  const addCat = () =>
    saveCats([...agendaCats, { id: genCategoryId(), label: 'Nouvelle catégorie', icon: '📌', color: 'blue', enabled: true }])
  const removeCat = (id: string) => {
    if (!confirm('Supprimer cette catégorie ?\nLes rendez-vous qui l\'utilisent resteront visibles avec un affichage neutre.')) return
    saveCats(agendaCats.filter(c => c.id !== id))
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

  const handleDelete = async () => {
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await saFetch(`/api/superadmin/users/${userId}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Suppression impossible.')
      router.push('/superadmin')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Suppression impossible.')
      setDeleting(false)
    }
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

          <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-1">🏷️ Catégories d&apos;agenda</h2>
            <p className="text-sm text-gray-400 mb-4">
              Définissez les catégories de rendez-vous de cet utilisateur. Seules les catégories
              <strong> visibles</strong> lui seront proposées dans son agenda.
            </p>

            <div className="space-y-3">
              {agendaCats.map(cat => {
                const col = colorOf(cat.color)
                return (
                  <div key={cat.id} className={`rounded-2xl border-2 p-4 space-y-3 ${cat.enabled !== false ? `${col.bg} ${col.border}` : 'bg-white border-gray-200 opacity-70'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        value={cat.icon}
                        onChange={e => updateCat(cat.id, { icon: e.target.value.slice(0, 2) })}
                        aria-label="Icône"
                        className="w-14 text-center text-2xl border border-gray-200 rounded-xl py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <input
                        value={cat.label}
                        onChange={e => updateCat(cat.id, { label: e.target.value })}
                        aria-label="Nom de la catégorie"
                        placeholder="Nom de la catégorie"
                        className="flex-1 border border-gray-200 rounded-xl p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <button onClick={() => removeCat(cat.id)} aria-label="Supprimer la catégorie"
                        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all">🗑️</button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {AGENDA_COLORS.map(c => (
                        <button
                          key={c.key}
                          onClick={() => updateCat(cat.id, { color: c.key })}
                          aria-label={c.label}
                          title={c.label}
                          className={`w-8 h-8 rounded-full ${c.dot} transition-all active:scale-90 ${cat.color === c.key ? 'ring-4 ring-offset-1 ring-gray-400' : 'opacity-60 hover:opacity-100'}`}
                        />
                      ))}
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.enabled !== false}
                        onChange={e => updateCat(cat.id, { enabled: e.target.checked })}
                        className="w-5 h-5 accent-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {cat.enabled !== false ? 'Visible par l’utilisateur' : 'Masquée pour cet utilisateur'}
                      </span>
                    </label>
                  </div>
                )
              })}
            </div>

            <button onClick={addCat}
              className="mt-3 w-full py-3.5 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold hover:bg-indigo-50 active:scale-95 transition-all">
              + Ajouter une catégorie
            </button>
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

          <section className="bg-white rounded-2xl p-6 shadow-sm mt-6 border-2 border-red-100">
            <h2 className="text-lg font-semibold text-red-600 mb-1">Zone de danger</h2>
            <p className="text-sm text-gray-400 mb-4">
              La suppression du compte est <strong>définitive</strong> et efface toutes les données associées
              (profil, modules, routines, care, finances, agenda, rappels, services, aidants liés).
            </p>

            {!confirmDelete ? (
              <button
                onClick={() => { setConfirmDelete(true); setDeleteError(null) }}
                className="px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm active:scale-95 transition-all"
              >
                🗑️ Supprimer ce compte
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Pour confirmer, saisissez l&apos;email du compte : <strong className="text-gray-800">{data?.email}</strong>
                </p>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={data?.email ?? ''}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:border-red-300"
                />
                {deleteError && <p className="text-red-500 text-sm font-medium">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting || confirmText.trim() !== data?.email}
                    className="flex-1 px-4 py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-95 transition-all"
                  >
                    {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); setConfirmText(''); setDeleteError(null) }}
                    disabled={deleting}
                    className="px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm active:scale-95 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
      <BackBar label="Super Admin" href="/superadmin" />
    </main>
  )
}
