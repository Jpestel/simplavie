import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json({ error: 'userId et date requis' }, { status: 400 })

  const rows = await prisma.routineExtra.findMany({
    where: { userId, date },
    select: { stepPayload: true },
  })
  return NextResponse.json(rows.map(r => r.stepPayload))
}

export async function POST(req: NextRequest) {
  const { userId, date, stepId, stepPayload } = await req.json()
  if (!userId || !date || !stepId || stepPayload === undefined) {
    return NextResponse.json({ error: 'userId, date, stepId et stepPayload requis' }, { status: 400 })
  }

  await prisma.routineExtra.upsert({
    where: { userId_date_stepId: { userId, date, stepId } },
    update: { stepPayload },
    create: { userId, date, stepId, stepPayload },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { userId, date, stepId } = await req.json()
  if (!userId || !date || !stepId) {
    return NextResponse.json({ error: 'userId, date et stepId requis' }, { status: 400 })
  }

  await prisma.routineExtra.deleteMany({ where: { userId, date, stepId } })
  return NextResponse.json({ ok: true })
}
