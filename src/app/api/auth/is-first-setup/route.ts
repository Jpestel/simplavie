import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const count = await prisma.user.count()
    return NextResponse.json({ isFirst: count === 0 })
  } catch {
    return NextResponse.json({ isFirst: false })
  }
}
