'use client'
import Link from 'next/link'
import { Module } from '@/types'

// Fond coloré thématique par module (sert de "visuel" du module).
const GRADIENTS: Record<string, string> = {
  routine: 'from-amber-400 to-orange-500',
  reminders: 'from-fuchsia-400 to-purple-600',
  agenda: 'from-rose-400 to-red-500',
  contacts: 'from-sky-400 to-blue-600',
  aidants: 'from-emerald-400 to-teal-600',
  services: 'from-indigo-400 to-violet-600',
  finances: 'from-lime-400 to-green-600',
}

export default function ModuleCard({ module, locked = false }: { module: Module; locked?: boolean }) {
  const gradient = GRADIENTS[module.id] ?? 'from-slate-400 to-slate-600'
  return (
    <Link
      href={`/modules/${module.id}`}
      aria-label={module.label}
      className={`group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} shadow-sm hover:shadow-xl active:scale-[0.98] transition-all aspect-[4/5] focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300`}
    >
      {/* Grande icône = visuel du module */}
      <div className="flex-1 flex items-center justify-center">
        <span aria-hidden className="text-6xl md:text-7xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
          {module.icon}
        </span>
      </div>

      {/* Bandeau texte, sur voile sombre pour la lisibilité */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
        <div className="relative px-4 pb-4 pt-8">
          <div className="text-lg md:text-xl xl:text-2xl font-extrabold text-white leading-tight drop-shadow-md">
            {module.label}
          </div>
          <div className="text-white/90 text-xs md:text-sm mt-0.5 drop-shadow line-clamp-2">
            {module.description}
          </div>
        </div>
      </div>

      {locked && (
        <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-white/95 text-orange-600 shadow">
          🔒 À compléter
        </span>
      )}
    </Link>
  )
}
