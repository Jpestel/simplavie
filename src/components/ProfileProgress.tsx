'use client'
import Link from 'next/link'

// Pastille circulaire « Profil X % » cliquable, à placer en haut à droite de
// l'accueil. Renvoie vers la page /profil pour compléter au choix.
export default function ProfileProgress({ percent }: { percent: number }) {
  const size = 44
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, percent)) / 100)
  const complete = percent >= 100

  return (
    <Link
      href="/profil"
      aria-label={`Profil rempli à ${percent}%`}
      className="flex items-center gap-2 rounded-2xl bg-white border border-gray-100 shadow-sm pl-2 pr-3 py-1.5 hover:shadow-md active:scale-95 transition-all"
    >
      <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={complete ? '#22c55e' : '#6366f1'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute text-[11px] font-bold text-gray-700">{percent}%</span>
      </span>
      <span className="text-left leading-tight">
        <span className="block text-xs font-semibold text-gray-700">{complete ? 'Profil complet' : 'Mon profil'}</span>
        <span className="block text-[11px] text-gray-400">{complete ? '✓ à jour' : 'à compléter'}</span>
      </span>
    </Link>
  )
}
