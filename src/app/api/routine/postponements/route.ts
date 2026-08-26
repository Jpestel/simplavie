import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json({ error: 'userId et date requis' }, { status: 400 })

  const rows = await prisma.routinePostponement.findMany({
    where: { userId, date },
    select: { stepId: true, toDate: true },
  })

  const map: Record<string, string> = {}
  rows.forEach(r => { map[r.stepId] = r.toDate ?? '' })
  return NextResponse.json(map)
}

export async function POST(req: NextRequest) {
  const { userId, date, stepId, toDate } = await req.json()

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)
  if (!userId || !date || !stepId) {
    return NextResponse.json({ error: 'userId, date et stepId requis' }, { status: 400 })
  }

  await prisma.routinePostponement.upsert({
    where: { userId_date_stepId: { userId, date, stepId } },
    update: { toDate: toDate ?? '' },
    create: { userId, date, stepId, toDate: toDate ?? '' },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { userId, date, stepId } = await req.json()

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)
  if (!userId || !date || !stepId) {
    return NextResponse.json({ error: 'userId, date et stepId requis' }, { status: 400 })
  }

  await prisma.routinePostponement.deleteMany({ where: { userId, date, stepId } })
  return NextResponse.json({ ok: true })
}
