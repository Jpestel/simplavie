import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json(null)
  const record = await prisma.financeData.findUnique({ where: { id: userId } })
  return NextResponse.json(record?.payload ?? null)
}

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  const payload = await req.json()
  const record = await prisma.financeData.upsert({
    where: { id: userId },
    update: { payload },
    create: { id: userId, payload },
  })
  return NextResponse.json(record.payload)
}
