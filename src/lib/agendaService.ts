import { AgendaEvent } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'simplavie_agenda'

export async function loadEvents(): Promise<AgendaEvent[]> {
  const stored = localStorage.getItem(STORAGE_KEY)
  const local = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null

  if (isSupabaseConfigured) {
    supabase.from('agenda_data').select('payload').eq('id', 'default').maybeSingle().then(({ data }) => {
      if (data?.payload) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload))
    })
  }

  return local ?? []
}

export async function saveEvents(events: AgendaEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  if (!isSupabaseConfigured) return
  await supabase.from('agenda_data').upsert({ id: 'default', payload: events, updated_at: new Date().toISOString() })
}
