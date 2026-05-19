import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const { modules } = await req.json()
  if (!modules) return NextResponse.json({ error: 'modules requis' }, { status: 400 })

  const existing = await prisma.appConfig.findUnique({ where: { id: userId } })

  await prisma.appConfig.upsert({
    where: { id: userId },
    update: { modules },
    create: {
      id: userId,
      userName: existing?.userName ?? 'Mon proche',
      primaryColor: existing?.primaryColor ?? '#6366f1',
      adminPassword: existing?.adminPassword ?? '1234',
      modules,
    },
  })

  return NextResponse.json({ ok: true })
}
