'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RATINGS, MOMENTS } from '@/lib/liaisonRatings'

type Ctx = { firstName: string; dateLabel: string; aidants: string[]; suggested: string[]; done: { rating: string; aidants: string[] }[] }

function Quick() {
  const t = useSearchParams().get('t') ?? ''
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [error, setError] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [moment, setMoment] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedRating, setSavedRating] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/liaison-quick?t=${encodeURIComponent(t)}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) { setError(d.error || 'Lien invalide.'); return }
        setCtx(d)
        // On ne pré-coche personne (sauf s'il n'y a qu'un aidant) : évite de noter le même aidant chaque jour par habitude.
        setChosen(d.aidants?.length === 1 ? d.aidants : [])
      })
      .catch(() => setError('Impossible de joindre le serveur.'))
  }, [t])

  const rate = async (rating: string) => {
    if (saving || chosen.length === 0) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/liaison-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t, rating, aidants: chosen, moment }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) setSavedRating(rating)
      else setError(d.error || "L'enregistrement a échoué, réessaie.")
    } catch {
      setError('Impossible de joindre le serveur, réessaie.')
    }
    setSaving(false)
  }

  if (error && !ctx) return <main className="min-h-screen p-6 max-w-md mx-auto text-center pt-16"><p className="text-5xl mb-4">⏳</p><p className="text-lg text-gray-700 mb-6">{error}</p><Link href="/modules/liaison" className="text-indigo-600 underline font-semibold">Ouvrir le Cahier de liaison</Link></main>
  if (!ctx) return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">Chargement...</div>

  if (savedRating) {
    const info = RATINGS.find(r => r.key === savedRating)!
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto text-center pt-16">
        <div className="bg-green-50 border-4 border-green-500 rounded-3xl p-8">
          <p className="text-6xl mb-3">✅</p>
          <h1 className="text-2xl font-bold text-green-700 mb-2">Enregistré !</h1>
          <p className="text-green-700 font-semibold">{info.emoji} {info.label} — {ctx.dateLabel}</p>
        </div>
        <Link href="/modules/liaison" className="block mt-6 text-indigo-600 underline font-semibold">Ajouter un détail ou un autre aidant dans l&apos;appli</Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">📔 Bonjour{ctx.firstName ? ` ${ctx.firstName}` : ''} !</h1>
      <p className="text-gray-600 mb-5">Comment s&apos;est passée ta journée du <strong>{ctx.dateLabel}</strong> ?</p>
      {ctx.done.length > 0 && (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-3 mb-4">Déjà évalué ce jour-là : {ctx.done.map(d => `${RATINGS.find(r => r.key === d.rating)?.emoji} ${d.aidants.join(', ')}`).join(' · ')}. Tu peux en ajouter une autre.</p>
      )}
      <p className="text-lg font-bold text-gray-700 mb-2">Qui est venu aujourd&apos;hui ?</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {ctx.aidants.map(a => (
          <button key={a} onClick={() => setChosen(c => c.includes(a) ? c.filter(x => x !== a) : [...c, a])}
            className={`px-5 py-3 rounded-2xl font-semibold text-lg border-2 active:scale-95 transition-all ${chosen.includes(a) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
            {a}{ctx.suggested.includes(a) ? <span className="block text-[11px] font-normal opacity-70">hier</span> : null}
          </button>
        ))}
        {ctx.aidants.length === 0 && <p className="text-sm text-gray-400">Aucun aidant enregistré : <Link href="/modules/liaison" className="underline">ouvre l&apos;appli</Link>.</p>}
      </div>
      <p className="text-lg font-bold text-gray-700 mb-2">À quel moment ? <span className="text-sm font-normal text-gray-400">(facultatif)</span></p>
      <div className="flex flex-wrap gap-2 mb-6">
        {MOMENTS.map(m => (
          <button key={m.key} onClick={() => setMoment(cur => (cur === m.key ? null : m.key))}
            className={`px-5 py-3 rounded-2xl font-semibold border-2 active:scale-95 transition-all ${moment === m.key ? 'bg-amber-400 border-amber-400 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {RATINGS.map(r => (
          <button key={r.key} onClick={() => rate(r.key)} disabled={saving || chosen.length === 0}
            className="py-6 rounded-3xl border-2 border-gray-200 bg-white text-center active:scale-95 transition-all disabled:opacity-40">
            <span className="block text-5xl mb-1">{r.emoji}</span>
            <span className="text-base font-semibold text-gray-700">{r.label}</span>
          </button>
        ))}
      </div>
      {chosen.length === 0 && ctx.aidants.length > 0 && <p className="text-sm text-orange-600 font-semibold mt-3 text-center">Choisis d&apos;abord un aidant.</p>}
      {error && <p className="text-sm text-red-600 font-semibold mt-3 text-center">{error}</p>}
    </main>
  )
}

export default function LiaisonRapidePage() {
  return <Suspense fallback={null}><Quick /></Suspense>
}
