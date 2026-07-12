import { HealthPro, UserProfile } from '@/types'

// Spécialités proposées en liste déroulante (évite la saisie libre).
export const MEDICAL_SPECIALTIES = [
  { key: 'generaliste', label: 'Médecin généraliste', icon: '🩺' },
  { key: 'psychiatre', label: 'Psychiatre', icon: '🧠' },
  { key: 'psychologue', label: 'Psychologue', icon: '💬' },
  { key: 'infirmier', label: 'Infirmier·ère', icon: '💉' },
  { key: 'kine', label: 'Kinésithérapeute', icon: '🤸' },
  { key: 'dentiste', label: 'Dentiste', icon: '🦷' },
  { key: 'ophtalmo', label: 'Ophtalmologue', icon: '👁️' },
  { key: 'pharmacie', label: 'Pharmacie', icon: '💊' },
  { key: 'specialiste', label: 'Autre spécialiste', icon: '🏥' },
  { key: 'autre', label: 'Autre', icon: '📋' },
] as const

export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function specialtyLabel(pro: HealthPro): string {
  if (pro.specialty === 'autre' && pro.customSpecialty) return pro.customSpecialty
  return MEDICAL_SPECIALTIES.find(s => s.key === pro.specialty)?.label ?? 'Professionnel de santé'
}

export function specialtyIcon(pro: HealthPro): string {
  return MEDICAL_SPECIALTIES.find(s => s.key === pro.specialty)?.icon ?? '🏥'
}

// Récupère la liste des pros ; si vide, on reprend les anciens champs
// médecin traitant / pharmacie pour ne perdre aucune donnée existante.
export function getHealthPros(profile: Partial<UserProfile>): HealthPro[] {
  const list = profile.healthPros
  if (Array.isArray(list) && list.length > 0) return list

  const seeded: HealthPro[] = []
  if (profile.doctorName || profile.doctorPhone) {
    seeded.push({ id: genId(), specialty: 'generaliste', name: profile.doctorName ?? '', phone: profile.doctorPhone ?? '' })
  }
  if (profile.pharmacyName || profile.pharmacyPhone) {
    seeded.push({ id: genId(), specialty: 'pharmacie', name: profile.pharmacyName ?? '', phone: profile.pharmacyPhone ?? '' })
  }
  return seeded
}
