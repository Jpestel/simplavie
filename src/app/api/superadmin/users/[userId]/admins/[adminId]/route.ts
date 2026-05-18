import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'

type Params = { userId: string; adminId: string }

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { adminId } = await params
  const { permission } = await req.json()

  await prisma.adminAssignment.update({
    where: { id: adminId },
    data: { permission },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { adminId } = await params

  await prisma.adminAssignment.delete({ where: { id: adminId } })
  return NextResponse.json({ ok: true })
}
