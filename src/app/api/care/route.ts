import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const record = await prisma.careData.findUnique({ where: { id: userId as string } })
  return NextResponse.json(record?.payload ?? null)
}

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const payload = await req.json()
  const record = await prisma.careData.upsert({
    where: { id: userId as string },
    update: { payload },
    create: { id: userId as string, payload },
  })
  return NextResponse.json(record.payload)
}
