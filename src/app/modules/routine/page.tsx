'use client'
import { useState, useEffect } from 'react'
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

export default function RoutinePage() {
  const { config } = useConfig()
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [loading, setLoading] = useState(true)
  const today = localISO(new Date())

  useEffect(() => {
    async function init() {
      const base = await loadSteps(DEFAULT_STEPS)
      const doneIds = await loadCompletions(today)
      // Filter to only steps that apply today
      const todaySteps = base
        .filter(s => stepAppliesOn(s, today))
        .map(s => ({ ...s, done: doneIds.includes(s.id) }))
      setSteps(todaySteps)
      setLoading(false)
    }
    init()
  }, [today])

  const handleToggle = async (id: string) => {
    const step = steps.find(s => s.id === id)
    if (!step) return
    const next = !step.done
    setSteps(prev => prev.map(s => s.id === id ? { ...s, done: next } : s))
    await toggleCompletion(today, id, next)
  }

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length && steps.length > 0

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  return (
    <main className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ma journée</h1>
        <p className="text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {steps.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
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
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-green-700 font-semibold text-lg">Bravo !</p>
          <p className="text-green-600">Tu as terminé toutes tes tâches du jour !</p>
        </div>
      )}

      {steps.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-xl">Aucune tâche aujourd&apos;hui</p>
          <p className="mt-2 text-sm">Tu peux en ajouter depuis l&apos;espace configuration ⚙️</p>
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
