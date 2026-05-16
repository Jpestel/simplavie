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

const ICONS = [
  { icon: '🌅', label: 'Se lever' },
  { icon: '🚿', label: 'Douche' },
  { icon: '🛁', label: 'Bain' },
  { icon: '🦷', label: 'Dents' },
  { icon: '💊', label: 'Médicaments' },
  { icon: '🍳', label: 'Petit-déj' },
  { icon: '🥗', label: 'Repas' },
  { icon: '😴', label: 'Repos' },
  { icon: '🛒', label: 'Courses' },
  { icon: '🏥', label: 'Médecin' },
  { icon: '💇', label: 'Coiffeur' },
  { icon: '🏦', label: 'Banque' },
  { icon: '🏋️', label: 'Sport/Kiné' },
  { icon: '📞', label: 'Téléphone' },
  { icon: '🚗', label: 'Transport' },
  { icon: '💼', label: 'Travail' },
  { icon: '🧹', label: 'Ménage' },
  { icon: '👕', label: 'Linge' },
  { icon: '📝', label: 'Administratif' },
  { icon: '💆', label: 'Détente' },
]

// Ordre d'affichage lun→dim, avec la valeur JS correspondante (0=Dim)
const DAYS_ORDERED = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 0 },
]

const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string; icon: string }[] = [
  { key: 'daily',   label: 'Tous les jours', icon: '📆' },
  { key: 'weekly',  label: 'Certains jours',  icon: '🗓️' },
  { key: 'monthly', label: 'Chaque mois',     icon: '📅' },
  { key: 'yearly',  label: 'Chaque année',    icon: '🎂' },
  { key: 'once',    label: 'Date précise',    icon: '📌' },
]

const EMPTY_FORM = {
  icon: '✅', label: '', withTime: false, time: '',
  recurrence: 'daily' as RecurrenceType,
  weekDays: [] as number[], monthDay: 1, yearDate: '', specificDate: '',
}

export default function RoutineAdminPage() {
  const router = useRouter()
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { loadSteps(DEFAULT_STEPS).then(setSteps) }, [])

  const save = async (updated: RoutineStep[]) => {
    setSteps(updated)
    await saveSteps(updated)
  }

  const addStep = () => {
    if (!form.label.trim()) return
    const step: RoutineStep = {
      id: Date.now().toString(),
      label: form.label.trim(),
      icon: form.icon,
      time: form.withTime && form.time ? form.time : undefined,
      order: steps.length,
      done: false,
      recurrence: form.recurrence,
      weekDays: form.recurrence === 'weekly' ? form.weekDays : undefined,
      monthDay: form.recurrence === 'monthly' ? form.monthDay : undefined,
      yearDate: form.recurrence === 'yearly' ? form.yearDate : undefined,
      specificDate: form.recurrence === 'once' ? form.specificDate : undefined,
    }
    save([...steps, step])
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const removeStep = (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    save(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })))
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...steps]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    save(next.map((s, j) => ({ ...s, order: j })))
  }

  const moveDown = (i: number) => {
    if (i === steps.length - 1) return
    const next = [...steps]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    save(next.map((s, j) => ({ ...s, order: j })))
  }

  const toggleWeekDay = (value: number) => {
    const cur = form.weekDays
    setForm(f => ({ ...f, weekDays: cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value] }))
  }

  const input = "w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"

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
                  <div className="text-xs text-indigo-500 mt-0.5">
                    {recurrenceLabel(step)}{step.time ? ` · ${step.time}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 text-gray-400 disabled:opacity-20">↑</button>
                  <button onClick={() => moveDown(i)} disabled={i === steps.length - 1} className="p-1 text-gray-400 disabled:opacity-20">↓</button>
                  <button onClick={() => removeStep(step.id)} className="p-1 text-red-400 hover:text-red-600 ml-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button onClick={() => setShowForm(true)}
        className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-semibold hover:bg-indigo-50 active:scale-95 transition-all text-lg">
        + Ajouter une tâche
      </button>

      {/* Bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto max-h-[92vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-5">Nouvelle tâche</h2>

            {/* Icon picker */}
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-2">Icône</label>
              <div className="grid grid-cols-5 gap-2">
                {ICONS.map(({ icon, label }) => (
                  <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                    title={label}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95 ${
                      form.icon === icon ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-300'
                    }`}>
                    <span className="text-2xl">{icon}</span>
                    <span className="text-[10px] text-gray-400 leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-1">Nom de la tâche *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Ex : Prendre mon traitement" className={input} />
            </div>

            {/* Time toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <button onClick={() => setForm(f => ({ ...f, withTime: !f.withTime, time: '' }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.withTime ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.withTime ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-600 font-medium">Définir une heure</span>
              </label>
              {form.withTime && (
                <input type="time" value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className={input} />
              )}
            </div>

            {/* Recurrence */}
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
                  {DAYS_ORDERED.map(({ label, value }) => (
                    <button key={value} onClick={() => toggleWeekDay(value)}
                      className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                        form.weekDays.includes(value)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.recurrence === 'monthly' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Quel jour du mois ?</label>
                <input type="number" min={1} max={31} value={form.monthDay}
                  onChange={e => setForm(f => ({ ...f, monthDay: parseInt(e.target.value) }))}
                  className={input} />
              </div>
            )}

            {form.recurrence === 'yearly' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Quelle date chaque année ?</label>
                <input type="date"
                  value={form.yearDate ? `2000-${form.yearDate}` : ''}
                  onChange={e => setForm(f => ({ ...f, yearDate: e.target.value.slice(5) }))}
                  className={input} />
                <p className="text-xs text-gray-400 mt-1">L&apos;année est ignorée — seuls le jour et le mois comptent.</p>
              </div>
            )}

            {form.recurrence === 'once' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Date précise</label>
                <input type="date" value={form.specificDate}
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
              <button onClick={addStep} disabled={!form.label.trim()}
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
