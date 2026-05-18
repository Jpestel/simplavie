// NOTE: Ce fichier utilise prisma.$queryRaw / $executeRaw pour lire/écrire
// la colonne `calendar_token` dans user_profile, en attendant que le champ
// soit ajouté au schéma Prisma et migré (prisma migrate dev).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  try {
    const rows = await prisma.$queryRaw<{ calendar_token: string | null }[]>`
      SELECT calendar_token FROM user_profile WHERE id = ${userId} LIMIT 1
    `
    const token = rows[0]?.calendar_token ?? null
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ token: null })
  }
}

export async function POST(req: NextRequest) {
  const { userId, token } = await req.json()
  if (!userId || !token) return NextResponse.json({ error: 'userId et token requis' }, { status: 400 })

  try {
    await prisma.$executeRaw`
      UPDATE user_profile SET calendar_token = ${token} WHERE id = ${userId}
    `
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: 'Impossible de sauvegarder le token (colonne calendar_token manquante dans le schéma ?)' }, { status: 500 })
  }
}
