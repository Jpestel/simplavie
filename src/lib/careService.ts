import { CareData } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'simplavie_care_data'

export const EMPTY_CARE_DATA: CareData = {
  company: { name: '' },
  caregivers: [],
  appointments: [],
}

export async function loadCareData(): Promise<CareData> {
  // localStorage d'abord — instantané
  const stored = localStorage.getItem(STORAGE_KEY)
  const local = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null

  // Sync Supabase en arrière-plan
  if (isSupabaseConfigured) {
    supabase.from('care_data').select('payload').eq('id', 'default').maybeSingle().then(({ data }) => {
      if (data?.payload) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload))
      }
    })
  }

  return local ?? EMPTY_CARE_DATA
}

export async function saveCareData(care: CareData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(care))
  if (!isSupabaseConfigured) return
  await supabase.from('care_data').upsert({ id: 'default', payload: care, updated_at: new Date().toISOString() })
}
