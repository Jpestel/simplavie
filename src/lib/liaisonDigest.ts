// Rappel hebdomadaire du cahier de liaison : chaque dimanche soir, on prévient
// les comptes qui ont ce module activé, pour qu'ils décident eux-mêmes
// d'envoyer (ou non) le bilan de leur semaine. Ce n'est pas un envoi
// automatique du bilan — juste une invitation à aller le faire.
//
// Indépendant du système de Rappels (src/lib/reminderDigest.ts) : ce dernier
// n'envoie qu'une fois par jour à heure fixe pour tous les utilisateurs, alors
// qu'on veut ici une heure différente (le dimanche soir) sans toucher aux
// rappels personnels des autres comptes.
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import type { Module } from '@/types'

export type LiaisonDigestResult = {
  sent: number
  failed: number
  errors?: string[]
}

export async function sendWeeklyLiaisonReminders(): Promise<LiaisonDigestResult> {
  const configs = await prisma.appConfig.findMany()
  const userIds = configs
    .filter(c => ((c.modules as unknown as Module[]) ?? []).some(m => m.id === 'liaison' && m.enabled))
    .map(c => c.id)
  if (userIds.length === 0) return { sent: 0, failed: 0 }

  const profiles = await prisma.userProfile.findMany({
    where: { id: { in: userIds }, email: { not: null } },
    select: { id: true, email: true, firstName: true },
  })

  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  const failures: string[] = []
  let sent = 0

  for (const p of profiles) {
    if (!p.email) continue
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">📔 Cahier de liaison</h2>
        <p style="color:#555">C'est dimanche soir ! Si tu veux, tu peux relire ta semaine et envoyer ton bilan de satisfaction aux responsables.</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${base}/modules/liaison?tab=bilan" style="background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:bold;display:inline-block">
            Voir le bilan de ma semaine
          </a>
        </p>
        <p style="color:#aaa;font-size:12px">SimplaVie — rappel automatique. C'est toi qui décides d'envoyer ou non.</p>
      </div>
    `
    const result = await sendMail({
      to: p.email,
      subject: '📔 Ton bilan de la semaine est prêt à relire',
      html,
      text: `Bonjour${p.firstName ? ' ' + p.firstName : ''},\n\nC'est dimanche soir ! Tu peux relire ta semaine et envoyer ton bilan de satisfaction si tu veux : ${base}/modules/liaison?tab=bilan\n\n— SimplaVie`,
    })
    if (result.ok) sent += 1
    else failures.push(result.reason)
  }

  return { sent, failed: failures.length, ...(failures.length > 0 ? { errors: [...new Set(failures)] } : {}) }
}
