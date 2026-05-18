'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'

type Reminder = {
  id: string
  label: string
  time_of_day: string
  times: string[] | null
  recurrence: string
  week_days: number[] | null
  month_day: number | null
  specific_date: string | null
  date_start: string | null
  date_end: string | null
  active: boolean
}

// Une occurrence = un rappel à une heure précise
type Occurrence = {
  key: string        // `${reminder_id}_${time_slot}`
  reminderId: string
  timeSlot: string   // HH:MM
  label: string
  done: boolean
}

function isToday(r: Reminder): boolean {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  switch (r.recurrence) {
    case 'daily': return true
    case 'weekly': return (r.week_days ?? []).includes(now.getDay())
    case 'monthly': return r.month_day === now.getDate()
    case 'once': return r.specific_date === today
    case 'period': return !!(r.date_start && r.date_end && today >= r.date_start && today <= r.date_end)
    default: return false
  }
}

function getOccurrences(reminder: Reminder): string[] {
  if (reminder.times && reminder.times.length > 1) return reminder.times.map(t => t.slice(0, 5))
  return [reminder.time_of_day.slice(0, 5)]
}

const today = new Date().toISOString().slice(0, 10)

export default function RemindersPage() {
  const { activeUserId } = useAuth()
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!activeUserId) { setLoading(false); return }
    const [remRes, doneRes] = await Promise.all([
      fetch('/api/reminders?userId=' + activeUserId).then(r => r.json()),
      fetch('/api/reminders/completions?userId=' + activeUserId + '&date=' + today).then(r => r.json()),
    ])

    const doneKeys = new Set(
      (Array.isArray(doneRes) ? doneRes : []).map((r: { reminderId: string; timeSlot: string }) => `${r.reminderId}_${r.timeSlot}`)
    )

    const result: Occurrence[] = []
    for (const r of (Array.isArray(remRes) ? remRes : []) as Reminder[]) {
      if (!isToday(r)) continue
      for (const timeSlot of getOccurrences(r)) {
        const key = `${r.id}_${timeSlot}`
        result.push({ key, reminderId: r.id, timeSlot, label: r.label, done: doneKeys.has(key) })
      }
    }

    // Trier par heure
    result.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    setOccurrences(result)
    setLoading(false)
  }, [activeUserId])

  useEffect(() => { loadData() }, [loadData])

  const toggle = async (occ: Occurrence) => {
    if (!activeUserId) return
    const isDone = occ.done
    setOccurrences(prev => prev.map(o => o.key === occ.key ? { ...o, done: !isDone } : o))
    if (isDone) {
      await fetch('/api/reminders/completions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, reminderId: occ.reminderId, date: today, timeSlot: occ.timeSlot }),
      })
    } else {
      await fetch('/api/reminders/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, reminderId: occ.reminderId, date: today, timeSlot: occ.timeSlot }),
      })
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 text-xl">Chargement...</p></div>

  const pending = occurrences.filter(o => !o.done)
  const done = occurrences.filter(o => o.done)
  const allDone = occurrences.length > 0 && pending.length === 0

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rappels du jour</h1>
        <p className="text-gray-500 mt-1 capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {occurrences.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-xl">Aucun rappel aujourd&apos;hui</p>
        </div>
      ) : (
        <>
          {allDone && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-green-700 font-semibold text-lg">Tous les rappels sont faits !</p>
            </div>
          )}

          {/* À faire */}
          {pending.length > 0 && (
            <div className="space-y-3 mb-5">
              {pending.map(occ => (
                <button key={occ.key} onClick={() => toggle(occ)}
                  className="w-full bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100 flex items-center gap-4 active:scale-95 transition-all text-left">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
                  <div className="text-4xl">🔔</div>
                  <div className="flex-1">
                    <div className="text-xl font-bold text-gray-800">{occ.label}</div>
                    <div className="text-gray-500 mt-0.5">{occ.timeSlot}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Faits */}
          {done.length > 0 && (
            <div className="space-y-2">
              {done.map(occ => (
                <button key={occ.key} onClick={() => toggle(occ)}
                  className="w-full bg-green-50 rounded-2xl p-4 border-2 border-green-200 flex items-center gap-4 active:scale-95 transition-all text-left opacity-70">
                  <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-green-400 flex items-center justify-center shrink-0 text-white font-bold">✓</div>
                  <div className="text-3xl">🔔</div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-400 line-through">{occ.label}</div>
                    <div className="text-gray-400 text-sm mt-0.5">{occ.timeSlot}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <BackBar />
    </main>
  )
}
