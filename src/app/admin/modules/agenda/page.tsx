'use client'
import { useState, useEffect } from 'react'
import { AgendaEvent } from '@/types'
import { loadEvents, saveEvents } from '@/lib/agendaService'
import { useAuth } from '@/lib/authContext'
import { useConfig } from '@/lib/configContext'
import { allCategories, visibleCategories, userVisibleCategories, findCategory, colorOf } from '@/lib/agendaCategories'
import Link from 'next/link'

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc']
const DAYS_FULL    = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

function daysUntil(date: string, today: string) {
  const ms = new Date(date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}

function countdownLabel(d: number) {
  if (d === 0) return "Aujourd'hui !"
  if (d === 1) return 'Demain'
  if (d < 0) return `Il y a ${Math.abs(d)} j`
  return `J-${d}`
}

function countdownStyle(d: number) {
  if (d < 0) return 'bg-gray-100 text-gray-400'
  if (d === 0) return 'bg-red-500 text-white font-bold'
  if (d === 1) return 'bg-orange-400 text-white font-semibold'
  if (d <= 7)  return 'bg-indigo-100 text-indigo-700 font-semibold'
  return 'bg-gray-100 text-gray-500'
}

export default function AdminAgendaPage() {
  const { activeUserId } = useAuth()
  const { config, updateConfig } = useConfig()
  const [events, setEvents]     = useState<AgendaEvent[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const [fTitle, setFTitle] = useState('')
  const [fDate,  setFDate]  = useState(today)
  const [fTime,  setFTime]  = useState('')
  const [fCat,   setFCat]   = useState<string>('medical')

  // Catégories définies par le Super Admin (non modifiables ici) ...
  const cats = allCategories(config.agendaCategories)
  const allowedCats = visibleCategories(config.agendaCategories)
  // ... et parmi elles, celles que l'utilisateur choisit d'afficher.
  const hidden = config.agendaHiddenCategories ?? []
  const formCats = userVisibleCategories(config.agendaCategories, hidden)

  const toggleCategoryVisibility = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id]
    updateConfig({ agendaHiddenCategories: next })
  }

  useEffect(() => {
    if (!activeUserId) return
    loadEvents(activeUserId).then(e => { setEvents(e); setLoading(false) })
  }, [activeUserId])

  const upcoming = [...events]
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  const past = [...events]
    .filter(e => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? ''))

  const isPastDate = fDate < today

  function openCreate() {
    setEditingId(null)
    setFTitle(''); setFTime(''); setFDate(today); setFCat(formCats[0]?.id ?? 'other')
    setShowForm(true)
  }

  function openEdit(e: AgendaEvent) {
    setEditingId(e.id)
    setFTitle(e.title)
    setFDate(e.date)
    setFTime(e.time ?? '')
    setFCat(e.category ?? formCats[0]?.id ?? 'other')
    setShowForm(true)
  }

  async function submitEvent() {
    if (!fTitle.trim() || !fDate || !activeUserId) return
    const next: AgendaEvent[] = editingId
      ? events.map(e => e.id === editingId
          ? { ...e, date: fDate, time: fTime || undefined, title: fTitle.trim(), category: fCat }
          : e)
      : [...events, { id: Date.now().toString(), date: fDate, time: fTime || undefined, title: fTitle.trim(), category: fCat }]
    setEvents(next)
    await saveEvents(activeUserId, next)
    setShowForm(false)
    setEditingId(null)
  }

  async function deleteEvent(id: string) {
    if (!activeUserId) return
    const next = events.filter(e => e.id !== id)
    setEvents(next)
    await saveEvents(activeUserId, next)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const EventRow = ({ e }: { e: AgendaEvent }) => {
    const cat  = findCategory(cats, e.category)
    const col  = colorOf(cat.color)
    const days = daysUntil(e.date, today)
    return (
      <div className={`rounded-2xl p-4 shadow-sm border-2 flex items-center gap-3 ${col.bg} ${col.border} ${days < 0 ? 'opacity-70' : ''}`}>
        <span className="text-3xl shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-lg leading-tight ${col.text}`}>{e.title}</div>
          <div className="text-gray-500 text-sm mt-0.5">{formatDate(e.date)}{e.time ? ` à ${e.time}` : ''}</div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-lg whitespace-nowrap ${countdownStyle(days)}`}>{countdownLabel(days)}</span>
          <div className="flex gap-1">
            <button onClick={() => openEdit(e)} aria-label="Modifier"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 active:scale-95 transition-all text-sm">✏️</button>
            <button onClick={() => deleteEvent(e.id)} aria-label="Supprimer"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 active:scale-95 transition-all text-sm">✕</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="flex items-center justify-center w-10 h-10 shrink-0 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
          <p className="text-sm text-indigo-600 font-semibold mt-0.5">Vue aidant — vous pouvez ajouter, modifier ou supprimer des rendez-vous</p>
        </div>
      </div>

      {/* Choix des catégories affichées (parmi celles autorisées par le Super Admin) */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-1">🏷️ Catégories affichées</h2>
        <p className="text-sm text-gray-400 mb-3">
          Choisissez les catégories à utiliser dans l&apos;agenda. Les autres seront masquées.
        </p>
        <div className="flex flex-wrap gap-2">
          {allowedCats.map(cat => {
            const col = colorOf(cat.color)
            const on = !hidden.includes(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategoryVisibility(cat.id)}
                aria-pressed={on}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-semibold text-sm active:scale-95 transition-all ${
                  on ? `${col.bg} ${col.text} ${col.border}` : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                <span>{on ? '☑' : '☐'}</span>
                <span className="text-lg">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Ces catégories sont définies par l&apos;administrateur de SimplaVie.
        </p>
      </section>

      <>
          {upcoming.length === 0 ? (
            <div className="text-center mt-16 text-gray-400">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-xl">Aucun rendez-vous à venir</p>
              <p className="mt-2 text-sm">Appuie sur + pour en ajouter un</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(e => <EventRow key={e.id} e={e} />)}
            </div>
          )}

          {past.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowPast(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white border-2 border-gray-100 text-gray-600 font-semibold active:scale-95 transition-all"
              >
                <span>🕓 Rendez-vous passés ({past.length})</span>
                <span className={`transition-transform ${showPast ? 'rotate-90' : ''}`}>›</span>
              </button>
              {showPast && (
                <div className="space-y-3 mt-3">
                  {past.map(e => <EventRow key={e.id} e={e} />)}
                </div>
              )}
            </div>
          )}
        </>

      {/* FAB */}
      {!showForm && (
        <button
          onClick={openCreate}
          aria-label="Ajouter un rendez-vous"
          className="fixed bottom-10 right-6 w-16 h-16 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-4xl rounded-full shadow-lg flex items-center justify-center transition-all z-40"
        >+</button>
      )}

      {/* Form bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-5">
              {editingId ? 'Modifier le rendez-vous' : 'Ajouter un rendez-vous'}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-500 mb-2">Catégorie</label>
              <div className="grid grid-cols-2 gap-2">
                {formCats.map(cat => {
                  const col = colorOf(cat.color)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setFCat(cat.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        fCat === cat.id ? `${col.bg} ${col.text} ${col.border}` : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-semibold text-sm">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-500 mb-1">Quoi ?</label>
              <input
                type="text"
                value={fTitle}
                onChange={e => setFTitle(e.target.value)}
                placeholder="Ex : Consultation, Kiné, Papiers..."
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-indigo-400"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Quand ?</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                  className={`w-full border-2 rounded-2xl px-4 py-4 text-base focus:outline-none ${isPastDate ? 'border-amber-300 focus:border-amber-400' : 'border-gray-200 focus:border-indigo-400'}`} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">À quelle heure ?</label>
                <input type="time" value={fTime} onChange={e => setFTime(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            {isPastDate && (
              <div className="mb-4 bg-amber-50 border-2 border-amber-300 rounded-2xl p-3">
                <p className="text-amber-800 font-semibold text-sm">⚠️ Cette date est déjà passée</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Le rendez-vous sera enregistré dans l&apos;historique (« Rendez-vous passés »).
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-3">
              <button onClick={() => { setShowForm(false); setEditingId(null) }}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">
                Annuler
              </button>
              <button onClick={submitEvent} disabled={!fTitle.trim() || !fDate}
                className="flex-[2] py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all">
                {editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
