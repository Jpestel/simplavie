import { CareData } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'simplavie_care_data'

export const EMPTY_CARE_DATA: CareData = {
  company: { name: '' },
  caregivers: [],
  appointments: [],
}

export async function loadCareData(): Promise<CareData> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('care_data').select('payload').eq('id', 'default').maybeSingle()
    if (data?.payload) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload))
      return data.payload as CareData
    }
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try { return JSON.parse(stored) } catch { /* fall through */ }
  }
  return EMPTY_CARE_DATA
}

export async function saveCareData(care: CareData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(care))
  if (!isSupabaseConfigured) return
  await supabase.from('care_data').upsert({ id: 'default', payload: care, updated_at: new Date().toISOString() })
}
