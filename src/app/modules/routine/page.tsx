'use client'
import { useState, useEffect, useCallback } from 'react'
import { RoutineStep } from '@/types'
import { useConfig } from '@/lib/configContext'
import BackBar from '@/components/BackBar'
import { loadSteps, loadCompletions, toggleCompletion } from '@/lib/routineService'
import { stepAppliesOn } from '@/lib/routineUtils'

const DEFAULT_STEPS: RoutineStep[] = [
  { id: '1', label: 'Se lever', icon: '🌅', order: 0, done: false, recurrence: 'daily' },
  { id: '2', label: 'Se laver', icon: '🚿', order: 1, done: false, recurrence: 'daily' },
  { id: '3', label: 'Prendre son traitement', icon: '💊', order: 2, done: false, recurrence: 'daily' },
  { id: '4', label: 'Prendre le petit-déjeuner', icon: '🍳', order: 3, done: false, recurrence: 'daily' },
]

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return localISO(d)
}

export default function RoutinePage() {
  const { config } = useConfig()
  const [allSteps, setAllSteps] = useState<RoutineStep[]>([])
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [loading, setLoading] = useState(true)
  const today = localISO(new Date())
  const [date, setDate] = useState(today)

  // Load base steps once
  useEffect(() => {
    loadSteps(DEFAULT_STEPS).then(s => { setAllSteps(s); setLoading(false) })
  }, [])

  // Reload completions whenever date changes
  const loadForDate = useCallback(async (d: string, base: RoutineStep[]) => {
    const doneIds = await loadCompletions(d)
    const todaySteps = base
      .filter(s => stepAppliesOn(s, d))
      .map(s => ({ ...s, done: doneIds.includes(s.id) }))
    setSteps(todaySteps)
  }, [])

  useEffect(() => {
    if (!loading) loadForDate(date, allSteps)
  }, [date, allSteps, loading, loadForDate])

  const handleToggle = async (id: string) => {
    const step = steps.find(s => s.id === id)
    if (!step) return
    const next = !step.done
    setSteps(prev => prev.map(s => s.id === id ? { ...s, done: next } : s))
    await toggleCompletion(date, id, next)
  }

  // Find prev/next date that has tasks
  const findDate = (from: string, direction: 1 | -1, base: RoutineStep[]): string | null => {
    let cursor = from
    for (let i = 0; i < 365; i++) {
      cursor = offsetDate(cursor, direction)
      if (base.some(s => stepAppliesOn(s, cursor))) return cursor
    }
    return null
  }

  const prevDate = allSteps.length ? findDate(date, -1, allSteps) : null
  const nextDate = allSteps.length ? findDate(date, 1, allSteps) : null

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length && steps.length > 0
  const isToday = date === today

  const d = new Date(date + 'T00:00:00')
  const dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  return (
    <main className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Ma journée</h1>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => prevDate && setDate(prevDate)}
          disabled={!prevDate}
          className="w-14 h-14 flex items-center justify-center bg-white border-2 border-gray-200 rounded-2xl text-2xl text-gray-600 active:scale-95 hover:bg-gray-50 transition-all shrink-0 disabled:opacity-30">
          ‹
        </button>
        <div className="flex-1 text-center">
          <div className="font-bold text-gray-800 capitalize">{dateLabel}</div>
          {!isToday && (
            <button onClick={() => setDate(today)} className="text-xs text-indigo-500 font-semibold mt-0.5 underline">
              Aujourd&apos;hui
            </button>
          )}
        </div>
        <button
          onClick={() => nextDate && setDate(nextDate)}
          disabled={!nextDate}
          className="w-14 h-14 flex items-center justify-center bg-white border-2 border-gray-200 rounded-2xl text-2xl text-gray-600 active:scale-95 hover:bg-gray-50 transition-all shrink-0 disabled:opacity-30">
          ›
        </button>
      </div>

      {/* Progress bar */}
      {steps.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{doneCount} / {steps.length} tâches</span>
            <span>{Math.round((doneCount / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / steps.length) * 100}%`, backgroundColor: config.primaryColor }} />
          </div>
        </div>
      )}

      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-5 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-green-700 font-semibold text-lg">Bravo !</p>
          <p className="text-green-600">Toutes les tâches sont faites !</p>
        </div>
      )}

      {steps.length === 0 ? (
        <div className="text-center mt-16 text-gray-400">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-xl">Aucune tâche ce jour</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map(step => (
            <button key={step.id} onClick={() => handleToggle(step.id)}
              className={`w-full flex items-center gap-5 p-5 rounded-3xl text-left transition-all active:scale-95 ${
                step.done ? 'bg-green-50 border-2 border-green-200' : 'bg-white border-2 border-gray-100 shadow-sm hover:border-indigo-200'
              }`}>
              <span className="text-4xl">{step.icon}</span>
              <div className="flex-1">
                <div className={`text-xl font-semibold ${step.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{step.label}</div>
                {step.time && <div className="text-gray-400 mt-1">{step.time}</div>}
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-lg transition-all shrink-0 ${step.done ? 'bg-green-400' : 'bg-gray-200'}`}>
                {step.done ? '✓' : ''}
              </div>
            </button>
          ))}
        </div>
      )}
      <BackBar />
    </main>
  )
}
