import { UserProfile } from '@/types'
import { parseTreatments } from '@/lib/treatments'
import { getHealthPros } from '@/lib/healthPros'

export type CompletionItem = { key: string; label: string; done: boolean }

function filled(v?: string | null): boolean {
  return !!(v && v.trim())
}

// Liste des critères de complétion du profil. Chaque critère pèse autant.
export function completionItems(p: Partial<UserProfile>): CompletionItem[] {
  const treatments = parseTreatments(p.treatments)
  const pros = getHealthPros(p)
  return [
    { key: 'identity', label: 'Nom et prénom', done: filled(p.firstName) && filled(p.lastName) },
    { key: 'birth', label: 'Date de naissance', done: filled(p.birthDate) },
    { key: 'address', label: 'Adresse', done: filled(p.address) && filled(p.city) },
    { key: 'contact', label: 'Téléphone', done: filled(p.mobile) || filled(p.phone) },
    { key: 'email', label: 'Email', done: filled(p.email) },
    { key: 'bloodType', label: 'Groupe sanguin', done: filled(p.bloodType) },
    { key: 'allergies', label: 'Allergies', done: filled(p.allergies) },
    { key: 'treatments', label: 'Traitements', done: treatments.list.length > 0 || filled(treatments.note) },
    { key: 'healthPros', label: 'Professionnels de santé', done: pros.length > 0 },
    { key: 'contacts', label: 'Proches', done: (p.contacts?.length ?? 0) > 0 },
    { key: 'admin', label: 'Administratif', done: filled(p.socialSecurityNumber) || filled(p.mutuelle) },
  ]
}

export function completionPercent(p: Partial<UserProfile>): number {
  const items = completionItems(p)
  const done = items.filter(i => i.done).length
  return Math.round((done / items.length) * 100)
}
