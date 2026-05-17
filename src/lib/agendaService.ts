import { AgendaEvent } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

export async function loadEvents(userId: string): Promise<AgendaEvent[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase.from('agenda_data').select('payload').eq('id', userId).maybeSingle()
  return (data?.payload as AgendaEvent[]) ?? []
}

export async function saveEvents(userId: string, events: AgendaEvent[]) {
  if (!isSupabaseConfigured) return
  await supabase.from('agenda_data').upsert({ id: userId, payload: events, updated_at: new Date().toISOString() })
}
