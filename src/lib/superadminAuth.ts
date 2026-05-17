import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from './supabaseAdmin'

export async function verifySuperAdmin(req: NextRequest): Promise<{ userId: string } | { error: string }> {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return { error: 'Non authentifié' }

    const admin = getSupabaseAdmin()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return { error: 'Non authentifié' }

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
