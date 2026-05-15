import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured =
  url.startsWith('http') && key.length > 20

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) _client = createClient(url, key)
  return _client
}

export const supabase = {
  from: (table: string) => {
    if (!isSupabaseConfigured) {
      const noop = () => noop as unknown
      return { select: noop, insert: noop, upsert: noop, delete: noop, eq: noop, neq: noop, maybeSingle: noop, then: noop }
    }
    return getSupabase().from(table)
  },
} as unknown as SupabaseClient
