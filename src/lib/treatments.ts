import { Treatment } from '@/types'

// Moments de prise proposés en cases à cocher pour chaque traitement.
export const MOMENTS = [
  { key: 'matin', label: 'Matin', icon: '🌅' },
  { key: 'midi', label: 'Midi', icon: '☀️' },
  { key: 'soir', label: 'Soir', icon: '🌆' },
  { key: 'coucher', label: 'Coucher', icon: '🌙' },
] as const

export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function sanitize(t: unknown): Treatment | null {
  if (!t || typeof t !== 'object') return null
  const o = t as Record<string, unknown>
  return {
    id: typeof o.id === 'string' && o.id ? o.id : genId(),
    name: typeof o.name === 'string' ? o.name : '',
    dosage: typeof o.dosage === 'string' ? o.dosage : '',
    moments: Array.isArray(o.moments) ? o.moments.filter((m): m is string => typeof m === 'string') : [],
    time: typeof o.time === 'string' ? o.time : '',
    notes: typeof o.notes === 'string' ? o.notes : '',
  }
}

// Le champ `treatments` est une colonne texte : on y stocke désormais du JSON
// { list, note }. On reste rétrocompatible : un ancien texte libre est repris
// tel quel dans `note`.
export function parseTreatments(raw?: string | null): { list: Treatment[]; note: string } {
  if (!raw || !raw.trim()) return { list: [], note: '' }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return { list: parsed.map(sanitize).filter((x): x is Treatment => x !== null), note: '' }
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { list?: unknown }).list)) {
      const obj = parsed as { list: unknown[]; note?: unknown }
      return {
        list: obj.list.map(sanitize).filter((x): x is Treatment => x !== null),
        note: typeof obj.note === 'string' ? obj.note : '',
      }
    }
    // JSON valide mais forme inattendue → on le traite comme du texte libre.
    return { list: [], note: raw }
  } catch {
    // Ancien contenu en texte libre.
    return { list: [], note: raw }
  }
}

export function serializeTreatments(list: Treatment[], note: string): string {
  const cleanNote = note.trim()
  if (list.length === 0 && !cleanNote) return ''
  return JSON.stringify({ list, note: cleanNote || undefined })
}
