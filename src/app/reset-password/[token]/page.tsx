'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Une erreur est survenue.')
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">Nouveau mot de passe</h1>

        {done ? (
          <div className="mt-6 text-center">
            <p className="text-5xl mb-4">✅</p>
            <p className="text-gray-700 text-lg">Votre mot de passe a été mis à jour.</p>
            <p className="text-gray-400 text-sm mt-3">Redirection vers la connexion…</p>
            <Link
              href="/login"
              className="mt-6 inline-block w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl py-4 text-lg font-bold active:scale-95 transition-all"
            >
              Se connecter maintenant
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-center mb-8">Choisissez un nouveau mot de passe pour votre compte.</p>

            <div className="flex flex-col gap-4">
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-xl text-gray-800 focus:outline-none focus:border-indigo-400"
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-xl text-gray-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            {error && <p className="mt-5 text-center text-red-500 font-medium">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={busy}
              className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl py-5 text-xl font-bold active:scale-95 transition-all"
            >
              {busy ? 'Enregistrement...' : 'Valider'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
