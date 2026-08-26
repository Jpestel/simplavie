// Déclenchement manuel du récapitulatif quotidien des rappels.
// En fonctionnement normal, c'est le planificateur interne qui s'en charge
// (src/lib/reminderScheduler.ts). Cette route reste utile pour tester ou
// forcer un envoi.
import { NextRequest, NextResponse } from 'next/server'
import { sendDailyReminderDigests } from '@/lib/reminderDigest'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sendDailyReminderDigests()
  return NextResponse.json(result)
}
