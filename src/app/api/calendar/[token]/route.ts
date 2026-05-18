import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CareData } from '@/types'

function pad(n: number) { return String(n).padStart(2, '0') }

function toICSDate(date: string, time?: string): string {
  const d = date.replace(/-/g, '')
  if (!time) return d
  const [h, m] = time.split(':')
  return `${d}T${pad(Number(h))}${pad(Number(m))}00`
}

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function generateICS(care: CareData): string {
  const appointments = (care.appointments ?? []).filter(a => a.status !== 'cancelled')
  const caregivers = care.caregivers ?? []

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SimplaVie//Planning Aidants//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Planning Aidants',
    'X-WR-TIMEZONE:Europe/Paris',
    'X-WR-CALDESC:Planning des interventions à domicile',
  ]

  for (const appt of appointments) {
    const cg = caregivers.find(c => c.id === appt.caregiverId)
    const name = appt.caregiverName || cg?.name || 'Intervenant'
    const role = cg?.role || ''

    const dtstart = toICSDate(appt.date, appt.time)
    const dtend = appt.endTime
      ? toICSDate(appt.date, appt.endTime)
      : toICSDate(appt.date, appt.time)

    const hasTime = !!appt.time
    const startPrefix = hasTime ? 'DTSTART;TZID=Europe/Paris:' : 'DTSTART;VALUE=DATE:'
    const endPrefix = hasTime ? 'DTEND;TZID=Europe/Paris:' : 'DTEND;VALUE=DATE:'

    const descParts: string[] = []
    if (role) descParts.push(role)
    if (care.company?.name) descParts.push(care.company.name)
    if (appt.notes) descParts.push(appt.notes)
    if (appt.modifiedNote) descParts.push('⚠️ ' + appt.modifiedNote)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:simplavie-${appt.id}@simplavie.app`)
    lines.push(`${startPrefix}${dtstart}`)
    lines.push(`${endPrefix}${dtend}`)
    lines.push(`SUMMARY:${esc(name)}${role ? ' (' + esc(role) + ')' : ''}`)
    if (descParts.length) lines.push(`DESCRIPTION:${esc(descParts.join('\n'))}`)
    lines.push(`STATUS:${appt.status === 'modified' ? 'TENTATIVE' : 'CONFIRMED'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return new NextResponse('Not found', { status: 404 })

  // NOTE: calendar_token n'est pas encore dans le schéma Prisma UserProfile.
  // On utilise $queryRaw en attendant la migration officielle.
  let userId: string | null = null
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM user_profile WHERE calendar_token = ${token} LIMIT 1
    `
    userId = rows[0]?.id ?? null
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  if (!userId) return new NextResponse('Not found', { status: 404 })

  const careRecord = await prisma.careData.findUnique({ where: { id: userId } })

  const care: CareData = (careRecord?.payload as CareData) ?? {
    company: { name: '' }, caregivers: [], appointments: [],
  }

  return new NextResponse(generateICS(care), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="planning-aidants.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
