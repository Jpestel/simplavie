'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'
import { loadFinanceData, saveFinanceData, DEFAULT_FINANCE } from '@/lib/financeService'
import { computeBudgetSummary, localISO } from '@/lib/financeUtils'
import type { FinanceData, FinanceTransaction } from '@/types'

function fmt(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function fmtDateShort(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function FinancesPage() {
  const { activeUserId, loading: authLoading } = useAuth()
  const [data, setData] = useState<FinanceData>(DEFAULT_FINANCE)
  const [loading, setLoading] = useState(true)
  const [showProjection, setShowProjection] = useState(false)

  // Balance update sheet
  const [showBalance, setShowBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  // Add/edit transaction sheet
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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleUpdateBalance = async () => {
    const val = parseFloat(balanceInput.replace(',', '.'))
    if (isNaN(val)) return
    const next = { ...data, balance: val, balanceDate: localISO(new Date()) }
    setData(next)
    if (activeUserId) await saveFinanceData(next, activeUserId)
    setShowBalance(false); setBalanceInput('')
  }

  const openAddTx = () => {
    setEditingTx(null); setTxLabel(''); setTxAmount(''); setTxDate(localISO(new Date()))
    setShowAddTx(true)
  }

  const openEditTx = (tx: FinanceTransaction) => {
    setEditingTx(tx); setTxLabel(tx.label); setTxAmount(tx.amount.toString()); setTxDate(tx.date)
    setShowAddTx(true)
  }

  const handleSaveTx = async () => {
    const amount = parseFloat(txAmount.replace(',', '.'))
    if (!txLabel.trim() || isNaN(amount) || amount <= 0) return

    let next: FinanceData
    if (editingTx) {
      const diff = amount - editingTx.amount
      next = {
        ...data,
        balance: data.balance - diff,
        balanceDate: localISO(new Date()),
        transactions: data.transactions.map(t => t.id === editingTx.id
          ? { ...editingTx, label: txLabel.trim(), amount, date: txDate } : t),
      }
    } else {
      next = {
        ...data,
        balance: data.balance - amount,
        balanceDate: localISO(new Date()),
        transactions: [
          { id: `tx-${Date.now()}`, label: txLabel.trim(), amount, date: txDate },
          ...data.transactions,
        ].slice(0, 50),
      }
    }
    setData(next)
    if (activeUserId) await saveFinanceData(next, activeUserId)
    setShowAddTx(false); setEditingTx(null)
  }

  const handleDeleteTx = async (tx: FinanceTransaction) => {
    if (!confirm('Supprimer cette dépense ?')) return
    const next: FinanceData = {
      ...data,
      balance: data.balance + tx.amount,
      balanceDate: localISO(new Date()),
      transactions: data.transactions.filter(t => t.id !== tx.id),
    }
    setData(next); if (activeUserId) await saveFinanceData(next, activeUserId)
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const threshold = data.alertThreshold ?? 5
  const needsUpdate = summary?.needsDateUpdate ?? false
  const freePerDay = summary?.freePerDay ?? 0
  const isNegative = !needsUpdate && freePerDay < 0
  const isWarning  = !needsUpdate && freePerDay >= 0 && freePerDay < threshold
  const cardBg = !summary ? 'bg-gray-400'
    : needsUpdate ? 'bg-orange-400'
    : isNegative ? 'bg-red-500'
    : isWarning ? 'bg-orange-400'
    : 'bg-indigo-500'

  const recentTx = data.transactions.slice(0, 8)

  return (
    <main className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">💶 Finances</h1>

      {/* ── Carte principale ── */}
      <div className={`rounded-3xl p-7 mb-5 text-white shadow-lg ${cardBg}`}>
        {!summary ? (
          <div className="text-center">
            <div className="text-4xl mb-2">⚙️</div>
            <div className="text-lg font-semibold">Configurez vos ressources</div>
            <div className="text-sm opacity-75 mt-1">Accédez à la configuration pour démarrer</div>
          </div>
        ) : needsUpdate ? (
          <div className="text-center">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-lg font-bold mb-1">Date de versement inconnue</div>
            <div className="text-sm opacity-90">
              Mettez à jour la date de : <strong>{summary.expiredSources.join(', ')}</strong>
            </div>
            <div className="text-sm opacity-75 mt-2">Solde actuel : {fmt(data.balance)}</div>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="text-base font-semibold opacity-80 mb-1">Budget libre / jour</div>
              <div className="text-6xl font-black tracking-tight mb-2">{fmt(freePerDay)}</div>
              <div className="text-sm opacity-75">
                {summary.daysUntilNextIncome === 1
                  ? `Demain : ${summary.nextIncomeLabel} +${fmt(summary.nextIncomeAmount)}`
                  : `${summary.daysUntilNextIncome} jours · jusqu'au ${fmtDate(summary.nextIncomeDate)}`}
              </div>
            </div>

            {/* Résumé en 3 colonnes */}
            <div className="grid grid-cols-3 gap-3 bg-white/15 rounded-2xl p-4 text-center">
              <div>
                <div className="text-xs opacity-70 mb-0.5">Solde</div>
                <div className="text-base font-bold">{fmt(data.balance)}</div>
              </div>
              <div>
                <div className="text-xs opacity-70 mb-0.5">Engagements</div>
                <div className="text-base font-bold">
                  {summary.committedIn > 0
                    ? `${fmt(-summary.committedOut)} / +${fmt(summary.committedIn)}`
                    : fmt(-summary.committedOut)}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70 mb-0.5">Libre total</div>
                <div className="text-base font-bold">{fmt(summary.freeTotal)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Alertes ── */}
      {needsUpdate && summary && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-5">
          <p className="text-orange-700 font-bold">📅 Mise à jour requise</p>
          <p className="text-orange-600 text-sm mt-1">
            Rendez-vous dans la <strong>configuration</strong> pour renseigner la prochaine date de versement de : <strong>{summary.expiredSources.join(', ')}</strong>.
          </p>
        </div>
      )}
      {!needsUpdate && isWarning && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-5">
          <p className="text-orange-700 font-bold">⚠️ Budget serré</p>
          <p className="text-orange-600 text-sm mt-1">Il te reste moins de {threshold}€ par jour. Sois vigilant(e).</p>
        </div>
      )}
      {!needsUpdate && isNegative && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-5">
          <p className="text-red-700 font-bold">🚨 Budget dépassé</p>
          <p className="text-red-600 text-sm mt-1">Tes engagements dépassent ton solde actuel.</p>
        </div>
      )}

      {/* ── Solde actuel ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400 font-semibold">Solde actuel</div>
          <div className="text-2xl font-bold text-gray-800">{fmt(data.balance)}</div>
          {data.balanceDate && <div className="text-xs text-gray-400 mt-0.5">Mis à jour le {fmtDate(data.balanceDate)}</div>}
        </div>
        <button onClick={() => { setBalanceInput(data.balance.toString()); setShowBalance(true) }}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl text-sm active:scale-95 transition-all">
          Mettre à jour
        </button>
      </div>

      {/* ── Évolution prévue ── */}
      {summary && !needsUpdate && summary.projection.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setShowProjection(v => !v)}
            className="w-full flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.99] transition-all"
          >
            <span className="font-bold text-gray-700">📊 Évolution prévue jusqu&apos;au {fmtDate(summary.nextIncomeDate)}</span>
            <span className="text-gray-400 text-lg">{showProjection ? '▲' : '▼'}</span>
          </button>

          {showProjection && (
            <div className="mt-2 bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Ligne de départ */}
              <div className="px-5 py-4 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Aujourd&apos;hui · {fmtDateShort(localISO(new Date()))}</span>
                    <div className="text-sm text-gray-500 mt-0.5">Solde actuel : <span className="font-semibold text-gray-800">{fmt(data.balance)}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Budget libre/jour</div>
                    <div className="text-lg font-black text-indigo-600">{fmt(summary.freePerDay)}</div>
                  </div>
                </div>
              </div>

              {/* Événements */}
              {summary.projection.filter(p => !p.isToday && p.events.length > 0).map((entry, i) => (
                <div key={entry.date} className={`px-5 py-4 ${i < summary.projection.filter(p => !p.isToday && p.events.length > 0).length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{fmtDateShort(entry.date)}</div>
                  {entry.events.map((ev, j) => (
                    <div key={j} className={`flex items-center gap-2 mb-1 ${j < entry.events.length - 1 ? '' : ''}`}>
                      <span className={`text-sm font-semibold ${ev.flow === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                        {ev.flow === 'in' ? '+' : '-'}{fmt(ev.amount)}
                      </span>
                      <span className="text-sm text-gray-600">{ev.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="text-xs text-gray-400">Solde prévu : <span className="font-semibold text-gray-700">{fmt(entry.balanceAfter)}</span></div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">À partir de là</div>
                      <div className={`text-sm font-bold ${entry.freePerDay < 0 ? 'text-red-500' : entry.freePerDay < threshold ? 'text-orange-500' : 'text-indigo-600'}`}>
                        {fmt(entry.freePerDay)}/j · {entry.daysRemaining}j
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Ligne d'arrivée : prochaine ressource */}
              <div className="px-5 py-4 bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{fmtDateShort(summary.nextIncomeDate)}</span>
                    <div className="text-sm text-gray-600 mt-0.5">{summary.nextIncomeLabel}</div>
                  </div>
                  <div className="text-lg font-black text-green-600">+{fmt(summary.nextIncomeAmount)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mes dépenses ── */}
      {recentTx.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-700 mb-3">Mes dépenses récentes</h2>
          <div className="space-y-2">
            {recentTx.map(tx => (
              <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{tx.label}</div>
                  <div className="text-sm text-gray-400">{fmtDate(tx.date)}</div>
                </div>
                <div className="text-red-500 font-bold mr-2">-{fmt(tx.amount)}</div>
                <button onClick={() => openEditTx(tx)} className="text-gray-300 hover:text-indigo-500 text-xl active:scale-95 transition-all">✏️</button>
                <button onClick={() => handleDeleteTx(tx)} className="text-gray-300 hover:text-red-500 text-xl active:scale-95 transition-all">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      {!showAddTx && !showBalance && (
        <button onClick={openAddTx}
          className="fixed bottom-32 right-6 w-16 h-16 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-4xl rounded-full shadow-lg flex items-center justify-center transition-all z-40">
          +
        </button>
      )}

      {/* ── Bottom sheet solde ── */}
      {showBalance && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBalance(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Mettre à jour le solde</h2>
            <p className="text-sm text-gray-400 mb-4">Entrez le solde actuellement affiché dans votre banque.</p>
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

      {/* ── Bottom sheet dépense ── */}
      {showAddTx && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddTx(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingTx ? 'Modifier la dépense' : 'Enregistrer une dépense'}
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Description</label>
                <input type="text" value={txLabel} onChange={e => setTxLabel(e.target.value)}
                  placeholder="Ex : Supermarché, pharmacie..." className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Montant (€)</label>
                <input type="number" step="0.01" min="0" value={txAmount} onChange={e => setTxAmount(e.target.value)}
                  placeholder="0.00" className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg font-bold focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Date</label>
                <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            {/* Impact immédiat */}
            {!editingTx && txAmount && !isNaN(parseFloat(txAmount)) && summary && !needsUpdate && (
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="text-sm text-gray-500 mb-1">Impact sur ton budget libre</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nouveau solde :</span>
                  <span className="font-bold text-gray-800">{fmt(data.balance - parseFloat(txAmount))}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-600">Nouveau budget/jour :</span>
                  <span className={`font-bold ${(summary.freeTotal - parseFloat(txAmount)) / summary.daysUntilNextIncome < threshold ? 'text-orange-500' : 'text-indigo-600'}`}>
                    {fmt((summary.freeTotal - parseFloat(txAmount)) / summary.daysUntilNextIncome)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowAddTx(false); setEditingTx(null) }} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95">Annuler</button>
              <button onClick={handleSaveTx} disabled={!txLabel.trim() || !txAmount}
                className={`flex-[2] py-4 rounded-2xl disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all ${editingTx ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-green-500 hover:bg-green-600'}`}>
                {editingTx ? 'Modifier' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar />
    </main>
  )
}
