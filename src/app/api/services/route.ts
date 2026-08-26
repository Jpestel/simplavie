import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const activeOnly = req.nextUrl.searchParams.get('active') === 'true'

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const where = activeOnly ? { userId: userId as string, active: true } : { userId: userId as string }
  const services = await prisma.service.findMany({
    where,
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })
  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, name, description, url, icon, category, order } = body
  if (!userId || !name || !url) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const service = await prisma.service.create({
    data: { userId, name, description, url, icon: icon ?? '🔗', category: category ?? 'Autres', order: order ?? 0, active: true },
  })
  return NextResponse.json(service)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  // userId retiré des champs modifiables : on ne déplace pas un service
  // d'un compte à un autre.
  const { id, userId: _ignored, ...data } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.service.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const service = await prisma.service.update({ where: { id }, data })
  return NextResponse.json(service)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.service.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
