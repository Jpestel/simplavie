import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MODULES } from '@/lib/defaultConfig'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const check = await verifySuperAdmin(req)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { globalRole: { not: 'superadmin' } },
    orderBy: { createdAt: 'desc' },
    include: {
      profile: true,
      appConfig: true,
      managedBy: { select: { id: true } },
    },
  })

  const enriched = users.map(user => {
    const rawModules = (user.appConfig?.modules ?? null) as Array<{ id: string; enabled: boolean }> | null
    const savedIds = new Set((rawModules ?? []).map(m => m.id))
    const modules = rawModules
      ? [...rawModules, ...DEFAULT_MODULES.filter(m => !savedIds.has(m.id))]
      : DEFAULT_MODULES

    return {
      id: user.id,
      display_name: user.appConfig?.userName ?? user.name ?? 'Sans nom',
      email: user.email,
      global_role: user.globalRole,
      admin_count: user.managedBy.length,
      enabled_modules: modules.filter(m => m.enabled).length,
      total_modules: modules.length,
      created_at: user.createdAt,
    }
  })

  return NextResponse.json({ users: enriched })
}

export async function POST(req: NextRequest) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { email, password, name } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'email et password requis' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, password: hashed, name, globalRole: 'user' },
  })

  await prisma.userProfile.create({ data: { id: user.id } })
  await prisma.appConfig.create({ data: { id: user.id } })

  return NextResponse.json({ id: user.id, email: user.email, globalRole: user.globalRole })
}
