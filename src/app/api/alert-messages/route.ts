import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export async function GET() {
  const row = await prisma.alertMessage.findUnique({ where: { id: 'default' } })
  return NextResponse.json((row?.payload as string[]) ?? DEFAULT_MESSAGES)
}

export async function POST(req: NextRequest) {
  const messages = await req.json()
  await prisma.alertMessage.upsert({
    where: { id: 'default' },
    update: { payload: messages },
    create: { id: 'default', payload: messages },
  })
  return NextResponse.json({ ok: true })
}
