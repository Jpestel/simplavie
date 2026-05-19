import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

export async function verifySuperAdmin(req: NextRequest): Promise<{ userId: string } | { error: string }> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) return { error: 'Non authentifié' }
    if (token.globalRole !== 'superadmin') return { error: 'Accès refusé' }
    return { userId: token.id as string }
  } catch {
    return { error: 'Erreur serveur' }
  }
}
