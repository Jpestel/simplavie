import { getSupabase } from './supabase'

async function getToken(): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session?.access_token ?? null
}

export async function saFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  })
}
