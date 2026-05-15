import { RoutineStep } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

const STEPS_KEY = 'simplavie_routine_steps'
const DONE_PREFIX = 'simplavie_routine_done_'

function stepsToRows(steps: RoutineStep[]) {
  return steps.map(s => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    step_time: s.time ?? null,
    step_order: s.order,
  }))
}

function rowsToSteps(rows: Record<string, unknown>[]): RoutineStep[] {
  return rows
    .sort((a, b) => (a.step_order as number) - (b.step_order as number))
    .map(r => ({
      id: r.id as string,
      label: r.label as string,
      icon: r.icon as string,
      time: (r.step_time as string) ?? undefined,
      order: r.step_order as number,
      done: false,
    }))
}

export async function loadSteps(defaultSteps: RoutineStep[]): Promise<RoutineStep[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('routine_steps').select('*')
    if (data && data.length > 0) {
      const steps = rowsToSteps(data as Record<string, unknown>[])
      localStorage.setItem(STEPS_KEY, JSON.stringify(steps))
      return steps
    }
  }
  const stored = localStorage.getItem(STEPS_KEY)
  if (stored) {
    try { return JSON.parse(stored) } catch { /* fall through */ }
  }
  return defaultSteps
}

export async function saveSteps(steps: RoutineStep[]) {
  localStorage.setItem(STEPS_KEY, JSON.stringify(steps))
  if (!isSupabaseConfigured) return
  // Delete all and re-insert (simplest for reordering)
  await supabase.from('routine_steps').delete().neq('id', '__none__')
  if (steps.length > 0) {
    await supabase.from('routine_steps').insert(stepsToRows(steps))
  }
}

export async function loadCompletions(date: string): Promise<string[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('routine_completions').select('step_id').eq('date', date)
    if (data) {
      const ids = data.map((r: Record<string, unknown>) => r.step_id as string)
      localStorage.setItem(DONE_PREFIX + date, JSON.stringify(ids))
      return ids
    }
  }
  const stored = localStorage.getItem(DONE_PREFIX + date)
  return stored ? JSON.parse(stored) : []
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
