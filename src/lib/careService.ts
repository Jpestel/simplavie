import { CareData } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

export const EMPTY_CARE_DATA: CareData = {
  company: { name: '' },
  caregivers: [],
  appointments: [],
}

export async function loadCareData(userId: string): Promise<CareData> {
  if (!isSupabaseConfigured || !userId) return EMPTY_CARE_DATA
  try {
    const { data, error } = await supabase.from('care_data').select('payload').eq('id', userId).maybeSingle()
    if (!error && data?.payload) return data.payload as CareData
  } catch { /* ignore */ }
  return EMPTY_CARE_DATA
}

export async function saveCareData(care: CareData, userId: string) {
  if (!isSupabaseConfigured || !userId) return
  await supabase.from('care_data').upsert({ id: userId, payload: care, updated_at: new Date().toISOString() })
}
