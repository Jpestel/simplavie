'use client'
import { useState, useEffect } from 'react'
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

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

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

export default function RemindersPage() {
  const { activeUserId } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeUserId || !isSupabaseConfigured) { setLoading(false); return }
    getSupabase()!.from('reminders').select('*').eq('user_id', activeUserId).eq('active', true).order('time_of_day')
      .then(({ data }) => {
        const today = (data ?? []).filter(isToday) as Reminder[]
        setReminders(today)
        setLoading(false)
      })
  }, [activeUserId])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 text-xl">Chargement...</p></div>

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
        <div className="space-y-3">
          {reminders.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100 flex items-center gap-4">
              <div className="text-4xl">🔔</div>
              <div>
                <div className="text-xl font-bold text-gray-800">{r.label}</div>
                <div className="text-gray-500 mt-0.5">{r.time_of_day.slice(0, 5)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BackBar />
    </main>
  )
}
