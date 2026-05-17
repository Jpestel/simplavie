import { supabase, isSupabaseConfigured } from './supabase'

export const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export async function loadAlertMessages(): Promise<string[]> {
  if (!isSupabaseConfigured) return DEFAULT_MESSAGES
  const { data } = await supabase.from('alert_messages').select('payload').eq('id', 'default').maybeSingle()
  return (data?.payload as string[]) ?? DEFAULT_MESSAGES
}

export async function saveAlertMessages(messages: string[]) {
  if (!isSupabaseConfigured) return
  await supabase.from('alert_messages').upsert({ id: 'default', payload: messages, updated_at: new Date().toISOString() })
}
