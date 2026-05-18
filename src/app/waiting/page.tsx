'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { useConfig } from '@/lib/configContext'
import { useRouter } from 'next/navigation'

export default function WaitingPage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const { config, reloadConfig, isLoading: configLoading } = useConfig()
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  // Rediriger si des modules ont été activés
  useEffect(() => {
    if (authLoading || configLoading) return
    if (!user) { router.replace('/login'); return }
    if (config.modules.some(m => m.enabled)) router.replace('/')
  }, [authLoading, configLoading, user, config.modules, router])

  const handleCheck = async () => {
    setChecking(true)
    await reloadConfig()
    // Le useEffect ci-dessus prendra le relais si des modules sont activés
    setChecking(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const activated = config.modules.some(m => m.enabled)

  if (authLoading || configLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto text-center">
      <div className="text-7xl mb-6">{activated ? '🎉' : '⏳'}</div>

      <h1 className="text-2xl font-bold text-gray-800 mb-3">
        {activated ? 'Votre espace est prêt !' : 'Votre espace est en cours d\'activation'}
      </h1>

      <p className="text-gray-500 mb-2 leading-relaxed">
        Votre profil a bien été enregistré. Un administrateur a été notifié et va activer vos modules.
      </p>
      <p className="text-gray-400 text-sm mb-10">
        Vous recevrez accès à l&apos;application dès que votre espace sera prêt.
      </p>

      <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8 text-left space-y-2">
        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
          <span>✅</span> Profil créé
        </div>
        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
          <span>📧</span> Administrateur notifié
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${activated ? 'text-indigo-700' : 'text-gray-400'}`}>
          <span>{activated ? '✅' : '🔓'}</span> Activation des modules {activated ? '' : '(en attente)'}
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${activated ? 'text-indigo-700' : 'text-gray-400'}`}>
          <span>{activated ? '✅' : '🚀'}</span> Accès à SimplaVie {activated ? '' : '(en attente)'}
        </div>
      </div>

      <button
        onClick={handleCheck}
        disabled={checking}
        className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-bold text-lg mb-3 disabled:opacity-60"
      >
        {checking ? 'Vérification...' : activated ? 'Accéder à mon espace →' : 'Vérifier l\'activation'}
      </button>

      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-2xl border border-gray-200 text-gray-500 font-medium active:scale-95 transition-all"
      >
        Se déconnecter
      </button>
    </main>
  )
}
