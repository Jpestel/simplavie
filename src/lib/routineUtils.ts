import { RoutineStep } from '@/types'

const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc']

export function stepAppliesOn(step: RoutineStep, date: string): boolean {
  const d = new Date(date + 'T00:00:00')
  switch (step.recurrence ?? 'daily') {
    case 'daily':
      return true
    case 'weekly':
      return (step.weekDays ?? []).includes(d.getDay())
    case 'monthly':
      return d.getDate() === step.monthDay
    case 'yearly': {
      const [mm, dd] = (step.yearDate ?? '').split('-').map(Number)
      return d.getMonth() + 1 === mm && d.getDate() === dd
    }
    case 'once':
      return step.specificDate === date
    default:
      return true
  }
}

export function recurrenceLabel(step: RoutineStep): string {
  switch (step.recurrence ?? 'daily') {
    case 'daily':
      return 'Tous les jours'
    case 'weekly': {
      const days = (step.weekDays ?? []).sort().map(d => DAYS_SHORT[d])
      return days.length ? days.join(', ') : 'Aucun jour'
    }
    case 'monthly':
      return `Le ${step.monthDay} de chaque mois`
    case 'yearly': {
      const [mm, dd] = (step.yearDate ?? '').split('-').map(Number)
      return `Le ${dd} ${MONTHS_SHORT[(mm ?? 1) - 1]} chaque année`
    }
    case 'once':
      return step.specificDate
        ? new Date(step.specificDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Date unique'
    default:
      return ''
  }
}
