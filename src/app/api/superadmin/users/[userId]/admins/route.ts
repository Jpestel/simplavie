import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const { adminUserId, permission } = await req.json()
  if (!adminUserId) return NextResponse.json({ error: 'adminUserId requis' }, { status: 400 })

  const assignment = await prisma.adminAssignment.create({
    data: {
      ownerUserId: userId,
      adminUserId,
      permission: permission ?? 'admin',
    },
  })

  return NextResponse.json(assignment)
}
