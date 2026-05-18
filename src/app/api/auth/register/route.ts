import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already used' }, { status: 409 })

  const count = await prisma.user.count()
  const globalRole = count === 0 ? 'superadmin' : 'user'

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, password: hashed, name, globalRole },
  })

  // Crée profile vide + config par défaut
  await prisma.userProfile.create({ data: { id: user.id } })
  await prisma.appConfig.create({ data: { id: user.id } })

  return NextResponse.json({ id: user.id, email: user.email, globalRole })
}
