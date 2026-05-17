import { createClient } from '@supabase/supabase-js'

// Client côté serveur uniquement — utilise la service_role key (bypass RLS)
// Ne jamais importer ce fichier dans du code client !
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
