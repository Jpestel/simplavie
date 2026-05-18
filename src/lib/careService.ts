import { CareData } from '@/types'

export const EMPTY_CARE_DATA: CareData = {
  company: { name: '' },
  caregivers: [],
  appointments: [],
}

export async function loadCareData(userId: string): Promise<CareData> {
  if (!userId) return EMPTY_CARE_DATA
  try {
    const res = await fetch(`/api/care?userId=${userId}`)
    if (!res.ok) return EMPTY_CARE_DATA
    const data = await res.json()
    if (data) return data as CareData
  } catch { /* ignore */ }
  return EMPTY_CARE_DATA
}

export async function saveCareData(care: CareData, userId: string) {
  if (!userId) return
  await fetch(`/api/care?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(care),
  })
}
