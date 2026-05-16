import { CareData } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const storageKey = (userId: string) => `simplavie_care_data_${userId}`

export const EMPTY_CARE_DATA: CareData = {
  company: { name: '' },
  caregivers: [],
  appointments: [],
}

export async function loadCareData(userId: string): Promise<CareData> {
  const key = storageKey(userId)

  if (isSupabaseConfigured && userId) {
    try {
      const { data, error } = await supabase
        .from('care_data')
        .select('payload')
        .eq('id', userId)
        .maybeSingle()
      if (!error && data?.payload) {
        const parsed = data.payload as CareData
        localStorage.setItem(key, JSON.stringify(parsed))
        return parsed
      }
    } catch { /* ignore */ }
  }

  const stored = localStorage.getItem(key)
  return stored ? (() => { try { return JSON.parse(stored) } catch { return EMPTY_CARE_DATA } })() : EMPTY_CARE_DATA
}

export async function saveCareData(care: CareData, userId: string) {
  const key = storageKey(userId)
  localStorage.setItem(key, JSON.stringify(care))
  if (!isSupabaseConfigured || !userId) return
  await supabase.from('care_data').upsert({ id: userId, payload: care, updated_at: new Date().toISOString() })
}
