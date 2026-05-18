import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function verifySuperAdmin(): Promise<{ userId: string } | { error: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return { error: 'Non authentifié' }
    if (session.user.globalRole !== 'superadmin') return { error: 'Accès refusé' }
    return { userId: session.user.id }
  } catch {
    return { error: 'Erreur serveur' }
  }
}
