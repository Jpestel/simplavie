import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const aidants = await prisma.mailAidant.findMany({
    where: { userId: userId as string },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(aidants)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, prenom, order } = body
  if (!userId || !prenom) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const aidant = await prisma.mailAidant.create({
    data: { userId, prenom, order: order ?? 0 },
  })
  return NextResponse.json(aidant)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, userId: _ignored, ...data } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.mailAidant.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const aidant = await prisma.mailAidant.update({ where: { id }, data })
  return NextResponse.json(aidant)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.mailAidant.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.mailAidant.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
