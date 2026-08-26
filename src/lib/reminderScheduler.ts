// Planificateur interne : déclenche l'envoi du récapitulatif quotidien des
// rappels, sans cron système ni service externe.
//
// Démarré par src/instrumentation.ts, une fois au lancement du serveur.
//
// Réglages facultatifs dans .env.local :
//   REMINDERS_CRON=0 7 * * *      (par défaut : tous les jours à 7h)
//   REMINDERS_TZ=Europe/Paris     (par défaut : Europe/Paris)
import cron from 'node-cron'
import { sendDailyReminderDigests } from '@/lib/reminderDigest'

// Le module peut être évalué plusieurs fois (rechargement à chaud en dev) :
// on garde l'état sur globalThis pour ne jamais planifier deux fois.
const globalForScheduler = globalThis as unknown as { simplavieSchedulerStarted?: boolean }

export function startReminderScheduler() {
  if (globalForScheduler.simplavieSchedulerStarted) return
  globalForScheduler.simplavieSchedulerStarted = true

  // Garde-fou : en développement, la base pointe sur la production. Un
  // `npm run dev` laissé ouvert enverrait de vrais e-mails aux aidants.
  if (process.env.NODE_ENV !== 'production') {
    console.log('[rappels] planificateur désactivé hors production')
    return
  }

  const expression = process.env.REMINDERS_CRON ?? '0 7 * * *'
  const timezone = process.env.REMINDERS_TZ ?? 'Europe/Paris'

  if (!cron.validate(expression)) {
    console.error('[rappels] REMINDERS_CRON invalide :', expression, '— planificateur non démarré')
    return
  }

  cron.schedule(expression, async () => {
    const startedAt = new Date().toISOString()
    try {
      const result = await sendDailyReminderDigests()
      console.log('[rappels]', startedAt, '→', JSON.stringify(result))
    } catch (e) {
      console.error('[rappels]', startedAt, '→ échec inattendu :', e)
    }
  }, { timezone })

  console.log(`[rappels] planificateur démarré — « ${expression} » (${timezone})`)
}
