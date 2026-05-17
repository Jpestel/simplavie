'use client'
import { useState, useEffect } from 'react'
import { AgendaEvent, AgendaCategory } from '@/types'
import { loadEvents, saveEvents } from '@/lib/agendaService'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'

type CatInfo = { label: string; icon: string; bg: string; text: string; border: string }

const CATS: Record<AgendaCategory, CatInfo> = {
  medical: { label: 'Médical',       icon: '🏥', bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200'   },
  admin:   { label: 'Administratif', icon: '📄', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  family:  { label: 'Famille',       icon: '👨‍👩‍👧', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  other:   { label: 'Autre',         icon: '📌', bg: 'bg-gray-50',  text: 'text-gray-600',  border: 'border-gray-200'  },
}

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
  return `J-${d}`
}

function countdownStyle(d: number) {
  if (d === 0) return 'bg-red-500 text-white font-bold'
  if (d === 1) return 'bg-orange-400 text-white font-semibold'
  if (d <= 7)  return 'bg-indigo-100 text-indigo-700 font-semibold'
  return 'bg-gray-100 text-gray-500'
}

export default function AdminAgendaPage() {
  const { activeUserId } = useAuth()
  const [events, setEvents]     = useState<AgendaEvent[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const [fTitle, setFTitle] = useState('')
  const [fDate,  setFDate]  = useState(today)
  const [fTime,  setFTime]  = useState('')
  const [fCat,   setFCat]   = useState<AgendaCategory>('medical')

  useEffect(() => {
    if (!activeUserId) return
    loadEvents(activeUserId).then(e => { setEvents(e); setLoading(false) })
  }, [activeUserId])

  const upcoming = [...events]
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  async function addEvent() {
    if (!fTitle.trim() || !fDate || !activeUserId) return
    const next: AgendaEvent[] = [
      ...events,
      { id: Date.now().toString(), date: fDate, time: fTime || undefined, title: fTitle.trim(), category: fCat },
    ]
    setEvents(next)
    await saveEvents(activeUserId, next)
    setFTitle(''); setFTime(''); setFDate(today); setFCat('medical')
    setShowForm(false)
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

  return (
    <main className="min-h-screen p-6 pb-36 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
        <p className="text-sm text-indigo-600 font-semibold mt-0.5">Vue aidant — vous pouvez ajouter ou supprimer des rendez-vous</p>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center mt-16 text-gray-400">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-xl">Aucun rendez-vous à venir</p>
          <p className="mt-2 text-sm">Appuie sur + pour en ajouter un</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map(e => {
            const cat  = CATS[e.category ?? 'other']
            const days = daysUntil(e.date, today)
            return (
              <div key={e.id} className={`rounded-2xl p-4 shadow-sm border-2 flex items-center gap-3 ${cat.bg} ${cat.border}`}>
                <span className="text-3xl shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-lg leading-tight ${cat.text}`}>{e.title}</div>
                  <div className="text-gray-500 text-sm mt-0.5">{formatDate(e.date)}{e.time ? ` à ${e.time}` : ''}</div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-lg whitespace-nowrap ${countdownStyle(days)}`}>{countdownLabel(days)}</span>
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 active:scale-95 transition-all text-sm"
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-6 w-16 h-16 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-4xl rounded-full shadow-lg flex items-center justify-center transition-all z-40"
        >+</button>
      )}

      {/* Form bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-5">Ajouter un rendez-vous</h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-500 mb-2">Catégorie</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CATS) as [AgendaCategory, CatInfo][]).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setFCat(key)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                      fCat === key ? `${cat.bg} ${cat.text} ${cat.border}` : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-sm">{cat.label}</span>
                  </button>
                ))}
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

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Quand ?</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} min={today}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">À quelle heure ?</label>
                <input type="time" value={fTime} onChange={e => setFTime(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">
                Annuler
              </button>
              <button onClick={addEvent} disabled={!fTitle.trim() || !fDate}
                className="flex-[2] py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar href="/admin" />
    </main>
  )
}
