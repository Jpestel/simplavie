import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) return NextResponse.json({ error: 'Missing weekStart' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const row = await prisma.liaisonWeekSent.findUnique({
    where: { userId_weekStart: { userId: userId as string, weekStart } },
  })
  return NextResponse.json({ sent: !!row })
}

// Idempotent : cliquer plusieurs fois sur "Envoyer"/"Copier" la même semaine
// ne crée qu'une seule marque.
export async function POST(req: NextRequest) {
  const { userId, weekStart } = await req.json()
  if (!userId || !weekStart) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.liaisonWeekSent.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {},
    create: { userId, weekStart },
  })
  return NextResponse.json({ ok: true })
}
