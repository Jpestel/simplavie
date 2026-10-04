import { prisma } from '@/lib/prisma'

// « Tout premier bilan » : ce compte n'a encore JAMAIS envoyé de bilan par SimplaVie pour une
// AUTRE semaine. La semaine en cours est exclue pour qu'un renvoi du premier bilan garde
// l'explication (les responsables ne sont toujours pas prévenus). Source unique : l'aperçu
// à l'écran et l'envoi serveur utilisent cette même fonction.
export async function isFirstServerBilan(userId: string, weekStart: string): Promise<boolean> {
  const other = await prisma.liaisonWeekSent.findFirst({
    where: { userId, method: 'serveur', weekStart: { not: weekStart } },
    select: { id: true },
  })
  return !other
}
