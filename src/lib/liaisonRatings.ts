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

// Score numérique pour calculer une moyenne (1 = très mal, 4 = très bien).
export const RATING_SCORE: Record<RatingKey, number> = {
  tres_mal: 1,
  mal: 2,
  bien: 3,
  tres_bien: 4,
}

export function averageScore(ratings: RatingKey[]): number | null {
  if (ratings.length === 0) return null
  return ratings.reduce((sum, r) => sum + RATING_SCORE[r], 0) / ratings.length
}

// Reconvertit une moyenne (1 à 4) vers le niveau le plus proche, pour afficher
// un résumé avec le même vocabulaire (emoji/label) que les évaluations
// individuelles plutôt qu'une échelle numérique isolée.
export function overallRating(avg: number): RatingKey {
  if (avg >= 3.5) return 'tres_bien'
  if (avg >= 2.5) return 'bien'
  if (avg >= 1.5) return 'mal'
  return 'tres_mal'
}

export function formatAverageFr(avg: number): string {
  return avg.toFixed(1).replace('.', ',')
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

// ⚠️ Ne JAMAIS passer par `toISOString()` ici : elle convertit en UTC, donc à
// minuit local dans un fuseau en avance sur UTC (Europe/Paris), la date
// obtenue est celle de la VEILLE (ex: lundi 00h local → dimanche 22h UTC).
// C'est exactement ce qui décalait la semaine d'un jour. On reste en
// calendrier local de bout en bout, comme `localToday()` dans reminderDigest.ts.
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
