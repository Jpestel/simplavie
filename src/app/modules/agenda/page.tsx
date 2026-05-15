'use client'
import { useState, useEffect } from 'react'
import { AgendaEvent } from '@/types'
import { loadEvents, saveEvents } from '@/lib/agendaService'
import BackBar from '@/components/BackBar'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc']
const DAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function groupEvents(events: AgendaEvent[], today: string) {
  const sorted = [...events]
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  const todayEnd = today
  const weekEnd = (() => {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })()

  return {
    today: sorted.filter(e => e.date === todayEnd),
    week: sorted.filter(e => e.date > todayEnd && e.date <= weekEnd),
    later: sorted.filter(e => e.date > weekEnd),
  }
}

export default function AgendaPage() {
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    loadEvents().then(e => { setEvents(e); setLoading(false) })
    setDate(today)
  }, [today])

  async function addEvent() {
    if (!title.trim() || !date) return
    const next: AgendaEvent[] = [
      ...events,
      { id: Date.now().toString(), date, time: time || undefined, title: title.trim() }
    ]
    setEvents(next)
    await saveEvents(next)
    setTitle('')
    setTime('')
    setDate(today)
    setShowForm(false)
  }

  async function deleteEvent(id: string) {
    const next = events.filter(e => e.id !== id)
    setEvents(next)
    await saveEvents(next)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const { today: todayEvents, week, later } = groupEvents(events, today)

  const Section = ({ label, items }: { label: string; items: AgendaEvent[] }) => (
    items.length === 0 ? null : (
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">{label}</h2>
        <div className="space-y-2">
          {items.map(e => (
            <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-gray-800 text-lg">{e.title}</div>
                <div className="text-gray-400 text-sm mt-0.5">
                  {formatDate(e.date)}{e.time ? ` à ${e.time}` : ''}
                </div>
              </div>
              <button
                onClick={() => deleteEvent(e.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 active:scale-95 transition-all text-xl"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>
    )
  )

  return (
    <main className="min-h-screen p-6 pb-36 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
        <p className="text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Event list */}
      {todayEvents.length === 0 && week.length === 0 && later.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-xl">Aucun rendez-vous</p>
          <p className="mt-2 text-sm">Appuie sur le bouton + pour en ajouter un</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section label="Aujourd'hui" items={todayEvents} />
          <Section label="Cette semaine" items={week} />
          <Section label="Plus tard" items={later} />
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-6 w-16 h-16 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-4xl rounded-full shadow-lg flex items-center justify-center transition-all z-40"
        >
          +
        </button>
      )}

      {/* Add form - bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-5">Nouveau rendez-vous</h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Quoi ?</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex : Médecin, Kiné, Coiffeur..."
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-indigo-400"
                  autoFocus
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Quand ?</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    min={today}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">À quelle heure ?</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={addEvent}
                disabled={!title.trim() || !date}
                className="flex-2 px-8 py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar />
    </main>
  )
}
