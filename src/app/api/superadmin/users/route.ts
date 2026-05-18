import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { DEFAULT_MODULES } from '@/lib/defaultConfig'

export async function GET(req: NextRequest) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const admin = getSupabaseAdmin()

  const { data: owners, error } = await admin
    .from('user_profile')
    .select('id, display_name, global_role, created_at')
    .neq('global_role', 'superadmin')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = await Promise.all((owners ?? []).map(async (owner) => {
    const [adminsRes, configRes, authRes] = await Promise.all([
      admin.from('admin_assignments').select('id', { count: 'exact' }).eq('owner_user_id', owner.id),
      admin.from('app_config').select('modules, user_name').eq('user_id', owner.id).maybeSingle(),
      admin.auth.admin.getUserById(owner.id),
    ])

    const rawModules = (configRes.data?.modules ?? null) as Array<{ id: string; enabled: boolean }> | null
    const savedIds = new Set((rawModules ?? []).map(m => m.id))
    const modules = rawModules
      ? [...rawModules, ...DEFAULT_MODULES.filter(m => !savedIds.has(m.id))]
      : DEFAULT_MODULES
    return {
      id: owner.id,
      display_name: configRes.data?.user_name ?? owner.display_name ?? 'Sans nom',
      email: authRes.data?.user?.email ?? '',
      global_role: owner.global_role,
      admin_count: adminsRes.count ?? 0,
      enabled_modules: modules.filter(m => m.enabled).length,
      total_modules: modules.length,
      created_at: owner.created_at,
    }
  }))

  return NextResponse.json({ users: enriched })
}
