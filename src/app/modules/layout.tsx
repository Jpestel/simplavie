'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useProfile } from '@/lib/profileContext'
import { useConfig } from '@/lib/configContext'
import { missingPrerequisites, ITEM_SECTION } from '@/lib/modulePrerequisites'

// Barrière de prérequis : avant d'accéder à un module, on vérifie que les
// éléments de profil requis sont renseignés. Sinon on invite à les compléter.
export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, isLoading } = useProfile()
  const { config } = useConfig()

  const moduleId = pathname.split('/')[2] ?? ''
  const missing = missingPrerequisites(moduleId, profile)

  if (isLoading) return null
  if (missing.length === 0) return <>{children}</>

  const moduleLabel = config.modules.find(m => m.id === moduleId)?.label ?? 'ce module'
  const firstSection = ITEM_SECTION[missing[0].key] ?? ''

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Complétez votre profil</h1>
      <p className="text-gray-500 mb-6">
        Pour utiliser <strong>{moduleLabel}</strong>, renseignez d&apos;abord :
      </p>
      <ul className="w-full space-y-2 mb-8">
        {missing.map(m => (
          <li key={m.key} className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-orange-700 font-semibold">
            {m.label}
          </li>
        ))}
      </ul>
      <Link
        href={`/profil${firstSection ? `?section=${firstSection}` : ''}`}
        className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all"
      >
        Compléter mon profil →
      </Link>
      <Link href="/" className="mt-3 text-gray-400 text-sm hover:text-gray-600">← Retour à l&apos;accueil</Link>
    </main>
  )
}
