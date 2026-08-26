// Appelée une fois au démarrage de chaque instance du serveur Next.js.
// Sert ici à lancer le planificateur des rappels quotidiens.
export async function register() {
  // Le planificateur utilise node-cron et Prisma : réservé au runtime Node.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startReminderScheduler } = await import('@/lib/reminderScheduler')
    startReminderScheduler()
  }
}
