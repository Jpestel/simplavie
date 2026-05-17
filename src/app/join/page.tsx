'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/lib/authContext'

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
  const { signUp } = useAuth()
  const token = searchParams.get('token') ?? ''

  const [invite, setInvite] = useState<Invite | null>(null)
  const [status, setStatus] = useState<'loading' | 'invalid' | 'need-account' | 'valid' | 'done' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Formulaire de création de compte simplifié
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupError, setSignupError] = useState('')

  async function checkToken(client: ReturnType<typeof getSupabase>) {
    if (!token || !client) { setStatus('invalid'); return }

    const { data: inv } = await client
      .from('admin_invites')
      .select('token, owner_id, used_by, permission')
      .eq('token', token)
      .maybeSingle()

    if (!inv || inv.used_by) { setStatus('invalid'); return }

    const { data: session } = await client.auth.getSession()
    if (inv.owner_id === session.data?.session?.user?.id) { setStatus('invalid'); return }

    const { data: ownerProfile } = await client
      .from('user_profile')
      .select('display_name')
      .eq('id', inv.owner_id)
      .maybeSingle()

    setInvite({ ...inv, owner_display_name: ownerProfile?.display_name ?? null })
    return inv
  }

  useEffect(() => {
    async function init() {
      if (!token) { setStatus('invalid'); return }
      const client = getSupabase()
      if (!client) { setStatus('invalid'); return }

      const { data: { session } } = await client.auth.getSession()

      const inv = await checkToken(client)
      if (!inv) return

      if (!session) {
        setStatus('need-account')
      } else {
        setStatus('valid')
      }
    }
    init()
  }, [token])

  async function handleSignupAndJoin() {
    if (!email || !password) return
    setBusy(true)
    setSignupError('')

    const { error } = await signUp(email, password, '')
    if (error) { setSignupError(error); setBusy(false); return }

    // Petit délai pour que la session soit établie
    await new Promise(r => setTimeout(r, 800))
    setStatus('valid')
    setBusy(false)
  }

  async function handleJoin() {
    if (!invite) return
    const client = getSupabase()
    if (!client) return
    setBusy(true)

    const { data: { session } } = await client.auth.getSession()
    if (!session) { setStatus('need-account'); setBusy(false); return }

    const { error: profileError } = await client
      .from('user_profile')
      .update({ role: 'admin', owner_id: invite.owner_id, permission: invite.permission ?? 'read' })
      .eq('id', session.user.id)

    if (profileError) { setStatus('error'); setErrorMsg(profileError.message); setBusy(false); return }

    await client
      .from('admin_invites')
      .update({ used_by: session.user.id })
      .eq('token', invite.token)

    setStatus('done')
    setBusy(false)
    // Redirection vers la config, pas l'accueil
    router.push('/admin')
  }

  async function handleDecline() {
    router.push('/')
  }

  const ownerName = invite?.owner_display_name ?? 'quelqu\'un'

  if (status === 'loading') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-2xl text-gray-400">Chargement...</p>
    </div>
  )

  if (status === 'invalid') return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-5xl mb-4">🔗</p>
        <p className="text-xl font-semibold text-red-500 mb-2">Invitation invalide ou déjà utilisée</p>
        <button onClick={() => router.push('/')} className="mt-4 text-indigo-500 text-base underline">Retour à l&apos;accueil</button>
      </div>
    </main>
  )

  if (status === 'error') return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-xl font-semibold text-red-500 mb-2">Une erreur est survenue</p>
        {errorMsg && <p className="text-sm text-red-400 font-mono mt-2">{errorMsg}</p>}
      </div>
    </main>
  )

  // Pas de compte → créer un compte simplifié
  if (status === 'need-account') return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <p className="text-5xl mb-4">🤝</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {ownerName} vous invite à l&apos;aider
          </h1>
          <p className="text-gray-500 text-sm">
            Créez un accès pour gérer son quotidien sur SimplaVie
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Votre email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@email.com"
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Choisissez un mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {signupError && <p className="text-red-500 text-sm">{signupError}</p>}
        </div>

        <button
          onClick={handleSignupAndJoin}
          disabled={busy || !email || !password}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl py-4 text-lg font-bold active:scale-95 transition-all mb-3"
        >
          {busy ? 'Création en cours...' : 'Créer mon accès et accepter'}
        </button>
        <button onClick={handleDecline} className="w-full text-gray-400 text-sm py-2">
          Refuser l&apos;invitation
        </button>
      </div>
    </main>
  )

  // Déjà connecté → accepter/refuser
  if (status === 'valid') return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-5xl mb-4">🤝</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {ownerName} vous invite à l&apos;aider
        </h1>
        <p className="text-gray-500 mb-8">
          Vous aurez accès à la configuration de son compte SimplaVie pour l&apos;aider au quotidien.
        </p>
        <button
          onClick={handleJoin}
          disabled={busy}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl py-4 text-xl font-bold active:scale-95 transition-all mb-3"
        >
          {busy ? 'En cours...' : '✅ Accepter d\'aider ' + ownerName}
        </button>
        <button
          onClick={handleDecline}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl py-3 text-base font-medium active:scale-95 transition-all"
        >
          Refuser
        </button>
      </div>
    </main>
  )

  return null
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  )
}
