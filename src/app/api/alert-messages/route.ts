import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
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
  const id = userId ?? 'default'
  const messages = await req.json()
  await prisma.alertMessage.upsert({
    where: { id },
    update: { payload: messages },
    create: { id, payload: messages },
  })
  return NextResponse.json({ ok: true })
}
