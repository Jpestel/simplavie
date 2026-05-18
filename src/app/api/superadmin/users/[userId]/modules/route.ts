import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const { modules } = await req.json()
  if (!modules) return NextResponse.json({ error: 'modules requis' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Récupérer la config existante pour ne pas écraser les autres champs
  const { data: existing } = await admin
    .from('app_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const row = {
    id: userId,
    user_id: userId,
    user_name: existing?.user_name ?? 'Mon proche',
    primary_color: existing?.primary_color ?? '#6366f1',
    // background_color n'est pas encore dans le schéma Supabase → stocké en localStorage
    admin_password: existing?.admin_password ?? '1234',
    modules,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from('app_config').upsert(row)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
