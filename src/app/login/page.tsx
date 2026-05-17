'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [isFirstSetup, setIsFirstSetup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestSignup, setSuggestSignup] = useState(false)
  const [busy, setBusy] = useState(false)

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'Email ou mot de passe incorrect.'
    }
    if (msg.includes('Email not confirmed')) {
      return 'Votre adresse e-mail n\'est pas confirmée. Vérifiez votre boîte mail.'
    }
    if (msg.includes('User not found') || msg.includes('user_not_found')) {
      return 'Aucun compte trouvé avec cet email.'
    }
    if (msg.includes('Too many requests') || msg.includes('over_email_send_rate_limit')) {
      return 'Trop de tentatives. Réessayez dans quelques minutes.'
    }
    if (msg.includes('Password should be at least')) {
      return 'Le mot de passe doit contenir au moins 6 caractères.'
    }
    if (msg.includes('User already registered') || msg.includes('already_registered')) {
      return 'Un compte existe déjà avec cet email.'
    }
    return msg
  }

  useEffect(() => {
    fetch('/api/auth/is-first-setup')
      .then(r => r.json())
      .then(d => {
        if (d.isFirst) { setIsFirstSetup(true); setMode('signup') }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit() {
    setError(null)
    setBusy(true)
    let result: { error: string | null }
    if (mode === 'signup') {
      result = await signUp(email, password, name)
    } else {
      result = await signIn(email, password)
    }
    setBusy(false)
    if (result.error) {
      const translated = translateError(result.error)
      setError(translated)
      if (mode === 'login' && (
        result.error.includes('Invalid login credentials') ||
        result.error.includes('invalid_credentials') ||
        result.error.includes('User not found')
      )) {
        setSuggestSignup(true)
      }
    } else {
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {isFirstSetup && (
          <div className="mb-6 bg-violet-50 border border-violet-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🛡️</p>
            <p className="text-violet-800 font-bold">Premier lancement</p>
            <p className="text-violet-600 text-sm mt-1">Ce compte sera le Super Administrateur de SimplaVie.</p>
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
          {mode === 'login' ? 'Se connecter' : isFirstSetup ? 'Créer le Super Admin' : 'Créer un compte'}
        </h1>

        <div className="flex flex-col gap-4">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Prénom (optionnel)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-xl text-gray-800 focus:outline-none focus:border-indigo-400"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-xl text-gray-800 focus:outline-none focus:border-indigo-400"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-xl text-gray-800 focus:outline-none focus:border-indigo-400"
          />
        </div>

        {error && (
          <div className="mt-5 text-center">
            <p className="text-red-500 font-medium">{error}</p>
            {suggestSignup && (
              <button
                onClick={() => { setMode('signup'); setError(null); setSuggestSignup(false) }}
                className="mt-2 text-indigo-500 font-semibold text-sm underline"
              >
                Créer un compte →
              </button>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl py-5 text-xl font-bold active:scale-95 transition-all"
        >
          {busy ? 'En cours...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>

        {!isFirstSetup && (
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
            className="mt-4 w-full border-2 border-gray-200 text-gray-500 rounded-2xl py-4 text-lg font-semibold active:scale-95 transition-all hover:bg-gray-50"
          >
            {mode === 'login' ? 'Créer un compte' : 'J\'ai déjà un compte'}
          </button>
        )}
      </div>
    </main>
  )
}
