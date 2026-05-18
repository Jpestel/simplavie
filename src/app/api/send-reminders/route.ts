import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

function todayMatches(reminder: {
  recurrence: string
  weekDays: unknown
  monthDay: number | null
  specificDate: string | null
}): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=dim, 1=lun...
  const dayOfMonth = now.getDate()
  const today = now.toISOString().slice(0, 10)

  switch (reminder.recurrence) {
    case 'daily': return true
    case 'weekly': return ((reminder.weekDays as number[]) ?? []).includes(dayOfWeek)
    case 'monthly': return reminder.monthDay === dayOfMonth
    case 'once': return reminder.specificDate === today
    default: return false
  }
}

function timeLabel(t: string) {
  return t.slice(0, 5)
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reminders = await prisma.reminder.findMany({
    where: { active: true },
  })

  if (reminders.length === 0) return NextResponse.json({ sent: 0 })

  // Filtrer ceux d'aujourd'hui
  const todaysReminders = reminders.filter(r => todayMatches(r))
  if (todaysReminders.length === 0) return NextResponse.json({ sent: 0 })

  // Grouper par userId
  const byUser: Record<string, typeof todaysReminders> = {}
  for (const r of todaysReminders) {
    if (!byUser[r.userId]) byUser[r.userId] = []
    byUser[r.userId].push(r)
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0

  for (const [, userReminders] of Object.entries(byUser)) {
    // Trier par heure
    const sorted = [...userReminders].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))

    // Collecter tous les emails de destination
    const allEmails = [...new Set(sorted.flatMap((r) => (r.emails as string[]) ?? []))]
    if (allEmails.length === 0) continue

    const dateLabel = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })

    const lines = sorted.map((r) =>
      `• ${timeLabel(r.timeOfDay)} — ${r.label}`
    ).join('\n')

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">📅 Rappels du jour</h2>
        <p style="color:#555;text-transform:capitalize">${dateLabel}</p>
        <div style="background:#f8f8f8;border-radius:12px;padding:16px;margin:16px 0">
          ${sorted.map((r) =>
            `<p style="margin:8px 0"><strong>${timeLabel(r.timeOfDay)}</strong> — ${r.label}</p>`
          ).join('')}
        </div>
        <p style="color:#aaa;font-size:12px">SimplaVie — rappels automatiques</p>
      </div>
    `

    await resend.emails.send({
      from: 'SimplaVie <onboarding@resend.dev>',
      to: allEmails,
      subject: `📅 Rappels du jour — ${sorted.length} rappel(s)`,
      html,
      text: `Rappels du jour\n${dateLabel}\n\n${lines}\n\n— SimplaVie`,
    })

    sent += allEmails.length
  }

  return NextResponse.json({ sent, reminders: todaysReminders.length })
}
