import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'

// Les catégories d'agenda sont gérées uniquement par le Super Admin,
// utilisateur par utilisateur.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const { agendaCategories } = await req.json()
  if (!Array.isArray(agendaCategories)) {
    return NextResponse.json({ error: 'agendaCategories requis' }, { status: 400 })
  }

  const existing = await prisma.appConfig.findUnique({ where: { id: userId } })

  await prisma.appConfig.upsert({
    where: { id: userId },
    update: { agendaCategories },
    create: {
      id: userId,
      userName: existing?.userName ?? 'Mon proche',
      primaryColor: existing?.primaryColor ?? '#6366f1',
      adminPassword: existing?.adminPassword ?? '1234',
      modules: existing?.modules ?? [],
      agendaCategories,
    },
  })

  return NextResponse.json({ ok: true })
}
