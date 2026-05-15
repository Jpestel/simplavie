'use client'
import { useConfig } from '@/lib/configContext'
import { useProfile } from '@/lib/profileContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const { config, isLoading: configLoading } = useConfig()
  const { profile, isLoading: profileLoading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!profileLoading && !profile.profileCompleted) {
      router.push('/onboarding')
    }
  }, [profileLoading, profile.profileCompleted, router])

  if (configLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-400">Chargement...</div>
      </div>
    )
  }

  if (!profile.profileCompleted) return null

  const activeModules = config.modules.filter(m => m.enabled).sort((a, b) => a.order - b.order)

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Bonjour {profile.firstName} 👋
        </h1>
        <p className="text-xl text-gray-500">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {activeModules.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-xl">Aucun module activé</p>
          <p className="mt-2">Demande à ton aidant de configurer l&apos;application.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeModules.map(module => (
            <Link
              key={module.id}
              href={`/modules/${module.id}`}
              className="flex items-center gap-6 bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-md transition-all active:scale-95"
              style={{ borderColor: `${config.primaryColor}20` }}
            >
              <span className="text-5xl">{module.icon}</span>
              <div>
                <div className="text-2xl font-bold text-gray-800">{module.label}</div>
                <div className="text-gray-500 mt-1">{module.description}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center mt-16">
        <Link href="/admin" className="text-gray-300 text-sm hover:text-gray-400">⚙️</Link>
      </div>
    </main>
  )
}
