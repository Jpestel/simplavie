import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const settings = await prisma.mailSettings.findUnique({ where: { id: userId as string } })
  return NextResponse.json(settings ?? { id: userId, agencyName: null })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { userId, agencyName } = body
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const settings = await prisma.mailSettings.upsert({
    where: { id: userId },
    create: { id: userId, agencyName: agencyName ?? null },
    update: { agencyName: agencyName ?? null },
  })
  return NextResponse.json(settings)
}
