import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const activeOnly = req.nextUrl.searchParams.get('active') === 'true'
  if (!userId) return NextResponse.json([])
  const where = activeOnly ? { userId, active: true } : { userId }
  const services = await prisma.service.findMany({
    where,
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })
  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, name, description, url, icon, category, order } = body
  if (!userId || !name || !url) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const service = await prisma.service.create({
    data: { userId, name, description, url, icon: icon ?? '🔗', category: category ?? 'Autres', order: order ?? 0, active: true },
  })
  return NextResponse.json(service)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const service = await prisma.service.update({ where: { id }, data })
  return NextResponse.json(service)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
