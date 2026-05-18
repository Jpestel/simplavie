'use client'
import BackBar from '@/components/BackBar'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import Link from 'next/link'

type Service = {
  id: string
  name: string
  description: string
  url: string
  icon: string
  category: string
  order: number
  active: boolean
}

export default function ServicesPage() {
  const { activeUserId } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeUserId) { setLoading(false); return }
    fetch('/api/services?userId=' + activeUserId + '&active=true')
      .then(r => r.json())
      .then(data => { setServices(Array.isArray(data) ? data : []); setLoading(false) })
  }, [activeUserId])

  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Group by category
  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  const categoryEntries = Object.entries(grouped)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl text-gray-400">Chargement...</div>
    </div>
  )

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Services utiles</h1>
          <p className="text-sm text-gray-400">Accès rapide aux sites officiels</p>
        </div>
      </div>

      {/* Empty state */}
      {categoryEntries.length === 0 && (
        <div className="text-center mt-20">
          <p className="text-4xl mb-4">🔗</p>
          <p className="text-gray-500 text-lg font-medium">Aucun service configuré</p>
          <p className="text-gray-400 text-sm mt-2">Un administrateur peut en ajouter depuis la configuration</p>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        {categoryEntries.map(([category, items]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              {category}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleOpen(service.url)}
                  className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md active:scale-95 transition-all aspect-square"
                >
                  <span className="text-5xl">{service.icon}</span>
                  <span className="font-semibold text-sm text-gray-700 text-center leading-tight">{service.name}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {categoryEntries.length > 0 && (
        <p className="text-center text-xs text-gray-300 mt-10">
          Ces liens ouvrent les sites officiels dans un nouvel onglet
        </p>
      )}
    </main>
  )
}
