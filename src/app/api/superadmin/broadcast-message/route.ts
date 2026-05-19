import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/superadminAuth'
import { prisma } from '@/lib/prisma'

const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export async function POST(req: NextRequest) {
  const check = await verifySuperAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 401 })

  const { message, targetAll, userIds } = await req.json() as {
    message: string
    targetAll: boolean
    userIds: string[]
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 })
  }

  let targetUserIds: string[]

  if (targetAll) {
    const users = await prisma.user.findMany({
      where: { globalRole: { not: 'superadmin' } },
      select: { id: true },
    })
    targetUserIds = users.map(u => u.id)
  } else {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Aucun utilisateur sélectionné' }, { status: 400 })
    }
    targetUserIds = userIds
  }

  let updated = 0

  for (const userId of targetUserIds) {
    const existing = await prisma.alertMessage.findUnique({ where: { id: userId } })
    const currentMessages = (existing?.payload as string[]) ?? DEFAULT_MESSAGES
    const newMessages = [...currentMessages, message.trim()]
    await prisma.alertMessage.upsert({
      where: { id: userId },
      update: { payload: newMessages },
      create: { id: userId, payload: newMessages },
    })
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
