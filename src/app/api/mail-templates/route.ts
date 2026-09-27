import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const templates = await prisma.mailTemplate.findMany({
    where: { userId: userId as string },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, label, subject, body: templateBody, order } = body
  if (!userId || !label || !templateBody) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const template = await prisma.mailTemplate.create({
    data: { userId, label, subject: subject ?? '', body: templateBody, order: order ?? 0 },
  })
  return NextResponse.json(template)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, userId: _ignored, body: templateBody, ...rest } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.mailTemplate.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const data = templateBody !== undefined ? { ...rest, body: templateBody } : rest
  const template = await prisma.mailTemplate.update({ where: { id }, data })
  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.mailTemplate.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.mailTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
