import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const entries = await prisma.liaisonEntry.findMany({
    where: { userId: userId as string },
    orderBy: [{ date: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(entries)
}

// Chaque intervention est sa propre entrée : plusieurs peuvent partager la
// même date (aidants différents, avis différents), donc toujours un create.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, date, rating, aidants, comment } = body
  if (!userId || !date || !rating) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  // Une évaluation doit obligatoirement être associée à au moins un aidant.
  if (!Array.isArray(aidants) || aidants.length === 0) {
    return NextResponse.json({ error: 'Au moins un aidant est requis' }, { status: 400 })
  }

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const entry = await prisma.liaisonEntry.create({
    data: { userId, date, rating, aidants, comment: comment || null },
  })
  return NextResponse.json(entry)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, date, rating, aidants, comment } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  // Si aidants est envoyé, il doit rester non vide (une évaluation garde toujours au moins un aidant).
  if (aidants !== undefined && (!Array.isArray(aidants) || aidants.length === 0)) {
    return NextResponse.json({ error: 'Au moins un aidant est requis' }, { status: 400 })
  }

  const existing = await prisma.liaisonEntry.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const entry = await prisma.liaisonEntry.update({
    where: { id },
    data: {
      ...(date !== undefined ? { date } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(aidants !== undefined ? { aidants } : {}),
      ...(comment !== undefined ? { comment: comment || null } : {}),
    },
  })
  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.liaisonEntry.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.liaisonEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
