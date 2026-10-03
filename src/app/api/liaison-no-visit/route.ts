import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

// Jours où personne n'est passé : ils comptent comme « remplis » pour le bilan
// de la semaine, sans créer d'évaluation (donc sans toucher aux moyennes).
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const rows = await prisma.liaisonNoVisit.findMany({
    where: { userId: userId as string },
    select: { date: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(rows.map(r => r.date))
}

export async function POST(req: NextRequest) {
  const { userId, date } = await req.json()
  if (!userId || !date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  // Un jour qui a déjà des évaluations ne peut pas être « sans visite ».
  const hasEntries = await prisma.liaisonEntry.count({ where: { userId, date } })
  if (hasEntries > 0) {
    return NextResponse.json({ error: 'Ce jour a déjà des évaluations' }, { status: 409 })
  }

  await prisma.liaisonNoVisit.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.liaisonNoVisit.deleteMany({ where: { userId: userId as string, date } })
  return NextResponse.json({ ok: true })
}
