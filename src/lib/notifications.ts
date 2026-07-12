import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Prévient tous les Super Admins qu'un nouveau compte vient d'être créé et
// attend l'activation de ses modules. Best-effort : n'interrompt jamais
// l'inscription si l'envoi échoue.
export async function notifySuperAdminsNewAccount(newUser: { email: string; name?: string | null }) {
  try {
    const superAdmins = await prisma.user.findMany({
      where: { globalRole: 'superadmin' },
      select: { email: true },
    })
    const to = superAdmins.map(s => s.email).filter(Boolean)
    if (to.length === 0) return

    const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
    const from = process.env.RESEND_FROM ?? 'SimplaVie <onboarding@resend.dev>'
    const name = newUser.name ? escapeHtml(newUser.name) : '—'
    const email = escapeHtml(newUser.email)

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from,
      to,
      subject: 'Nouveau compte SimplaVie à activer',
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h1 style="font-size: 22px; color: #4f46e5;">SimplaVie</h1>
          <p>Un nouveau compte vient d'être créé et <strong>attend l'activation de ses modules</strong>.</p>
          <div style="background: #f9fafb; border: 1px solid #eee; border-radius: 12px; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Nom :</strong> ${name}</p>
            <p style="margin: 6px 0 0;"><strong>Email :</strong> ${email}</p>
          </div>
          <p>Ouvrez l'espace Super Admin pour activer ses modules :</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${base}/superadmin" style="background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; display: inline-block;">
              Ouvrir l'espace Super Admin
            </a>
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[notifySuperAdminsNewAccount] échec envoi', e)
  }
}
