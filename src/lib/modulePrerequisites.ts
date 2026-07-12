import { UserProfile } from '@/types'
import { completionItems, CompletionItem } from '@/lib/profileCompletion'

// Règle métier : éléments de profil à renseigner avant d'utiliser un module.
// Les clés référencent celles de completionItems (lib/profileCompletion).
export const MODULE_PREREQUISITES: Record<string, string[]> = {
  reminders: ['treatments'],
  services: ['admin'],
}

// Section de /profil à ouvrir pour compléter un critère donné.
export const ITEM_SECTION: Record<string, string> = {
  identity: 'identity',
  birth: 'identity',
  address: 'identity',
  contact: 'contact',
  email: 'contact',
  bloodType: 'medical',
  allergies: 'medical',
  treatments: 'medical',
  healthPros: 'pros',
  admin: 'admin',
  contacts: 'contacts',
}

// Critères manquants pour un module (vide = accès autorisé).
export function missingPrerequisites(moduleId: string, profile: Partial<UserProfile>): CompletionItem[] {
  const required = MODULE_PREREQUISITES[moduleId] ?? []
  if (required.length === 0) return []
  return completionItems(profile).filter(i => required.includes(i.key) && !i.done)
}
