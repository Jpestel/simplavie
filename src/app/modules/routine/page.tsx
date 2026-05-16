'use client'
import { useState, useEffect, useCallback } from 'react'
import { RoutineStep } from '@/types'
import { useConfig } from '@/lib/configContext'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'
import {
  loadSteps, loadCompletions, toggleCompletion,
  loadCancellations, toggleCancellation,
  loadPostponements, togglePostponement,
  loadExtras, postponeStep,
} from '@/lib/routineService'
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

function sortSteps(list: RoutineStep[]): RoutineStep[] {
  return [...list].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time)
    if (a.time) return -1
    if (b.time) return 1
    return a.order - b.order
  })
}

export default function RoutinePage() {
  const { config } = useConfig()
  const { activeUserId, loading: authLoading } = useAuth()
  const [allSteps, setAllSteps] = useState<RoutineStep[]>([])
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [cancelledIds, setCancelledIds] = useState<string[]>([])
  const [postponedIds, setPostponedIds] = useState<string[]>([])
  const [actionStep, setActionStep] = useState<RoutineStep | null>(null)
  const [loading, setLoading] = useState(true)
  const today = localISO(new Date())
  const [date, setDate] = useState(today)

  useEffect(() => {
    if (authLoading) return
    const timeout = setTimeout(() => setLoading(false), 8000)
    loadSteps(DEFAULT_STEPS, activeUserId ?? '')
      .then(s => { setAllSteps(s) })
      .catch(() => { setAllSteps(DEFAULT_STEPS) })
      .finally(() => { clearTimeout(timeout); setLoading(false) })
  }, [activeUserId, authLoading])

  const loadForDate = useCallback(async (d: string, base: RoutineStep[]) => {
    const uid = activeUserId ?? ''
    const [doneIds, cancelled, postponed, extras] = await Promise.all([
      loadCompletions(d, uid),
      loadCancellations(d, uid),
      loadPostponements(d, uid),
      loadExtras(d, uid),
    ])
    const all = [...base.filter(s => stepAppliesOn(s, d)), ...extras.filter(e => !base.find(s => s.id === e.id))]
    const sorted = sortSteps(all.map(s => ({ ...s, done: doneIds.includes(s.id) })))
    setSteps(sorted)
    setCancelledIds(cancelled)
    setPostponedIds(postponed)
  }, [activeUserId])

  useEffect(() => {
    if (!loading) loadForDate(date, allSteps)
  }, [date, allSteps, loading, loadForDate])

  const handleToggle = async (id: string) => {
    const step = steps.find(s => s.id === id)
    if (!step) return
    const uid = activeUserId ?? ''
    if (cancelledIds.includes(id) || postponedIds.includes(id)) {
      const newC = cancelledIds.filter(x => x !== id)
      const newP = postponedIds.filter(x => x !== id)
      setCancelledIds(newC)
      setPostponedIds(newP)
      await toggleCancellation(date, id, false, uid)
      await togglePostponement(date, id, false, uid)
      return
    }
    const next = !step.done
    setSteps(prev => prev.map(s => s.id === id ? { ...s, done: next } : s))
    await toggleCompletion(date, id, next, uid)
  }

  const handleCancel = async () => {
    if (!actionStep) return
    const id = actionStep.id
    const uid = activeUserId ?? ''
    if (actionStep.done) {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, done: false } : s))
      await toggleCompletion(date, id, false, uid)
    }
    const newC = [...new Set([...cancelledIds, id])]
    setCancelledIds(newC)
    await toggleCancellation(date, id, true, uid)
    setActionStep(null)
  }

  const handlePostpone = async () => {
    if (!actionStep) return
    const id = actionStep.id
    const uid = activeUserId ?? ''
    if (actionStep.done) {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, done: false } : s))
      await toggleCompletion(date, id, false, uid)
    }
    const toDate = offsetDate(date, 1)
    const newP = [...new Set([...postponedIds, id])]
    setPostponedIds(newP)
    await postponeStep(actionStep, date, toDate, uid)
    setActionStep(null)
  }

  const findDate = (from: string, direction: 1 | -1, base: RoutineStep[]): string | null => {
    let cursor = from
    for (let i = 0; i < 365; i++) {
      cursor = offsetDate(cursor, direction)
      if (base.some(s => stepAppliesOn(s, cursor))) return cursor
      try {
        const extras = localStorage.getItem('simplavie_routine_extra_' + cursor)
        if (extras && (JSON.parse(extras) as RoutineStep[]).length > 0) return cursor
      } catch { /* ignore */ }
    }
    return null
  }

  const prevDate = allSteps.length ? findDate(date, -1, allSteps) : null
  const nextDate = allSteps.length ? findDate(date, 1, allSteps) : null

  const activeSteps = steps.filter(s => !cancelledIds.includes(s.id) && !postponedIds.includes(s.id))
  const doneCount = activeSteps.filter(s => s.done).length
  const totalCount = activeSteps.length
  const allDone = doneCount === totalCount && totalCount > 0
  const isToday = date === today

  const d = new Date(date + 'T00:00:00')
  const dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  if (!activeUserId) return (
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
      {totalCount > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{doneCount} / {totalCount} tâches</span>
            <span>{Math.round((doneCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / totalCount) * 100}%`, backgroundColor: config.primaryColor }} />
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
          {steps.map(step => {
            const isCancelled = cancelledIds.includes(step.id)
            const isPostponed = postponedIds.includes(step.id)
            const isResolved = isCancelled || isPostponed

            return (
              <div key={step.id} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all ${
                step.done
                  ? 'bg-green-50 border-2 border-green-200'
                  : isCancelled
                  ? 'bg-red-50 border-2 border-red-200'
                  : isPostponed
                  ? 'bg-orange-50 border-2 border-orange-200'
                  : 'bg-white border-2 border-gray-100 shadow-sm'
              }`}>
                <button onClick={() => handleToggle(step.id)} className="flex items-center gap-4 flex-1 text-left active:scale-95 transition-all">
                  <span className="text-4xl">{step.icon}</span>
                  <div className="flex-1">
                    <div className={`text-xl font-semibold ${isResolved || step.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {step.label}
                    </div>
                    {step.time && !isResolved && <div className="text-gray-400 mt-1">{step.time}</div>}
                    {isCancelled && <div className="text-red-400 text-sm font-semibold mt-1">Annulée</div>}
                    {isPostponed && <div className="text-orange-400 text-sm font-semibold mt-1">Reportée à demain</div>}
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-lg transition-all shrink-0 ${
                    step.done ? 'bg-green-400' : isCancelled ? 'bg-red-300' : isPostponed ? 'bg-orange-300' : 'bg-gray-200'
                  }`}>
                    {step.done ? '✓' : isCancelled ? '✕' : isPostponed ? '→' : ''}
                  </div>
                </button>
                {!isResolved && !step.done && (
                  <button onClick={() => setActionStep(step)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 active:scale-95 transition-all shrink-0 text-xl">
                    ⋯
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action bottom sheet */}
      {actionStep && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setActionStep(null)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{actionStep.icon}</span>
              <p className="text-lg font-bold text-gray-800">{actionStep.label}</p>
            </div>
            <div className="space-y-3">
              <button onClick={handleCancel}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 font-semibold text-lg active:scale-95 transition-all">
                <span className="text-2xl">✕</span>
                <div className="text-left">
                  <div className="font-bold">Annuler cette tâche</div>
                  <div className="text-sm text-red-400 font-normal">Ne sera plus comptée aujourd&apos;hui</div>
                </div>
              </button>
              <button onClick={handlePostpone}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-50 border-2 border-orange-200 text-orange-700 font-semibold text-lg active:scale-95 transition-all">
                <span className="text-2xl">→</span>
                <div className="text-left">
                  <div className="font-bold">Reporter à demain</div>
                  <div className="text-sm text-orange-400 font-normal">Ajoutée automatiquement demain</div>
                </div>
              </button>
              <button onClick={() => setActionStep(null)}
                className="w-full p-4 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-lg active:scale-95 transition-all">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar />
    </main>
  )
}
