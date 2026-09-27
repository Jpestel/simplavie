// Moteur de modèles pour le module "Écrire un mail" : un sujet/corps contient
// des jetons {{xxx}}. Certains sont spéciaux (aidant, date, heure, prenom),
// tous les autres deviennent un simple champ texte proposé à l'utilisateur.
// C'est ce qui permet à Quentin d'ajouter n'importe quel nouveau modèle sans
// qu'on ait besoin de coder un cas particulier.

export const SPECIAL_TOKENS = ['aidant', 'aidants', 'date', 'heure', 'prenom'] as const
export type SpecialToken = typeof SPECIAL_TOKENS[number]

export function extractTokens(subject: string, body: string): string[] {
  const re = /\{\{(\w+)\}\}/g
  const seen: string[] = []
  for (const text of [subject, body]) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      if (!seen.includes(m[1])) seen.push(m[1])
    }
  }
  return seen
}

export function isCaregiverToken(token: string): boolean {
  return token === 'aidant' || token === 'aidants'
}

export function isEquipmentToken(token: string): boolean {
  return token === 'equipement' || token === 'equipements'
}

// Ajoutée automatiquement en bas de chaque mail généré (pas dans les modèles
// eux-mêmes) : le destinataire doit comprendre que le style factuel vient de
// l'outil, mais que le contenu reste choisi par la personne elle-même.
export const MAIL_DISCLAIMER =
  "Ce mail a été rédigé avec l'aide d'un outil adapté à mon handicap, ce qui explique son style très factuel — le contenu reste choisi par moi-même."

export function tokenLabel(token: string): string {
  if (token === 'date') return 'Date'
  if (token === 'heure') return 'Heure'
  const spaced = token.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function formatDateFr(isoDate: string): string {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatHeureFr(hhmm: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${h}h` : `${h}h${m}`
}

export function joinNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

/** Remplace tous les {{xxx}} par leur valeur (chaîne vide si absente). */
export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, token: string) => values[token] ?? '')
}

export function buildMailtoUrl(to: string[], subject: string, body: string): string {
  // On n'utilise PAS URLSearchParams : son toString() encode les espaces en
  // "+" (format formulaire), que les clients mail n'interprètent pas dans une
  // URL mailto:. encodeURIComponent encode l'espace en %20, correct ici.
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  // La virgule entre destinataires ne doit pas être encodée (séparateur du
  // schéma mailto:), donc on encode chaque adresse séparément.
  const recipients = to.map(a => encodeURIComponent(a)).join(',')
  return `mailto:${recipients}?${query}`
}
