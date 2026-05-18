import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([])

  const assignments = await prisma.adminAssignment.findMany({
    where: { adminUserId: session.user.id },
    include: {
      owner: {
        include: {
          appConfig: { select: { userName: true } },
        },
      },
    },
  })

  const result = assignments.map((a) => ({
    id: a.id,
    owner_id: a.ownerUserId,
    owner_name: a.owner.appConfig?.userName ?? null,
    permission: a.permission as 'read' | 'write' | 'admin',
  }))

  return NextResponse.json(result)
}
