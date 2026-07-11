import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { createResetToken } from '@/lib/passwordReset'

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 })
  }

  // Recherche à l'identique (comme la connexion, qui ne normalise pas la casse).
  const user = await prisma.user.findUnique({ where: { email: email.trim() } })

  // On envoie l'email seulement si le compte existe, mais on renvoie toujours la
  // même réponse pour ne pas révéler quels emails ont un compte (anti-énumération).
  if (user) {
    const token = createResetToken(user)
    const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
    const link = `${base}/reset-password/${token}`
    const from = process.env.RESEND_FROM ?? 'SimplaVie <onboarding@resend.dev>'

    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from,
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe SimplaVie',
        html: `
          <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
            <h1 style="font-size: 22px; color: #4f46e5;">SimplaVie</h1>
            <p>Bonjour${user.name ? ' ' + user.name : ''},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${link}" style="background: #4f46e5; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: bold; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </p>
            <p style="font-size: 14px; color: #6b7280;">Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email : votre mot de passe restera inchangé.</p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>${link}</p>
          </div>
        `,
      })
    } catch (e) {
      // On journalise mais on ne révèle pas l'échec au client.
      console.error('[forgot-password] envoi email échoué', e)
    }
  }

  return NextResponse.json({ ok: true })
}
