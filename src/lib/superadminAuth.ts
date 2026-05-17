// Helper serveur : vérifie que la requête vient bien d'un superadmin
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from './supabaseAdmin'

export async function verifySuperAdmin(): Promise<{ userId: string } | { error: string }> {
  try {
    const cookieStore = await cookies()
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('user_profile')
      .select('global_role')
      .eq('id', user.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (profile?.global_role !== 'superadmin') return { error: 'Accès refusé' }
    return { userId: user.id }
  } catch {
    return { error: 'Erreur serveur' }
  }
}
