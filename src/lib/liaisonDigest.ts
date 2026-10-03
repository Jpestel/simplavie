// Rappel hebdomadaire du cahier de liaison : chaque dimanche soir, on prévient
// les comptes qui ont ce module activé ET n'ont pas déjà envoyé leur bilan
// cette semaine (voir LiaisonWeekSent), pour qu'ils décident eux-mêmes
// d'envoyer (ou non) le bilan de leur semaine. Ce n'est pas un envoi
// automatique du bilan — juste une invitation à aller le faire, avec la liste
// des jours qu'il reste à évaluer s'il y en a.
//
// Indépendant du système de Rappels (src/lib/reminderDigest.ts) : ce dernier
// n'envoie qu'une fois par jour à heure fixe pour tous les utilisateurs, alors
// qu'on veut ici une heure différente (le dimanche soir) sans toucher aux
// rappels personnels des autres comptes.
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { weekDates, formatDayFr } from '@/lib/liaisonRatings'
import type { Module } from '@/types'

export type LiaisonDigestResult = {
  sent: number
  skippedAlreadySent: number
  failed: number
  errors?: string[]
}

export async function sendWeeklyLiaisonReminders(): Promise<LiaisonDigestResult> {
  const configs = await prisma.appConfig.findMany()
  const userIds = configs
    .filter(c => ((c.modules as unknown as Module[]) ?? []).some(m => m.id === 'liaison' && m.enabled))
    .map(c => c.id)
  if (userIds.length === 0) return { sent: 0, skippedAlreadySent: 0, failed: 0 }

  // Semaine en cours au moment de l'exécution (le cron tombe le dimanche).
  const days = weekDates(0)
  const weekStart = days[0]

  const [profiles, alreadySent, weekEntries, noVisitDays] = await Promise.all([
    prisma.userProfile.findMany({
      where: { id: { in: userIds }, email: { not: null } },
      select: { id: true, email: true, firstName: true },
    }),
    prisma.liaisonWeekSent.findMany({ where: { userId: { in: userIds }, weekStart }, select: { userId: true } }),
    prisma.liaisonEntry.findMany({ where: { userId: { in: userIds }, date: { in: days } }, select: { userId: true, date: true } }),
    prisma.liaisonNoVisit.findMany({ where: { userId: { in: userIds }, date: { in: days } }, select: { userId: true, date: true } }),
  ])

  const sentUserIds = new Set(alreadySent.map(r => r.userId))
  // Un jour est « fait » s'il a une évaluation OU s'il est marqué « sans visite ».
  const entriesByUser: Record<string, Set<string>> = {}
  for (const e of [...weekEntries, ...noVisitDays]) {
    if (!entriesByUser[e.userId]) entriesByUser[e.userId] = new Set()
    entriesByUser[e.userId].add(e.date)
  }

  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  const failures: string[] = []
  let sent = 0
  let skippedAlreadySent = 0

  for (const p of profiles) {
    if (!p.email) continue
    if (sentUserIds.has(p.id)) { skippedAlreadySent += 1; continue }

    const doneDates = entriesByUser[p.id] ?? new Set<string>()
    const missingDays = days.filter(d => !doneDates.has(d))

    const missingHtml = missingDays.length > 0
      ? `<p style="color:#555">Il manque une évaluation pour :</p>
         <ul style="color:#c2410c">${missingDays.map(d => `<li>${formatDayFr(d)}</li>`).join('')}</ul>`
      : `<p style="color:#555">Ta semaine est complète — tu peux relire ton bilan et l'envoyer aux responsables si tu veux.</p>`
    const missingText = missingDays.length > 0
      ? `Il manque une évaluation pour :\n${missingDays.map(d => `- ${formatDayFr(d)}`).join('\n')}\n\n`
      : `Ta semaine est complète — tu peux relire ton bilan et l'envoyer aux responsables si tu veux.\n\n`

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">📔 Cahier de liaison</h2>
        <p style="color:#555">C'est dimanche soir !</p>
        ${missingHtml}
        <p style="text-align:center;margin:24px 0">
          <a href="${base}/modules/liaison?tab=bilan" style="background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:bold;display:inline-block">
            Voir le bilan de ma semaine
          </a>
        </p>
        <p style="color:#aaa;font-size:12px">SimplaVie — rappel automatique. C'est toi qui décides d'envoyer ou non.</p>
      </div>
    `
    const result = await sendMail({
      to: p.email,
      subject: '📔 Ton bilan de la semaine est prêt à relire',
      html,
      text: `Bonjour${p.firstName ? ' ' + p.firstName : ''},\n\nC'est dimanche soir !\n\n${missingText}${base}/modules/liaison?tab=bilan\n\n— SimplaVie`,
    })
    if (result.ok) sent += 1
    else failures.push(result.reason)
  }

  return {
    sent,
    skippedAlreadySent,
    failed: failures.length,
    ...(failures.length > 0 ? { errors: [...new Set(failures)] } : {}),
  }
}
