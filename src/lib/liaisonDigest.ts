// Rappel hebdomadaire du cahier de liaison : chaque dimanche soir, on prévient
// les comptes qui ont ce module activé ET n'ont pas déjà envoyé leur bilan
// cette semaine (voir LiaisonWeekSent), pour qu'ils décident eux-mêmes
// d'envoyer (ou non) le bilan de leur semaine. Ce n'est PAS un envoi du bilan :
// il ne part jamais tout seul, seulement quand la personne appuie sur
// « Envoyer ». Le rappel liste les jours qu'il reste à évaluer, et, si aucun
// responsable n'a d'adresse e-mail (le bilan ne pourrait donc pas partir),
// demande d'en ajouter un.
//
// Indépendant du système de Rappels (src/lib/reminderDigest.ts) : ce dernier
// n'envoie qu'une fois par jour à heure fixe pour tous les utilisateurs, alors
// qu'on veut ici une heure différente (le dimanche soir) sans toucher aux
// rappels personnels des autres comptes.
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { weekDates, buildReminderMail } from '@/lib/liaisonRatings'
import type { Module } from '@/types'

export type LiaisonDigestResult = {
  sent: number
  skippedAlreadySent: number
  withoutResponsable: number
  failed: number
  errors?: string[]
}

export async function sendWeeklyLiaisonReminders(): Promise<LiaisonDigestResult> {
  const configs = await prisma.appConfig.findMany()
  const userIds = configs
    .filter(c => ((c.modules as unknown as Module[]) ?? []).some(m => m.id === 'liaison' && m.enabled))
    .map(c => c.id)
  if (userIds.length === 0) return { sent: 0, skippedAlreadySent: 0, withoutResponsable: 0, failed: 0 }

  // Semaine en cours au moment de l'exécution (le cron tombe le dimanche).
  const days = weekDates(0)
  const weekStart = days[0]

  const [profiles, alreadySent, weekEntries, noVisitDays, responsables] = await Promise.all([
    prisma.userProfile.findMany({
      where: { id: { in: userIds }, email: { not: null } },
      select: { id: true, email: true, firstName: true },
    }),
    prisma.liaisonWeekSent.findMany({ where: { userId: { in: userIds }, weekStart }, select: { userId: true } }),
    prisma.liaisonEntry.findMany({ where: { userId: { in: userIds }, date: { in: days } }, select: { userId: true, date: true } }),
    prisma.liaisonNoVisit.findMany({ where: { userId: { in: userIds }, date: { in: days } }, select: { userId: true, date: true } }),
    prisma.mailResponsable.findMany({ where: { userId: { in: userIds } }, select: { userId: true, email: true } }),
  ])

  const sentUserIds = new Set(alreadySent.map(r => r.userId))
  // Un jour est « fait » s'il a une évaluation OU s'il est marqué « sans visite ».
  const entriesByUser: Record<string, Set<string>> = {}
  for (const e of [...weekEntries, ...noVisitDays]) {
    if (!entriesByUser[e.userId]) entriesByUser[e.userId] = new Set()
    entriesByUser[e.userId].add(e.date)
  }
  // Comptes qui ont au moins un responsable avec une adresse e-mail (sinon le bilan ne peut pas partir).
  const usersWithResponsable = new Set(
    responsables.filter(r => r.email && r.email.trim()).map(r => r.userId),
  )

  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  const failures: string[] = []
  let sent = 0
  let skippedAlreadySent = 0
  let withoutResponsable = 0

  for (const p of profiles) {
    if (!p.email) continue
    if (sentUserIds.has(p.id)) { skippedAlreadySent += 1; continue }

    const doneDates = entriesByUser[p.id] ?? new Set<string>()
    const missingDays = days.filter(d => !doneDates.has(d))
    const canSend = usersWithResponsable.has(p.id)
    if (!canSend) withoutResponsable += 1

    const mail = buildReminderMail({ base, firstName: p.firstName, missingDays, canSend })
    const result = await sendMail({ to: p.email, subject: mail.subject, html: mail.html, text: mail.text })
    if (result.ok) sent += 1
    else failures.push(result.reason)
  }

  return {
    sent,
    skippedAlreadySent,
    withoutResponsable,
    failed: failures.length,
    ...(failures.length > 0 ? { errors: [...new Set(failures)] } : {}),
  }
}
