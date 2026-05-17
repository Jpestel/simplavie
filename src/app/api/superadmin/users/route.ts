import { NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const admin = getSupabaseAdmin()

  // Tous les comptes propriétaires
  const { data: owners, error } = await admin
    .from('user_profile')
    .select('id, display_name, global_role, created_at')
    .eq('role', 'owner')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Pour chaque owner : nombre d'admins + modules activés
  const enriched = await Promise.all((owners ?? []).map(async (owner) => {
    const [adminsRes, configRes, authRes] = await Promise.all([
      admin.from('user_profile').select('id', { count: 'exact' }).eq('owner_id', owner.id).eq('role', 'admin'),
      admin.from('app_config').select('modules, user_name').eq('user_id', owner.id).maybeSingle(),
      admin.auth.admin.getUserById(owner.id),
    ])

    const modules = (configRes.data?.modules ?? []) as Array<{ enabled: boolean }>
    const enabledModules = modules.filter(m => m.enabled).length

    return {
      id: owner.id,
      display_name: configRes.data?.user_name ?? owner.display_name ?? 'Sans nom',
      email: authRes.data?.user?.email ?? '',
      global_role: owner.global_role,
      admin_count: adminsRes.count ?? 0,
      enabled_modules: enabledModules,
      total_modules: modules.length,
      created_at: owner.created_at,
    }
  }))

  return NextResponse.json({ users: enriched })
}
