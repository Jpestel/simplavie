import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'
import { DEFAULT_REMINDER_TIME, isValidReminderTime } from '@/lib/liaisonRatings'

// Réglages du Cahier de liaison propres à un compte (aujourd'hui : l'heure du rappel du dimanche).
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const row = await prisma.liaisonSettings.findUnique({ where: { id: userId as string } })
  const custom = isValidReminderTime(row?.reminderTime)
  return NextResponse.json({
    reminderTime: custom ? row!.reminderTime : DEFAULT_REMINDER_TIME,
    isDefault: !custom,
    dailyReminder: row?.dailyReminder === true,
    dailyReminderTime: isValidReminderTime(row?.dailyReminderTime) ? row!.dailyReminderTime : '20:00',
  })
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { userId, reminderTime, dailyReminder, dailyReminderTime } = body
  if (typeof userId !== 'string' || !userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  // Deux familles de réglages, enregistrées séparément : l'heure du rappel du dimanche,
  // et le rappel quotidien (activé ou non + heure).
  if (dailyReminder !== undefined || dailyReminderTime !== undefined) {
    if (dailyReminder !== undefined && typeof dailyReminder !== 'boolean') return NextResponse.json({ error: 'Valeur invalide.' }, { status: 400 })
    if (dailyReminderTime !== undefined && !isValidReminderTime(dailyReminderTime)) {
      return NextResponse.json({ error: 'Heure invalide (format attendu : HH:MM, de 00:00 à 23:59).' }, { status: 400 })
    }
    const data = {
      ...(dailyReminder !== undefined ? { dailyReminder } : {}),
      ...(dailyReminderTime !== undefined ? { dailyReminderTime } : {}),
    }
    const row = await prisma.liaisonSettings.upsert({ where: { id: userId }, update: data, create: { id: userId, ...data } })
    return NextResponse.json({ dailyReminder: row.dailyReminder, dailyReminderTime: row.dailyReminderTime ?? '20:00' })
  }

  if (!isValidReminderTime(reminderTime)) {
    return NextResponse.json({ error: 'Heure invalide (format attendu : HH:MM, de 00:00 à 23:59).' }, { status: 400 })
  }

  // On ne touche pas à lastReminderWeek : changer l'heure après un rappel déjà envoyé cette
  // semaine ne provoque pas de doublon.
  const row = await prisma.liaisonSettings.upsert({
    where: { id: userId },
    update: { reminderTime },
    create: { id: userId, reminderTime },
  })
  return NextResponse.json({ reminderTime: row.reminderTime, isDefault: false })
}
