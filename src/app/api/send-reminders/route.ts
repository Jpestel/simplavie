import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function todayMatches(reminder: {
  recurrence: string
  week_days: number[] | null
  month_day: number | null
  specific_date: string | null
}): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=dim, 1=lun...
  const dayOfMonth = now.getDate()
  const today = now.toISOString().slice(0, 10)

  switch (reminder.recurrence) {
    case 'daily': return true
    case 'weekly': return (reminder.week_days ?? []).includes(dayOfWeek)
    case 'monthly': return reminder.month_day === dayOfMonth
    case 'once': return reminder.specific_date === today
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reminders || reminders.length === 0) return NextResponse.json({ sent: 0 })

  // Filtrer ceux d'aujourd'hui
  const todaysReminders = reminders.filter(r => todayMatches(r))
  if (todaysReminders.length === 0) return NextResponse.json({ sent: 0 })

  // Grouper par user_id
  const byUser: Record<string, typeof todaysReminders> = {}
  for (const r of todaysReminders) {
    if (!byUser[r.user_id]) byUser[r.user_id] = []
    byUser[r.user_id].push(r)
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0

  for (const [, userReminders] of Object.entries(byUser)) {
    // Trier par heure
    const sorted = [...userReminders].sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))

    // Collecter tous les emails de destination
    const allEmails = [...new Set(sorted.flatMap((r: { emails: string[] }) => r.emails ?? []))]
    if (allEmails.length === 0) continue

    const dateLabel = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })

    const lines = sorted.map((r: { time_of_day: string; label: string }) =>
      `• ${timeLabel(r.time_of_day)} — ${r.label}`
    ).join('\n')

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">📅 Rappels du jour</h2>
        <p style="color:#555;text-transform:capitalize">${dateLabel}</p>
        <div style="background:#f8f8f8;border-radius:12px;padding:16px;margin:16px 0">
          ${sorted.map((r: { time_of_day: string; label: string }) =>
            `<p style="margin:8px 0"><strong>${timeLabel(r.time_of_day)}</strong> — ${r.label}</p>`
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
