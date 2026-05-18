import { FinanceData } from '@/types'

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const DEFAULT_FINANCE: FinanceData = {
  balance: 0,
  balanceDate: localISO(new Date()),
  alertThreshold: 5,
  incomeSources: [],
  fixedExpenses: [],
  plannedExpenses: [],
  transactions: [],
}

export async function loadFinanceData(userId: string): Promise<FinanceData> {
  if (!userId) return DEFAULT_FINANCE
  try {
    const res = await fetch(`/api/finance?userId=${userId}`)
    if (!res.ok) return DEFAULT_FINANCE
    const data = await res.json()
    if (data) return { ...DEFAULT_FINANCE, ...(data as FinanceData) }
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
