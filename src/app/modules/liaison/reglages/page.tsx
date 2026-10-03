'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/authContext'
import { DEFAULT_MOTIFS } from '@/lib/liaisonRatings'

type Motif = { id: string; label: string; kind: 'negatif' | 'positif'; order: number }

const SECTIONS: { kind: Motif['kind']; titre: string; aide: string; placeholder: string }[] = [
  { kind: 'negatif', titre: '😟 Ce qui peut mal se passer', aide: 'Proposés quand tu choisis « Mal » ou « Très mal ».', placeholder: 'ex: Parle trop fort' },
  { kind: 'positif', titre: '🙂 Ce qui peut bien se passer', aide: 'Proposés quand tu choisis « Bien » ou « Très bien ».', placeholder: 'ex: Très souriante' },
]

const input = 'w-full border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white'

export default function LiaisonReglagesPage() {
  const { activeUserId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [motifs, setMotifs] = useState<Motif[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({ negatif: '', positif: '' })
  const [seeding, setSeeding] = useState(false)

  const load = async () => {
    if (!activeUserId) return
    const res = await fetch(`/api/liaison-motifs?userId=${activeUserId}`)
    const data = res.ok ? await res.json() : []
    setMotifs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeUserId])

  const add = async (kind: Motif['kind']) => {
    const label = drafts[kind].trim()
    if (!activeUserId || !label) return
    await fetch('/api/liaison-motifs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, label, kind, order: motifs.length }),
    })
    setDrafts(d => ({ ...d, [kind]: '' }))
    await load()
  }

  const remove = async (m: Motif) => {
    if (!confirm(`Supprimer « ${m.label} » ? (les évaluations déjà enregistrées gardent leur texte)`)) return
    await fetch('/api/liaison-motifs?id=' + m.id, { method: 'DELETE' })
    setMotifs(prev => prev.filter(x => x.id !== m.id))
  }

  const seedDefaults = async () => {
    if (!activeUserId) return
    setSeeding(true)
    await Promise.all(DEFAULT_MOTIFS.map((m, i) =>
      fetch('/api/liaison-motifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, label: m.label, kind: m.kind, order: motifs.length + i }),
      })
    ))
    await load()
    setSeeding(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📔 Réglages du cahier de liaison</h1>
        <p className="text-sm text-gray-400">Les motifs rapides se cochent en un appui au lieu d&apos;être tapés.</p>
      </div>

      {motifs.length === 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center mb-6">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-gray-600 font-medium mb-2">Aucun motif pour l&apos;instant</p>
          <p className="text-sm text-gray-400 mb-5">Charge les motifs de base (absence, retard, poubelle non sortie, lève-malade…), tu pourras les modifier.</p>
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
          >
            {seeding ? 'Chargement...' : '📥 Charger les motifs de base'}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {SECTIONS.map(s => (
          <section key={s.kind} className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-700">{s.titre}</h2>
            <p className="text-xs text-gray-400 mb-3">{s.aide}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {motifs.filter(m => m.kind === s.kind).map(m => (
                <div key={m.id} className="flex items-center gap-2 bg-gray-50 rounded-2xl pl-4 pr-2 py-2">
                  <span className="font-semibold text-gray-700 break-words">{m.label}</span>
                  <button onClick={() => remove(m)} aria-label={`Supprimer ${m.label}`} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 text-sm">✕</button>
                </div>
              ))}
              {motifs.filter(m => m.kind === s.kind).length === 0 && <p className="text-sm text-gray-400">Aucun motif.</p>}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={drafts[s.kind]}
                onChange={e => setDrafts(d => ({ ...d, [s.kind]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') add(s.kind) }}
                placeholder={s.placeholder}
                className={input}
              />
              <button
                onClick={() => add(s.kind)}
                disabled={!drafts[s.kind].trim()}
                className="px-5 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
          </section>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm text-center mt-6">
        <p className="text-4xl mb-3">🤝</p>
        <p className="text-gray-600 font-medium mb-2">Aidants et responsables</p>
        <p className="text-sm text-gray-400 mb-5">
          Le cahier de liaison utilise les aidants et les responsables déjà configurés pour le module Mails.
        </p>
        <Link href="/modules/mails/reglages" className="inline-block px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all">
          Aller aux réglages Mails →
        </Link>
      </div>
    </main>
  )
}
