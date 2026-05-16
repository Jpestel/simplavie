'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Invite = { id: string; token: string; used_by: string | null }

export default function AdminInvitePage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [invite, setInvite] = useState<Invite | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const inviteLink = invite
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join?token=${invite.token}`
    : ''

  const loadInvite = async () => {
    if (!user || !isSupabaseConfigured) { setLoading(false); return }
    const sb = getSupabase()!
    const { data } = await sb
      .from('admin_invites')
      .select('id, token, used_by')
      .eq('owner_id', user.id)
      .is('used_by', null)
      .maybeSingle()
    setInvite(data as Invite | null)
    setLoading(false)
  }

  useEffect(() => { loadInvite() }, [user])

  const generateInvite = async () => {
    if (!user || !isSupabaseConfigured) return
    const sb = getSupabase()!
    if (invite) {
      await sb.from('admin_invites').delete().eq('id', invite.id)
    }
    const { data } = await sb
      .from('admin_invites')
      .insert({ owner_id: user.id })
      .select('id, token, used_by')
      .single()
    setInvite(data as Invite)
    setCopied(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (profile?.role === 'admin') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-gray-400">
          <p className="text-xl">Action non disponible</p>
          <p className="mt-2 text-sm">Seul le propriétaire du compte peut gérer les administrateurs.</p>
          <button onClick={() => router.back()} className="mt-6 text-indigo-500 font-semibold">← Retour</button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Accès administrateurs</h1>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
        <p className="text-gray-600 mb-6 leading-relaxed">
          Partagez ce lien avec une personne de confiance pour qu&apos;elle puisse accéder à la configuration de votre compte.
          Le lien est à usage unique.
        </p>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Chargement...</div>
        ) : invite ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 break-all text-sm text-gray-600 font-mono border border-gray-200">
              {inviteLink}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg active:scale-95 transition-all ${
                  copied ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
                }`}
              >
                {copied ? '✓ Copié !' : 'Copier le lien'}
              </button>
              <button
                onClick={generateInvite}
                className="px-5 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold active:scale-95 transition-all"
                title="Révoquer et régénérer"
              >
                🔄
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generateInvite}
            className="w-full py-5 rounded-2xl bg-indigo-500 text-white font-bold text-xl active:scale-95 transition-all"
          >
            Générer un lien d&apos;invitation
          </button>
        )}
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <p className="text-orange-700 text-sm font-semibold">⚠️ Une fois utilisé, le lien n&apos;est plus valable.</p>
        <p className="text-orange-600 text-sm mt-1">Générez-en un nouveau si vous souhaitez inviter une autre personne.</p>
      </div>
    </main>
  )
}
