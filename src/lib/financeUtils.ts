import { FinanceData, IncomeSource } from '@/types'

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// Prochain jour du mois > today (strictement futur — le jour de ressource lui-même pointe sur le mois suivant)
function nextOccurrence(from: Date, dayOfMonth: number): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  if (from.getDate() < dayOfMonth) {
    d.setDate(dayOfMonth)
  } else {
    d.setMonth(d.getMonth() + 1, dayOfMonth)
  }
  return d
}

// Dernier jour du mois <= today (ce mois ou mois précédent)
function prevOccurrence(from: Date, dayOfMonth: number): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  if (from.getDate() >= dayOfMonth) {
    d.setDate(dayOfMonth)
  } else {
    d.setMonth(d.getMonth() - 1, dayOfMonth)
  }
  return d
}

// Retourne la prochaine date d'entrée pour une source donnée (strictement future pour fixed, ou nextDate pour variable)
function getNextIncome(source: IncomeSource, today: Date): Date {
  if ((source.dateMode ?? 'fixed') === 'variable') {
    if (!source.nextDate) return nextOccurrence(today, source.dayOfMonth)
    const d = new Date(source.nextDate + 'T00:00:00')
    d.setHours(0, 0, 0, 0)
    return d
  }
  return nextOccurrence(today, source.dayOfMonth)
}

export type BudgetSummary = {
  dailyBudget: number
  availableBudget: number
  daysUntilNextIncome: number
  nextIncomeDate: string
  nextIncomeTotal: number
  upcomingExpenses: Array<{ label: string; amount: number; date: string }>
  upcomingExceptionalIncomes: Array<{ label: string; amount: number; date: string }>
  // Pour la barre de progression
  daysElapsed: number
  totalPeriodDays: number
  periodProgress: number  // 0-100
}

export function computeBudgetSummary(data: FinanceData): BudgetSummary | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = localISO(today)

  const activeSources = data.incomeSources.filter(s => s.active)
  if (activeSources.length === 0) return null

  // Trouver la prochaine date de ressource (la plus proche)
  let nextIncomeDate: Date | null = null
  for (const source of activeSources) {
    const d = getNextIncome(source, today)
    if (!nextIncomeDate || d < nextIncomeDate) nextIncomeDate = d
  }
  if (!nextIncomeDate) return null

  const nextIncomeDateStr = localISO(nextIncomeDate)

  // Total des ressources ce jour-là
  let nextIncomeTotal = 0
  for (const source of activeSources) {
    if (localISO(getNextIncome(source, today)) === nextIncomeDateStr) {
      nextIncomeTotal += source.amount
    }
  }

  // Jours restants (aujourd'hui inclus)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilNextIncome = Math.max(1, Math.round((nextIncomeDate.getTime() - today.getTime()) / msPerDay) + 1)

  // Dépenses fixes à venir avant la prochaine ressource
  const upcomingExpenses: Array<{ label: string; amount: number; date: string }> = []

  for (const expense of data.fixedExpenses.filter(e => e.active)) {
    const d = nextOccurrence(today, expense.dayOfMonth)
    if (d < nextIncomeDate) {
      upcomingExpenses.push({ label: expense.label, amount: expense.amount, date: localISO(d) })
    }
  }

  // Dépenses planifiées à venir
  for (const expense of data.plannedExpenses.filter(e => !e.paid)) {
    if (expense.date >= todayStr && expense.date < nextIncomeDateStr) {
      upcomingExpenses.push({ label: expense.label, amount: expense.amount, date: expense.date })
    }
  }

  upcomingExpenses.sort((a, b) => a.date.localeCompare(b.date))

  // Revenus exceptionnels à venir avant la prochaine ressource (non encore encaissés)
  const upcomingExceptionalIncomes: Array<{ label: string; amount: number; date: string }> = []
  for (const inc of (data.exceptionalIncomes ?? []).filter(e => !e.received)) {
    if (inc.date >= todayStr && inc.date < nextIncomeDateStr) {
      upcomingExceptionalIncomes.push({ label: inc.label, amount: inc.amount, date: inc.date })
    }
  }
  upcomingExceptionalIncomes.sort((a, b) => a.date.localeCompare(b.date))

  const totalUpcoming = upcomingExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalExceptional = upcomingExceptionalIncomes.reduce((sum, e) => sum + e.amount, 0)
  const availableBudget = data.balance - totalUpcoming + totalExceptional
  const dailyBudget = availableBudget / daysUntilNextIncome

  // Calcul de la progression dans la période
  // Source principale (celle qui détermine la prochaine ressource)
  const mainSource = activeSources.find(s => localISO(getNextIncome(s, today)) === nextIncomeDateStr)
  const prevIncomeDate = mainSource
    ? ((mainSource.dateMode ?? 'fixed') === 'variable'
        ? null  // pour variable, pas de précédente connue
        : prevOccurrence(today, mainSource.dayOfMonth))
    : null
  const msPerDayN = 1000 * 60 * 60 * 24
  const totalPeriodDays = prevIncomeDate
    ? Math.round((nextIncomeDate.getTime() - prevIncomeDate.getTime()) / msPerDayN)
    : daysUntilNextIncome
  const daysElapsed = Math.max(0, totalPeriodDays - daysUntilNextIncome)
  const periodProgress = totalPeriodDays > 0 ? Math.round((daysElapsed / totalPeriodDays) * 100) : 0

  return {
    dailyBudget,
    availableBudget,
    daysUntilNextIncome,
    nextIncomeDate: nextIncomeDateStr,
    nextIncomeTotal,
    upcomingExpenses,
    upcomingExceptionalIncomes,
    daysElapsed,
    totalPeriodDays,
    periodProgress,
  }
}
