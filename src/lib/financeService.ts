import { FinanceData } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const DEFAULT_FINANCE: FinanceData = {
  balance: 0,
  balanceDate: localISO(new Date()),
  incomeSources: [],
  fixedExpenses: [],
  plannedExpenses: [],
  transactions: [],
}

export async function loadFinanceData(userId: string): Promise<FinanceData> {
  if (!isSupabaseConfigured || !userId) return DEFAULT_FINANCE
  const { data } = await supabase.from('finance_data').select('payload').eq('user_id', userId).maybeSingle()
  if (data?.payload) return { ...DEFAULT_FINANCE, ...(data.payload as FinanceData) }
  return DEFAULT_FINANCE
}

export async function saveFinanceData(financeData: FinanceData, userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return
  await supabase.from('finance_data').upsert({
    id: userId,
    user_id: userId,
    payload: financeData,
    updated_at: new Date().toISOString(),
  })
}
