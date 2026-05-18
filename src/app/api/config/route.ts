import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json(null)
  const config = await prisma.appConfig.findUnique({ where: { id: userId } })
  return NextResponse.json(config)
}

export async function PATCH(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  const body = await req.json()
  const config = await prisma.appConfig.upsert({
    where: { id: userId },
    update: body,
    create: { id: userId, ...body },
  })
  return NextResponse.json(config)
}
