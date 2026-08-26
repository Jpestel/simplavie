// Contrôle d'accès des routes API.
//
// Règle : les données d'un compte (profil, routine, agenda, rappels, finances,
// aidants, services…) ne sont accessibles qu'à
//   - son propriétaire,
//   - un superadmin,
//   - une personne à qui le propriétaire a donné accès (AdminAssignment).
//     La permission 'read' n'autorise que la lecture ; 'write' et 'admin'
//     autorisent aussi les modifications.
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export type Caller = { userId: string; globalRole: string }
export type Denied = { error: string; status: 401 | 403 }

export function isDenied(r: Caller | Denied): r is Denied {
  return 'error' in r
}

/** Réponse d'erreur normalisée à renvoyer depuis une route. */
export function deny(d: Denied) {
  return NextResponse.json({ error: d.error }, { status: d.status })
}

/** Exige simplement un utilisateur connecté (routes sans données personnelles). */
export async function requireSession(req: NextRequest): Promise<Caller | Denied> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) return { error: 'Non authentifié', status: 401 }
    return { userId: token.id as string, globalRole: (token.globalRole as string) ?? 'user' }
  } catch {
    return { error: 'Non authentifié', status: 401 }
  }
}

/**
 * Exige que l'appelant ait le droit d'accéder aux données de `ownerId`.
 * `mode` vaut 'write' pour toute écriture (POST/PATCH/PUT/DELETE).
 */
export async function requireAccess(
  req: NextRequest,
  ownerId: string | null | undefined,
  mode: 'read' | 'write' = 'read',
): Promise<Caller | Denied> {
  const caller = await requireSession(req)
  if (isDenied(caller)) return caller

  if (!ownerId) return { error: 'Accès refusé', status: 403 }
  if (ownerId === caller.userId) return caller
  if (caller.globalRole === 'superadmin') return caller

  const assignment = await prisma.adminAssignment.findUnique({
    where: { ownerUserId_adminUserId: { ownerUserId: ownerId, adminUserId: caller.userId } },
  })
  if (!assignment) return { error: 'Accès refusé', status: 403 }
  if (mode === 'write' && assignment.permission === 'read') {
    return { error: 'Accès en lecture seule', status: 403 }
  }
  return caller
}

/**
 * Même contrôle, à partir d'un enregistrement dont on ne connaît que l'id :
 * on récupère d'abord le propriétaire, puis on applique requireAccess.
 * Renvoie 403 (et non 404) si l'enregistrement n'existe pas, pour ne pas
 * révéler l'existence d'un id.
 */
export async function requireAccessToRecord(
  req: NextRequest,
  ownerId: string | null | undefined,
  mode: 'read' | 'write' = 'read',
): Promise<Caller | Denied> {
  if (!ownerId) return { error: 'Accès refusé', status: 403 }
  return requireAccess(req, ownerId, mode)
}
