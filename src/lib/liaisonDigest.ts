// Rappel hebdomadaire du cahier de liaison : chaque dimanche, à l'heure réglée pour
// le compte (par défaut 20:30, voir LiaisonSettings.reminderTime), on prévient les
// comptes qui ont ce module activé ET n'ont pas déjà envoyé leur bilan cette
// semaine (voir LiaisonWeekSent), pour qu'ils pensent à l'envoyer. Ce n'est PAS un
// envoi du bilan : il ne part jamais tout seul, seulement quand la personne
// appuie sur « Envoyer ». Le rappel liste les jours qu'il reste à évaluer et, si
// aucun responsable n'a d'adresse e-mail (le bilan ne pourrait donc pas partir),
// demande d'en ajouter un.
//
// Le planificateur (src/lib/reminderScheduler.ts) appelle cette fonction CHAQUE
// MINUTE le dimanche ; elle ne retient que les comptes dont l'heure vient de sonner
// (voir isReminderDue : à l'heure réglée, puis 10 minutes de rattrapage). Un compte
// n'est relancé qu'une fois par semaine : on « réserve » la semaine en base AVANT
// d'envoyer (donc pas de doublon, même si deux passages se chevauchent), et on
// libère la réservation si l'envoi échoue pour qu'un nouvel essai ait lieu.
//
// Indépendant du système de Rappels (src/lib/reminderDigest.ts) : ce dernier
// n'envoie qu'une fois par jour à heure fixe pour tous les utilisateurs, alors
// qu'on veut ici une heure propre à chaque compte, sans toucher aux rappels
// personnels des autres.
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import {
  weekDates, buildReminderMail, isReminderDue, isEveningTime, isValidReminderTime,
  minutesOfDayInZone, DEFAULT_REMINDER_TIME,
} from '@/lib/liaisonRatings'
import type { Module } from '@/types'

export type ReminderDetail = {
  time: string
  due: boolean
  alreadyRemindedThisWeek: boolean
  weekAlreadySent: boolean
  canSend: boolean
  missingDays: number
  hasEmail: boolean
}

export type LiaisonDigestResult = {
  sent: number
  skippedAlreadySent: number
  withoutResponsable: number
  failed: number
  errors?: string[]
  /** Mode « à blanc » seulement : l'état de chaque compte, sans adresse e-mail. */
  details?: ReminderDetail[]
}

export async function sendWeeklyLiaisonReminders(
  opts: { now?: Date; nowMinutes?: number; dryRun?: boolean } = {},
): Promise<LiaisonDigestResult> {
  const now = opts.now ?? new Date()
  const dryRun = !!opts.dryRun
  const tz = process.env.REMINDERS_TZ ?? 'Europe/Paris'
  // `nowMinutes` ne sert qu'à simuler une heure lors d'une vérification à blanc.
  const nowMinutes = opts.nowMinutes ?? minutesOfDayInZone(now, tz)

  const configs = await prisma.appConfig.findMany()
  const userIds = configs
    .filter(c => ((c.modules as unknown as Module[]) ?? []).some(m => m.id === 'liaison' && m.enabled))
    .map(c => c.id)
  const empty: LiaisonDigestResult = { sent: 0, skippedAlreadySent: 0, withoutResponsable: 0, failed: 0, ...(dryRun ? { details: [] } : {}) }
  if (userIds.length === 0) return empty

  // Semaine en cours au moment de l'exécution (le planificateur ne tourne que le dimanche).
  const days = weekDates(0, now)
  const weekStart = days[0]

  const [profiles, alreadySent, weekEntries, noVisitDays, responsables, settings] = await Promise.all([
    prisma.userProfile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, firstName: true },
    }),
    prisma.liaisonWeekSent.findMany({ where: { userId: { in: userIds }, weekStart }, select: { userId: true } }),
    prisma.liaisonEntry.findMany({ where: { userId: { in: userIds }, date: { in: days } }, select: { userId: true, date: true } }),
    prisma.liaisonNoVisit.findMany({ where: { userId: { in: userIds }, date: { in: days } }, select: { userId: true, date: true } }),
    prisma.mailResponsable.findMany({ where: { userId: { in: userIds } }, select: { userId: true, email: true } }),
    prisma.liaisonSettings.findMany({ where: { id: { in: userIds } } }),
  ])

  const sentUserIds = new Set(alreadySent.map(r => r.userId))
  const settingsById = new Map(settings.map(s => [s.id, s]))
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
  const details: ReminderDetail[] = []
  let sent = 0
  let skippedAlreadySent = 0
  let withoutResponsable = 0

  for (const p of profiles) {
    const st = settingsById.get(p.id)
    const time = isValidReminderTime(st?.reminderTime) ? st!.reminderTime! : DEFAULT_REMINDER_TIME
    const due = isReminderDue(nowMinutes, time)
    const alreadyReminded = st?.lastReminderWeek === weekStart
    const weekAlreadySent = sentUserIds.has(p.id)
    const doneDates = entriesByUser[p.id] ?? new Set<string>()
    const missingDays = days.filter(d => !doneDates.has(d))
    const canSend = usersWithResponsable.has(p.id)

    if (dryRun) {
      details.push({
        time, due, alreadyRemindedThisWeek: alreadyReminded, weekAlreadySent, canSend,
        missingDays: missingDays.length, hasEmail: !!p.email,
      })
    }

    if (!p.email || !due || alreadyReminded) continue
    if (weekAlreadySent) { skippedAlreadySent += 1; continue }
    if (!canSend) withoutResponsable += 1
    if (dryRun) continue

    // Réservation atomique de la semaine : un seul passage peut envoyer.
    await prisma.liaisonSettings.upsert({ where: { id: p.id }, update: {}, create: { id: p.id } })
    const claim = await prisma.liaisonSettings.updateMany({
      where: { id: p.id, OR: [{ lastReminderWeek: null }, { lastReminderWeek: { not: weekStart } }] },
      data: { lastReminderWeek: weekStart },
    })
    if (claim.count === 0) continue

    const mail = buildReminderMail({ base, firstName: p.firstName, missingDays, canSend, evening: isEveningTime(time) })
    const result = await sendMail({ to: p.email, subject: mail.subject, html: mail.html, text: mail.text })
    if (result.ok) {
      sent += 1
    } else {
      failures.push(result.reason)
      // On libère la réservation : le passage suivant (dans la fenêtre de rattrapage) réessaiera.
      await prisma.liaisonSettings.updateMany({ where: { id: p.id, lastReminderWeek: weekStart }, data: { lastReminderWeek: null } })
    }
  }

  return {
    sent,
    skippedAlreadySent,
    withoutResponsable,
    failed: failures.length,
    ...(failures.length > 0 ? { errors: [...new Set(failures)] } : {}),
    ...(dryRun ? { details } : {}),
  }
}
