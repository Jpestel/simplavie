import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

const KINDS = ['negatif', 'positif']

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const motifs = await prisma.liaisonMotif.findMany({
    where: { userId: userId as string },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(motifs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, order } = body
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  const kind = KINDS.includes(body.kind) ? body.kind : 'negatif'
  if (!userId || !label) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  // Évite les doublons (ex. double clic sur « Charger les motifs de base »).
  const already = await prisma.liaisonMotif.findFirst({ where: { userId, label, kind } })
  if (already) return NextResponse.json(already)

  const motif = await prisma.liaisonMotif.create({ data: { userId, label, kind, order: order ?? 0 } })
  return NextResponse.json(motif)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.liaisonMotif.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.liaisonMotif.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
