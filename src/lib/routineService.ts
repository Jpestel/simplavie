import { RoutineStep } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const STEPS_KEY = 'simplavie_routine_steps'
const DONE_PREFIX = 'simplavie_routine_done_'
const CANCELLED_PREFIX = 'simplavie_routine_cancelled_'
const POSTPONED_PREFIX = 'simplavie_routine_postponed_'
const EXTRA_PREFIX = 'simplavie_routine_extra_'

export async function loadSteps(defaultSteps: RoutineStep[]): Promise<RoutineStep[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('routine_data').select('payload').eq('id', 'default').maybeSingle()
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

export async function saveSteps(steps: RoutineStep[]) {
  localStorage.setItem(STEPS_KEY, JSON.stringify(steps))
  if (!isSupabaseConfigured) return
  await supabase.from('routine_data').upsert({ id: 'default', payload: steps, updated_at: new Date().toISOString() })
}

export async function loadCompletions(date: string): Promise<string[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('routine_completions').select('step_id').eq('date', date)
    if (!error && data) {
      const ids = data.map((r: Record<string, unknown>) => r.step_id as string)
      localStorage.setItem(DONE_PREFIX + date, JSON.stringify(ids))
      return ids
    }
  }
  const stored = localStorage.getItem(DONE_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function toggleCompletion(date: string, stepId: string, done: boolean) {
  // Mise à jour optimiste du cache local
  const stored = localStorage.getItem(DONE_PREFIX + date)
  const current: string[] = stored ? JSON.parse(stored) : []
  const next = done ? [...new Set([...current, stepId])] : current.filter(id => id !== stepId)
  localStorage.setItem(DONE_PREFIX + date, JSON.stringify(next))

  if (!isSupabaseConfigured) return
  if (done) {
    await supabase.from('routine_completions').upsert({ date, step_id: stepId })
  } else {
    await supabase.from('routine_completions').delete().eq('date', date).eq('step_id', stepId)
  }
}

export async function loadCancellations(date: string): Promise<string[]> {
  const stored = localStorage.getItem(CANCELLED_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function toggleCancellation(date: string, stepId: string, cancelled: boolean) {
  const stored = localStorage.getItem(CANCELLED_PREFIX + date)
  const current: string[] = stored ? JSON.parse(stored) : []
  const next = cancelled ? [...new Set([...current, stepId])] : current.filter(id => id !== stepId)
  localStorage.setItem(CANCELLED_PREFIX + date, JSON.stringify(next))
}

export async function loadPostponements(date: string): Promise<string[]> {
  const stored = localStorage.getItem(POSTPONED_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function togglePostponement(date: string, stepId: string, postponed: boolean) {
  const stored = localStorage.getItem(POSTPONED_PREFIX + date)
  const current: string[] = stored ? JSON.parse(stored) : []
  const next = postponed ? [...new Set([...current, stepId])] : current.filter(id => id !== stepId)
  localStorage.setItem(POSTPONED_PREFIX + date, JSON.stringify(next))
}

export async function loadExtras(date: string): Promise<RoutineStep[]> {
  const stored = localStorage.getItem(EXTRA_PREFIX + date)
  return stored ? JSON.parse(stored) : []
}

export async function postponeStep(step: RoutineStep, fromDate: string, toDate: string) {
  await togglePostponement(fromDate, step.id, true)
  const stored = localStorage.getItem(EXTRA_PREFIX + toDate)
  const extras: RoutineStep[] = stored ? JSON.parse(stored) : []
  if (!extras.find(s => s.id === step.id)) {
    localStorage.setItem(EXTRA_PREFIX + toDate, JSON.stringify([...extras, step]))
  }
}
