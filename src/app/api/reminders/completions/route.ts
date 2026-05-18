import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json({ error: 'userId et date requis' }, { status: 400 })

  const completions = await prisma.reminderCompletion.findMany({
    where: { userId, date },
  })
  return NextResponse.json(completions)
}

export async function POST(req: NextRequest) {
  const { userId, reminderId, date, timeSlot } = await req.json()
  if (!userId || !reminderId || !date || !timeSlot) {
    return NextResponse.json({ error: 'userId, reminderId, date et timeSlot requis' }, { status: 400 })
  }

  await prisma.reminderCompletion.upsert({
    where: { userId_reminderId_date_timeSlot: { userId, reminderId, date, timeSlot } },
    update: {},
    create: { userId, reminderId, date, timeSlot },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { userId, reminderId, date, timeSlot } = await req.json()
  if (!userId || !reminderId || !date || !timeSlot) {
    return NextResponse.json({ error: 'userId, reminderId, date et timeSlot requis' }, { status: 400 })
  }

  await prisma.reminderCompletion.deleteMany({ where: { userId, reminderId, date, timeSlot } })
  return NextResponse.json({ ok: true })
}
