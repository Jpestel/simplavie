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

// Nom complet et couleur fixe par jour de la semaine (lundi → dimanche), pour
// le sélecteur de jours du Cahier de liaison — chaque jour garde toujours la
// même couleur, quelle que soit la semaine affichée.
export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export const DAY_COLORS = [
  'bg-sky-500',      // Lundi
  'bg-emerald-500',  // Mardi
  'bg-amber-500',    // Mercredi
  'bg-fuchsia-500',  // Jeudi
  'bg-rose-500',     // Vendredi
  'bg-violet-500',   // Samedi
  'bg-teal-500',     // Dimanche
]

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

export function weekDates(offset: number = 0, from: Date = new Date()): string[] {
  const monday = mondayOf(from)
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

// ─── Moment de la journée ─────────────────────────────────────────────────────

export type MomentKey = 'matin' | 'midi' | 'soir' | 'nuit'

export const MOMENTS: { key: MomentKey; emoji: string; label: string; phrase: string }[] = [
  { key: 'matin', emoji: '🌅', label: 'Matin', phrase: 'le matin' },
  { key: 'midi', emoji: '☀️', label: 'Midi', phrase: 'le midi' },
  { key: 'soir', emoji: '🌆', label: 'Soir', phrase: 'le soir' },
  { key: 'nuit', emoji: '🌙', label: 'Nuit', phrase: 'la nuit' },
]

export function momentInfo(key?: string | null) {
  return MOMENTS.find(m => m.key === key) ?? null
}

/** Déduit le moment de la journée d'une heure de planning ("08:30"). */
export function momentFromTime(time?: string | null): MomentKey | null {
  const h = parseInt((time ?? '').slice(0, 2), 10)
  if (Number.isNaN(h)) return null
  if (h < 5) return 'nuit'
  if (h < 11) return 'matin'
  if (h < 15) return 'midi'
  if (h < 21) return 'soir'
  return 'nuit'
}

export function isBadRating(rating: string): boolean {
  return rating === 'mal' || rating === 'tres_mal'
}

// ─── Motifs rapides ───────────────────────────────────────────────────────────

export type MotifKind = 'negatif' | 'positif'

// Proposés au chargement initial (bouton « Charger les motifs de base »), puis
// entièrement modifiables dans les réglages du Cahier de liaison.
export const DEFAULT_MOTIFS: { label: string; kind: MotifKind }[] = [
  { label: 'Absence non prévenue', kind: 'negatif' },
  { label: 'Retard', kind: 'negatif' },
  { label: 'Tâche non faite', kind: 'negatif' },
  { label: 'Poubelle non sortie', kind: 'negatif' },
  { label: 'Ménage mal fait', kind: 'negatif' },
  { label: 'Courses mal rangées', kind: 'negatif' },
  { label: 'Lève-malade mal utilisé', kind: 'negatif' },
  { label: 'Toilette bâclée', kind: 'negatif' },
  { label: 'Repas oublié', kind: 'negatif' },
  { label: 'Manque de respect', kind: 'negatif' },
  { label: 'Parti trop tôt', kind: 'negatif' },
  { label: "À l'heure", kind: 'positif' },
  { label: 'Très attentionné(e)', kind: 'positif' },
  { label: 'Travail soigné', kind: 'positif' },
  { label: 'Bonne utilisation du lève-malade', kind: 'positif' },
  { label: 'A pris son temps', kind: 'positif' },
  { label: 'Bonne ambiance', kind: 'positif' },
]

// ─── Résumé par aidant ────────────────────────────────────────────────────────

export type AidantStat = {
  name: string
  count: number
  avg: number
  bad: number
  topMotifs: { label: string; count: number }[]
}

/**
 * Une évaluation qui cite plusieurs aidants compte pour chacun d'eux. Les
 * motifs ne sont retenus que pour les évaluations négatives (ce sont eux qui
 * servent de preuve), les trois plus fréquents par aidant. Trié par prénom
 * (ordre neutre, pas un classement).
 */
export function aidantStats(
  entries: { rating: RatingKey; aidants: string[]; motifs?: string[] | null }[],
): AidantStat[] {
  const map = new Map<string, { scores: number[]; bad: number; motifs: Map<string, number> }>()
  for (const e of entries) {
    for (const name of e.aidants ?? []) {
      const s = map.get(name) ?? { scores: [], bad: 0, motifs: new Map<string, number>() }
      s.scores.push(RATING_SCORE[e.rating])
      if (isBadRating(e.rating)) {
        s.bad += 1
        for (const m of e.motifs ?? []) s.motifs.set(m, (s.motifs.get(m) ?? 0) + 1)
      }
      map.set(name, s)
    }
  }
  return [...map.entries()]
    .map(([name, s]) => ({
      name,
      count: s.scores.length,
      avg: s.scores.reduce((a, b) => a + b, 0) / s.scores.length,
      bad: s.bad,
      topMotifs: [...s.motifs.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
        .slice(0, 3)
        .map(([label, count]) => ({ label, count })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

// ─── Signalement immédiat à l'agence ──────────────────────────────────────────

function listFr(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

/** Mail prérempli pour prévenir tout de suite l'agence après un « Mal » / « Très mal ». */
export function buildIncidentMail(
  e: {
    date: string
    rating: RatingKey
    aidants: string[]
    moment?: string | null
    motifs?: string[] | null
    comment?: string | null
  },
  firstName: string,
): { label: string; subject: string; body: string } {
  const jour = formatDayFr(e.date)
  const jourMinuscule = jour.charAt(0).toLowerCase() + jour.slice(1)
  const moment = momentInfo(e.moment)
  const quand = moment ? `${jourMinuscule}, ${moment.phrase}` : jourMinuscule
  const qui = listFr(e.aidants)
  const info = ratingInfo(e.rating)

  const lignes = [
    'Bonjour,',
    '',
    `Je souhaite vous signaler un problème survenu le ${quand}${qui ? (moment ? ', avec ' : ' avec ') + qui : ''}.`,
    '',
    `Évaluation : ${info.emoji} ${info.label}`,
  ]
  if (e.motifs && e.motifs.length > 0) lignes.push(`Motifs : ${e.motifs.join(', ')}`)
  if (e.comment && e.comment.trim()) lignes.push(`Précisions : ${e.comment.trim()}`)
  lignes.push('', 'Merci de votre retour.')
  if (firstName) lignes.push('', firstName)

  return {
    label: 'Signalement',
    subject: `Signalement${qui ? ' concernant ' + qui : ''} — ${quand}`,
    body: lignes.join('\n'),
  }
}

// ─── Mail de rappel du dimanche soir (envoyé à Quentin, jamais à l'agence) ────

/**
 * Contenu du rappel hebdomadaire. `canSend` = au moins un responsable a une
 * adresse e-mail : sans cela le bilan ne peut pas partir, donc le rappel le
 * dit et renvoie vers l'ajout d'un responsable. Dans tous les cas il rappelle
 * que le bilan ne part jamais tout seul.
 */
export function buildReminderMail(input: {
  base: string
  firstName?: string | null
  missingDays: string[]
  canSend: boolean
  /** Rappel envoyé en soirée (défaut) : « C'est dimanche soir ! », sinon « C'est dimanche ! ». */
  evening?: boolean
}): { subject: string; html: string; text: string } {
  const { base, firstName, missingDays, canSend } = input
  const salut = (input.evening ?? true) ? "C'est dimanche soir !" : "C'est dimanche !"
  const lienBilan = `${base}/modules/liaison?tab=bilan`
  const lienResp = `${base}/modules/mails/reglages`

  const missingHtml = missingDays.length > 0
    ? `<p style="color:#555">Il manque une évaluation pour :</p>
       <ul style="color:#c2410c">${missingDays.map(d => `<li>${formatDayFr(d)}</li>`).join('')}</ul>`
    : `<p style="color:#555">Ta semaine est complète — tu peux relire ton bilan et l'envoyer si tu veux.</p>`
  const missingText = missingDays.length > 0
    ? `Il manque une évaluation pour :\n${missingDays.map(d => `- ${formatDayFr(d)}`).join('\n')}\n\n`
    : `Ta semaine est complète — tu peux relire ton bilan et l'envoyer si tu veux.\n\n`

  const noticeHtml = canSend ? '' : `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 16px;margin:16px 0;color:#9a3412">
      <p style="margin:0 0 8px"><strong>Avant de pouvoir envoyer ton bilan</strong>, ajoute un responsable avec son adresse e-mail.</p>
      <p style="margin:0"><a href="${lienResp}" style="color:#9a3412;font-weight:bold">Ajouter un responsable →</a></p>
    </div>`
  const noticeText = canSend ? '' : `⚠️ Avant de pouvoir envoyer ton bilan, ajoute un responsable avec son adresse e-mail : ${lienResp}\n\n`

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#6366f1">📔 Cahier de liaison</h2>
      <p style="color:#555">${salut}</p>
      ${missingHtml}
      ${noticeHtml}
      <p style="text-align:center;margin:24px 0">
        <a href="${lienBilan}" style="background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:bold;display:inline-block">
          Voir le bilan de ma semaine
        </a>
      </p>
      <p style="color:#aaa;font-size:12px">SimplaVie — rappel automatique. Le bilan ne part jamais tout seul : c'est toi qui décides de l'envoyer, quand tu veux.</p>
    </div>
  `
  const text = `Bonjour${firstName ? ' ' + firstName : ''},\n\n${salut}\n\n${missingText}${noticeText}${lienBilan}\n\nLe bilan ne part jamais tout seul : c'est toi qui décides de l'envoyer, quand tu veux.\n\n— SimplaVie`

  return { subject: '📔 Ton bilan de la semaine est prêt à relire', html, text }
}

// ─── Bilan hebdomadaire : dates et rédaction (partagés navigateur / serveur) ──

export type BilanEntry = {
  date: string
  rating: RatingKey
  aidants: string[]
  moment?: string | null
  motifs?: string[] | null
  comment?: string | null
}

/** Ajoute (ou retire) des jours à une date ISO locale, sans passer par l'UTC. */
export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return isoDate(d)
}

/** Les 7 jours (lundi → dimanche) à partir de la date ISO d'un lundi. */
export function weekDatesFrom(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i))
}

/**
 * Rédige le bilan envoyé à l'agence. UNE seule fonction pour l'aperçu affiché à
 * l'écran et pour l'envoi par le serveur : ce qu'on voit est exactement ce qui part.
 * `weekEntries` = évaluations des 7 jours ; `fourWeeksEntries` = celles des 4
 * semaines qui se terminent à cette semaine (pour la tendance par aidant) ;
 * `noVisitDays` = jours de la semaine marqués « personne n'est passé ».
 */
/** Jours sans évaluation : la raison choisie, et comment elle s'écrit dans le bilan. */
export const NO_EVAL_REASONS = [
  { key: 'aucune', emoji: '🚫', label: "Personne n'est passé ce jour-là", mail: "aucune intervention", line: "pas d'intervention" },
  { key: 'oubli', emoji: '🤔', label: "J'ai oublié, je ne me souviens plus", mail: "oubli de ma part", line: "pas d'évaluation (oubli de ma part)" },
  { key: 'absent', emoji: '🏠', label: "J'étais absent de chez moi", mail: "absent de chez moi", line: "absent de chez moi" },
  { key: 'autre', emoji: '✏️', label: "Autre raison", mail: "autre raison", line: "pas d'évaluation pour cette journée" },
] as const
export type NoEvalReasonKey = (typeof NO_EVAL_REASONS)[number]['key']
export function noEvalReason(key: string | null | undefined) {
  return NO_EVAL_REASONS.find(r => r.key === key) ?? NO_EVAL_REASONS[0]
}

/** Explication ajoutée au tout premier bilan : les destinataires ne connaissent pas forcément l'outil. */
export const FIRST_BILAN_EXPLANATION = [
  "C'est la première fois que je vous envoie ce bilan, je vous explique de quoi il s'agit.",
  "Afin que vous ayez un retour régulier sur les interventions des aidants chez moi, j'utilise un outil adapté à mon handicap, SimplaVie. Chaque jour où un aidant est venu, j'indique en quelques clics comment cela s'est passé (très bien, bien, mal ou très mal), avec si besoin quelques précisions.",
  "Chaque semaine, ce bilan résume mes évaluations : le détail de chaque intervention, la satisfaction globale de la semaine et, pour chaque aidant, ce qui s'est bien ou mal passé. Il est envoyé par l'outil, mais seulement quand je décide de l'envoyer, et son contenu reflète mes propres choix. C'est pourquoi il est très factuel. Vous le recevrez désormais sous ce même format.",
  "Vous pouvez simplement répondre à ce mail : votre réponse m'arrivera directement.",
].join('\n\n')

export function buildBilanMail(input: {
  days: string[]
  weekEntries: BilanEntry[]
  fourWeeksEntries: BilanEntry[]
  noVisitDays: string[]
  /** Raison par date (voir NO_EVAL_REASONS) ; absente = « aucune intervention ». */
  noVisitReasons?: Record<string, string>
  firstName: string
  includeAidantSummary: boolean
  disclaimer: string
  /** Tout premier bilan envoyé par ce compte : les responsables n'ont pas forcément été prévenus. */
  isFirstBilan?: boolean
}): { subject: string; body: string } {
  const { days, weekEntries, fourWeeksEntries, noVisitDays, noVisitReasons = {}, firstName, includeAidantSummary, disclaimer, isFirstBilan } = input
  const periode = `du ${formatShortFr(days[0])} au ${formatShortFr(days[6])}`
  const subject = `Bilan de la semaine ${periode}`

  const avg = averageScore(weekEntries.map(e => e.rating))
  const overall = avg !== null ? ratingInfo(overallRating(avg)) : null
  const counts = RATINGS.map(r => ({ ...r, count: weekEntries.filter(e => e.rating === r.key).length }))

  const intro = isFirstBilan
    ? `Bonjour,\n\n${FIRST_BILAN_EXPLANATION}\n\nVoici donc mon bilan de satisfaction pour la semaine ${periode} :\n`
    : `Bonjour,\n\nVoici mon bilan de satisfaction pour la semaine ${periode} :\n`
  const globalLine = overall ? `Satisfaction globale de la semaine : ${overall.emoji} ${overall.label} (moyenne ${formatAverageFr(avg!)}/4)\n\n` : ''
  const countLines = counts.map(c => `${c.emoji} ${c.label} : ${c.count} intervention(s)`).join('\n')
  const reasonOf = (d: string) => noEvalReason(noVisitReasons[d]).key
  const noInterv = noVisitDays.filter(d => reasonOf(d) === 'aucune')
  const noEval = noVisitDays.filter(d => reasonOf(d) !== 'aucune')
  const noEvalDetail = NO_EVAL_REASONS.filter(r => r.key !== 'aucune')
    .map(r => ({ r, n: noEval.filter(d => reasonOf(d) === r.key).length })).filter(x => x.n > 0)
    .map(x => `${x.r.mail} : ${x.n}`).join(', ')
  const noVisitLine =
    (noInterv.length > 0 ? `\nJour(s) sans intervention : ${noInterv.length}` : '') +
    (noEval.length > 0 ? `\nJour(s) sans évaluation : ${noEval.length} (${noEvalDetail})` : '')

  const lines: string[] = []
  for (const d of days) {
    const es = weekEntries.filter(e => e.date === d)
    if (es.length === 0) {
      if (noVisitDays.includes(d)) lines.push(`- ${formatDayFr(d)} : ${noEvalReason(noVisitReasons[d]).line}`)
      continue
    }
    for (const e of es) {
      const info = ratingInfo(e.rating)
      const mo = momentInfo(e.moment)
      const when = mo ? ` (${mo.label.toLowerCase()})` : ''
      const who = e.aidants.length > 0 ? ` (${listFr(e.aidants)})` : ''
      const why = e.motifs && e.motifs.length > 0 ? ` [${e.motifs.join(', ')}]` : ''
      const note = e.comment ? ` — ${e.comment}` : ''
      lines.push(`- ${formatDayFr(d)}${when} : ${info.emoji} ${info.label}${who}${why}${note}`)
    }
  }
  const detailLines = lines.length > 0 ? '\n\nDétail :\n' + lines.join('\n') : ''

  let aidantLines = ''
  const weekStats = aidantStats(weekEntries)
  if (includeAidantSummary && weekStats.length > 0) {
    const monthByName = new Map(aidantStats(fourWeeksEntries).map(s => [s.name, s]))
    aidantLines = '\n\nPar aidant :\n' + weekStats.map(s => {
      const lvl = ratingInfo(overallRating(s.avg))
      const motifsTxt = s.topMotifs.length > 0
        ? ` (motifs : ${s.topMotifs.map(m => (m.count > 1 ? `${m.label} ×${m.count}` : m.label)).join(', ')})`
        : ''
      const badTxt = s.bad > 0 ? ` — ${s.bad} « Mal / Très mal »${motifsTxt}` : ''
      const m4 = monthByName.get(s.name)
      const trend = m4 && m4.count > s.count ? ` (4 dernières semaines : ${formatAverageFr(m4.avg)}/4)` : ''
      return `- ${s.name} : ${lvl.emoji} ${formatAverageFr(s.avg)}/4 sur ${s.count} intervention(s) cette semaine${badTxt}${trend}`
    }).join('\n')
  }

  const signature = firstName ? `\n\n${firstName}` : ''
  return { subject, body: `${intro}\n${globalLine}${countLines}${noVisitLine}${aidantLines}${detailLines}${signature}\n\n${disclaimer}` }
}


// ─── Heure du rappel du dimanche (réglable par compte) ────────────────────────

export const DEFAULT_REMINDER_TIME = '20:30'
/** Un rappel manqué (serveur redémarré à ce moment-là…) est encore envoyé pendant ces minutes. */
export const REMINDER_CATCHUP_MINUTES = 10
const REMINDER_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidReminderTime(v: unknown): v is string {
  return typeof v === 'string' && REMINDER_TIME_RE.test(v)
}

/** "20:30" → 1230 (minutes depuis minuit), ou null si l'heure est invalide. */
export function minutesOfDay(hhmm: string | null | undefined): number | null {
  if (!isValidReminderTime(hhmm)) return null
  return parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3, 5), 10)
}

/** Minutes écoulées depuis minuit à l'instant `now`, dans le fuseau demandé (indépendant du fuseau du serveur). */
export function minutesOfDayInZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  return h * 60 + m
}

/**
 * Le rappel est « à envoyer » à partir de l'heure réglée et pendant REMINDER_CATCHUP_MINUTES.
 * Heure absente ou invalide = DEFAULT_REMINDER_TIME. Passé ce délai, on n'envoie plus : régler
 * une heure déjà dépassée ne déclenche donc pas d'envoi immédiat.
 */
export function isReminderDue(nowMinutes: number, reminderTime: string | null | undefined): boolean {
  const target = minutesOfDay(reminderTime) ?? minutesOfDay(DEFAULT_REMINDER_TIME)!
  const elapsed = nowMinutes - target
  return elapsed >= 0 && elapsed <= REMINDER_CATCHUP_MINUTES
}

/** Un rappel réglé avant 17h n'est plus « dimanche soir ». */
export function isEveningTime(reminderTime: string | null | undefined): boolean {
  return (minutesOfDay(reminderTime) ?? minutesOfDay(DEFAULT_REMINDER_TIME)!) >= 17 * 60
}
