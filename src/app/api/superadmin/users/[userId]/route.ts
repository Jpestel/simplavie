import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const admin = getSupabaseAdmin()

  const [profileRes, configRes, assignmentsRes, authRes] = await Promise.all([
    admin.from('user_profile').select('display_name, global_role').eq('id', userId).maybeSingle(),
    admin.from('app_config').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('admin_assignments').select('id, admin_user_id, permission').eq('owner_user_id', userId),
    admin.auth.admin.getUserById(userId),
  ])

  const adminsWithInfo = await Promise.all((assignmentsRes.data ?? []).map(async (a) => {
    const [profileData, authData] = await Promise.all([
      admin.from('user_profile').select('display_name').eq('id', a.admin_user_id).maybeSingle(),
      admin.auth.admin.getUserById(a.admin_user_id),
    ])
    return {
      id: a.id,
      display_name: profileData.data?.display_name ?? null,
      email: authData.data?.user?.email ?? '',
      permission: a.permission,
    }
  }))

  return NextResponse.json({
    profile: profileRes.data,
    config: configRes.data,
    admins: adminsWithInfo,
    email: authRes.data?.user?.email ?? '',
  })
}
