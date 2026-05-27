import { FinanceData, FinanceEvent } from '@/types'

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const DEFAULT_FINANCE: FinanceData = {
  balance: 0,
  balanceDate: localISO(new Date()),
  alertThreshold: 5,
  events: [],
  transactions: [],
}

// Migration du format legacy (4 listes séparées) vers le nouveau format (events unifié)
function migrateIfNeeded(raw: Record<string, unknown>): FinanceData {
  // Déjà au nouveau format
  if (Array.isArray(raw.events)) {
    return { ...DEFAULT_FINANCE, ...(raw as unknown as FinanceData) }
  }

  const events: FinanceEvent[] = []

  // incomeSources → events flow=in, mode=fixed ou variable
  for (const s of (raw.incomeSources as Array<Record<string, unknown>>) ?? []) {
    events.push({
      id: s.id as string,
      label: s.label as string,
      amount: s.amount as number,
      flow: 'in',
      mode: (s.dateMode as string) === 'variable' ? 'variable' : 'fixed',
      dayOfMonth: s.dayOfMonth as number | undefined,
      nextDate: s.nextDate as string | undefined,
      active: (s.active as boolean) ?? true,
    })
  }

  // fixedExpenses → events flow=out, mode=fixed
  for (const e of (raw.fixedExpenses as Array<Record<string, unknown>>) ?? []) {
    events.push({
      id: e.id as string,
      label: e.label as string,
      amount: e.amount as number,
      flow: 'out',
      mode: 'fixed',
      dayOfMonth: e.dayOfMonth as number,
      active: (e.active as boolean) ?? true,
    })
  }

  // plannedExpenses → events flow=out, mode=oneshot
  for (const e of (raw.plannedExpenses as Array<Record<string, unknown>>) ?? []) {
    events.push({
      id: e.id as string,
      label: e.label as string,
      amount: e.amount as number,
      flow: 'out',
      mode: 'oneshot',
      nextDate: e.date as string,
      done: (e.paid as boolean) ?? false,
      active: true,
    })
  }

  // exceptionalIncomes → events flow=in, mode=oneshot
  for (const e of (raw.exceptionalIncomes as Array<Record<string, unknown>>) ?? []) {
    events.push({
      id: e.id as string,
      label: e.label as string,
      amount: e.amount as number,
      flow: 'in',
      mode: 'oneshot',
      nextDate: e.date as string,
      done: (e.received as boolean) ?? false,
      active: true,
    })
  }

  return {
    balance: (raw.balance as number) ?? 0,
    balanceDate: (raw.balanceDate as string) ?? localISO(new Date()),
    alertThreshold: (raw.alertThreshold as number) ?? 5,
    events,
    transactions: (raw.transactions as FinanceData['transactions']) ?? [],
  }
}

export async function loadFinanceData(userId: string): Promise<FinanceData> {
  if (!userId) return DEFAULT_FINANCE
  try {
    const res = await fetch(`/api/finance?userId=${userId}`)
    if (!res.ok) return DEFAULT_FINANCE
    const raw = await res.json()
    if (raw) return migrateIfNeeded(raw as Record<string, unknown>)
  } catch { /* ignore */ }
  return DEFAULT_FINANCE
}

export async function saveFinanceData(financeData: FinanceData, userId: string): Promise<void> {
  if (!userId) return
  await fetch(`/api/finance?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(financeData),
  })
}
