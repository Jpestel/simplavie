import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type Params = { userId: string; adminId: string }

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { adminId } = await params
  const { permission } = await req.json()

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('admin_assignments')
    .update({ permission })
    .eq('id', adminId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { adminId } = await params
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('admin_assignments')
    .delete()
    .eq('id', adminId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
