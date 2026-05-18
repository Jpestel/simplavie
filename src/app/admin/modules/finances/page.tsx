'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'
import { loadFinanceData, saveFinanceData, DEFAULT_FINANCE } from '@/lib/financeService'
import type { FinanceData, IncomeSource, FinanceFixedExpense, FinancePlannedExpense } from '@/types'

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmt(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

type FormSheet =
  | { type: 'income'; item?: IncomeSource }
  | { type: 'fixed'; item?: FinanceFixedExpense }
  | { type: 'planned'; item?: FinancePlannedExpense }
  | null

export default function FinancesAdminPage() {
  const { activeUserId, loading: authLoading } = useAuth()
  const [data, setData] = useState<FinanceData>(DEFAULT_FINANCE)
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<FormSheet>(null)

  // Form fields
  const [fLabel, setFLabel] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fDay, setFDay] = useState('1')
  const [fDate, setFDate] = useState(localISO(new Date()))
  const [fActive, setFActive] = useState(true)

  // Balance update
  const [showBalance, setShowBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  // Alert threshold
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

  const openSheet = (s: FormSheet) => {
    if (!s) { setSheet(null); return }
    setSheet(s)
    if (s.type === 'income' && s.item) {
      setFLabel(s.item.label); setFAmount(s.item.amount.toString()); setFDay(s.item.dayOfMonth.toString()); setFActive(s.item.active)
    } else if (s.type === 'fixed' && s.item) {
      setFLabel(s.item.label); setFAmount(s.item.amount.toString()); setFDay(s.item.dayOfMonth.toString()); setFActive(s.item.active)
    } else if (s.type === 'planned' && s.item) {
      setFLabel(s.item.label); setFAmount(s.item.amount.toString()); setFDate(s.item.date)
    } else {
      setFLabel(''); setFAmount(''); setFDay('1'); setFDate(localISO(new Date())); setFActive(true)
    }
  }

  const handleSaveSheet = async () => {
    if (!sheet) return
    const amount = parseFloat(fAmount.replace(',', '.'))
    if (!fLabel.trim() || isNaN(amount)) return
    const day = parseInt(fDay)

    if (sheet.type === 'income') {
      const item: IncomeSource = { id: sheet.item?.id ?? `inc-${Date.now()}`, label: fLabel.trim(), amount, dayOfMonth: day, active: fActive }
      const list = sheet.item ? data.incomeSources.map(i => i.id === item.id ? item : i) : [...data.incomeSources, item]
      await save({ ...data, incomeSources: list })
    } else if (sheet.type === 'fixed') {
      const item: FinanceFixedExpense = { id: sheet.item?.id ?? `fix-${Date.now()}`, label: fLabel.trim(), amount, dayOfMonth: day, active: fActive }
      const list = sheet.item ? data.fixedExpenses.map(i => i.id === item.id ? item : i) : [...data.fixedExpenses, item]
      await save({ ...data, fixedExpenses: list })
    } else if (sheet.type === 'planned') {
      const item: FinancePlannedExpense = { id: sheet.item?.id ?? `pln-${Date.now()}`, label: fLabel.trim(), amount, date: fDate, paid: sheet.item?.paid ?? false }
      const list = sheet.item ? data.plannedExpenses.map(i => i.id === item.id ? item : i) : [...data.plannedExpenses, item]
      await save({ ...data, plannedExpenses: list })
    }
    setSheet(null)
  }

  const handleDelete = async (type: 'income' | 'fixed' | 'planned', id: string) => {
    if (type === 'income') await save({ ...data, incomeSources: data.incomeSources.filter(i => i.id !== id) })
    else if (type === 'fixed') await save({ ...data, fixedExpenses: data.fixedExpenses.filter(i => i.id !== id) })
    else await save({ ...data, plannedExpenses: data.plannedExpenses.filter(i => i.id !== id) })
  }

  const handleUpdateBalance = async () => {
    const val = parseFloat(balanceInput.replace(',', '.'))
    if (isNaN(val)) return
    await save({ ...data, balance: val, balanceDate: localISO(new Date()) })
    setShowBalance(false)
    setBalanceInput('')
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

  return (
    <main className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">💶 Configuration Finances</h1>

      {/* Seuil d'alerte */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">Seuil d&apos;alerte</h2>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-400 mb-3">Une alerte s&apos;affiche quand le budget disponible par jour passe sous ce seuil.</p>
          {editingThreshold ? (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  type="number" min="0" step="1"
                  value={thresholdInput}
                  onChange={e => setThresholdInput(e.target.value)}
                  className="w-full border-2 border-indigo-300 rounded-2xl px-4 py-3 text-xl font-bold focus:outline-none focus:border-indigo-500 text-center"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
              </div>
              <button onClick={() => setEditingThreshold(false)} className="px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold active:scale-95 transition-all">✕</button>
              <button onClick={handleSaveThreshold} className="px-4 py-3 rounded-2xl bg-indigo-500 text-white font-bold active:scale-95 transition-all">✓</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-orange-500 text-2xl">⚠️</span>
                <span className="text-2xl font-black text-gray-800">{data.alertThreshold ?? 5} €<span className="text-base font-semibold text-gray-400"> / jour</span></span>
              </div>
              <button
                onClick={() => { setThresholdInput((data.alertThreshold ?? 5).toString()); setEditingThreshold(true) }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl text-sm active:scale-95 transition-all"
              >Modifier</button>
            </div>
          )}
        </div>
      </section>

      {/* Solde */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">Solde actuel</h2>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-gray-800">{fmt(data.balance)}</div>
            {data.balanceDate && <div className="text-sm text-gray-400 mt-1">Mis à jour le {new Date(data.balanceDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>}
          </div>
          <button onClick={() => { setBalanceInput(data.balance.toString()); setShowBalance(true) }} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl text-sm active:scale-95 transition-all">
            Mettre à jour
          </button>
        </div>
      </section>

      {/* Ressources */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">Ressources (revenus)</h2>
          <button onClick={() => openSheet({ type: 'income' })} className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl text-sm active:scale-95 transition-all">+ Ajouter</button>
        </div>
        {data.incomeSources.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-2xl">Aucune ressource configurée</div>
        ) : (
          <div className="space-y-2">
            {data.incomeSources.map(item => (
              <div key={item.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${!item.active ? 'opacity-50' : ''}`}>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{item.label}</div>
                  <div className="text-sm text-gray-400">Le {item.dayOfMonth} du mois · {fmt(item.amount)}</div>
                </div>
                <button onClick={() => openSheet({ type: 'income', item })} className="text-gray-400 hover:text-indigo-500 text-xl px-2 active:scale-95 transition-all">✏️</button>
                <button onClick={() => handleDelete('income', item.id)} className="text-gray-400 hover:text-red-500 text-xl px-2 active:scale-95 transition-all">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dépenses fixes */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">Dépenses fixes</h2>
          <button onClick={() => openSheet({ type: 'fixed' })} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-sm active:scale-95 transition-all">+ Ajouter</button>
        </div>
        {data.fixedExpenses.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-2xl">Aucune dépense fixe</div>
        ) : (
          <div className="space-y-2">
            {data.fixedExpenses.map(item => (
              <div key={item.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${!item.active ? 'opacity-50' : ''}`}>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{item.label}</div>
                  <div className="text-sm text-gray-400">Le {item.dayOfMonth} du mois · {fmt(item.amount)}</div>
                </div>
                <button onClick={() => openSheet({ type: 'fixed', item })} className="text-gray-400 hover:text-indigo-500 text-xl px-2 active:scale-95 transition-all">✏️</button>
                <button onClick={() => handleDelete('fixed', item.id)} className="text-gray-400 hover:text-red-500 text-xl px-2 active:scale-95 transition-all">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dépenses planifiées */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">Dépenses planifiées</h2>
          <button onClick={() => openSheet({ type: 'planned' })} className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold rounded-xl text-sm active:scale-95 transition-all">+ Ajouter</button>
        </div>
        {data.plannedExpenses.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-2xl">Aucune dépense planifiée</div>
        ) : (
          <div className="space-y-2">
            {data.plannedExpenses.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{item.label}</div>
                  <div className="text-sm text-gray-400">{new Date(item.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · {fmt(item.amount)}</div>
                </div>
                <button onClick={() => openSheet({ type: 'planned', item })} className="text-gray-400 hover:text-indigo-500 text-xl px-2 active:scale-95 transition-all">✏️</button>
                <button onClick={() => handleDelete('planned', item.id)} className="text-gray-400 hover:text-red-500 text-xl px-2 active:scale-95 transition-all">🗑️</button>
              </div>
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
            <div className="relative mb-6">
              <input type="number" step="0.01" value={balanceInput} onChange={e => setBalanceInput(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-2xl font-bold focus:outline-none focus:border-indigo-400 text-center" autoFocus />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl font-bold">€</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBalance(false)} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">Annuler</button>
              <button onClick={handleUpdateBalance} className="flex-[2] py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg active:scale-95 transition-all">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet form (income / fixed / planned) */}
      {sheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSheet(null)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {sheet.type === 'income' ? (sheet.item ? 'Modifier la ressource' : 'Ajouter une ressource')
              : sheet.type === 'fixed' ? (sheet.item ? 'Modifier la dépense fixe' : 'Ajouter une dépense fixe')
              : (sheet.item ? 'Modifier la dépense planifiée' : 'Ajouter une dépense planifiée')}
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Libellé</label>
                <input type="text" value={fLabel} onChange={e => setFLabel(e.target.value)} placeholder={sheet.type === 'income' ? 'Ex : Salaire, AAH...' : 'Ex : Loyer, EDF...'} className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Montant (€)</label>
                <input type="number" step="0.01" min="0" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-400" />
              </div>
              {(sheet.type === 'income' || sheet.type === 'fixed') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Jour du mois (1-31)</label>
                  <input type="number" min="1" max="31" value={fDay} onChange={e => setFDay(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-400" />
                </div>
              )}
              {sheet.type === 'planned' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Date prévue</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-indigo-400" />
                </div>
              )}
              {(sheet.type === 'income' || sheet.type === 'fixed') && (
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={() => setFActive(!fActive)} className={`w-12 h-7 rounded-full transition-all relative ${fActive ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${fActive ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm font-semibold text-gray-600">Active</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSheet(null)} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">Annuler</button>
              <button onClick={handleSaveSheet} disabled={!fLabel.trim() || !fAmount} className="flex-[2] py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all">
                {sheet.item ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar label="Configurer · Finances" href="/admin/dashboard" />
    </main>
  )
}
