import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type Params = { userId: string; adminId: string }

// PATCH — modifier la permission d'un admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { adminId } = await params
  const { permission } = await req.json()

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('user_profile')
    .update({ permission })
    .eq('id', adminId)
    .eq('role', 'admin')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — révoquer un admin
export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { adminId } = await params
  const admin = getSupabaseAdmin()

  // Repasse le compte en owner sans owner_id
  const { error } = await admin
    .from('user_profile')
    .update({ role: 'owner', owner_id: null, permission: null })
    .eq('id', adminId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
