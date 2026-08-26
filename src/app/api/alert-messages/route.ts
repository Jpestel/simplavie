import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireAccess, isDenied, deny } from '@/lib/apiAuth'

const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  // Sans userId : liste globale par défaut, lisible par tout compte connecté.
  const auth = userId
    ? await requireAccess(req, userId, 'read')
    : await requireSession(req)
  if (isDenied(auth)) return deny(auth)

  const id = userId ?? 'default'
  const row = await prisma.alertMessage.findUnique({ where: { id } })
  if (!row) {
    if (userId) {
      const globalRow = await prisma.alertMessage.findUnique({ where: { id: 'default' } })
      return NextResponse.json((globalRow?.payload as string[]) ?? DEFAULT_MESSAGES)
    }
    return NextResponse.json(DEFAULT_MESSAGES)
  }
  return NextResponse.json(row.payload as string[])
}

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (userId) {
    const auth = await requireAccess(req, userId, 'write')
    if (isDenied(auth)) return deny(auth)
  } else {
    // Écrire la liste globale 'default' est réservé au superadmin.
    const auth = await requireSession(req)
    if (isDenied(auth)) return deny(auth)
    if (auth.globalRole !== 'superadmin') {
      return deny({ error: 'Accès refusé', status: 403 })
    }
  }

  const id = userId ?? 'default'
  const messages = await req.json()
  await prisma.alertMessage.upsert({
    where: { id },
    update: { payload: messages },
    create: { id, payload: messages },
  })
  return NextResponse.json({ ok: true })
}
