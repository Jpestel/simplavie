import { FinanceData, FinanceEvent } from '@/types'

export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function parseDate(s: string): Date {
  const d = new Date(s + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  return d
}

// Prochain jour du mois strictement après today
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

// ─── Types exportés ───────────────────────────────────────────────────────────

// Une entrée de la projection jour par jour
export type ProjectionEntry = {
  date: string
  isToday: boolean
  events: Array<{ id: string; label: string; amount: number; flow: 'in' | 'out' }>
  balanceAfter: number  // solde projeté après les événements de ce jour
  freePerDay: number    // budget libre/jour à partir de ce jour (freeTotal / jours restants depuis ce jour)
  daysRemaining: number // jours restants jusqu'à la prochaine ressource (ce jour inclus)
}

export type BudgetSummary = {
  // Métrique principale
  freePerDay: number
  freeTotal: number        // argent libre pour toute la période (= solde - engagements sortants + rentrées ponctuelles)
  committedOut: number     // total des sorties planifiées avant la prochaine ressource
  committedIn: number      // total des entrées ponctuelles avant la prochaine ressource
  // Prochaine ressource
  daysUntilNextIncome: number
  nextIncomeDate: string
  nextIncomeLabel: string
  nextIncomeAmount: number
  // Alertes
  needsDateUpdate: boolean
  expiredSources: string[]  // noms des sources variables dont la date est expirée
  // Projection
  projection: ProjectionEntry[]
}

// ─── Calcul principal ─────────────────────────────────────────────────────────

export function computeBudgetSummary(data: FinanceData): BudgetSummary | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = localISO(today)
  const msPerDay = 1000 * 60 * 60 * 24

  const activeEvents = (data.events ?? []).filter(e => e.active !== false)

  // Sources de revenus récurrents (mode fixed ou variable)
  const incomeSources = activeEvents.filter(e => e.flow === 'in' && e.mode !== 'oneshot')
  if (incomeSources.length === 0) return null

  // Détecter les sources variables expirées (date passée ou non saisie)
  const expiredSources: string[] = []
  for (const ev of incomeSources) {
    if (ev.mode === 'variable') {
      if (!ev.nextDate || parseDate(ev.nextDate) <= today) {
        expiredSources.push(ev.label)
      }
    }
  }

  // Trouver la prochaine date de ressource (la plus proche parmi les sources valides)
  let nextIncomeDate: Date | null = null
  for (const ev of incomeSources) {
    let d: Date | null = null
    if (ev.mode === 'fixed' && ev.dayOfMonth) {
      d = nextOccurrence(today, ev.dayOfMonth)
    } else if (ev.mode === 'variable' && ev.nextDate) {
      const parsed = parseDate(ev.nextDate)
      if (parsed > today) d = parsed
    }
    if (d && (!nextIncomeDate || d < nextIncomeDate)) nextIncomeDate = d
  }

  // Aucune date valide → alerte, calcul impossible
  if (!nextIncomeDate) {
    return {
      freePerDay: 0, freeTotal: data.balance,
      committedOut: 0, committedIn: 0,
      daysUntilNextIncome: 0, nextIncomeDate: '',
      nextIncomeLabel: '', nextIncomeAmount: 0,
      needsDateUpdate: true, expiredSources, projection: [],
    }
  }

  const nextIncomeDateStr = localISO(nextIncomeDate)

  // Calculer le total et le libellé de la prochaine ressource
  let nextIncomeLabel = ''
  let nextIncomeAmount = 0
  for (const ev of incomeSources) {
    let d: Date | null = null
    if (ev.mode === 'fixed' && ev.dayOfMonth) d = nextOccurrence(today, ev.dayOfMonth)
    else if (ev.mode === 'variable' && ev.nextDate) d = parseDate(ev.nextDate)
    if (d && localISO(d) === nextIncomeDateStr) {
      nextIncomeAmount += ev.amount
      nextIncomeLabel = nextIncomeLabel ? `${nextIncomeLabel} + ${ev.label}` : ev.label
    }
  }

  // Nombre de jours dans la période (aujourd'hui inclus)
  const daysUntilNextIncome = Math.max(1, Math.round((nextIncomeDate.getTime() - today.getTime()) / msPerDay) + 1)

  // ── Collecter tous les événements de la période [aujourd'hui, veille de la prochaine ressource] ──
  // Sorties (dépenses fixes, variables, ponctuelles) + entrées ponctuelles (pas les sources récurrentes)
  const periodEvents: Array<{ date: string; event: FinanceEvent }> = []

  for (const ev of activeEvents) {
    // Les sources récurrentes de revenus définissent la frontière de la période, on ne les inclut pas
    if (ev.flow === 'in' && ev.mode !== 'oneshot') continue

    let dateStr: string | null = null

    if (ev.mode === 'fixed' && ev.dayOfMonth) {
      const s = localISO(nextOccurrence(today, ev.dayOfMonth))
      if (s >= todayStr && s < nextIncomeDateStr) dateStr = s
    } else if (ev.mode === 'variable' && ev.nextDate) {
      if (ev.nextDate >= todayStr && ev.nextDate < nextIncomeDateStr) dateStr = ev.nextDate
    } else if (ev.mode === 'oneshot' && !ev.done && ev.nextDate) {
      if (ev.nextDate >= todayStr && ev.nextDate < nextIncomeDateStr) dateStr = ev.nextDate
    }

    if (dateStr) periodEvents.push({ date: dateStr, event: ev })
  }

  periodEvents.sort((a, b) => a.date.localeCompare(b.date))

  const committedOut = periodEvents.filter(e => e.event.flow === 'out').reduce((s, e) => s + e.event.amount, 0)
  const committedIn  = periodEvents.filter(e => e.event.flow === 'in' ).reduce((s, e) => s + e.event.amount, 0)

  // Argent libre = solde - toutes les sorties planifiées + toutes les entrées ponctuelles
  const freeTotal  = data.balance - committedOut + committedIn
  const freePerDay = freeTotal / daysUntilNextIncome

  // ── Construire la projection jour par jour (uniquement les jours avec événements + aujourd'hui) ──
  const eventsByDate: Record<string, FinanceEvent[]> = {}
  for (const { date, event } of periodEvents) {
    if (!eventsByDate[date]) eventsByDate[date] = []
    eventsByDate[date].push(event)
  }

  const projectionDates = [...new Set([todayStr, ...Object.keys(eventsByDate)])].sort()

  let runningBalance = data.balance
  const projection: ProjectionEntry[] = []

  for (const dateStr of projectionDates) {
    const dayEvents = eventsByDate[dateStr] ?? []
    const dayIndex  = Math.round((parseDate(dateStr).getTime() - today.getTime()) / msPerDay)
    const daysRemaining = daysUntilNextIncome - dayIndex  // jours restants depuis ce jour (inclus)

    // Appliquer les événements du jour au solde courant
    for (const ev of dayEvents) {
      runningBalance += ev.flow === 'in' ? ev.amount : -ev.amount
    }

    projection.push({
      date: dateStr,
      isToday: dateStr === todayStr,
      events: dayEvents.map(ev => ({ id: ev.id, label: ev.label, amount: ev.amount, flow: ev.flow })),
      balanceAfter: runningBalance,
      // freeTotal est constant ; divisé par le nb de jours restants depuis ce jour
      freePerDay: daysRemaining > 0 ? freeTotal / daysRemaining : 0,
      daysRemaining,
    })
  }

  return {
    freePerDay, freeTotal, committedOut, committedIn,
    daysUntilNextIncome, nextIncomeDate: nextIncomeDateStr,
    nextIncomeLabel, nextIncomeAmount,
    needsDateUpdate: expiredSources.length > 0, expiredSources,
    projection,
  }
}
