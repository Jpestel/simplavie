'use client'
import { useState, useEffect } from 'react'
import { AgendaEvent, AgendaCategoryDef } from '@/types'
import { loadEvents, saveEvents } from '@/lib/agendaService'
import { useAuth } from '@/lib/authContext'
import { useConfig } from '@/lib/configContext'
import { allCategories, visibleCategories, findCategory, colorOf, AGENDA_COLORS, genCategoryId } from '@/lib/agendaCategories'
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
  const [tab, setTab] = useState<'events' | 'categories'>('events')

  const today = new Date().toISOString().slice(0, 10)
  const [fTitle, setFTitle] = useState('')
  const [fDate,  setFDate]  = useState(today)
  const [fTime,  setFTime]  = useState('')
  const [fCat,   setFCat]   = useState<string>('medical')

  // Catégories configurées pour CET utilisateur (toutes, activées ou non).
  const cats = allCategories(config.agendaCategories)
  const formCats = visibleCategories(config.agendaCategories)

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

  // ── Gestion des catégories ──
  const saveCats = (next: AgendaCategoryDef[]) => updateConfig({ agendaCategories: next })
  const updateCat = (id: string, patch: Partial<AgendaCategoryDef>) =>
    saveCats(cats.map(c => (c.id === id ? { ...c, ...patch } : c)))
  const addCat = () =>
    saveCats([...cats, { id: genCategoryId(), label: 'Nouvelle catégorie', icon: '📌', color: 'blue', enabled: true }])
  const removeCat = (id: string) => {
    const used = events.filter(e => e.category === id).length
    const msg = used > 0
      ? `Supprimer cette catégorie ?\n${used} rendez-vous l'utilise(nt) — ils resteront visibles avec un affichage neutre.`
      : 'Supprimer cette catégorie ?'
    if (!confirm(msg)) return
    saveCats(cats.filter(c => c.id !== id))
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
          <p className="text-sm text-indigo-600 font-semibold mt-0.5">Vue aidant — rendez-vous et catégories</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 mb-6 bg-gray-100 rounded-2xl p-1">
        {([['events', '📅 Rendez-vous'], ['categories', '🏷️ Catégories']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ÉVÉNEMENTS ── */}
      {tab === 'events' && (
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
      )}

      {/* ── CATÉGORIES ── */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Créez les catégories adaptées à cet utilisateur. Seules les catégories <strong>activées</strong> lui
            seront proposées lorsqu&apos;il ajoute un rendez-vous.
          </p>

          <div className="space-y-3">
            {cats.map(cat => {
              const col = colorOf(cat.color)
              return (
                <div key={cat.id} className={`rounded-2xl border-2 p-4 space-y-3 ${cat.enabled ? `${col.bg} ${col.border}` : 'bg-white border-gray-200 opacity-70'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      value={cat.icon}
                      onChange={e => updateCat(cat.id, { icon: e.target.value.slice(0, 2) })}
                      aria-label="Icône"
                      className="w-14 text-center text-2xl border border-gray-200 rounded-xl py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <input
                      value={cat.label}
                      onChange={e => updateCat(cat.id, { label: e.target.value })}
                      aria-label="Nom de la catégorie"
                      placeholder="Nom de la catégorie"
                      className="flex-1 border border-gray-200 rounded-xl p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button onClick={() => removeCat(cat.id)} aria-label="Supprimer la catégorie"
                      className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all">🗑️</button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {AGENDA_COLORS.map(c => (
                      <button
                        key={c.key}
                        onClick={() => updateCat(cat.id, { color: c.key })}
                        aria-label={c.label}
                        title={c.label}
                        className={`w-8 h-8 rounded-full ${c.dot} transition-all active:scale-90 ${cat.color === c.key ? 'ring-4 ring-offset-1 ring-gray-400' : 'opacity-60 hover:opacity-100'}`}
                      />
                    ))}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cat.enabled !== false}
                      onChange={e => updateCat(cat.id, { enabled: e.target.checked })}
                      className="w-5 h-5 accent-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {cat.enabled !== false ? 'Visible par l’utilisateur' : 'Masquée pour cet utilisateur'}
                    </span>
                  </label>
                </div>
              )
            })}
          </div>

          <button onClick={addCat}
            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold hover:bg-indigo-50 active:scale-95 transition-all">
            + Ajouter une catégorie
          </button>
        </div>
      )}

      {/* FAB */}
      {tab === 'events' && !showForm && (
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
