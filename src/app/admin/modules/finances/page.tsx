'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'
import { loadFinanceData, saveFinanceData, DEFAULT_FINANCE } from '@/lib/financeService'
import { localISO } from '@/lib/financeUtils'
import type { FinanceData, FinanceEvent } from '@/types'

function fmt(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function eventScheduleLabel(ev: FinanceEvent): string {
  if (ev.mode === 'fixed' && ev.dayOfMonth) return `Le ${ev.dayOfMonth} de chaque mois`
  if (ev.mode === 'variable') return ev.nextDate ? `Variable · prochain le ${fmtDate(ev.nextDate)}` : 'Variable · date non définie'
  if (ev.mode === 'oneshot' && ev.nextDate) return `Le ${fmtDate(ev.nextDate)}`
  return '—'
}

const MODE_LABELS: Record<string, string> = {
  fixed: 'Récurrent fixe',
  variable: 'Récurrent variable',
  oneshot: 'Ponctuel',
}

export default function FinancesAdminPage() {
  const { activeUserId, loading: authLoading } = useAuth()
  const [data, setData] = useState<FinanceData>(DEFAULT_FINANCE)
  const [loading, setLoading] = useState(true)

  // Bottom sheet form
  const [showSheet, setShowSheet] = useState(false)
  const [editingEvent, setEditingEvent] = useState<FinanceEvent | null>(null)

  // Champs du formulaire
  const [fLabel, setFLabel] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fFlow, setFFlow] = useState<'in' | 'out'>('out')
  const [fMode, setFMode] = useState<'fixed' | 'variable' | 'oneshot'>('fixed')
  const [fDay, setFDay] = useState('1')
  const [fDate, setFDate] = useState(localISO(new Date()))
  const [fActive, setFActive] = useState(true)

  // Solde
  const [showBalance, setShowBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  // Seuil alerte
  const [thresholdInput, setThresholdInput] = useState('')
  const [editingThreshold, setEditingThreshold] = useState(false)

  useEffect(() => {
    if (authLoading || !activeUserId) return
    loadFinanceData(activeUserId).then(d => { setData(d); setLoading(false) })
  }, [activeUserId, authLoading])

  const save = async (next: FinanceData) => {
    setData(next)
    if (activeUserId) await saveFinanceData(next, activeUserId)
  }

  const openNew = () => {
    setEditingEvent(null)
    setFLabel(''); setFAmount(''); setFFlow('out'); setFMode('fixed')
    setFDay('1'); setFDate(localISO(new Date())); setFActive(true)
    setShowSheet(true)
  }

  const openEdit = (ev: FinanceEvent) => {
    setEditingEvent(ev)
    setFLabel(ev.label); setFAmount(ev.amount.toString()); setFFlow(ev.flow)
    setFMode(ev.mode); setFDay((ev.dayOfMonth ?? 1).toString())
    setFDate(ev.nextDate ?? localISO(new Date())); setFActive(ev.active)
    setShowSheet(true)
  }

  const handleSaveEvent = async () => {
    const amount = parseFloat(fAmount.replace(',', '.'))
    if (!fLabel.trim() || isNaN(amount) || amount <= 0) return

    const item: FinanceEvent = {
      id: editingEvent?.id ?? `ev-${Date.now()}`,
      label: fLabel.trim(),
      amount,
      flow: fFlow,
      mode: fMode,
      dayOfMonth: fMode === 'fixed' ? parseInt(fDay) : undefined,
      nextDate: (fMode === 'variable' || fMode === 'oneshot') ? fDate : undefined,
      active: fActive,
      done: editingEvent?.done ?? false,
    }

    const events = editingEvent
      ? data.events.map(e => e.id === item.id ? item : e)
      : [...data.events, item]

    await save({ ...data, events })
    setShowSheet(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return
    await save({ ...data, events: data.events.filter(e => e.id !== id) })
  }

  const handleToggleDone = async (ev: FinanceEvent) => {
    const markingDone = !ev.done
    const updated = { ...ev, done: markingDone }
    const events = data.events.map(e => e.id === ev.id ? updated : e)
    // Pour les entrées ponctuelles : ajuster le solde quand on marque reçu/annule
    if (ev.mode === 'oneshot' && ev.flow === 'in') {
      const newBalance = markingDone ? data.balance + ev.amount : data.balance - ev.amount
      await save({ ...data, balance: newBalance, balanceDate: localISO(new Date()), events })
    } else {
      await save({ ...data, events })
    }
  }

  const handleUpdateBalance = async () => {
    const val = parseFloat(balanceInput.replace(',', '.'))
    if (isNaN(val)) return
    await save({ ...data, balance: val, balanceDate: localISO(new Date()) })
    setShowBalance(false); setBalanceInput('')
  }

  const handleSaveThreshold = async () => {
    const val = parseFloat(thresholdInput.replace(',', '.'))
    if (isNaN(val) || val < 0) return
    await save({ ...data, alertThreshold: val })
    setEditingThreshold(false)
  }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const inEvents  = data.events.filter(e => e.flow === 'in')
  const outEvents = data.events.filter(e => e.flow === 'out')

  return (
    <main className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">💶 Configuration Finances</h1>

      {/* Solde actuel */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-3">Solde actuel</h2>
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-gray-800">{fmt(data.balance)}</div>
            {data.balanceDate && (
              <div className="text-sm text-gray-400 mt-1">Mis à jour le {fmtDate(data.balanceDate)}</div>
            )}
          </div>
          <button
            onClick={() => { setBalanceInput(data.balance.toString()); setShowBalance(true) }}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl text-sm active:scale-95 transition-all"
          >Mettre à jour</button>
        </div>
      </section>

      {/* Seuil d'alerte */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-3">Seuil d&apos;alerte</h2>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-400 mb-3">Alerte quand le budget libre/jour passe sous ce seuil.</p>
          {editingThreshold ? (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input type="number" min="0" step="1" value={thresholdInput} onChange={e => setThresholdInput(e.target.value)}
                  className="w-full border-2 border-indigo-300 rounded-2xl px-4 py-3 text-xl font-bold focus:outline-none text-center" autoFocus />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
              </div>
              <button onClick={() => setEditingThreshold(false)} className="px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold active:scale-95">✕</button>
              <button onClick={handleSaveThreshold} className="px-4 py-3 rounded-2xl bg-indigo-500 text-white font-bold active:scale-95">✓</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-gray-800">{data.alertThreshold ?? 5} €<span className="text-base font-semibold text-gray-400">/jour</span></span>
              <button onClick={() => { setThresholdInput((data.alertThreshold ?? 5).toString()); setEditingThreshold(true) }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl text-sm active:scale-95 transition-all">Modifier</button>
            </div>
          )}
        </div>
      </section>

      {/* Événements : entrées */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">💚 Entrées d&apos;argent</h2>
          <button onClick={openNew} className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl text-sm active:scale-95 transition-all">+ Ajouter</button>
        </div>
        {inEvents.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-2xl text-sm">Aucune entrée configurée</div>
        ) : (
          <div className="space-y-2">
            {inEvents.map(ev => (
              <EventRow key={ev.id} ev={ev} onEdit={openEdit} onDelete={handleDelete} onToggleDone={handleToggleDone} />
            ))}
          </div>
        )}
      </section>

      {/* Événements : sorties */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">🔴 Sorties d&apos;argent</h2>
          <button onClick={openNew} className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl text-sm active:scale-95 transition-all">+ Ajouter</button>
        </div>
        {outEvents.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-2xl text-sm">Aucune sortie configurée</div>
        ) : (
          <div className="space-y-2">
            {outEvents.map(ev => (
              <EventRow key={ev.id} ev={ev} onEdit={openEdit} onDelete={handleDelete} onToggleDone={handleToggleDone} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom sheet balance */}
      {showBalance && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBalance(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Mettre à jour le solde</h2>
            <p className="text-sm text-gray-400 mb-4">Entrez votre solde actuel depuis votre application bancaire.</p>
            <div className="relative mb-6">
              <input type="number" step="0.01" value={balanceInput} onChange={e => setBalanceInput(e.target.value)}
                placeholder="0.00" className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-2xl font-bold focus:outline-none focus:border-indigo-400 text-center" autoFocus />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl font-bold">€</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBalance(false)} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95">Annuler</button>
              <button onClick={handleUpdateBalance} disabled={!balanceInput} className="flex-[2] py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet form événement */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSheet(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-5">
              {editingEvent ? 'Modifier' : 'Ajouter un événement financier'}
            </h2>

            <div className="space-y-4 mb-6">
              {/* Flow */}
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-2">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFFlow('in')}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${fFlow === 'in' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    💚 Entrée d&apos;argent
                  </button>
                  <button type="button" onClick={() => setFFlow('out')}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${fFlow === 'out' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    🔴 Sortie d&apos;argent
                  </button>
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Libellé</label>
                <input type="text" value={fLabel} onChange={e => setFLabel(e.target.value)}
                  placeholder={fFlow === 'in' ? 'Ex : Salaire, AAH, CAF...' : 'Ex : Loyer, EDF, Courses...'}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-400" />
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Montant (€)</label>
                <input type="number" step="0.01" min="0" value={fAmount} onChange={e => setFAmount(e.target.value)}
                  placeholder="0.00" className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-indigo-400" />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-2">Fréquence</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fixed', 'variable', 'oneshot'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setFMode(m)}
                      className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${fMode === m ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {m === 'fixed' ? '🔁 Fixe mensuel' : m === 'variable' ? '📅 Variable mensuel' : '1️⃣ Ponctuel'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {fMode === 'fixed' && 'Se répète chaque mois le même jour.'}
                  {fMode === 'variable' && 'Se répète chaque mois — tu mets à jour la date chaque mois.'}
                  {fMode === 'oneshot' && 'Une seule fois à la date choisie.'}
                </p>
              </div>

              {/* Jour du mois (fixed) */}
              {fMode === 'fixed' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Jour du mois (1-31)</label>
                  <input type="number" min="1" max="31" value={fDay} onChange={e => setFDay(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-400" />
                </div>
              )}

              {/* Date (variable ou oneshot) */}
              {(fMode === 'variable' || fMode === 'oneshot') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">
                    {fMode === 'variable' ? 'Prochaine date attendue' : 'Date'}
                  </label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-indigo-400" />
                </div>
              )}

              {/* Actif (fixed/variable) */}
              {fMode !== 'oneshot' && (
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={() => setFActive(!fActive)}
                    className={`w-12 h-7 rounded-full transition-all relative ${fActive ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${fActive ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm font-semibold text-gray-600">Actif</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSheet(false)} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95">Annuler</button>
              <button onClick={handleSaveEvent} disabled={!fLabel.trim() || !fAmount}
                className={`flex-[2] py-4 rounded-2xl disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all ${editingEvent ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-green-500 hover:bg-green-600'}`}>
                {editingEvent ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar label="Sauvegarder" href="/admin/dashboard" />
    </main>
  )
}

// ─── Composant ligne d'événement ──────────────────────────────────────────────
function EventRow({
  ev, onEdit, onDelete, onToggleDone,
}: {
  ev: FinanceEvent
  onEdit: (ev: FinanceEvent) => void
  onDelete: (id: string) => void
  onToggleDone: (ev: FinanceEvent) => void
}) {
  const isIn = ev.flow === 'in'
  const isDone = ev.mode === 'oneshot' && ev.done

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${isDone || !ev.active ? 'opacity-50' : ''}`}>
      <div className={`w-2 h-10 rounded-full shrink-0 ${isIn ? 'bg-green-400' : 'bg-red-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 truncate">{ev.label}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {eventScheduleLabel(ev)}
          {' · '}
          <span className={`font-semibold ${isIn ? 'text-green-600' : 'text-red-500'}`}>
            {isIn ? '+' : '-'}{ev.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
          {' · '}
          <span className="text-gray-400">{MODE_LABELS[ev.mode]}</span>
          {isDone && <span className="ml-1 text-green-600">· Traité ✓</span>}
        </div>
      </div>
      {ev.mode === 'oneshot' && !ev.done && (
        <button onClick={() => onToggleDone(ev)}
          className="text-xs px-2.5 py-1.5 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 font-semibold active:scale-95 shrink-0">
          ✓ Traité
        </button>
      )}
      <button onClick={() => onEdit(ev)} className="text-gray-300 hover:text-indigo-500 text-xl px-1 active:scale-95">✏️</button>
      <button onClick={() => onDelete(ev.id)} className="text-gray-300 hover:text-red-500 text-xl px-1 active:scale-95">🗑️</button>
    </div>
  )
}
