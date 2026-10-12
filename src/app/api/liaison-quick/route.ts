import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readQuickToken } from '@/lib/liaisonQuick'
import { RATINGS, MOMENTS, formatDayFr } from '@/lib/liaisonRatings'

// Évaluation en un appui depuis l'e-mail du soir. Pas de session : le jeton signé du lien
// (voir liaisonQuick.ts) est la seule preuve, et il ne permet que d'ajouter une évaluation
// pour ce compte et ce jour, avec des aidants déjà enregistrés pour ce compte.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const names = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export async function GET(req: NextRequest) {
  const tok = readQuickToken(req.nextUrl.searchParams.get('t'))
  if (!tok) return NextResponse.json({ error: 'Lien expiré ou invalide.' }, { status: 401 })
  const { userId, date } = tok

  const [profile, aidants, done, previous] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: userId }, select: { firstName: true } }),
    prisma.mailAidant.findMany({ where: { userId }, orderBy: { order: 'asc' }, select: { prenom: true } }),
    prisma.liaisonEntry.findMany({ where: { userId, date }, select: { rating: true, aidants: true } }),
    prisma.liaisonEntry.findFirst({ where: { userId, date: { lt: date } }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], select: { date: true } }),
  ])
  // Aidants proposés d'office : ceux de la dernière journée évaluée avant celle-ci.
  const lastDay = previous
    ? await prisma.liaisonEntry.findMany({ where: { userId, date: previous.date }, select: { aidants: true } })
    : []
  const list = aidants.map(a => a.prenom)
  const suggested = [...new Set(lastDay.flatMap(e => names(e.aidants)))].filter(n => list.some(l => norm(l) === norm(n)))

  return NextResponse.json({
    firstName: profile?.firstName ?? '',
    dateLabel: formatDayFr(date),
    aidants: list,
    suggested,
    done: done.map(d => ({ rating: d.rating, aidants: names(d.aidants) })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const tok = readQuickToken(body.t)
  if (!tok) return NextResponse.json({ error: 'Lien expiré ou invalide.' }, { status: 401 })
  const { userId, date } = tok

  if (!RATINGS.some(r => r.key === body.rating)) return NextResponse.json({ error: 'Note invalide' }, { status: 400 })
  const wanted = names(body.aidants)
  if (wanted.length === 0) return NextResponse.json({ error: 'Choisis au moins un aidant.' }, { status: 400 })

  // Les aidants doivent exister pour ce compte (on enregistre le prénom tel qu'il est dans la liste).
  const known = await prisma.mailAidant.findMany({ where: { userId }, select: { prenom: true } })
  const chosen = [...new Set(wanted.map(w => known.find(k => norm(k.prenom) === norm(w))?.prenom).filter((x): x is string => !!x))]
  if (chosen.length === 0) return NextResponse.json({ error: 'Aidant inconnu.' }, { status: 400 })

  // Un double appui ne doit pas créer deux évaluations identiques.
  const dup = await prisma.liaisonEntry.findFirst({
    where: { userId, date, rating: body.rating, createdAt: { gt: new Date(Date.now() - 30_000) } },
  })
  if (!dup) {
    await prisma.liaisonEntry.create({ data: { userId, date, rating: body.rating, aidants: chosen, moment: MOMENTS.some(m => m.key === body.moment) ? body.moment : null, motifs: [], comment: null } })
    await prisma.liaisonNoVisit.deleteMany({ where: { userId, date } })
  }
  return NextResponse.json({ ok: true })
}
