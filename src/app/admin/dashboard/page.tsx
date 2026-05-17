'use client'
import BackBar from '@/components/BackBar'
import { useState } from 'react'
import { useConfig } from '@/lib/configContext'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const { config, updateConfig } = useConfig()
  const { signOut, isAdmin, hasOwnAccount, createOwnAccount } = useAuth()
  const router = useRouter()
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [createError, setCreateError] = useState('')

  const handleCreateOwnAccount = async () => {
    setCreatingAccount(true)
    setCreateError('')
    const { error } = await createOwnAccount()
    if (error) { setCreateError(error); setCreatingAccount(false); return }
    router.push('/')
  }

  const toggleModule = (id: string) => {
    const updated = config.modules.map(m =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    )
    updateConfig({ modules: updated })
  }

  const sorted = [...config.modules].sort((a, b) => a.order - b.order)

  const moveModule = (index: number, direction: -1 | 1) => {
    const next = [...sorted]
    const swap = index + direction
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    updateConfig({ modules: next.map((m, i) => ({ ...m, order: i })) })
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Configuration</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition-all text-indigo-600 font-semibold text-sm"
          >
            <span>🏠</span>
            <span>Accueil</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-semibold text-sm"
          >
            <span>🔒</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Général</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Couleur principale</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.primaryColor}
                onChange={e => updateConfig({ primaryColor: e.target.value })}
                className="w-12 h-12 rounded-xl border-0 cursor-pointer"
              />
              <span className="text-gray-400 text-sm">{config.primaryColor}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Modules</h2>
        <div className="space-y-3">
          {sorted.map((module, i) => (
            <div key={module.id} className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50">
              {/* Boutons ordre */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => moveModule(i, -1)}
                  disabled={i === 0}
                  aria-label="Monter"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none text-gray-500 text-lg font-bold"
                >▲</button>
                <button
                  onClick={() => moveModule(i, 1)}
                  disabled={i === sorted.length - 1}
                  aria-label="Descendre"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none text-gray-500 text-lg font-bold"
                >▼</button>
              </div>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{module.icon}</span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-700">{module.label}</div>
                  <div className="text-sm text-gray-400">{module.description}</div>
                  {module.locked && (
                    <div className="text-xs text-orange-400 mt-0.5">🔒 Désactivé par l&apos;administrateur</div>
                  )}
                </div>
              </div>
              {module.locked ? (
                <div className="w-12 h-6 rounded-full bg-gray-100 flex items-center justify-center cursor-not-allowed shrink-0">
                  <span className="text-xs text-gray-300">🔒</span>
                </div>
              ) : (
                <button
                  onClick={() => toggleModule(module.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                    module.enabled ? 'bg-indigo-500' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    module.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Configurer les modules</h2>
        <div className="space-y-2">
          <Link
            href="/admin/profile"
            className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700"
          >
            <span>👤 Profil utilisateur</span>
            <span className="text-gray-400">→</span>
          </Link>
          {[
            { id: 'routine',   href: '/admin/modules/routine',   label: '📋 Routine du jour' },
            { id: 'contacts',  href: '/admin/modules/contacts',  label: "📞 Contacts d'urgence" },
            { id: 'aidants',   href: '/admin/modules/aidants',   label: '🤝 Mes aidants' },
            { id: 'reminders', href: '/admin/modules/reminders', label: '🔔 Rappels' },
            { id: 'services',  href: '/admin/modules/services',  label: '🔗 Services utiles' },
          ].filter(item => {
            const m = config.modules.find(m => m.id === item.id)
            return m && m.enabled && !m.locked
          }).map(item => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700"
            >
              <span>{item.label}</span>
              <span className="text-gray-400">→</span>
            </Link>
          ))}
          {hasOwnAccount && (
            <Link
              href="/admin/invite"
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700"
            >
              <span>👥 Gérer les administrateurs</span>
              <span className="text-gray-400">→</span>
            </Link>
          )}
        </div>
      </section>

      {isAdmin && !hasOwnAccount && (
        <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-6">
          <h2 className="text-base font-semibold text-indigo-800 mb-1">Vous souhaitez aussi utiliser SimplaVie ?</h2>
          <p className="text-sm text-indigo-600 mb-4">
            Créez votre propre compte pour accéder à votre espace personnel SimplaVie.
          </p>
          {createError && <p className="text-red-500 text-sm mb-3">{createError}</p>}
          <button
            onClick={handleCreateOwnAccount}
            disabled={creatingAccount}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl py-3 font-bold text-sm active:scale-95 transition-all"
          >
            {creatingAccount ? 'Création...' : 'Créer mon compte SimplaVie'}
          </button>
        </section>
      )}
      <BackBar />
    </main>
  )
}
