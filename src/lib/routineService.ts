import { RoutineStep } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const STEPS_KEY = 'simplavie_routine_steps'
const DONE_PREFIX = 'simplavie_routine_done_'
const CANCELLED_PREFIX = 'simplavie_routine_cancelled_'
const POSTPONED_PREFIX = 'simplavie_routine_postponed_'
const EXTRA_PREFIX = 'simplavie_routine_extra_'

export async function loadSteps(defaultSteps: RoutineStep[], userId: string): Promise<RoutineStep[]> {
  if (isSupabaseConfigured && userId) {
    const { data, error } = await supabase
      .from('routine_data').select('payload').eq('user_id', userId).maybeSingle()
    if (!error && data?.payload) {
      const steps = (data.payload as RoutineStep[]).map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' }))
      localStorage.setItem(STEPS_KEY, JSON.stringify(steps))
      return steps.sort((a, b) => a.order - b.order)
    }
  }
  const stored = localStorage.getItem(STEPS_KEY)
  const local: RoutineStep[] | null = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null
  const steps = (local ?? defaultSteps).map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' }))
  return steps.sort((a, b) => a.order - b.order)
}

export async function saveSteps(steps: RoutineStep[], userId: string) {
  localStorage.setItem(STEPS_KEY, JSON.stringify(steps))
  if (!isSupabaseConfigured || !userId) return
  await supabase.from('routine_data').upsert({ id: userId, user_id: userId, payload: steps, updated_at: new Date().toISOString() })
}

export async function loadCompletions(date: string, userId: string): Promise<string[]> {
  if (isSupabaseConfigured && userId) {
    const { data, error } = await supabase
      .from('routine_completions').select('step_id').eq('user_id', userId).eq('date', date)
    if (!error && data) {
      const ids = data.map((r: Record<string, unknown>) => r.step_id as string)
      localStorage.setItem(DONE_PREFIX + date, JSON.stringify(ids))
      return ids
    }
  }
  const stored = localStorage.getItem(DONE_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function toggleCompletion(date: string, stepId: string, done: boolean, userId: string) {
  const stored = localStorage.getItem(DONE_PREFIX + date)
  const current: string[] = stored ? JSON.parse(stored) : []
  const next = done ? [...new Set([...current, stepId])] : current.filter(id => id !== stepId)
  localStorage.setItem(DONE_PREFIX + date, JSON.stringify(next))

  if (!isSupabaseConfigured || !userId) return
  if (done) {
    await supabase.from('routine_completions').upsert({ date, step_id: stepId, user_id: userId })
  } else {
    await supabase.from('routine_completions').delete().eq('user_id', userId).eq('date', date).eq('step_id', stepId)
  }
}

export async function loadCancellations(date: string, userId: string): Promise<string[]> {
  if (isSupabaseConfigured && userId) {
    const { data, error } = await supabase
      .from('routine_cancellations').select('step_id').eq('user_id', userId).eq('date', date)
    if (!error && data && data.length > 0) {
      const ids = data.map((r: Record<string, unknown>) => r.step_id as string)
      localStorage.setItem(CANCELLED_PREFIX + date, JSON.stringify(ids))
      return ids
    }
  }
  const stored = localStorage.getItem(CANCELLED_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function toggleCancellation(date: string, stepId: string, cancelled: boolean, userId: string) {
  const stored = localStorage.getItem(CANCELLED_PREFIX + date)
  const current: string[] = stored ? JSON.parse(stored) : []
  const next = cancelled ? [...new Set([...current, stepId])] : current.filter(id => id !== stepId)
  localStorage.setItem(CANCELLED_PREFIX + date, JSON.stringify(next))

  if (!isSupabaseConfigured || !userId) return
  if (cancelled) {
    await supabase.from('routine_cancellations').upsert({ date, step_id: stepId, user_id: userId })
  } else {
    await supabase.from('routine_cancellations').delete().eq('user_id', userId).eq('date', date).eq('step_id', stepId)
  }
}

export async function loadPostponements(date: string, userId: string): Promise<string[]> {
  if (isSupabaseConfigured && userId) {
    const { data, error } = await supabase
      .from('routine_postponements').select('step_id').eq('user_id', userId).eq('date', date)
    if (!error && data && data.length > 0) {
      const ids = data.map((r: Record<string, unknown>) => r.step_id as string)
      localStorage.setItem(POSTPONED_PREFIX + date, JSON.stringify(ids))
      return ids
    }
  }
  const stored = localStorage.getItem(POSTPONED_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function togglePostponement(date: string, stepId: string, postponed: boolean, userId: string) {
  const stored = localStorage.getItem(POSTPONED_PREFIX + date)
  const current: string[] = stored ? JSON.parse(stored) : []
  const next = postponed ? [...new Set([...current, stepId])] : current.filter(id => id !== stepId)
  localStorage.setItem(POSTPONED_PREFIX + date, JSON.stringify(next))

  if (!isSupabaseConfigured || !userId) return
  if (postponed) {
    await supabase.from('routine_postponements').upsert({ date, step_id: stepId, user_id: userId })
  } else {
    await supabase.from('routine_postponements').delete().eq('user_id', userId).eq('date', date).eq('step_id', stepId)
  }
}

export async function loadExtras(date: string, userId: string): Promise<RoutineStep[]> {
  if (isSupabaseConfigured && userId) {
    const { data, error } = await supabase
      .from('routine_extras').select('step_payload').eq('user_id', userId).eq('date', date)
    if (!error && data && data.length > 0) {
      const steps = data.map((r: Record<string, unknown>) => r.step_payload as RoutineStep)
      localStorage.setItem(EXTRA_PREFIX + date, JSON.stringify(steps))
      return steps
    }
  }
  const stored = localStorage.getItem(EXTRA_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function postponeStep(step: RoutineStep, fromDate: string, toDate: string, userId: string) {
  await togglePostponement(fromDate, step.id, true, userId)

  const stored = localStorage.getItem(EXTRA_PREFIX + toDate)
  const extras: RoutineStep[] = stored ? JSON.parse(stored) : []
  if (!extras.find(s => s.id === step.id)) {
    localStorage.setItem(EXTRA_PREFIX + toDate, JSON.stringify([...extras, step]))
  }

  if (isSupabaseConfigured && userId) {
    await supabase.from('routine_extras').upsert({
      user_id: userId,
      date: toDate,
      step_id: step.id,
      step_payload: step,
    })
  }
}
