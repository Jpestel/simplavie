'use client'
import { useState, useEffect } from 'react'
import { RoutineStep } from '@/types'
import { useRouter } from 'next/navigation'
import { useConfig } from '@/lib/configContext'

const STORAGE_KEY = 'simplavie_routine_steps'
const DONE_KEY_PREFIX = 'simplavie_routine_done_'

const DEFAULT_STEPS: RoutineStep[] = [
  { id: '1', label: 'Se lever', icon: '🌅', order: 0, done: false },
  { id: '2', label: 'Se laver', icon: '🚿', order: 1, done: false },
  { id: '3', label: 'Prendre son traitement', icon: '💊', order: 2, done: false },
  { id: '4', label: 'Prendre le petit-déjeuner', icon: '🍳', order: 3, done: false },
]

export default function RoutinePage() {
  const router = useRouter()
  const { config } = useConfig()
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const today = new Date().toISOString().slice(0, 10)
  const doneKey = DONE_KEY_PREFIX + today

  useEffect(() => {
    const storedSteps = localStorage.getItem(STORAGE_KEY)
    const baseSteps: RoutineStep[] = storedSteps ? JSON.parse(storedSteps) : DEFAULT_STEPS
    const storedDone: string[] = JSON.parse(localStorage.getItem(doneKey) || '[]')
    setSteps(baseSteps.map(s => ({ ...s, done: storedDone.includes(s.id) })))
  }, [doneKey])

  const toggleStep = (id: string) => {
    const updated = steps.map(s => s.id === id ? { ...s, done: !s.done } : s)
    setSteps(updated)
    const doneIds = updated.filter(s => s.done).map(s => s.id)
    localStorage.setItem(doneKey, JSON.stringify(doneIds))
  }

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length && steps.length > 0

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-3xl text-gray-400 hover:text-gray-600 active:scale-95 transition-all"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ma journée</h1>
          <p className="text-gray-400">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{doneCount} / {steps.length} étapes</span>
          <span>{steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${steps.length > 0 ? (doneCount / steps.length) * 100 : 0}%`,
              backgroundColor: config.primaryColor
            }}
          />
        </div>
      </div>

      {/* All done message */}
      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-green-700 font-semibold text-lg">Bravo {config.userName} !</p>
          <p className="text-green-600">Tu as terminé toutes tes étapes !</p>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => toggleStep(step.id)}
            className={`w-full flex items-center gap-5 p-5 rounded-3xl text-left transition-all active:scale-95 ${
              step.done
                ? 'bg-green-50 border-2 border-green-200'
                : 'bg-white border-2 border-gray-100 shadow-sm hover:border-indigo-200'
            }`}
          >
            <span className="text-4xl">{step.icon}</span>
            <div className="flex-1">
              <div className={`text-xl font-semibold ${step.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {step.label}
              </div>
              {step.time && (
                <div className="text-gray-400 mt-1">{step.time}</div>
              )}
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-lg transition-all ${
              step.done ? 'bg-green-400' : 'bg-gray-200'
            }`}>
              {step.done ? '✓' : ''}
            </div>
          </button>
        ))}
      </div>
    </main>
  )
}
