import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const data = await prisma.routineData.findUnique({ where: { id: userId } })
  return NextResponse.json({ payload: data?.payload ?? null })
}

export async function POST(req: NextRequest) {
  const { userId, payload } = await req.json()

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)
  if (!userId || payload === undefined) {
    return NextResponse.json({ error: 'userId et payload requis' }, { status: 400 })
  }

  await prisma.routineData.upsert({
    where: { id: userId },
    update: { payload },
    create: { id: userId, payload },
  })

  return NextResponse.json({ ok: true })
}
