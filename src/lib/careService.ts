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
  const stored = localStorage.getItem(key)
  const local = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null

  if (isSupabaseConfigured && userId) {
    supabase.from('care_data').select('payload').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (data?.payload) {
        localStorage.setItem(key, JSON.stringify(data.payload))
      }
    })
  }

  return local ?? EMPTY_CARE_DATA
}

export async function saveCareData(care: CareData, userId: string) {
  const key = storageKey(userId)
  localStorage.setItem(key, JSON.stringify(care))
  if (!isSupabaseConfigured || !userId) return
  await supabase.from('care_data').upsert({ id: userId, user_id: userId, payload: care, updated_at: new Date().toISOString() })
}
