export type RatingKey = 'tres_bien' | 'bien' | 'mal' | 'tres_mal'

export const RATINGS: { key: RatingKey; emoji: string; label: string }[] = [
  { key: 'tres_bien', emoji: '😄', label: 'Très bien' },
  { key: 'bien', emoji: '🙂', label: 'Bien' },
  { key: 'mal', emoji: '😟', label: 'Mal' },
  { key: 'tres_mal', emoji: '😣', label: 'Très mal' },
]

export function ratingInfo(key: string) {
  return RATINGS.find(r => r.key === key) ?? { key, emoji: '❔', label: key }
}

// Couleurs actives (bouton sélectionné) par niveau — dégradé vert → rouge.
export const RATING_COLORS: Record<RatingKey, string> = {
  tres_bien: 'bg-green-500 border-green-500 text-white',
  bien: 'bg-teal-500 border-teal-500 text-white',
  mal: 'bg-orange-500 border-orange-500 text-white',
  tres_mal: 'bg-red-500 border-red-500 text-white',
}

export function mondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function weekDates(offset: number = 0): string[] {
  const monday = mondayOf(new Date())
  monday.setDate(monday.getDate() + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return isoDate(d)
  })
}

export function formatDayFr(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}`
}

export function formatShortFr(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}
