'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!email.trim()) {
      setError('Veuillez saisir votre email.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Une erreur est survenue.')
      }
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">Mot de passe oublié</h1>

        {sent ? (
          <div className="mt-6 text-center">
            <p className="text-5xl mb-4">📬</p>
            <p className="text-gray-700 text-lg">
              Si un compte est associé à cet email, vous allez recevoir un lien pour réinitialiser votre
              mot de passe.
            </p>
            <p className="text-gray-400 text-sm mt-3">Pensez à vérifier vos spams. Le lien est valable 1 heure.</p>
            <Link
              href="/login"
              className="mt-6 inline-block w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl py-4 text-lg font-bold active:scale-95 transition-all"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-center mb-8">
              Saisissez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.
            </p>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-xl text-gray-800 focus:outline-none focus:border-indigo-400"
            />

            {error && <p className="mt-5 text-center text-red-500 font-medium">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={busy}
              className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl py-5 text-xl font-bold active:scale-95 transition-all"
            >
              {busy ? 'Envoi...' : 'Envoyer le lien'}
            </button>

            <Link
              href="/login"
              className="mt-4 block w-full text-center border-2 border-gray-200 text-gray-500 rounded-2xl py-4 text-lg font-semibold active:scale-95 transition-all hover:bg-gray-50"
            >
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
