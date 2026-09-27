'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function BugReportPage() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || ''
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!message.trim()) {
      setError('Décris un peu le problème avant d’envoyer.')
      return
    }
    setError('')
    setSending(true)
    const res = await fetch('/api/bug-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim(), page: from || null }),
    })
    setSending(false)
    if (res.ok) {
      setSent(true)
      setMessage('')
    } else {
      setError('Erreur lors de l’envoi, réessaie dans un instant.')
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen p-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Merci !</h1>
        <p className="text-gray-500 mb-6">Ton signalement a bien été envoyé.</p>
        <Link href="/" className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all">
          Retour à l&apos;accueil
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto pb-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-white border-2 border-gray-200 px-4 py-2.5 text-gray-700 font-semibold hover:bg-gray-50 active:scale-95 transition-all shadow-sm mb-4"
        >
          <span className="text-lg leading-none">←</span> Retour
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">🐛 Signaler un bug</h1>
        <p className="text-sm text-gray-400">Décris ce qui ne marche pas, ça part directement au créateur de l&apos;appli.</p>
      </div>

      <div className="space-y-4">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="ex: Quand j'appuie sur ce bouton, rien ne se passe…"
          className="w-full min-h-[160px] border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {error && <p className="text-red-500 font-medium">{error}</p>}
        <button
          onClick={submit}
          disabled={sending}
          className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40"
        >
          {sending ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
    </main>
  )
}
