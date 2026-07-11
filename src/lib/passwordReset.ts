import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

// Durée de validité d'un lien de réinitialisation : 1 heure
const TOKEN_TTL_MS = 60 * 60 * 1000

type TokenUser = { id: string; password: string }

// La clé de signature inclut le hash ACTUEL du mot de passe : dès que le mot de
// passe change, la clé change et tous les liens précédemment émis deviennent
// invalides → usage unique + invalidation automatique, sans stockage en base.
function sign(payloadB64: string, passwordHash: string): string {
  const key = `${process.env.NEXTAUTH_SECRET ?? ''}:${passwordHash}`
  return createHmac('sha256', key).update(payloadB64).digest('hex')
}

export function createResetToken(user: TokenUser): string {
  const payload = { uid: user.id, exp: Date.now() + TOKEN_TTL_MS }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = sign(payloadB64, user.password)
  return `${payloadB64}.${sig}`
}

// Retourne l'utilisateur si le token est valide et non expiré, sinon null.
export async function verifyResetToken(token: string) {
  if (!token || !token.includes('.')) return null
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null

  let payload: { uid?: string; exp?: number }
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
  } catch {
    return null
  }
  if (!payload.uid || !payload.exp || Date.now() > payload.exp) return null

  const user = await prisma.user.findUnique({ where: { id: payload.uid } })
  if (!user) return null

  const expected = sign(payloadB64, user.password)
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  return user
}
