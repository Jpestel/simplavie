import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireAccess, isDenied, deny } from '@/lib/apiAuth'
import { sendMail } from '@/lib/mailer'
import { isFirstServerBilan } from '@/lib/liaisonFirstBilan'
import { MAIL_DISCLAIMER } from '@/lib/mailTemplateTokens'
import {
  RatingKey, BilanEntry, buildBilanMail, weekDatesFrom, addDaysIso, formatDayFr,
} from '@/lib/liaisonRatings'

// Envoi du bilan hebdomadaire PAR SIMPLAVIE, uniquement quand la personne appuie
// sur « Envoyer » (jamais automatique).
//
// Sécurité : le navigateur n'envoie ni destinataire, ni objet, ni texte. Il
// désigne seulement des responsables et des contacts DÉJÀ enregistrés pour ce
// compte ; les adresses viennent de la base, et le message est rédigé ICI à
// partir des évaluations enregistrées (même fonction que l'aperçu à l'écran).
// Sans cela, la route serait un relais permettant d'envoyer n'importe quoi,
// depuis l'adresse vérifiée du domaine, à n'importe qui.
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/
// Protection contre le double appui (et contre un usage abusif en rafale).
const MIN_DELAY_MS = 60_000

const cleanEmail = (v: unknown): string | null =>
  typeof v === 'string' && EMAIL_RE.test(v.trim()) ? v.trim() : null

const stringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type DbEntry = { date: string; rating: string; aidants: unknown; moment: string | null; motifs: unknown; comment: string | null }
const toBilanEntry = (e: DbEntry): BilanEntry => ({
  date: e.date,
  rating: e.rating as RatingKey,
  aidants: stringArray(e.aidants),
  moment: e.moment,
  motifs: stringArray(e.motifs),
  comment: e.comment,
})

export async function POST(req: NextRequest) {
  // Authentification d'abord : tout appel anonyme reçoit 401, quel que soit son contenu.
  const session = await requireSession(req)
  if (isDenied(session)) return deny(session)

  const body = await req.json().catch(() => ({}))
  const { userId, weekStart } = body
  const responsableIds = stringArray(body.responsableIds)
  const ccContactIds = stringArray(body.ccContactIds)
  const includeAidantSummary = body.includeAidantSummary !== false

  // `weekStart` doit être la date d'un lundi (le bilan couvre toujours lundi → dimanche).
  if (
    typeof userId !== 'string' || typeof weekStart !== 'string' || !WEEK_RE.test(weekStart) ||
    new Date(weekStart + 'T00:00:00').getDay() !== 1
  ) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
  if (responsableIds.length === 0) {
    return NextResponse.json({ error: 'Choisis au moins un responsable.' }, { status: 400 })
  }

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const days = weekDatesFrom(weekStart)

  // Garde-fou : un envoi vient d'avoir lieu pour cette semaine.
  const previous = await prisma.liaisonWeekSent.findUnique({ where: { userId_weekStart: { userId, weekStart } } })
  if (previous?.method === 'serveur' && previous.sentAt && Date.now() - previous.sentAt.getTime() < MIN_DELAY_MS) {
    return NextResponse.json({ error: "Le bilan vient d'être envoyé, patiente une minute avant de le renvoyer." }, { status: 429 })
  }

  const fourWeeksStart = addDaysIso(days[0], -21)
  const [entries, noVisit, responsables, profile] = await Promise.all([
    prisma.liaisonEntry.findMany({
      where: { userId, date: { gte: fourWeeksStart, lte: days[6] } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.liaisonNoVisit.findMany({ where: { userId, date: { in: days } }, select: { date: true } }),
    prisma.mailResponsable.findMany({ where: { userId, id: { in: responsableIds } } }),
    prisma.userProfile.findUnique({ where: { id: userId } }),
  ])

  // Règle de fond : chaque jour a une évaluation ou la marque « personne n'est passé ».
  const weekEntries = entries.filter(e => days.includes(e.date))
  const done = new Set([...weekEntries.map(e => e.date), ...noVisit.map(n => n.date)])
  const missingDays = days.filter(d => !done.has(d))
  if (missingDays.length > 0) {
    return NextResponse.json(
      { error: `Il manque une évaluation pour : ${missingDays.map(formatDayFr).join(', ')}.`, missingDays },
      { status: 409 },
    )
  }

  // Destinataires : uniquement des responsables de CE compte, avec une adresse valide.
  const to = [...new Set(responsables.map(r => cleanEmail(r.email)).filter((x): x is string => !!x))]
  if (to.length === 0) {
    return NextResponse.json(
      { error: "Aucun responsable avec une adresse e-mail valide : ajoute-en un avant d'envoyer." },
      { status: 400 },
    )
  }

  // Copie : la personne elle-même (e-mail du profil) + les contacts cochés, retrouvés par id.
  const contacts = Array.isArray(profile?.contacts) ? (profile.contacts as { id?: string; email?: string }[]) : []
  const ownEmail = cleanEmail(profile?.email)
  const cc = [...new Set([
    ...(ownEmail ? [ownEmail] : []),
    ...contacts.filter(c => c.id && ccContactIds.includes(c.id)).map(c => cleanEmail(c.email)).filter((x): x is string => !!x),
  ])].filter(a => !to.includes(a))

  const isFirstBilan = await isFirstServerBilan(userId, weekStart)

  const mail = buildBilanMail({
    days,
    weekEntries: weekEntries.map(toBilanEntry),
    fourWeeksEntries: entries.map(toBilanEntry),
    noVisitDays: noVisit.map(n => n.date),
    firstName: profile?.firstName ?? '',
    includeAidantSummary,
    disclaimer: MAIL_DISCLAIMER,
    isFirstBilan,
  })

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.5">${escapeHtml(mail.body).replace(/\n/g, '<br>')}</div>`
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()

  const result = await sendMail({
    to,
    cc,
    subject: mail.subject,
    html,
    text: mail.body,
    // Les réponses de l'agence arrivent chez la personne, pas dans la boîte de l'application.
    replyTo: ownEmail ?? undefined,
    fromName: fullName ? `${fullName} (via SimplaVie)` : undefined,
  })
  if (!result.ok) {
    // Le détail technique est dans les journaux du serveur ([mailer] ÉCHEC) ; on ne le renvoie pas au navigateur.
    return NextResponse.json(
      { error: "L'envoi a échoué. Réessaie dans un instant, ou utilise « Ouvrir dans mon appli mail »." },
      { status: 502 },
    )
  }

  const sentAt = new Date()
  await prisma.liaisonWeekSent.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: { sentAt, recipients: [...to, ...cc], method: 'serveur' },
    create: { userId, weekStart, sentAt, recipients: [...to, ...cc], method: 'serveur' },
  })

  return NextResponse.json({ ok: true, sentAt, to, cc })
}
