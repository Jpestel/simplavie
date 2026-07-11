import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyResetToken } from '@/lib/passwordReset'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}))
  if (!token || !password) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 })
  }

  const user = await verifyResetToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  // Changer le mot de passe invalide aussi tout lien de réinitialisation encore en
  // circulation (la clé de signature dépend du hash du mot de passe).
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
