import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const activeParam = req.nextUrl.searchParams.get('active')
  const where: { userId: string; active?: boolean } = { userId }
  if (activeParam === 'true') where.active = true
  if (activeParam === 'false') where.active = false

  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: { timeOfDay: 'asc' },
  })
  return NextResponse.json(reminders)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, label, timeOfDay, ...rest } = body
  if (!userId || !label || !timeOfDay) {
    return NextResponse.json({ error: 'userId, label et timeOfDay requis' }, { status: 400 })
  }

  const reminder = await prisma.reminder.create({
    data: { userId, label, timeOfDay, ...rest },
  })
  return NextResponse.json(reminder)
}

export async function PATCH(req: NextRequest) {
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const reminder = await prisma.reminder.update({
    where: { id },
    data: fields,
  })
  return NextResponse.json(reminder)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await prisma.reminder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
