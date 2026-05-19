'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import { saFetch } from '@/lib/superadminFetch'
import BackBar from '@/components/BackBar'

type UserRow = {
  id: string
  display_name: string
  email: string
  global_role: string | null
}

const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export default function SuperAdminMessagesPage() {
  const { isSuperAdmin, loading } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserRow[]>([])
  const [fetching, setFetching] = useState(true)

  const [newMessage, setNewMessage] = useState('')
  const [targetAll, setTargetAll] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; updated?: number; error?: string } | null>(null)

  const [globalMessages, setGlobalMessages] = useState<string[]>([])
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [newDefaultMessage, setNewDefaultMessage] = useState('')

  // Inspection messages d'un utilisateur
  const [inspectUserId, setInspectUserId] = useState<string>('')
  const [inspectMessages, setInspectMessages] = useState<string[]>([])
  const [loadingInspect, setLoadingInspect] = useState(false)
  const [savingInspect, setSavingInspect] = useState(false)
  const [newInspectMessage, setNewInspectMessage] = useState('')

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/')
  }, [loading, isSuperAdmin, router])

  useEffect(() => {
    if (!isSuperAdmin) return
    saFetch('/api/superadmin/users')
      .then(r => r.json())
      .then(d => {
        const list: UserRow[] = (d.users ?? []).filter((u: UserRow) => u.global_role !== 'superadmin')
        setUsers(list)
        setFetching(false)
      })
    fetch('/api/alert-messages')
      .then(r => r.json())
      .then(msgs => { setGlobalMessages(msgs); setLoadingGlobal(false) })
      .catch(() => { setGlobalMessages(DEFAULT_MESSAGES); setLoadingGlobal(false) })
  }, [isSuperAdmin])

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    )
  }

  const handleBroadcast = async () => {
    if (!newMessage.trim()) return
    if (!targetAll && selectedUserIds.length === 0) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await saFetch('/api/superadmin/broadcast-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim(), targetAll, userIds: selectedUserIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendResult({ ok: false, error: data.error ?? 'Erreur inconnue' })
      } else {
        setSendResult({ ok: true, updated: data.updated })
        setNewMessage('')
      }
    } catch {
      setSendResult({ ok: false, error: 'Erreur réseau' })
    } finally {
      setSending(false)
    }
  }

  const handleDeleteGlobal = async (index: number) => {
    const next = globalMessages.filter((_, i) => i !== index)
    setSavingGlobal(true)
    try {
      await fetch('/api/alert-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      setGlobalMessages(next)
    } finally {
      setSavingGlobal(false)
    }
  }

  const handleInspectUser = async (userId: string) => {
    setInspectUserId(userId)
    if (!userId) { setInspectMessages([]); return }
    setLoadingInspect(true)
    try {
      const res = await fetch(`/api/alert-messages?userId=${userId}`)
      const msgs = await res.json()
      setInspectMessages(msgs)
    } catch { setInspectMessages([]) }
    finally { setLoadingInspect(false) }
  }

  const handleDeleteInspect = async (index: number) => {
    const next = inspectMessages.filter((_, i) => i !== index)
    setSavingInspect(true)
    try {
      await fetch(`/api/alert-messages?userId=${inspectUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      setInspectMessages(next)
    } finally { setSavingInspect(false) }
  }

  const handleAddInspect = async () => {
    if (!newInspectMessage.trim()) return
    const next = [...inspectMessages, newInspectMessage.trim()]
    setSavingInspect(true)
    try {
      await fetch(`/api/alert-messages?userId=${inspectUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      setInspectMessages(next)
      setNewInspectMessage('')
    } finally { setSavingInspect(false) }
  }

  if (loading || !isSuperAdmin) return null

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💬 Messages aidants</h1>
          <p className="text-sm text-gray-400">Broadcaster des messages types aux utilisateurs</p>
        </div>
      </div>

      {/* Section broadcast */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6 space-y-5">
        <h2 className="text-base font-bold text-gray-700">Ajouter un message type</h2>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Message</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
            rows={3}
            placeholder="Ex : L'intervenant n'est pas venu..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          />
        </div>

        {/* Sélection destinataires */}
        <div>
          <label className="block text-sm text-gray-500 mb-2">Destinataires</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTargetAll(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${targetAll ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Tous les utilisateurs
            </button>
            <button
              onClick={() => setTargetAll(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!targetAll ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Sélection
            </button>
          </div>

          {!targetAll && (
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50">
              {fetching ? (
                <p className="text-sm text-gray-400 text-center py-2">Chargement...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Aucun utilisateur</p>
              ) : (
                users.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700 text-sm truncate">{u.display_name || '(sans nom)'}</div>
                      <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {sendResult && (
          <div className={`p-3 rounded-xl text-sm font-medium ${sendResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {sendResult.ok
              ? `Message ajouté pour ${sendResult.updated} utilisateur(s).`
              : `Erreur : ${sendResult.error}`}
          </div>
        )}

        <button
          onClick={handleBroadcast}
          disabled={sending || !newMessage.trim() || (!targetAll && selectedUserIds.length === 0)}
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold disabled:opacity-40 active:scale-95 transition-all"
        >
          {sending ? 'Envoi...' : '+ Ajouter ce message'}
        </button>
      </section>

      {/* Section messages d'un utilisateur */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6 space-y-4">
        <h2 className="text-base font-bold text-gray-700">Messages d&apos;un utilisateur</h2>
        <p className="text-sm text-gray-400">Consulter, ajouter ou supprimer les messages personnalisés d&apos;un utilisateur.</p>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Choisir un utilisateur</label>
          <select
            className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={inspectUserId}
            onChange={e => handleInspectUser(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.display_name || '(sans nom)'} — {u.email}</option>
            ))}
          </select>
        </div>

        {inspectUserId && (
          <>
            {loadingInspect ? (
              <p className="text-sm text-gray-400">Chargement...</p>
            ) : inspectMessages.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun message pour cet utilisateur.</p>
            ) : (
              <div className="space-y-2">
                {inspectMessages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="flex-1 text-gray-700 text-sm">{msg}</p>
                    <button
                      onClick={() => handleDeleteInspect(i)}
                      disabled={savingInspect}
                      className="text-gray-300 hover:text-red-500 shrink-0 text-lg disabled:opacity-40"
                    >🗑️</button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 space-y-2 border-t border-gray-100">
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none text-sm"
                rows={2}
                placeholder="Ajouter un message à cet utilisateur..."
                value={newInspectMessage}
                onChange={e => setNewInspectMessage(e.target.value)}
              />
              <button
                onClick={handleAddInspect}
                disabled={savingInspect || !newInspectMessage.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
              >+ Ajouter à cet utilisateur</button>
            </div>
          </>
        )}
      </section>

      {/* Section messages fallback */}
      <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-700">Messages par défaut</h2>
        <p className="text-sm text-gray-400">Ces messages s&apos;affichent pour les utilisateurs qui n&apos;ont pas encore de messages personnalisés.</p>

        {loadingGlobal ? (
          <p className="text-gray-400 text-sm">Chargement...</p>
        ) : globalMessages.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun message par défaut.</p>
        ) : (
          <div className="space-y-2">
            {globalMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="flex-1 text-gray-700 text-sm">{msg}</p>
                <button
                  onClick={() => handleDeleteGlobal(i)}
                  disabled={savingGlobal}
                  className="text-gray-300 hover:text-red-500 shrink-0 text-lg disabled:opacity-40"
                >🗑️</button>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un message par défaut */}
        <div className="pt-2 space-y-2 border-t border-gray-100">
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none text-sm"
            rows={2}
            placeholder="Ajouter un message par défaut..."
            value={newDefaultMessage ?? ''}
            onChange={e => setNewDefaultMessage(e.target.value)}
          />
          <button
            onClick={async () => {
              if (!newDefaultMessage?.trim()) return
              const next = [...globalMessages, newDefaultMessage.trim()]
              setSavingGlobal(true)
              await fetch('/api/alert-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
              setGlobalMessages(next)
              setNewDefaultMessage('')
              setSavingGlobal(false)
            }}
            disabled={savingGlobal || !newDefaultMessage?.trim()}
            className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
          >+ Ajouter</button>
        </div>
      </section>

      <BackBar label="Super Admin" href="/superadmin" />
    </main>
  )
}
