'use client'
import Link from 'next/link'
import { DEFAULT_MODULES } from '@/lib/defaultConfig'

// Mêmes couleurs que les cartes de l'accueil (cohérence visuelle).
const GRADIENTS: Record<string, string> = {
  routine: 'from-amber-400 to-orange-500',
  reminders: 'from-fuchsia-400 to-purple-600',
  agenda: 'from-rose-400 to-red-500',
  contacts: 'from-sky-400 to-blue-600',
  aidants: 'from-emerald-400 to-teal-600',
  services: 'from-indigo-400 to-violet-600',
  finances: 'from-lime-400 to-green-600',
}

// Explications simples et claires du but de chaque module.
const HELP: Record<string, string> = {
  routine: "Retrouvez les étapes de votre journée, une par une, avec des images. Cochez chaque étape quand elle est faite : vous voyez toujours où vous en êtes.",
  reminders: "Recevez une alerte au bon moment pour vos médicaments, vos repas et vos tâches importantes. Plus besoin d'y penser : l'application vous prévient.",
  agenda: "Voyez tous vos rendez-vous et événements sur un calendrier simplifié, pour préparer votre semaine sereinement et ne rien oublier.",
  contacts: "Appelez vos proches et vos numéros d'urgence en un seul appui, sans avoir à chercher le bon numéro.",
  aidants: "Retrouvez les personnes qui vous accompagnent (société d'aide, intervenants) et leurs horaires de passage.",
  services: "Accédez d'un seul clic aux sites et services utiles : CAF, CPAM, impôts, santé… Tout est réuni au même endroit.",
  finances: "Suivez votre budget du quotidien simplement, pour savoir en un coup d'œil ce qu'il vous reste.",
}

export default function AidePage() {
  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto pb-16">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-white border-2 border-gray-200 px-4 py-2.5 text-gray-700 font-semibold hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
        >
          <span className="text-lg leading-none">←</span> Retour
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="text-5xl mb-2">💡</div>
        <h1 className="text-3xl font-bold text-gray-800">Aide</h1>
        <p className="text-lg text-gray-500 mt-1">À quoi sert chaque partie de l&apos;application&nbsp;?</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DEFAULT_MODULES.map(m => (
          <div key={m.id} className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${GRADIENTS[m.id] ?? 'from-slate-400 to-slate-600'} flex items-center justify-center text-3xl shadow`}>
              {m.icon}
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800">{m.label}</div>
              <div className="text-gray-600 mt-1 leading-relaxed">{HELP[m.id] ?? m.description}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
