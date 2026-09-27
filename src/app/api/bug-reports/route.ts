import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isDenied, deny } from '@/lib/apiAuth'

// N'importe quel compte connecté peut signaler un bug (POST). Seul le
// superadmin peut lister (GET) ou traiter (PATCH) les signalements : ce n'est
// pas une donnée personnelle d'un compte, donc requireAccess ne s'applique
// pas ici — même idiome que l'écriture de la liste "default" dans
// alert-messages/route.ts.
export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (isDenied(auth)) return deny(auth)
  if (auth.globalRole !== 'superadmin') return deny({ error: 'Accès refusé', status: 403 })

  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true, name: true } } },
  })
  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (isDenied(auth)) return deny(auth)

  const body = await req.json()
  const message = (body.message || '').trim()
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

  const report = await prisma.bugReport.create({
    data: { userId: auth.userId, message, page: body.page || null },
  })
  return NextResponse.json(report)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSession(req)
  if (isDenied(auth)) return deny(auth)
  if (auth.globalRole !== 'superadmin') return deny({ error: 'Accès refusé', status: 403 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const report = await prisma.bugReport.update({ where: { id }, data: { status } })
  return NextResponse.json(report)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSession(req)
  if (isDenied(auth)) return deny(auth)
  if (auth.globalRole !== 'superadmin') return deny({ error: 'Accès refusé', status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.bugReport.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
