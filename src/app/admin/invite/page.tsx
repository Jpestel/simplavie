'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/profileContext'
import { useRouter } from 'next/navigation'

type AdminUser = {
  id: string
  display_name: string | null
  permission: 'read' | 'write'
}

type Permission = 'read' | 'write'

export default function AdminInvitePage() {
  const { user, hasOwnAccount, adminAssignments, profile: authProfile } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [contactPermissions, setContactPermissions] = useState<Record<string, Permission>>({})
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const contactsWithEmail = profile.contacts.filter(c => c.email)

  useEffect(() => {
    if (!user) { setLoadingAdmins(false); return }
    fetch(`/api/admin-assignments?ownerId=${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAdmins(data ?? []); setLoadingAdmins(false) })
      .catch(() => setLoadingAdmins(false))
  }, [user])

  const handleTogglePermission = async (admin: AdminUser) => {
    const next: Permission = admin.permission === 'read' ? 'write' : 'read'
    setTogglingId(admin.id)
    await fetch('/api/admin-assignments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: admin.id, permission: next }),
    })
    setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, permission: next } : a))
    setTogglingId(null)
  }

  const handleRevoke = async (adminId: string) => {
    if (!confirm('Retirer l\'accès à cette personne ?')) return
    setRevoking(adminId)
    await fetch(`/api/admin-assignments?id=${adminId}`, { method: 'DELETE' })
    setAdmins(prev => prev.filter(a => a.id !== adminId))
    setRevoking(null)
  }

  const handleInvite = async (contactId: string, contactEmail: string, contactName: string) => {
    if (!user) return
    setSendingTo(contactId)
    const permission = contactPermissions[contactId] ?? 'read'

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: user.id, permission }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data?.token) {
        const link = `${window.location.origin}/join?token=${data.token}`
        const ownerName = profile.firstName || authProfile?.display_name || 'votre proche'
        const permLabel = permission === 'write' ? 'consulter et modifier' : 'consulter'
        const subject = encodeURIComponent(`Accès à l'espace SimplaVie de ${ownerName}`)
        const body = encodeURIComponent(
          `Bonjour ${contactName},\n\n` +
          `Vous avez été invité(e) à accéder à l'espace SimplaVie de ${ownerName} en mode « ${permLabel} ».\n\n` +
          `Cliquez sur ce lien pour accepter l'invitation :\n${link}\n\n` +
          `Ce lien est à usage unique.\n\nSimplaVie`
        )
        window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`
      }
    }

    setSendingTo(null)
  }

  if (!hasOwnAccount) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-gray-400">
          <p className="text-xl">Action non disponible</p>
          <p className="mt-2 text-sm">Seul le propriétaire d&apos;un compte SimplaVie peut gérer ses administrateurs.</p>
          <button onClick={() => router.back()} className="mt-6 text-indigo-500 font-semibold">← Retour</button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Accès et invitations</h1>
      </div>

      {/* Bloc 1 — Administrateurs actuels */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-700 mb-3">Administrateurs actuels</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loadingAdmins ? (
            <div className="p-6 text-center text-gray-400">Chargement...</div>
          ) : admins.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <p>Aucun administrateur pour l&apos;instant.</p>
              <p className="text-sm mt-1">Invitez quelqu&apos;un via vos contacts ci-dessous.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-500 shrink-0 text-lg">
                    {(admin.display_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">
                      {admin.display_name ?? 'Administrateur'}
                    </div>
                    <button
                      onClick={() => handleTogglePermission(admin)}
                      disabled={togglingId === admin.id}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium transition-all active:scale-95"
                    >
                      {admin.permission === 'write' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
                          ✏️ Lecture + Édition
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                          👁️ Lecture seule
                        </span>
                      )}
                      <span className="text-gray-400 text-xs">Changer</span>
                    </button>
                  </div>
                  <button
                    onClick={() => handleRevoke(admin.id)}
                    disabled={revoking === admin.id}
                    className="px-3 py-2 rounded-xl bg-red-50 text-red-500 font-semibold text-sm active:scale-95 transition-all disabled:opacity-40 shrink-0"
                  >
                    {revoking === admin.id ? '...' : 'Retirer'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bloc 2 — Inviter via contacts */}
      <section>
        <h2 className="text-lg font-bold text-gray-700 mb-3">Inviter via vos contacts</h2>

        {contactsWithEmail.length === 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
            <p className="text-orange-700 font-semibold">Aucun contact avec une adresse e-mail</p>
            <p className="text-orange-600 text-sm mt-1">Ajoutez des e-mails à vos contacts dans le profil utilisateur.</p>
            <button
              onClick={() => router.push('/admin/profile')}
              className="mt-3 text-indigo-500 font-semibold text-sm underline"
            >
              Aller au profil →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {contactsWithEmail.map(contact => {
                const perm = contactPermissions[contact.id] ?? 'read'
                const isSending = sendingTo === contact.id
                return (
                  <div key={contact.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800">{contact.name}</div>
                        <div className="text-sm text-gray-400">{contact.relation} · {contact.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex gap-1 flex-1">
                        <button
                          onClick={() => setContactPermissions(prev => ({ ...prev, [contact.id]: 'read' }))}
                          className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                            perm === 'read'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          👁️ Lecture
                        </button>
                        <button
                          onClick={() => setContactPermissions(prev => ({ ...prev, [contact.id]: 'write' }))}
                          className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                            perm === 'write'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          ✏️ Édition
                        </button>
                      </div>
                      <button
                        onClick={() => handleInvite(contact.id, contact.email!, contact.name)}
                        disabled={isSending}
                        className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-50 shrink-0"
                      >
                        {isSending ? '...' : '✉️ Inviter'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-blue-700 text-sm">
            <strong>Lecture</strong> : la personne peut consulter les informations mais pas les modifier.<br />
            <strong>Édition</strong> : la personne peut aussi modifier et supprimer des données.
          </p>
        </div>
      </section>
    </main>
  )
}
