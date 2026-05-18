// NOTE: Ce fichier nécessite l'ajout du modèle AdminInvite dans le schéma Prisma.
// En attendant, les opérations sur admin_invites renvoient 501.
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token requis' }, { status: 400 })
  // TODO: implémenter avec prisma.adminInvite une fois le modèle ajouté au schéma
  return NextResponse.json({ error: 'AdminInvite non encore migré vers Prisma' }, { status: 501 })
}

export async function POST(req: NextRequest) {
  const { token, usedBy } = await req.json()
  if (!token || !usedBy) return NextResponse.json({ error: 'token et usedBy requis' }, { status: 400 })
  // TODO: implémenter avec prisma.adminInvite une fois le modèle ajouté au schéma
  return NextResponse.json({ error: 'AdminInvite non encore migré vers Prisma' }, { status: 501 })
}
