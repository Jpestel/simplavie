import { RoutineStep } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const STEPS_KEY = 'simplavie_routine_steps'
const DONE_PREFIX = 'simplavie_routine_done_'

export async function loadSteps(defaultSteps: RoutineStep[]): Promise<RoutineStep[]> {
  const stored = localStorage.getItem(STEPS_KEY)
  const local: RoutineStep[] | null = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null

  if (isSupabaseConfigured) {
    supabase.from('routine_data').select('payload').eq('id', 'default').maybeSingle().then(({ data }) => {
      if (data?.payload) localStorage.setItem(STEPS_KEY, JSON.stringify(data.payload))
    })
  }

  // Backward compat: ensure recurrence field exists
  const steps = (local ?? defaultSteps).map(s => ({
    ...s,
    recurrence: s.recurrence ?? 'daily',
  }))

  return steps.sort((a, b) => a.order - b.order)
}

export async function saveSteps(steps: RoutineStep[]) {
  localStorage.setItem(STEPS_KEY, JSON.stringify(steps))
  if (!isSupabaseConfigured) return
  await supabase.from('routine_data').upsert({ id: 'default', payload: steps, updated_at: new Date().toISOString() })
}

export async function loadCompletions(date: string): Promise<string[]> {
  const stored = localStorage.getItem(DONE_PREFIX + date)
  const local: string[] = stored ? JSON.parse(stored) : []

  if (isSupabaseConfigured) {
    supabase.from('routine_completions').select('step_id').eq('date', date).then(({ data }) => {
      if (data) {
        const ids = data.map((r: Record<string, unknown>) => r.step_id as string)
        localStorage.setItem(DONE_PREFIX + date, JSON.stringify(ids))
      }
    })
  }

  return local
}

export async function toggleCompletion(date: string, stepId: string, done: boolean) {
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
