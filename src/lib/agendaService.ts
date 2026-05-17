import { AgendaEvent } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

export async function loadEvents(): Promise<AgendaEvent[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase.from('agenda_data').select('payload').eq('id', 'default').maybeSingle()
  return (data?.payload as AgendaEvent[]) ?? []
}

export async function saveEvents(events: AgendaEvent[]) {
  if (!isSupabaseConfigured) return
  await supabase.from('agenda_data').upsert({ id: 'default', payload: events, updated_at: new Date().toISOString() })
}
