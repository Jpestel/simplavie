import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const config = await prisma.appConfig.findUnique({ where: { id: userId as string } })
  return NextResponse.json(config)
}

export async function PATCH(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const body = await req.json()
  const config = await prisma.appConfig.upsert({
    where: { id: userId as string },
    update: body,
    create: { id: userId as string, ...body },
  })
  return NextResponse.json(config)
}
