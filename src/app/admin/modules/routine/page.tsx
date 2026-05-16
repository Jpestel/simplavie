'use client'
import { useState, useEffect } from 'react'
import { RoutineStep, RecurrenceType } from '@/types'
import { useRouter } from 'next/navigation'
import { loadSteps, saveSteps } from '@/lib/routineService'
import { recurrenceLabel } from '@/lib/routineUtils'

const DEFAULT_STEPS: RoutineStep[] = [
  { id: '1', label: 'Se lever', icon: '🌅', order: 0, done: false, recurrence: 'daily' },
  { id: '2', label: 'Se laver', icon: '🚿', order: 1, done: false, recurrence: 'daily' },
  { id: '3', label: 'Prendre son traitement', icon: '💊', order: 2, done: false, recurrence: 'daily' },
  { id: '4', label: 'Prendre le petit-déjeuner', icon: '🍳', order: 3, done: false, recurrence: 'daily' },
]

const DAYS_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const EMPTY_STEP: Partial<RoutineStep> = {
  icon: '✅', label: '', time: '', recurrence: 'daily',
  weekDays: [], monthDay: 1, yearDate: '', specificDate: '',
}

export default function RoutineAdminPage() {
  const router = useRouter()
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<RoutineStep>>(EMPTY_STEP)

  useEffect(() => { loadSteps(DEFAULT_STEPS).then(setSteps) }, [])

  const save = async (updated: RoutineStep[]) => {
    setSteps(updated)
    await saveSteps(updated)
  }

  const addStep = () => {
    if (!form.label?.trim()) return
    const step: RoutineStep = {
      id: Date.now().toString(),
      label: form.label.trim(),
      icon: form.icon || '✅',
      time: form.time || undefined,
      order: steps.length,
      done: false,
      recurrence: form.recurrence ?? 'daily',
      weekDays: form.recurrence === 'weekly' ? (form.weekDays ?? []) : undefined,
      monthDay: form.recurrence === 'monthly' ? form.monthDay : undefined,
      yearDate: form.recurrence === 'yearly' ? form.yearDate : undefined,
      specificDate: form.recurrence === 'once' ? form.specificDate : undefined,
    }
    save([...steps, step])
    setForm(EMPTY_STEP)
    setShowForm(false)
  }

  const removeStep = (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    save(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })))
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

  const toggleWeekDay = (d: number) => {
    const current = form.weekDays ?? []
    const next = current.includes(d) ? current.filter(x => x !== d) : [...current, d]
    setForm(f => ({ ...f, weekDays: next }))
  }

  const input = "w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"

  const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string; icon: string }[] = [
    { key: 'daily',   label: 'Tous les jours',   icon: '📆' },
    { key: 'weekly',  label: 'Certains jours',    icon: '🗓️' },
    { key: 'monthly', label: 'Chaque mois',       icon: '📅' },
    { key: 'yearly',  label: 'Chaque année',      icon: '🎂' },
    { key: 'once',    label: 'Date précise',       icon: '📌' },
  ]

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Routine du jour</h1>
      </div>

      {/* Step list */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Tâches ({steps.length})</h2>
        {steps.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Aucune tâche</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                <span className="text-2xl w-8 text-center">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-700">{step.label}</div>
                  <div className="text-xs text-indigo-500 mt-0.5">{recurrenceLabel(step)}{step.time ? ` · ${step.time}` : ''}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">↑</button>
                  <button onClick={() => moveDown(i)} disabled={i === steps.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">↓</button>
                  <button onClick={() => removeStep(step.id)} className="p-1 text-red-400 hover:text-red-600 ml-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={() => setShowForm(true)}
        className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-semibold hover:bg-indigo-50 active:scale-95 transition-all text-lg"
      >
        + Ajouter une tâche
      </button>

      {/* Add form — bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-5">Nouvelle tâche</h2>

            {/* Icon + label */}
            <div className="flex gap-3 mb-4">
              <input value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-16 border border-gray-200 rounded-xl p-3 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input value={form.label ?? ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Nom de la tâche *" className={`flex-1 ${input}`} />
            </div>

            {/* Time */}
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-1">Heure (optionnel)</label>
              <input type="time" value={form.time ?? ''} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={input} />
            </div>

            {/* Recurrence type */}
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-2">Répétition</label>
              <div className="grid grid-cols-2 gap-2">
                {RECURRENCE_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => setForm(f => ({ ...f, recurrence: opt.key }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95 text-left ${
                      form.recurrence === opt.key
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <span>{opt.icon}</span><span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional recurrence config */}
            {form.recurrence === 'weekly' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-2">Quels jours ?</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_LABELS.map((d, i) => (
                    <button key={i} onClick={() => toggleWeekDay(i)}
                      className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                        (form.weekDays ?? []).includes(i)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.recurrence === 'monthly' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Quel jour du mois ?</label>
                <input type="number" min={1} max={31} value={form.monthDay ?? 1}
                  onChange={e => setForm(f => ({ ...f, monthDay: parseInt(e.target.value) }))}
                  className={input} />
              </div>
            )}

            {form.recurrence === 'yearly' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Quelle date chaque année ?</label>
                <input type="date"
                  value={form.yearDate ? `2000-${form.yearDate}` : ''}
                  onChange={e => {
                    const val = e.target.value // "2000-MM-DD"
                    setForm(f => ({ ...f, yearDate: val.slice(5) })) // keep "MM-DD"
                  }}
                  className={input} />
                <p className="text-xs text-gray-400 mt-1">L&apos;année est ignorée — seuls le jour et le mois comptent.</p>
              </div>
            )}

            {form.recurrence === 'once' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Date précise</label>
                <input type="date" value={form.specificDate ?? ''}
                  onChange={e => setForm(f => ({ ...f, specificDate: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  className={input} />
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">
                Annuler
              </button>
              <button onClick={addStep} disabled={!form.label?.trim()}
                className="flex-1 py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
