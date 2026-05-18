'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/authContext'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import BackBar from '@/components/BackBar'

type Reminder = {
  id: string
  label: string
  time_of_day: string
  recurrence: string
  active: boolean
}

function isToday(r: { recurrence: string; week_days: number[] | null; month_day: number | null; specific_date: string | null }): boolean {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  switch (r.recurrence) {
    case 'daily': return true
    case 'weekly': return (r.week_days ?? []).includes(now.getDay())
    case 'monthly': return r.month_day === now.getDate()
    case 'once': return r.specific_date === today
    default: return false
  }
}

const today = new Date().toISOString().slice(0, 10)

export default function RemindersPage() {
  const { activeUserId } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!activeUserId || !isSupabaseConfigured) { setLoading(false); return }
    const db = getSupabase()!
    const [remRes, doneRes] = await Promise.all([
      db.from('reminders').select('*').eq('user_id', activeUserId).eq('active', true).order('time_of_day'),
      db.from('reminder_completions').select('reminder_id').eq('user_id', activeUserId).eq('date', today),
    ])
    const todayReminders = ((remRes.data ?? []).filter(isToday)) as Reminder[]
    setReminders(todayReminders)
    setDoneIds(new Set((doneRes.data ?? []).map((r: { reminder_id: string }) => r.reminder_id)))
    setLoading(false)
  }, [activeUserId])

  useEffect(() => { loadData() }, [loadData])

  const toggle = async (id: string) => {
    if (!activeUserId || !isSupabaseConfigured) return
    const db = getSupabase()!
    const isDone = doneIds.has(id)
    setDoneIds(prev => {
      const next = new Set(prev)
      isDone ? next.delete(id) : next.add(id)
      return next
    })
    if (isDone) {
      await db.from('reminder_completions').delete().eq('user_id', activeUserId).eq('reminder_id', id).eq('date', today)
    } else {
      await db.from('reminder_completions').upsert({ user_id: activeUserId, reminder_id: id, date: today })
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 text-xl">Chargement...</p></div>

  const pending = reminders.filter(r => !doneIds.has(r.id))
  const done = reminders.filter(r => doneIds.has(r.id))
  const allDone = reminders.length > 0 && pending.length === 0

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rappels du jour</h1>
        <p className="text-gray-500 mt-1 capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {reminders.length === 0 ? (
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

          {/* Rappels à faire */}
          {pending.length > 0 && (
            <div className="space-y-3 mb-5">
              {pending.map(r => (
                <button
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className="w-full bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100 flex items-center gap-4 active:scale-95 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
                  <div className="text-4xl">🔔</div>
                  <div className="flex-1">
                    <div className="text-xl font-bold text-gray-800">{r.label}</div>
                    <div className="text-gray-500 mt-0.5">{r.time_of_day.slice(0, 5)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Rappels effectués */}
          {done.length > 0 && (
            <div className="space-y-2">
              {done.map(r => (
                <button
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className="w-full bg-green-50 rounded-2xl p-4 border-2 border-green-200 flex items-center gap-4 active:scale-95 transition-all text-left opacity-70"
                >
                  <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-green-400 flex items-center justify-center shrink-0 text-white font-bold">✓</div>
                  <div className="text-3xl">🔔</div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-400 line-through">{r.label}</div>
                    <div className="text-gray-400 text-sm mt-0.5">{r.time_of_day.slice(0, 5)}</div>
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
