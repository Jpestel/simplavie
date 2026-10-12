// Rappel QUOTIDIEN du cahier de liaison (désactivé par défaut, activé compte par compte dans
// les réglages) : chaque soir à l'heure réglée, si la journée n'a encore ni évaluation ni
// raison « sans évaluation », un e-mail propose un lien d'évaluation en un appui (voir
// liaisonQuick.ts). Même mécanique que le rappel du dimanche : appelé chaque minute par le
// planificateur, une réservation atomique de la journée évite tout doublon.
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { isReminderDue, isValidReminderTime, minutesOfDayInZone } from '@/lib/liaisonRatings'
import { makeQuickToken, todayInZone } from '@/lib/liaisonQuick'
import type { Module } from '@/types'

export const DEFAULT_DAILY_TIME = '20:00'

export function buildDailyMail(base: string, firstName: string | null | undefined, token: string) {
  const link = `${base}/liaison-rapide?t=${encodeURIComponent(token)}`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#6366f1">📔 Cahier de liaison</h2>
      <p style="color:#555">Bonjour${firstName ? ' ' + firstName : ''}, comment s'est passée ta journée avec tes aidants ?</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${link}" style="background:#6366f1;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;display:inline-block;font-size:18px">
          😄 🙂 😟 😣 &nbsp;Évaluer ma journée
        </a>
      </p>
      <p style="color:#aaa;font-size:12px">SimplaVie — rappel du soir. Un appui sur le lien, puis sur ta note : c'est enregistré. Le lien ne sert qu'à évaluer cette journée.</p>
    </div>`
  const text = `Bonjour${firstName ? ' ' + firstName : ''},\n\nComment s'est passée ta journée avec tes aidants ?\nÉvaluer ma journée (un appui sur ta note) : ${link}\n\n— SimplaVie`
  return { subject: "📔 Comment s'est passée ta journée ?", html, text }
}

export type DailyDetail = { time: string; due: boolean; alreadyToday: boolean; dayFilled: boolean; hasEmail: boolean }
export type DailyResult = { sent: number; failed: number; errors?: string[]; details?: DailyDetail[] }

export async function sendDailyLiaisonReminders(
  opts: { now?: Date; nowMinutes?: number; dryRun?: boolean } = {},
): Promise<DailyResult> {
  const now = opts.now ?? new Date()
  const dryRun = !!opts.dryRun
  const tz = process.env.REMINDERS_TZ ?? 'Europe/Paris'
  const nowMinutes = opts.nowMinutes ?? minutesOfDayInZone(now, tz)
  const today = todayInZone(tz, now)

  const enabled = await prisma.liaisonSettings.findMany({ where: { dailyReminder: true } })
  if (enabled.length === 0) return { sent: 0, failed: 0, ...(dryRun ? { details: [] } : {}) }
  const ids = enabled.map(s => s.id)

  const [configs, profiles, entries, noVisit] = await Promise.all([
    prisma.appConfig.findMany({ where: { id: { in: ids } } }),
    prisma.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, firstName: true } }),
    prisma.liaisonEntry.findMany({ where: { userId: { in: ids }, date: today }, select: { userId: true } }),
    prisma.liaisonNoVisit.findMany({ where: { userId: { in: ids }, date: today }, select: { userId: true } }),
  ])
  const moduleOn = new Set(
    configs.filter(c => ((c.modules as unknown as Module[]) ?? []).some(m => m.id === 'liaison' && m.enabled)).map(c => c.id),
  )
  const filled = new Set([...entries, ...noVisit].map(x => x.userId))
  const profileById = new Map(profiles.map(p => [p.id, p]))
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')

  const failures: string[] = []
  const details: DailyDetail[] = []
  let sent = 0

  for (const st of enabled) {
    if (!moduleOn.has(st.id)) continue
    const p = profileById.get(st.id)
    const time = isValidReminderTime(st.dailyReminderTime) ? st.dailyReminderTime! : DEFAULT_DAILY_TIME
    const due = isReminderDue(nowMinutes, time)
    const alreadyToday = st.lastDailyReminderDate === today
    const dayFilled = filled.has(st.id)
    if (dryRun) details.push({ time, due, alreadyToday, dayFilled, hasEmail: !!p?.email })
    if (!p?.email || !due || alreadyToday || dayFilled || dryRun) continue

    const claim = await prisma.liaisonSettings.updateMany({
      where: { id: st.id, OR: [{ lastDailyReminderDate: null }, { lastDailyReminderDate: { not: today } }] },
      data: { lastDailyReminderDate: today },
    })
    if (claim.count === 0) continue

    const mail = buildDailyMail(base, p.firstName, makeQuickToken(st.id, today))
    const result = await sendMail({ to: p.email, subject: mail.subject, html: mail.html, text: mail.text })
    if (result.ok) sent += 1
    else {
      failures.push(result.reason)
      await prisma.liaisonSettings.updateMany({ where: { id: st.id, lastDailyReminderDate: today }, data: { lastDailyReminderDate: null } })
    }
  }

  return { sent, failed: failures.length, ...(failures.length ? { errors: [...new Set(failures)] } : {}), ...(dryRun ? { details } : {}) }
}
