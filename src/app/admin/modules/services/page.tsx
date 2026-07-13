'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import Link from 'next/link'

type Service = {
  id: string
  user_id: string
  name: string
  description: string
  url: string
  icon: string
  category: string
  order: number
  active: boolean
}

const CATEGORIES = [
  'Santé',
  'Aides & Allocations',
  'Impôts & Finances',
  'Démarches administratives',
  'Logement',
  'Transports & Mobilité',
  'Autres',
]

const DEFAULT_SERVICES = [
  { name: 'Ameli (CPAM)', description: 'Remboursements, droits, carte Vitale, indemnités', url: 'https://www.ameli.fr', icon: '🏥', category: 'Santé' },
  { name: 'Mon Espace Santé', description: 'Dossier médical partagé, ordonnances, documents', url: 'https://www.monespacesante.fr', icon: '📋', category: 'Santé' },
  { name: 'Doctolib', description: 'Prendre rendez-vous chez un médecin ou spécialiste', url: 'https://www.doctolib.fr', icon: '📅', category: 'Santé' },
  { name: 'CAF', description: 'Allocations familiales, aides au logement, RSA', url: 'https://www.caf.fr', icon: '💶', category: 'Aides & Allocations' },
  { name: 'MDPH', description: 'Maison Dép. des Personnes Handicapées — AAH, PCH, carte mobilité', url: 'https://www.mdph.fr', icon: '♿', category: 'Aides & Allocations' },
  { name: 'Info Retraite', description: 'Droits retraite, simulation, relevé de carrière', url: 'https://www.info-retraite.fr', icon: '🏖️', category: 'Aides & Allocations' },
  { name: 'France Travail', description: "Allocations chômage, offres d'emploi, formation", url: 'https://www.francetravail.fr', icon: '💼', category: 'Aides & Allocations' },
  { name: 'Impôts', description: 'Déclaration de revenus, paiement, documents fiscaux', url: 'https://www.impots.gouv.fr', icon: '🧾', category: 'Impôts & Finances' },
  { name: 'Mes Aides', description: 'Simuler toutes les aides sociales auxquelles vous avez droit', url: 'https://www.mes-aides.gouv.fr', icon: '🔍', category: 'Impôts & Finances' },
  { name: 'Service-Public.fr', description: 'Toutes les démarches administratives en ligne', url: 'https://www.service-public.fr', icon: '🏛️', category: 'Démarches administratives' },
  { name: 'France Connect', description: 'Connexion sécurisée à tous les services publics', url: 'https://franceconnect.gouv.fr', icon: '🔐', category: 'Démarches administratives' },
  { name: 'ANTS', description: 'Immatriculation, permis de conduire, documents véhicule', url: 'https://www.ants.gouv.fr', icon: '🚗', category: 'Démarches administratives' },
  { name: 'ANAH', description: "Aides pour travaux d'adaptation du logement au handicap", url: 'https://www.anah.gouv.fr', icon: '🔧', category: 'Logement' },
  { name: 'SNCF Connect', description: 'Billets de train, tarifs réduits, carte invalidité', url: 'https://www.sncf-connect.com', icon: '🚆', category: 'Transports & Mobilité' },
  { name: 'Carte Mobilité Inclusion', description: 'Demande et renouvellement de la CMI (MDPH)', url: 'https://www.service-public.fr/particuliers/vosdroits/F15066', icon: '🪪', category: 'Transports & Mobilité' },
]

const EMPTY_FORM = { name: '', description: '', url: '', icon: '🔗', category: 'Santé' }

export default function AdminServicesPage() {
  const { activeUserId } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!activeUserId) return
    const data = await fetch('/api/services?userId=' + activeUserId).then(r => r.json())
    setServices(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeUserId])

  const seedDefaults = async () => {
    if (!activeUserId) return
    setSaving(true)
    await Promise.all(DEFAULT_SERVICES.map((s, i) =>
      fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, userId: activeUserId, order: i }),
      })
    ))
    await load()
    setSaving(false)
  }

  const handleSave = async () => {
    if (!activeUserId || !form.name || !form.url) return
    setSaving(true)
    if (editingId) {
      await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: form.name, description: form.description, url: form.url, icon: form.icon, category: form.category }),
      })
    } else {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: activeUserId, order: services.length }),
      })
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
    await load()
    setSaving(false)
  }

  const handleEdit = (s: Service) => {
    setForm({ name: s.name, description: s.description, url: s.url, icon: s.icon, category: s.category })
    setEditingId(s.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce service ?')) return
    await fetch('/api/services?id=' + id, { method: 'DELETE' })
    setServices(prev => prev.filter(s => s.id !== id))
  }

  const handleToggle = async (s: Service) => {
    await fetch('/api/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    })
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))
  }

  const cancel = () => { setForm(EMPTY_FORM); setShowForm(false); setEditingId(null) }

  // Group by category
  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg"
        >
          ←
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">🔗 Services utiles</h1>
          <p className="text-sm text-gray-400">Gérer les liens affichés</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 transition-all text-white font-semibold text-sm"
        >
          <span>＋</span>
          <span>Ajouter</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <section className="bg-white rounded-2xl p-5 shadow-sm mb-6 border-2 border-indigo-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            {editingId ? '✏️ Modifier le service' : '➕ Nouveau service'}
          </h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-20">
                <label className="block text-xs text-gray-400 mb-1">Icône</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  maxLength={2}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex: Ameli"
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="ex: Remboursements, droits, carte Vitale"
                className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Catégorie</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.url}
              className={`flex-1 py-3 rounded-xl disabled:opacity-40 text-white font-semibold active:scale-95 transition-all ${editingId ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
            </button>
            <button
              onClick={cancel}
              className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold active:scale-95 transition-all"
            >
              Annuler
            </button>
          </div>
        </section>
      )}

      {/* Empty state */}
      {services.length === 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-gray-600 font-medium mb-2">Aucun service configuré</p>
          <p className="text-sm text-gray-400 mb-6">Charge les services par défaut ou ajoute-en un manuellement</p>
          <button
            onClick={seedDefaults}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
          >
            {saving ? 'Chargement...' : '📥 Charger les services par défaut'}
          </button>
        </div>
      )}

      {/* Services list grouped by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{category}</h2>
          <div className="space-y-2">
            {items.map(s => (
              <div
                key={s.id}
                className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 ${!s.active ? 'opacity-50' : ''}`}
              >
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-700 truncate">{s.name}</div>
                  {s.description && <div className="text-xs text-gray-400 truncate">{s.description}</div>}
                  <div className="text-xs text-indigo-400 truncate">{s.url}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(s)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${s.active ? 'bg-indigo-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${s.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(s)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 active:scale-95 transition-all text-sm"
                  >
                    ✏️
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 active:scale-95 transition-all text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
