'use client'
import { useConfig } from '@/lib/configContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const { config, updateConfig } = useConfig()
  const router = useRouter()

  const toggleModule = (id: string) => {
    const updated = config.modules.map(m =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    )
    updateConfig({ modules: updated })
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Configuration</h1>
        <button
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* General settings */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Général</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Prénom affiché</label>
            <input
              type="text"
              value={config.userName}
              onChange={e => updateConfig({ userName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
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
          <div>
            <label className="block text-sm text-gray-500 mb-1">Code PIN (4 chiffres)</label>
            <input
              type="password"
              maxLength={4}
              value={config.adminPassword}
              onChange={e => updateConfig({ adminPassword: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Modules</h2>
        <div className="space-y-3">
          {config.modules.map(module => (
            <div key={module.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{module.icon}</span>
                <div>
                  <div className="font-medium text-gray-700">{module.label}</div>
                  <div className="text-sm text-gray-400">{module.description}</div>
                </div>
              </div>
              <button
                onClick={() => toggleModule(module.id)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  module.enabled ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  module.enabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links to module config */}
      <section className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Configurer les modules</h2>
        <div className="space-y-2">
          <Link
            href="/admin/modules/routine"
            className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700"
          >
            <span>📋 Routine du jour</span>
            <span className="text-gray-400">→</span>
          </Link>
          <Link
            href="/admin/profile"
            className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700"
          >
            <span>👤 Profil utilisateur</span>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
