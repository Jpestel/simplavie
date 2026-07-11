import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MODULES } from '@/lib/defaultConfig'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
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
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params
  const fields = await req.json()

  const user = await prisma.user.update({
    where: { id: userId },
    data: fields,
  })

  return NextResponse.json({ ok: true, id: user.id })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { userId } = await params

  // Garde-fous : pas d'auto-suppression, pas de suppression d'un Super Admin.
  if (userId === check.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { globalRole: true } })
  if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (target.globalRole === 'superadmin') {
    return NextResponse.json({ error: 'Impossible de supprimer un compte Super Admin.' }, { status: 403 })
  }

  // Toutes les relations sont en onDelete: Cascade → profil, config, modules,
  // routines, care, finances, agenda, rappels, services et assignations d'admins
  // sont supprimés automatiquement.
  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ ok: true })
}
