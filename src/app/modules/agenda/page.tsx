'use client'
import { useState, useEffect } from 'react'
import { AgendaEvent } from '@/types'
import { loadEvents, saveEvents } from '@/lib/agendaService'
import { useAuth } from '@/lib/authContext'
import { useConfig } from '@/lib/configContext'
import { visibleCategories, findCategory, colorOf } from '@/lib/agendaCategories'

const MONTHS_FR   = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc']
const DAYS_FULL   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
const DAYS_GRID   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

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

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function AgendaPage() {
  const { activeUserId } = useAuth()
  const { config } = useConfig()
  const [events, setEvents]   = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState<'list' | 'month'>('list')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const todayDate = new Date(today + 'T00:00:00')

  const cats = visibleCategories(config.agendaCategories)

  const [viewYear,    setViewYear]    = useState(todayDate.getFullYear())
  const [viewMonth,   setViewMonth]   = useState(todayDate.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const [fTitle, setFTitle] = useState('')
  const [fDate,  setFDate]  = useState(today)
  const [fTime,  setFTime]  = useState('')
  const [fCat,   setFCat]   = useState<string>('medical')

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
    setFTitle(''); setFTime(''); setFDate(today); setFCat(cats[0]?.id ?? 'other')
    setShowForm(true)
  }

  function openEdit(e: AgendaEvent) {
    setEditingId(e.id)
    setFTitle(e.title)
    setFDate(e.date)
    setFTime(e.time ?? '')
    setFCat(e.category ?? cats[0]?.id ?? 'other')
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

  function prevMonth() {
    setSelectedDay(null)
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDay(null)
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1)
  }

  const cells = getMonthGrid(viewYear, viewMonth)
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`
  const eventsByDay: Record<number, AgendaEvent[]> = {}
  events.forEach(e => {
    if (e.date.startsWith(monthPrefix)) {
      const d = parseInt(e.date.slice(8))
      if (!eventsByDay[d]) eventsByDay[d] = []
      eventsByDay[d].push(e)
    }
  })

  const monthEvents = selectedDay
    ? (eventsByDay[selectedDay] ?? []).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    : Object.entries(eventsByDay)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .flatMap(([, evs]) => evs.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')))

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const EventCard = ({ e }: { e: AgendaEvent }) => {
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
            <button
              onClick={() => openEdit(e)}
              aria-label="Modifier le rendez-vous"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 active:scale-95 transition-all text-sm"
            >✏️</button>
            <button
              onClick={() => deleteEvent(e.id)}
              aria-label="Supprimer le rendez-vous"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 active:scale-95 transition-all text-sm"
            >✕</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-36 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
          <p className="text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${view === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
          >📋 Liste</button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${view === 'month' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
          >📅 Mois</button>
        </div>
      </div>

      {/* ── List view ── */}
      {view === 'list' && (
        <>
          {upcoming.length === 0 ? (
            <div className="text-center mt-16 text-gray-400">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-xl">Aucun rendez-vous à venir</p>
              <p className="mt-2 text-sm">Appuie sur + pour en ajouter un</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(e => <EventCard key={e.id} e={e} />)}
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
                  {past.map(e => <EventCard key={e.id} e={e} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Month view ── */}
      {view === 'month' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 active:scale-95 transition-all flex items-center justify-center text-gray-600 font-bold">◀</button>
            <h2 className="text-lg font-bold text-gray-800">{MONTHS_FR[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 active:scale-95 transition-all flex items-center justify-center text-gray-600 font-bold">▶</button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS_GRID.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mb-6">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday    = dateStr === today
              const evs        = eventsByDay[day] ?? []
              const isSelected = selectedDay === day
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 ${
                    isSelected ? 'bg-indigo-500' :
                    isToday    ? 'bg-indigo-100' :
                    evs.length ? 'bg-white hover:bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : isToday ? 'text-indigo-700' : 'text-gray-700'}`}>{day}</span>
                  {evs.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {evs.slice(0, 3).map((e, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : colorOf(findCategory(cats, e.category).color).dot}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {monthEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>{selectedDay ? 'Aucun rendez-vous ce jour' : 'Aucun rendez-vous ce mois'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                {selectedDay ? `${selectedDay} ${MONTHS_SHORT[viewMonth]}` : `${MONTHS_SHORT[viewMonth]} ${viewYear}`}
              </h3>
              {monthEvents.map(e => <EventCard key={e.id} e={e} />)}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      {!showForm && (
        <button
          onClick={openCreate}
          aria-label="Ajouter un rendez-vous"
          className="fixed bottom-32 right-6 w-16 h-16 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-4xl rounded-full shadow-lg flex items-center justify-center transition-all z-40"
        >+</button>
      )}

      {/* Form bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-5">
              {editingId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </h2>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-500 mb-2">Catégorie</label>
              <div className="grid grid-cols-2 gap-2">
                {cats.map(cat => {
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

            {/* Title */}
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

            {/* Date + Time */}
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
