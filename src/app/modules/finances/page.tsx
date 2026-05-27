'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'
import { loadFinanceData, saveFinanceData, DEFAULT_FINANCE } from '@/lib/financeService'
import { computeBudgetSummary } from '@/lib/financeUtils'
import type { FinanceData, FinanceTransaction } from '@/types'

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmt(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function FinancesPage() {
  const { activeUserId, loading: authLoading } = useAuth()
  const [data, setData] = useState<FinanceData>(DEFAULT_FINANCE)
  const [loading, setLoading] = useState(true)

  // Balance update bottom sheet
  const [showBalance, setShowBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  // Add/edit transaction bottom sheet
  const [showAddTx, setShowAddTx] = useState(false)
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null)
  const [txLabel, setTxLabel] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDate, setTxDate] = useState(localISO(new Date()))

  useEffect(() => {
    if (authLoading || !activeUserId) return
    loadFinanceData(activeUserId).then(d => { setData(d); setLoading(false) })
  }, [activeUserId, authLoading])

  const summary = computeBudgetSummary(data)

  const handleUpdateBalance = async () => {
    const val = parseFloat(balanceInput.replace(',', '.'))
    if (isNaN(val)) return
    const next = { ...data, balance: val, balanceDate: localISO(new Date()) }
    setData(next)
    if (activeUserId) await saveFinanceData(next, activeUserId)
    setShowBalance(false)
    setBalanceInput('')
  }

  const openAddTx = () => {
    setEditingTx(null)
    setTxLabel('')
    setTxAmount('')
    setTxDate(localISO(new Date()))
    setShowAddTx(true)
  }

  const openEditTx = (tx: FinanceTransaction) => {
    setEditingTx(tx)
    setTxLabel(tx.label)
    setTxAmount(tx.amount.toString())
    setTxDate(tx.date)
    setShowAddTx(true)
  }

  const handleAddTransaction = async () => {
    const amount = parseFloat(txAmount.replace(',', '.'))
    if (!txLabel.trim() || isNaN(amount) || amount <= 0) return

    let next: FinanceData
    if (editingTx) {
      // Remboursement de l'ancienne dépense + déduction nouvelle
      const diff = amount - editingTx.amount
      const updatedTx: FinanceTransaction = { ...editingTx, label: txLabel.trim(), amount, date: txDate }
      next = {
        ...data,
        balance: data.balance - diff,
        balanceDate: localISO(new Date()),
        transactions: data.transactions.map(t => t.id === editingTx.id ? updatedTx : t),
      }
    } else {
      const tx: FinanceTransaction = { id: `tx-${Date.now()}`, label: txLabel.trim(), amount, date: txDate }
      next = {
        ...data,
        balance: data.balance - amount,
        balanceDate: localISO(new Date()),
        transactions: [tx, ...data.transactions].slice(0, 50),
      }
    }
    setData(next)
    if (activeUserId) await saveFinanceData(next, activeUserId)
    setShowAddTx(false)
    setEditingTx(null)
  }

  const handleDeleteTx = async (tx: FinanceTransaction) => {
    if (!confirm('Supprimer cette dépense ?')) return
    // Rembourser le montant au solde
    const next: FinanceData = {
      ...data,
      balance: data.balance + tx.amount,
      balanceDate: localISO(new Date()),
      transactions: data.transactions.filter(t => t.id !== tx.id),
    }
    setData(next)
    if (activeUserId) await saveFinanceData(next, activeUserId)
  }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const daily = summary?.dailyBudget ?? 0
  const threshold = data.alertThreshold ?? 5
  const isNegative = daily < 0
  const isWarning = daily >= 0 && daily < threshold
  const cardBg = isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-indigo-500'
  const recentTx = data.transactions.slice(0, 5)

  return (
    <main className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">💶 Finances</h1>

      {/* Big daily budget card */}
      <div className={`rounded-3xl p-7 mb-5 text-white text-center shadow-lg ${cardBg}`}>
        {summary ? (
          <>
            <div className="text-lg font-semibold opacity-80 mb-1">Budget disponible / jour</div>
            <div className="text-6xl font-black mb-2">{fmt(summary.dailyBudget)}</div>
            <div className="text-sm opacity-75">
              {summary.daysUntilNextIncome === 1
                ? "Ressource attendue aujourd'hui"
                : `${summary.daysUntilNextIncome} jours jusqu'au ${fmtDate(summary.nextIncomeDate)}`}
            </div>
            <div className="text-sm opacity-75 mt-1">
              Budget restant total : {fmt(summary.availableBudget)}
            </div>

            {/* Barre de progression dans la période */}
            <div className="mt-4">
              <div className="flex justify-between text-xs opacity-60 mb-1">
                <span>Jour {summary.daysElapsed + 1}</span>
                <span>{summary.totalPeriodDays} jours au total</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-white/80 transition-all duration-500"
                  style={{ width: `${summary.periodProgress}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl mb-2">⚙️</div>
            <div className="text-lg font-semibold">Configurez vos ressources</div>
            <div className="text-sm opacity-75 mt-1">Accédez à la configuration pour démarrer</div>
          </>
        )}
      </div>

      {/* Alerte budget serré */}
      {summary && isWarning && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-5">
          <p className="text-orange-700 font-bold">⚠️ Budget serré</p>
          <p className="text-orange-600 text-sm mt-1">Il te reste moins de 5 € par jour jusqu&apos;à ta prochaine ressource. Sois vigilant(e) dans tes dépenses.</p>
        </div>
      )}
      {summary && isNegative && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-5">
          <p className="text-red-700 font-bold">🚨 Budget dépassé</p>
          <p className="text-red-600 text-sm mt-1">Tes dépenses à venir dépassent ton solde actuel. Vérifie tes échéances.</p>
        </div>
      )}

      {/* Solde actuel */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400 font-semibold">Solde actuel</div>
          <div className="text-2xl font-bold text-gray-800">{fmt(data.balance)}</div>
          {data.balanceDate && (
            <div className="text-xs text-gray-400 mt-0.5">Mis à jour le {fmtDate(data.balanceDate)}</div>
          )}
        </div>
        <button
          onClick={() => { setBalanceInput(data.balance.toString()); setShowBalance(true) }}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl text-sm active:scale-95 transition-all"
        >
          Mettre à jour
        </button>
      </div>

      {/* Revenus exceptionnels à venir */}
      {summary && summary.upcomingExceptionalIncomes.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-700 mb-3">Revenus exceptionnels attendus</h2>
          <div className="space-y-2">
            {summary.upcomingExceptionalIncomes.map((e, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{e.label}</div>
                  <div className="text-sm text-gray-400">{fmtDate(e.date)}</div>
                </div>
                <div className="text-green-500 font-bold text-lg">+{fmt(e.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prochaines échéances */}
      {summary && summary.upcomingExpenses.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-700 mb-3">Échéances à venir</h2>
          <div className="space-y-2">
            {summary.upcomingExpenses.map((e, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{e.label}</div>
                  <div className="text-sm text-gray-400">{fmtDate(e.date)}</div>
                </div>
                <div className="text-red-500 font-bold text-lg">-{fmt(e.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernières dépenses enregistrées */}
      {recentTx.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-700 mb-3">Dernières dépenses</h2>
          <div className="space-y-2">
            {recentTx.map(tx => (
              <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{tx.label}</div>
                  <div className="text-sm text-gray-400">{fmtDate(tx.date)}</div>
                </div>
                <div className="text-gray-700 font-bold mr-2">-{fmt(tx.amount)}</div>
                <button onClick={() => openEditTx(tx)} className="text-gray-300 hover:text-indigo-500 text-xl active:scale-95 transition-all">✏️</button>
                <button onClick={() => handleDeleteTx(tx)} className="text-gray-300 hover:text-red-500 text-xl active:scale-95 transition-all">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      {!showAddTx && !showBalance && (
        <button
          onClick={openAddTx}
          className="fixed bottom-32 right-6 w-16 h-16 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-4xl rounded-full shadow-lg flex items-center justify-center transition-all z-40"
        >+</button>
      )}

      {/* Bottom sheet : mettre à jour le solde */}
      {showBalance && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBalance(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Mettre à jour le solde</h2>
            <p className="text-sm text-gray-400 mb-4">Entrez votre solde actuel en consultant votre application bancaire.</p>
            <div className="relative mb-6">
              <input
                type="number"
                step="0.01"
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                placeholder="0.00"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-2xl font-bold focus:outline-none focus:border-indigo-400 text-center"
                autoFocus
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl font-bold">€</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBalance(false)} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">Annuler</button>
              <button onClick={handleUpdateBalance} disabled={!balanceInput} className="flex-[2] py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet : enregistrer une dépense */}
      {showAddTx && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddTx(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingTx ? 'Modifier la dépense' : 'Enregistrer une dépense'}</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Description</label>
                <input type="text" value={txLabel} onChange={e => setTxLabel(e.target.value)} placeholder="Ex : Supermarché, taxi..." className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Montant (€)</label>
                <input type="number" step="0.01" min="0" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg font-bold focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Date</label>
                <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAddTx(false); setEditingTx(null) }} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">Annuler</button>
              <button onClick={handleAddTransaction} disabled={!txLabel.trim() || !txAmount} className={`flex-[2] py-4 rounded-2xl disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all ${editingTx ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-green-500 hover:bg-green-600'}`}>{editingTx ? 'Modifier' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      <BackBar />
    </main>
  )
}
