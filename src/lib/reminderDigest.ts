// Envoi du récapitulatif quotidien des rappels.
//
// Extrait de la route /api/send-reminders pour être appelable aussi bien par
// le planificateur interne (src/lib/reminderScheduler.ts) que par la route,
// qui reste utile pour un déclenchement manuel.
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'

export type DigestResult = {
  sent: number
  failed: number
  reminders: number
  errors?: string[]
}

/** Date du jour au format AAAA-MM-JJ, en heure locale du serveur. */
function localToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayMatches(
  reminder: {
    recurrence: string
    weekDays: unknown
    monthDay: number | null
    specificDate: string | null
    dateStart?: string | null
    dateEnd?: string | null
  },
  now = new Date(),
): boolean {
  const dayOfWeek = now.getDay() // 0=dim, 1=lun...
  const dayOfMonth = now.getDate()
  const today = localToday(now)

  switch (reminder.recurrence) {
    case 'daily': return true
    case 'weekly': return ((reminder.weekDays as number[]) ?? []).includes(dayOfWeek)
    case 'monthly': return reminder.monthDay === dayOfMonth
    case 'once': return reminder.specificDate === today
    // 'period' est proposé dans l'interface : sans ce cas, ces rappels
    // n'étaient jamais envoyés.
    case 'period': return !!(reminder.dateStart && reminder.dateEnd
      && today >= reminder.dateStart && today <= reminder.dateEnd)
    default: return false
  }
}

function timeLabel(t: string) {
  return t.slice(0, 5)
}

/** Envoie un récapitulatif par compte concerné. Ne lève jamais. */
export async function sendDailyReminderDigests(): Promise<DigestResult> {
  const reminders = await prisma.reminder.findMany({ where: { active: true } })
  if (reminders.length === 0) return { sent: 0, failed: 0, reminders: 0 }

  const todaysReminders = reminders.filter(r => todayMatches(r))
  if (todaysReminders.length === 0) return { sent: 0, failed: 0, reminders: 0 }

  const byUser: Record<string, typeof todaysReminders> = {}
  for (const r of todaysReminders) {
    if (!byUser[r.userId]) byUser[r.userId] = []
    byUser[r.userId].push(r)
  }

  let sent = 0
  const failures: string[] = []

  for (const [, userReminders] of Object.entries(byUser)) {
    const sorted = [...userReminders].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))

    const allEmails = [...new Set(sorted.flatMap(r => (r.emails as string[]) ?? []))]
    if (allEmails.length === 0) continue

    const dateLabel = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })

    const lines = sorted.map(r => `• ${timeLabel(r.timeOfDay)} — ${r.label}`).join('\n')

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">📅 Rappels du jour</h2>
        <p style="color:#555;text-transform:capitalize">${dateLabel}</p>
        <div style="background:#f8f8f8;border-radius:12px;padding:16px;margin:16px 0">
          ${sorted.map(r =>
            `<p style="margin:8px 0"><strong>${timeLabel(r.timeOfDay)}</strong> — ${r.label}</p>`
          ).join('')}
        </div>
        <p style="color:#aaa;font-size:12px">SimplaVie — rappels automatiques</p>
      </div>
    `

    const result = await sendMail({
      to: allEmails,
      subject: `📅 Rappels du jour — ${sorted.length} rappel(s)`,
      html,
      text: `Rappels du jour\n${dateLabel}\n\n${lines}\n\n— SimplaVie`,
    })

    if (result.ok) sent += allEmails.length
    else failures.push(result.reason)
  }

  return {
    sent,
    failed: failures.length,
    reminders: todaysReminders.length,
    ...(failures.length > 0 ? { errors: [...new Set(failures)] } : {}),
  }
}
