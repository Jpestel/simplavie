import { AppConfig, Module } from '@/types'

export const DEFAULT_MODULES: Module[] = [
  {
    id: 'routine',
    name: 'routine',
    label: 'Ma journée',
    description: 'Routine visuelle étape par étape',
    icon: '📋',
    enabled: true,
    order: 0,
  },
  {
    id: 'reminders',
    name: 'reminders',
    label: 'Rappels',
    description: 'Médicaments, repas, tâches récurrentes',
    icon: '🔔',
    enabled: false,
    order: 1,
  },
  {
    id: 'agenda',
    name: 'agenda',
    label: 'Agenda',
    description: 'Calendrier simplifié',
    icon: '📅',
    enabled: false,
    order: 2,
  },
  {
    id: 'contacts',
    name: 'contacts',
    label: 'Contacts',
    description: "Contacts d'urgence en un clic",
    icon: '📞',
    enabled: false,
    order: 3,
  },
]

export const DEFAULT_CONFIG: AppConfig = {
  userName: 'Mon proche',
  primaryColor: '#6366f1',
  adminPassword: '1234',
  modules: DEFAULT_MODULES,
}
