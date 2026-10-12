// Lien d'évaluation « en un appui » envoyé dans l'e-mail du soir.
//
// Le lien contient un jeton signé (HMAC avec NEXTAUTH_SECRET) qui n'autorise qu'UNE chose :
// ajouter une évaluation pour CE compte et CE jour. Il n'ouvre aucune session et ne donne
// accès à rien d'autre. Il expire au bout de QUICK_DAYS jours.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const QUICK_DAYS = 3

const sign = (userId: string, date: string) => {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET manquant')
  return createHmac('sha256', secret).update(`liaison-quick|${userId}|${date}`).digest('hex').slice(0, 32)
}

export const makeQuickToken = (userId: string, date: string) => `${userId}.${date}.${sign(userId, date)}`

/** Date du jour (AAAA-MM-JJ) dans un fuseau donné. */
export function todayInZone(tz: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Retourne { userId, date } si le jeton est authentique et encore valable, sinon null. */
export function readQuickToken(token: unknown, now: Date = new Date()): { userId: string; date: string } | null {
  if (typeof token !== 'string' || token.length > 200) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, date, sig] = parts
  if (!/^[\w-]+$/.test(userId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  let expected: string
  try { expected = sign(userId, date) } catch { return null }
  const a = Buffer.from(sig), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const tz = process.env.REMINDERS_TZ ?? 'Europe/Paris'
  const today = todayInZone(tz, now)
  const ageDays = Math.round((new Date(today + 'T12:00:00Z').getTime() - new Date(date + 'T12:00:00Z').getTime()) / 86_400_000)
  if (ageDays < 0 || ageDays > QUICK_DAYS) return null
  return { userId, date }
}
