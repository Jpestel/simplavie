import { RoutineStep } from '@/types'

export async function loadSteps(defaultSteps: RoutineStep[], userId: string): Promise<RoutineStep[]> {
  if (!userId) {
    return defaultSteps.map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' })).sort((a, b) => a.order - b.order)
  }
  try {
    const res = await fetch(`/api/routine/data?userId=${encodeURIComponent(userId)}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.payload) {
        const steps = (data.payload as RoutineStep[]).map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' }))
        return steps.sort((a, b) => a.order - b.order)
      }
    }
  } catch (e) {
    console.error('[loadSteps] fetch error:', e)
  }
  return defaultSteps.map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' })).sort((a, b) => a.order - b.order)
}

export async function saveSteps(steps: RoutineStep[], userId: string) {
  if (!userId) return
  try {
    await fetch('/api/routine/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, payload: steps }),
    })
  } catch (e) {
    console.error('[saveSteps] fetch error:', e)
  }
}

export async function loadCompletions(date: string, userId: string): Promise<string[]> {
  if (!userId) return []
  try {
    const res = await fetch(`/api/routine/completions?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`)
    if (res.ok) return await res.json()
  } catch (e) {
    console.error('[loadCompletions] fetch error:', e)
  }
  return []
}

export async function toggleCompletion(date: string, stepId: string, done: boolean, userId: string) {
  if (!userId) return
  try {
    if (done) {
      await fetch('/api/routine/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, stepId }),
      })
    } else {
      await fetch('/api/routine/completions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, stepId }),
      })
    }
  } catch (e) {
    console.error('[toggleCompletion] fetch error:', e)
  }
}

export async function loadCancellations(date: string, userId: string): Promise<string[]> {
  if (!userId) return []
  try {
    const res = await fetch(`/api/routine/cancellations?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`)
    if (res.ok) return await res.json()
  } catch (e) {
    console.error('[loadCancellations] fetch error:', e)
  }
  return []
}

export async function toggleCancellation(date: string, stepId: string, cancelled: boolean, userId: string) {
  if (!userId) return
  try {
    if (cancelled) {
      await fetch('/api/routine/cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, stepId }),
      })
    } else {
      await fetch('/api/routine/cancellations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, stepId }),
      })
    }
  } catch (e) {
    console.error('[toggleCancellation] fetch error:', e)
  }
}

export async function loadPostponements(date: string, userId: string): Promise<Record<string, string>> {
  if (!userId) return {}
  try {
    const res = await fetch(`/api/routine/postponements?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`)
    if (res.ok) return await res.json()
  } catch (e) {
    console.error('[loadPostponements] fetch error:', e)
  }
  return {}
}

export async function togglePostponement(date: string, stepId: string, postponed: boolean, userId: string, toDate = '') {
  if (!userId) return
  try {
    if (postponed) {
      await fetch('/api/routine/postponements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, stepId, toDate }),
      })
    } else {
      await fetch('/api/routine/postponements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, stepId }),
      })
    }
  } catch (e) {
    console.error('[togglePostponement] fetch error:', e)
  }
}

export async function loadExtras(date: string, userId: string): Promise<RoutineStep[]> {
  if (!userId) return []
  try {
    const res = await fetch(`/api/routine/extras?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`)
    if (res.ok) return await res.json()
  } catch (e) {
    console.error('[loadExtras] fetch error:', e)
  }
  return []
}

export async function addExtra(step: RoutineStep, date: string, userId: string): Promise<{ error: string | null }> {
  if (!userId) return { error: null }
  try {
    const res = await fetch('/api/routine/extras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date, stepId: step.id, stepPayload: step }),
    })
    if (!res.ok) {
      const data = await res.json()
      return { error: data.error ?? 'Erreur lors de l\'ajout' }
    }
    return { error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur lors de l\'ajout'
    console.error('[addExtra] fetch error:', e)
    return { error: msg }
  }
}

export async function postponeStep(step: RoutineStep, fromDate: string, toDate: string, userId: string) {
  await togglePostponement(fromDate, step.id, true, userId, toDate)

  if (userId) {
    try {
      await fetch('/api/routine/extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: toDate, stepId: step.id, stepPayload: step }),
      })
    } catch (e) {
      console.error('[postponeStep] fetch error:', e)
    }
  }
}
