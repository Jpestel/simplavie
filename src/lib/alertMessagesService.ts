import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'simplavie_alert_messages'

export const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export async function loadAlertMessages(): Promise<string[]> {
  const stored = localStorage.getItem(STORAGE_KEY)
  const local = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null

  if (isSupabaseConfigured) {
    supabase.from('alert_messages').select('payload').eq('id', 'default').maybeSingle().then(({ data }) => {
      if (data?.payload) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload))
    })
  }

  return local ?? DEFAULT_MESSAGES
}

export async function saveAlertMessages(messages: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  if (!isSupabaseConfigured) return
  await supabase.from('alert_messages').upsert({ id: 'default', payload: messages, updated_at: new Date().toISOString() })
}
