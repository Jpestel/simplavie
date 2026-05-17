import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const admin = getSupabaseAdmin()

  const [profileRes, configRes, adminsRes, authRes] = await Promise.all([
    admin.from('user_profile').select('*').eq('id', userId).eq('role', 'owner').maybeSingle(),
    admin.from('app_config').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('user_profile').select('id, display_name, permission, created_at').eq('owner_id', userId).eq('role', 'admin'),
    admin.auth.admin.getUserById(userId),
  ])

  const adminsWithEmail = await Promise.all((adminsRes.data ?? []).map(async (a) => {
    const { data: au } = await admin.auth.admin.getUserById(a.id)
    return { ...a, email: au?.user?.email ?? '' }
  }))

  return NextResponse.json({
    profile: profileRes.data,
    config: configRes.data,
    admins: adminsWithEmail,
    email: authRes.data?.user?.email ?? '',
  })
}
