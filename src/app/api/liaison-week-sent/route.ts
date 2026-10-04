import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isFirstServerBilan } from '@/lib/liaisonFirstBilan'
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
  return NextResponse.json({
    sent: !!row,
    sentAt: row?.sentAt ?? null,
    recipients: Array.isArray(row?.recipients) ? row?.recipients : [],
    method: row?.method ?? null,
    isFirstBilan: await isFirstServerBilan(userId as string, weekStart),
  })
}

// Marque une semaine comme « envoyée » après un simple clic sur « Ouvrir dans mon
// appli mail » ou « Copier » (on ne sait pas si l'e-mail est vraiment parti).
// L'envoi par SimplaVie, lui, est enregistré par /api/liaison-bilan-send. Idempotent,
// et ne remplace jamais le détail d'un envoi déjà fait par le serveur.
export async function POST(req: NextRequest) {
  const { userId, weekStart, method } = await req.json()
  if (!userId || !weekStart) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.liaisonWeekSent.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {},
    create: {
      userId,
      weekStart,
      sentAt: new Date(),
      method: method === 'mailto' || method === 'copie' ? method : null,
    },
  })
  return NextResponse.json({ ok: true })
}
