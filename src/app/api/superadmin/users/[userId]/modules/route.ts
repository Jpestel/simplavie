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
  const { error } = await admin
    .from('app_config')
    .update({ modules, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
