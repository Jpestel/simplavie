import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const entries = await prisma.liaisonEntry.findMany({
    where: { userId: userId as string },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(entries)
}

// Une entrée par jour : on upsert sur (userId, date).
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, date, rating, aidants, comment } = body
  if (!userId || !date || !rating) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const entry = await prisma.liaisonEntry.upsert({
    where: { userId_date: { userId, date } },
    update: { rating, aidants: aidants ?? [], comment: comment || null },
    create: { userId, date, rating, aidants: aidants ?? [], comment: comment || null },
  })
  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.liaisonEntry.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.liaisonEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
