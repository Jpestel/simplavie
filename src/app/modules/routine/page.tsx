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
  loadExtras, postponeStep, addExtra,
} from '@/lib/routineService'
import { stepAppliesOn } from '@/lib/routineUtils'

const DEFAULT_STEPS: RoutineStep[] = []

const QUICK_ICONS = [
  { icon: '🌅', label: 'Réveil' },
  { icon: '🚿', label: 'Douche' },
  { icon: '👕', label: 'S\'habiller' },
  { icon: '💊', label: 'Médicaments' },
  { icon: '🍽️', label: 'Repas' },
  { icon: '🦷', label: 'Brossage' },
  { icon: '🚶', label: 'Sortie' },
  { icon: '🛌', label: 'Repos' },
  { icon: '📞', label: 'Téléphone' },
  { icon: '🏥', label: 'Médecin' },
  { icon: '🛒', label: 'Courses' },
  { icon: '📖', label: 'Lecture' },
  { icon: '🎵', label: 'Musique' },
  { icon: '✏️', label: 'Écriture' },
  { icon: '🌿', label: 'Plantes' },
  { icon: '📺', label: 'Télévision' },
]
const QUICK_ICON_LABELS = new Set(QUICK_ICONS.map(i => i.label))

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
  const [postponedMap, setPostponedMap] = useState<Record<string, string>>({})
  const [actionStep, setActionStep] = useState<RoutineStep | null>(null)
  const [postponeDate, setPostponeDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addIcon, setAddIcon] = useState(QUICK_ICONS[0].icon)
  const [addLabel, setAddLabel] = useState(QUICK_ICONS[0].label)
  const [addTime, setAddTime] = useState('')
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
    const baseForDay = base.filter(s => stepAppliesOn(s, d))
    const extraIds = new Set(extras.map(e => e.id))
    const baseWithoutExtras = baseForDay.filter(s => !extraIds.has(s.id))
    const all = [...baseWithoutExtras, ...extras]
    const sorted = sortSteps(all.map(s => ({ ...s, done: doneIds.includes(s.id) })))
    setSteps(sorted)
    setCancelledIds(cancelled)
    setPostponedMap(postponed)
  }, [activeUserId])

  useEffect(() => {
    if (!loading) loadForDate(date, allSteps)
  }, [date, allSteps, loading, loadForDate])

  const handleToggle = async (id: string) => {
    const step = steps.find(s => s.id === id)
    if (!step) return
    const uid = activeUserId ?? ''
    if (cancelledIds.includes(id) || id in postponedMap) {
      const newC = cancelledIds.filter(x => x !== id)
      const newP = { ...postponedMap }
      delete newP[id]
      setCancelledIds(newC)
      setPostponedMap(newP)
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
    if (!actionStep || !postponeDate) return
    const id = actionStep.id
    const uid = activeUserId ?? ''
    if (actionStep.done) {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, done: false } : s))
      await toggleCompletion(date, id, false, uid)
    }
    const newP = { ...postponedMap, [id]: postponeDate }
    setPostponedMap(newP)
    await postponeStep(actionStep, date, postponeDate, uid)
    setActionStep(null)
    setPostponeDate('')
  }

  const handleAddExtra = async () => {
    if (!addLabel.trim() || !activeUserId) return
    const newStep: RoutineStep = {
      id: `extra-${Date.now()}`,
      label: addLabel.trim(),
      icon: addIcon,
      time: addTime || undefined,
      order: steps.length + 1,
      done: false,
      recurrence: 'once',
      specificDate: date,
    }
    setSteps(prev => sortSteps([...prev, newStep]))
    await addExtra(newStep, date, activeUserId)
    setAddIcon(QUICK_ICONS[0].icon)
    setAddLabel(QUICK_ICONS[0].label)
    setAddTime('')
    setShowAddForm(false)
  }

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

  const activeSteps = steps.filter(s => !cancelledIds.includes(s.id) && !(s.id in postponedMap))
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
            const isPostponed = step.id in postponedMap
            const postponeTarget = postponedMap[step.id] ?? ''
            const tomorrow = offsetDate(date, 1)
            const postponeLabel = postponeTarget === tomorrow
              ? 'Reportée à demain'
              : postponeTarget
                ? `Reportée au ${new Date(postponeTarget + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                : 'Reportée'
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
                    {isPostponed && <div className="text-orange-400 text-sm font-semibold mt-1">{postponeLabel}</div>}
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
          <div className="absolute inset-0 bg-black/30" onClick={() => { setActionStep(null); setPostponeDate('') }} />
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

              <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">→</span>
                  <div className="font-bold text-orange-700 text-lg">Reporter à une date</div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map(days => {
                    const d = offsetDate(date, days)
                    const label = days === 1 ? 'Demain' : `+${days}j`
                    return (
                      <button key={days} onClick={() => setPostponeDate(d)}
                        className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                          postponeDate === d ? 'bg-orange-500 text-white' : 'bg-white border-2 border-orange-200 text-orange-600'
                        }`}>
                        {label}
                      </button>
                    )
                  })}
                  <input
                    type="date"
                    min={offsetDate(date, 1)}
                    value={postponeDate}
                    onChange={e => setPostponeDate(e.target.value)}
                    className="flex-1 py-2 px-2 rounded-xl border-2 border-orange-200 text-orange-600 text-sm font-semibold bg-white focus:outline-none focus:border-orange-400"
                  />
                </div>
                <button
                  onClick={handlePostpone}
                  disabled={!postponeDate}
                  className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-base active:scale-95 transition-all disabled:opacity-40">
                  Confirmer le report
                </button>
              </div>

              <button onClick={() => { setActionStep(null); setPostponeDate('') }}
                className="w-full p-4 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-lg active:scale-95 transition-all">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB ajout rapide */}
      {!showAddForm && !actionStep && (
        <button
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-32 right-6 w-16 h-16 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-4xl rounded-full shadow-lg flex items-center justify-center transition-all z-40"
        >+</button>
      )}

      {/* Formulaire ajout rapide */}
      {showAddForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Ajouter une tâche</h2>

            {/* Grille d'icônes */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-500 mb-2">Icône</label>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_ICONS.map(({ icon, label }) => (
                  <button
                    key={icon}
                    onClick={() => {
                      setAddIcon(icon)
                      if (!addLabel || QUICK_ICON_LABELS.has(addLabel)) setAddLabel(label)
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all active:scale-95 ${
                      addIcon === icon ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-3xl">{icon}</span>
                    <span className={`text-xs font-semibold ${addIcon === icon ? 'text-indigo-700' : 'text-gray-500'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nom de la tâche */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-500 mb-1">Nom de la tâche</label>
              <input
                type="text"
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                placeholder="Ex : Médicaments du soir..."
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Heure optionnelle */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-500 mb-1">Heure (optionnel)</label>
              <input
                type="time"
                value={addTime}
                onChange={e => setAddTime(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all"
              >Annuler</button>
              <button
                onClick={handleAddExtra}
                disabled={!addLabel.trim()}
                className="flex-[2] py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all"
              >Ajouter</button>
            </div>
          </div>
        </div>
      )}

      <BackBar />
    </main>
  )
}
