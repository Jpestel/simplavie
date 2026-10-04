// Vérification « à blanc » du rappel du dimanche : indique, pour chaque compte ayant le
// module activé, ce que ferait le planificateur à un instant donné (heure réglée,
// rappel dû ou non, semaine déjà envoyée, responsable présent…), SANS rien envoyer et
// SANS réserver de semaine. `?at=HH:MM` simule l'heure (fuseau REMINDERS_TZ).
//
// Protégée par CRON_SECRET (en-tête `x-cron-secret`, jamais dans l'URL pour ne pas la
// laisser dans les journaux). Sans CRON_SECRET défini côté serveur, la route est fermée.
import { NextRequest, NextResponse } from 'next/server'
import { sendWeeklyLiaisonReminders } from '@/lib/liaisonDigest'
import { minutesOfDay } from '@/lib/liaisonRatings'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const at = req.nextUrl.searchParams.get('at')
  const simulated = at ? minutesOfDay(at) : undefined
  if (at && simulated === null) {
    return NextResponse.json({ error: 'Paramètre at invalide (HH:MM).' }, { status: 400 })
  }

  const result = await sendWeeklyLiaisonReminders({ dryRun: true, nowMinutes: simulated ?? undefined })
  return NextResponse.json(result)
}
