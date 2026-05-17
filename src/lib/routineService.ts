import { RoutineStep } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'

export async function loadSteps(defaultSteps: RoutineStep[], userId: string): Promise<RoutineStep[]> {
  if (!isSupabaseConfigured || !userId) {
    return defaultSteps.map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' })).sort((a, b) => a.order - b.order)
  }
  const { data, error } = await supabase
    .from('routine_data').select('payload').eq('user_id', userId).maybeSingle()
  if (!error && data?.payload) {
    const steps = (data.payload as RoutineStep[]).map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' }))
    return steps.sort((a, b) => a.order - b.order)
  }
  return defaultSteps.map(s => ({ ...s, recurrence: s.recurrence ?? 'daily' })).sort((a, b) => a.order - b.order)
}

export async function saveSteps(steps: RoutineStep[], userId: string) {
  if (!isSupabaseConfigured || !userId) return
  await supabase.from('routine_data').upsert({ id: userId, user_id: userId, payload: steps, updated_at: new Date().toISOString() })
}

export async function loadCompletions(date: string, userId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !userId) return []
  const { data, error } = await supabase
    .from('routine_completions').select('step_id').eq('user_id', userId).eq('date', date)
  if (!error && data && data.length > 0) {
    return data.map((r: Record<string, unknown>) => r.step_id as string)
  }
  return []
}

export async function toggleCompletion(date: string, stepId: string, done: boolean, userId: string) {
  if (!isSupabaseConfigured || !userId) return
  if (done) {
    await supabase.from('routine_completions').upsert({ date, step_id: stepId, user_id: userId })
  } else {
    await supabase.from('routine_completions').delete().eq('user_id', userId).eq('date', date).eq('step_id', stepId)
  }
}

export async function loadCancellations(date: string, userId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !userId) return []
  const { data, error } = await supabase
    .from('routine_cancellations').select('step_id').eq('user_id', userId).eq('date', date)
  if (!error && data && data.length > 0) {
    return data.map((r: Record<string, unknown>) => r.step_id as string)
  }
  return []
}

export async function toggleCancellation(date: string, stepId: string, cancelled: boolean, userId: string) {
  if (!isSupabaseConfigured || !userId) return
  if (cancelled) {
    await supabase.from('routine_cancellations').upsert({ date, step_id: stepId, user_id: userId })
  } else {
    await supabase.from('routine_cancellations').delete().eq('user_id', userId).eq('date', date).eq('step_id', stepId)
  }
}

export async function loadPostponements(date: string, userId: string): Promise<Record<string, string>> {
  if (!isSupabaseConfigured || !userId) return {}
  const { data, error } = await supabase
    .from('routine_postponements').select('step_id, to_date').eq('user_id', userId).eq('date', date)
  if (!error && data && data.length > 0) {
    const map: Record<string, string> = {}
    data.forEach((r: Record<string, unknown>) => { map[r.step_id as string] = (r.to_date as string) ?? '' })
    return map
  }
  return {}
}

export async function togglePostponement(date: string, stepId: string, postponed: boolean, userId: string, toDate = '') {
  if (!isSupabaseConfigured || !userId) return
  if (postponed) {
    await supabase.from('routine_postponements').upsert({ date, step_id: stepId, user_id: userId, to_date: toDate || null })
  } else {
    await supabase.from('routine_postponements').delete().eq('user_id', userId).eq('date', date).eq('step_id', stepId)
  }
}

export async function loadExtras(date: string, userId: string): Promise<RoutineStep[]> {
  if (!isSupabaseConfigured || !userId) return []
  const { data, error } = await supabase
    .from('routine_extras').select('step_payload').eq('user_id', userId).eq('date', date)
  if (!error && data && data.length > 0) {
    return data.map((r: Record<string, unknown>) => r.step_payload as RoutineStep)
  }
  return []
}

export async function postponeStep(step: RoutineStep, fromDate: string, toDate: string, userId: string) {
  await togglePostponement(fromDate, step.id, true, userId, toDate)

  if (isSupabaseConfigured && userId) {
    await supabase.from('routine_extras').upsert({
      user_id: userId,
      date: toDate,
      step_id: step.id,
      step_payload: step,
    })
  }
}
