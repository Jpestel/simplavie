import { AgendaEvent } from '@/types'

export async function loadEvents(userId: string): Promise<AgendaEvent[]> {
  if (!userId) return []
  try {
    const res = await fetch(`/api/agenda?userId=${userId}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data as AgendaEvent[]) ?? []
  } catch { return [] }
}

export async function saveEvents(userId: string, events: AgendaEvent[]) {
  if (!userId) return
  await fetch(`/api/agenda?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(events),
  })
}
