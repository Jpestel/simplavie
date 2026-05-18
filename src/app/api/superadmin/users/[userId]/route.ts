import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MODULES } from '@/lib/defaultConfig'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params

  const [user, assignments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, appConfig: true },
    }),
    prisma.adminAssignment.findMany({
      where: { ownerUserId: userId },
      include: {
        admin: { select: { id: true, email: true, name: true } },
      },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const adminsWithInfo = assignments.map(a => ({
    id: a.id,
    display_name: a.admin.name ?? null,
    email: a.admin.email,
    permission: a.permission,
  }))

  const rawModules = (user.appConfig?.modules ?? null) as Array<{ id: string; enabled: boolean; [key: string]: unknown }> | null
  const savedIds = new Set((rawModules ?? []).map(m => m.id))
  const mergedModules = rawModules
    ? [...rawModules, ...DEFAULT_MODULES.filter(m => !savedIds.has(m.id))]
    : DEFAULT_MODULES

  const config = user.appConfig
    ? { ...user.appConfig, modules: mergedModules }
    : { user_name: null, modules: mergedModules }

  return NextResponse.json({
    profile: user.profile,
    config,
    admins: adminsWithInfo,
    email: user.email,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const fields = await req.json()

  const user = await prisma.user.update({
    where: { id: userId },
    data: fields,
  })

  return NextResponse.json({ ok: true, id: user.id })
}
