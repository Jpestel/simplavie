'use client'
import Link from 'next/link'

// Le cahier de liaison réutilise les aidants et les responsables déjà
// configurés pour le module Mails (pas de liste séparée à saisir deux fois).
export default function LiaisonReglagesPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📔 Réglages du cahier de liaison</h1>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <p className="text-4xl mb-3">🤝</p>
        <p className="text-gray-600 font-medium mb-2">Rien à régler ici</p>
        <p className="text-sm text-gray-400 mb-5">
          Le cahier de liaison utilise directement les aidants et les responsables déjà configurés pour le module Mails.
        </p>
        <Link href="/modules/mails/reglages" className="inline-block px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all">
          Aller aux réglages Mails →
        </Link>
      </div>
    </main>
  )
}
