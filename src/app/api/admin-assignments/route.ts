// Routes API pour que le propriétaire d'un compte gère ses admin_assignments.
// (Distinct des routes /superadmin/ réservées aux superadmins.)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET /api/admin-assignments?ownerId=xxx — liste des admins d'un owner
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([], { status: 401 })

  const ownerId = req.nextUrl.searchParams.get('ownerId') ?? session.user.id

  // Un utilisateur ne peut lire que ses propres assignments (sauf superadmin)
  if (ownerId !== session.user.id && session.user.globalRole !== 'superadmin') {
    return NextResponse.json([], { status: 403 })
  }

  const assignments = await prisma.adminAssignment.findMany({
    where: { ownerUserId: ownerId },
    include: {
      admin: {
        include: { profile: { select: { displayName: true } } },
      },
    },
  })

  const result = assignments.map(a => ({
    id: a.id,
    display_name: a.admin.profile?.displayName ?? null,
    permission: a.permission as 'read' | 'write',
  }))

  return NextResponse.json(result)
}

// PATCH /api/admin-assignments — modifier la permission d'un assignment
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id, permission } = await req.json()
  if (!id || !permission) return NextResponse.json({ error: 'id et permission requis' }, { status: 400 })

  // Vérifier que l'assignment appartient bien à cet owner
  const existing = await prisma.adminAssignment.findUnique({ where: { id } })
  if (!existing || existing.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  await prisma.adminAssignment.update({ where: { id }, data: { permission } })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin-assignments?id=xxx — supprimer un assignment
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  // Vérifier que l'assignment appartient bien à cet owner
  const existing = await prisma.adminAssignment.findUnique({ where: { id } })
  if (!existing || existing.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  await prisma.adminAssignment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
