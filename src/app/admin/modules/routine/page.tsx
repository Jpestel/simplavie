'use client'
import { useState, useEffect } from 'react'
import { RoutineStep } from '@/types'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'simplavie_routine_steps'

const DEFAULT_STEPS: RoutineStep[] = [
  { id: '1', label: 'Se lever', icon: '🌅', order: 0, done: false },
  { id: '2', label: 'Se laver', icon: '🚿', order: 1, done: false },
  { id: '3', label: 'Prendre son traitement', icon: '💊', order: 2, done: false },
  { id: '4', label: 'Prendre le petit-déjeuner', icon: '🍳', order: 3, done: false },
]

export default function RoutineAdminPage() {
  const router = useRouter()
  const [steps, setSteps] = useState<RoutineStep[]>(DEFAULT_STEPS)
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('✅')
  const [newTime, setNewTime] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setSteps(JSON.parse(stored))
  }, [])

  const save = (updated: RoutineStep[]) => {
    setSteps(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const addStep = () => {
    if (!newLabel.trim()) return
    const step: RoutineStep = {
      id: Date.now().toString(),
      label: newLabel.trim(),
      icon: newIcon || '✅',
      time: newTime || undefined,
      order: steps.length,
      done: false,
    }
    save([...steps, step])
    setNewLabel('')
    setNewIcon('✅')
    setNewTime('')
  }

  const removeStep = (id: string) => {
    save(steps.filter(s => s.id !== id))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...steps]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    save(next.map((s, i) => ({ ...s, order: i })))
  }

  const moveDown = (index: number) => {
    if (index === steps.length - 1) return
    const next = [...steps]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    save(next.map((s, i) => ({ ...s, order: i })))
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Routine du jour</h1>
      </div>

      {/* Add step */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Ajouter une étape</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Icône (emoji)"
              value={newIcon}
              onChange={e => setNewIcon(e.target.value)}
              className="w-20 border border-gray-200 rounded-xl p-3 text-center text-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              type="text"
              placeholder="Nom de l'étape"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStep()}
              className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-sm text-gray-400">Heure optionnelle</span>
          </div>
          <button
            onClick={addStep}
            className="w-full bg-indigo-500 text-white rounded-xl p-3 font-semibold hover:bg-indigo-600 active:scale-95 transition-all"
          >
            + Ajouter
          </button>
        </div>
      </section>

      {/* Steps list */}
      <section className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Étapes ({steps.length})
        </h2>
        {steps.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Aucune étape</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                <span className="text-2xl w-8 text-center">{step.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-700">{step.label}</div>
                  {step.time && <div className="text-sm text-gray-400">{step.time}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">↑</button>
                  <button onClick={() => moveDown(i)} disabled={i === steps.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">↓</button>
                  <button onClick={() => removeStep(step.id)} className="p-1 text-red-400 hover:text-red-600 ml-2">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
