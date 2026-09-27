import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess, isDenied, deny } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const auth = await requireAccess(req, userId, 'read')
  if (isDenied(auth)) return deny(auth)

  const drafts = await prisma.mailDraft.findMany({
    where: { userId: userId as string },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(drafts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, label, subject, body: draftBody, recipients } = body
  if (!userId || !draftBody || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const auth = await requireAccess(req, userId, 'write')
  if (isDenied(auth)) return deny(auth)

  const draft = await prisma.mailDraft.create({
    data: { userId, label: label || 'Mail', subject: subject ?? '', body: draftBody, recipients },
  })
  return NextResponse.json(draft)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await prisma.mailDraft.findUnique({ where: { id }, select: { userId: true } })
  const auth = await requireAccess(req, existing?.userId, 'write')
  if (isDenied(auth)) return deny(auth)

  await prisma.mailDraft.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
