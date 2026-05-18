import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // Upsert UserProfile — l'admin crée son propre compte utilisateur SimplaVie
    await prisma.userProfile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    })

    // Upsert AppConfig si elle n'existe pas encore
    await prisma.appConfig.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
