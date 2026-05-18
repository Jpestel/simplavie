import { FinanceData } from '@/types'

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// Prochain jour du mois >= today (même mois ou mois suivant)
function nextOccurrence(from: Date, dayOfMonth: number): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  if (from.getDate() <= dayOfMonth) {
    d.setDate(dayOfMonth)
  } else {
    d.setMonth(d.getMonth() + 1, dayOfMonth)
  }
  return d
}

export type BudgetSummary = {
  dailyBudget: number
  availableBudget: number
  daysUntilNextIncome: number
  nextIncomeDate: string
  nextIncomeTotal: number
  upcomingExpenses: Array<{ label: string; amount: number; date: string }>
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
    const d = nextOccurrence(today, source.dayOfMonth)
    if (!nextIncomeDate || d < nextIncomeDate) nextIncomeDate = d
  }
  if (!nextIncomeDate) return null

  const nextIncomeDateStr = localISO(nextIncomeDate)

  // Total des ressources ce jour-là
  let nextIncomeTotal = 0
  for (const source of activeSources) {
    if (localISO(nextOccurrence(today, source.dayOfMonth)) === nextIncomeDateStr) {
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

  const totalUpcoming = upcomingExpenses.reduce((sum, e) => sum + e.amount, 0)
  const availableBudget = data.balance - totalUpcoming
  const dailyBudget = availableBudget / daysUntilNextIncome

  return {
    dailyBudget,
    availableBudget,
    daysUntilNextIncome,
    nextIncomeDate: nextIncomeDateStr,
    nextIncomeTotal,
    upcomingExpenses,
  }
}
