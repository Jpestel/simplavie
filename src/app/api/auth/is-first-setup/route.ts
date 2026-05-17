import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const admin = getSupabaseAdmin()
    const { count } = await admin
      .from('user_profile')
      .select('*', { count: 'exact', head: true })
    return NextResponse.json({ isFirst: (count ?? 0) === 0 })
  } catch {
    return NextResponse.json({ isFirst: false })
  }
}
