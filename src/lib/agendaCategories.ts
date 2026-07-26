import { AgendaCategoryDef } from '@/types'

// Palette : les classes doivent être écrites en toutes lettres pour que
// Tailwind les génère (pas de construction dynamique de nom de classe).
export type AgendaColor = {
  key: string
  label: string
  bg: string
  text: string
  border: string
  dot: string
}

export const AGENDA_COLORS: AgendaColor[] = [
  { key: 'red',    label: 'Rouge',   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400' },
  { key: 'amber',  label: 'Orange',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  { key: 'green',  label: 'Vert',    bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400' },
  { key: 'blue',   label: 'Bleu',    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
  { key: 'violet', label: 'Violet',  bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-400' },
  { key: 'pink',   label: 'Rose',    bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200',   dot: 'bg-pink-400' },
  { key: 'teal',   label: 'Turquoise', bg: 'bg-teal-50', text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-400' },
  { key: 'gray',   label: 'Gris',    bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',   dot: 'bg-gray-400' },
]

export const FALLBACK_COLOR = AGENDA_COLORS[AGENDA_COLORS.length - 1]

export function colorOf(key?: string): AgendaColor {
  return AGENDA_COLORS.find(c => c.key === key) ?? FALLBACK_COLOR
}

// Catégories par défaut : reprennent celles historiques pour que les
// rendez-vous déjà enregistrés gardent leur couleur et leur libellé.
export const DEFAULT_AGENDA_CATEGORIES: AgendaCategoryDef[] = [
  { id: 'medical', label: 'Médical',       icon: '🏥', color: 'red',   enabled: true },
  { id: 'admin',   label: 'Administratif', icon: '📄', color: 'amber', enabled: true },
  { id: 'family',  label: 'Famille',       icon: '👨‍👩‍👧', color: 'green', enabled: true },
  { id: 'other',   label: 'Autre',         icon: '📌', color: 'gray',  enabled: true },
]

export function genCategoryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Toutes les catégories configurées (activées ou non) — vue aidant.
export function allCategories(cats?: AgendaCategoryDef[] | null): AgendaCategoryDef[] {
  return Array.isArray(cats) && cats.length > 0 ? cats : DEFAULT_AGENDA_CATEGORIES
}

// Catégories proposées à l'utilisateur (uniquement celles activées).
export function visibleCategories(cats?: AgendaCategoryDef[] | null): AgendaCategoryDef[] {
  const list = allCategories(cats).filter(c => c.enabled !== false)
  return list.length > 0 ? list : DEFAULT_AGENDA_CATEGORIES
}

// Catégories réellement affichées à l'utilisateur : autorisées par le Super
// Admin ET non masquées par l'utilisateur lui-même. Si l'utilisateur a tout
// masqué, on retombe sur les catégories autorisées pour ne pas bloquer l'ajout.
export function userVisibleCategories(
  cats?: AgendaCategoryDef[] | null,
  hidden?: string[] | null,
): AgendaCategoryDef[] {
  const allowed = visibleCategories(cats)
  if (!Array.isArray(hidden) || hidden.length === 0) return allowed
  const kept = allowed.filter(c => !hidden.includes(c.id))
  return kept.length > 0 ? kept : allowed
}

// Retrouve la catégorie d'un rendez-vous. Si elle a été supprimée entre-temps,
// on renvoie une catégorie neutre pour ne jamais casser l'affichage.
export function findCategory(cats: AgendaCategoryDef[], id?: string): AgendaCategoryDef {
  return (
    cats.find(c => c.id === id) ??
    DEFAULT_AGENDA_CATEGORIES.find(c => c.id === id) ??
    { id: 'other', label: 'Autre', icon: '📌', color: 'gray', enabled: true }
  )
}
