'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
  const { data: session } = useSession()
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

  async function checkToken() {
    if (!token) { setStatus('invalid'); return }

    const res = await fetch(`/api/invites?token=${encodeURIComponent(token)}`)
    if (!res.ok) { setStatus('invalid'); return }

    const inv: Invite = await res.json()
    if (!inv || inv.used_by) { setStatus('invalid'); return }

    if (inv.owner_id === session?.user?.id) { setStatus('invalid'); return }

    setInvite(inv)
    return inv
  }

  useEffect(() => {
    async function init() {
      if (!token) { setStatus('invalid'); return }

      const inv = await checkToken()
      if (!inv) return

      if (!session?.user) {
        setStatus('need-account')
      } else {
        setStatus('valid')
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, session?.user?.id])

  async function handleSignupAndJoin() {
    if (!email || !password) return
    setBusy(true)
    setSignupError('')

    const { error } = await signUp(email, password, undefined, false)
    if (error) { setSignupError(error); setBusy(false); return }

    // Petit délai pour que la session soit établie
    await new Promise(r => setTimeout(r, 800))
    setStatus('valid')
    setBusy(false)
  }

  async function handleJoin() {
    if (!invite || !session?.user?.id) return
    setBusy(true)

    const assignRes = await fetch('/api/superadmin/users/' + invite.owner_id + '/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminUserId: session.user.id,
        permission: invite.permission ?? 'read',
      }),
    })

    if (!assignRes.ok) {
      const data = await assignRes.json()
      setStatus('error')
      setErrorMsg(data.error ?? 'Erreur lors de l\'acceptation')
      setBusy(false)
      return
    }

    // Marquer l'invitation comme utilisée
    await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: invite.token, usedBy: session.user.id }),
    })

    setStatus('done')
    setBusy(false)
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
