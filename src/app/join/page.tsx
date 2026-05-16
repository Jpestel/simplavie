'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

type Invite = {
  token: string
  owner_id: string
  used_by: string | null
  permission: 'read' | 'write' | null
  owner_display_name?: string | null
}

function JoinInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [invite, setInvite] = useState<Invite | null>(null)
  const [status, setStatus] = useState<'loading' | 'invalid' | 'valid' | 'no-auth' | 'done' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function checkToken() {
      if (!token) { setStatus('invalid'); return }
      const client = getSupabase()
      if (!client) { setStatus('invalid'); return }

      const { data: { session } } = await client.auth.getSession()
      if (!session) { setStatus('no-auth'); return }

      const { data: inv } = await client
        .from('admin_invites')
        .select('token, owner_id, used_by, permission')
        .eq('token', token)
        .maybeSingle()

      if (!inv) { setStatus('invalid'); return }
      if (inv.used_by) { setStatus('invalid'); return }
      if (inv.owner_id === session.user.id) { setStatus('invalid'); return }

      const { data: ownerProfile } = await client
        .from('user_profile')
        .select('display_name')
        .eq('id', inv.owner_id)
        .maybeSingle()

      setInvite({ ...inv, owner_display_name: ownerProfile?.display_name ?? null })
      setStatus('valid')
    }
    checkToken()
  }, [token])

  async function handleJoin() {
    if (!invite) return
    const client = getSupabase()
    if (!client) return
    setBusy(true)

    const { data: { session } } = await client.auth.getSession()
    if (!session) { setStatus('no-auth'); setBusy(false); return }

    const { error: profileError } = await client
      .from('user_profile')
      .update({ role: 'admin', owner_id: invite.owner_id, permission: invite.permission ?? 'read' })
      .eq('id', session.user.id)

    if (profileError) { setStatus('error'); setErrorMsg('Profil: ' + profileError.message); setBusy(false); return }

    const { error: inviteError } = await client
      .from('admin_invites')
      .update({ used_by: session.user.id })
      .eq('token', invite.token)

    if (inviteError) { setStatus('error'); setErrorMsg('Invite: ' + inviteError.message); setBusy(false); return }

    setStatus('done')
    setBusy(false)
    router.push('/')
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-2xl text-gray-400">Chargement...</p>
      </div>
    )
  }

  if (status === 'no-auth') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-2xl font-semibold text-gray-700 mb-6">
            Veuillez d&apos;abord créer un compte
          </p>
          <Link
            href="/login"
            className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl py-4 px-8 text-xl font-bold active:scale-95 transition-all"
          >
            Créer un compte
          </Link>
        </div>
      </main>
    )
  }

  if (status === 'invalid') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-2xl font-semibold text-red-500 mb-4">
            Invitation invalide ou déjà utilisée
          </p>
          <Link
            href="/"
            className="text-indigo-500 text-lg font-medium underline"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-2xl font-semibold text-red-500">
            Une erreur est survenue. Réessaie plus tard.
          </p>
          {errorMsg && <p className="mt-4 text-sm text-red-400 font-mono break-all">{errorMsg}</p>}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Rejoindre comme administrateur
        </h1>
        {invite?.owner_display_name && (
          <p className="text-xl text-gray-500 mb-8">
            Compte de <span className="font-semibold text-gray-700">{invite.owner_display_name}</span>
          </p>
        )}
        <button
          onClick={handleJoin}
          disabled={busy}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl py-5 text-xl font-bold active:scale-95 transition-all"
        >
          {busy ? 'En cours...' : 'Confirmer'}
        </button>
        <Link
          href="/"
          className="mt-4 inline-block text-gray-400 text-lg"
        >
          Annuler
        </Link>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  )
}
