// Envoi d'e-mails par SMTP, volontairement agnostique du fournisseur.
//
// Configuration dans .env.local (Resend, depuis le 03/10/2026 ; Brevo abandonné) :
//   SMTP_HOST=smtp.resend.com
//   SMTP_PORT=465                 (TLS implicite ; 587 = STARTTLS)
//   SMTP_USER=resend              (littéralement « resend »)
//   SMTP_PASS=<clé API Resend>
//   MAIL_FROM=SimplaVie <contact@pastech.fr>   (domaine pastech.fr vérifié chez Resend)
//   MAIL_REPLY_TO=<adresse réellement relevée>   (facultatif)
//
// MAIL_FROM n'a pas besoin de correspondre à une boîte existante : il suffit
// que le domaine soit authentifié chez le prestataire. MAIL_REPLY_TO sert
// justement à ce qu'une réponse arrive quelque part.
//
// Changer de prestataire (Resend, IONOS, autre) ne demande que de modifier ces
// variables : aucun code à retoucher.
import nodemailer, { type Transporter } from 'nodemailer'

export type MailResult = { ok: true } | { ok: false; reason: string }

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587)
    transporter = nodemailer.createTransport({
      host,
      port,
      // 465 = TLS implicite ; 587 = STARTTLS
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transporter
}

/**
 * Envoie un e-mail. Ne lève jamais : renvoie toujours un résultat explicite,
 * pour que l'appelant puisse le journaliser sans interrompre son traitement.
 *
 * Contrairement au SDK Resend utilisé auparavant, un échec est ici toujours
 * visible : soit dans le résultat, soit dans les logs.
 */
export async function sendMail(opts: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  /** Copie visible (ex. la personne qui envoie, ses proches). */
  cc?: string[]
  /** Copie cachée : jamais visible des autres destinataires. */
  bcc?: string[]
  /** Adresse qui reçoit les réponses ; à défaut MAIL_REPLY_TO. */
  replyTo?: string
  /** Nom affiché de l'expéditeur (l'adresse reste celle de MAIL_FROM). */
  fromName?: string
}): Promise<MailResult> {
  const t = getTransporter()
  if (!t) {
    const reason = 'SMTP non configuré (SMTP_HOST, SMTP_USER et SMTP_PASS requis dans .env.local)'
    console.error('[mailer] e-mail NON envoyé —', reason, '| sujet:', opts.subject)
    return { ok: false, reason }
  }

  let from = process.env.MAIL_FROM
  if (!from) {
    const reason = 'MAIL_FROM non défini dans .env.local'
    console.error('[mailer] e-mail NON envoyé —', reason, '| sujet:', opts.subject)
    return { ok: false, reason }
  }
  // Nom affiché personnalisé (ex. « Quentin (via SimplaVie) ») : on garde l'adresse
  // vérifiée de MAIL_FROM, on ne change que le nom.
  if (opts.fromName) {
    const address = (from.match(/<([^>]+)>/)?.[1] ?? from).trim()
    from = `"${opts.fromName.replace(/["\r\n]/g, '')}" <${address}>`
  }

  const to = Array.isArray(opts.to) ? opts.to : [opts.to]
  if (to.length === 0) return { ok: false, reason: 'aucun destinataire' }
  const cc = opts.cc && opts.cc.length > 0 ? opts.cc : undefined
  const bcc = opts.bcc && opts.bcc.length > 0 ? opts.bcc : undefined

  // L'expéditeur peut être une adresse sans boîte (noreply@) : on redirige
  // alors les réponses vers une adresse réellement relevée.
  const replyTo = opts.replyTo || process.env.MAIL_REPLY_TO || undefined

  try {
    await t.sendMail({ from, to, cc, bcc, replyTo, subject: opts.subject, html: opts.html, text: opts.text })
    console.log('[mailer] envoyé —', opts.subject, '→', to.join(', '), cc ? `(copie : ${cc.join(', ')})` : '', bcc ? `(${bcc.length} copie(s) cachée(s))` : '')
    return { ok: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[mailer] ÉCHEC —', opts.subject, '→', to.join(', '), '|', reason)
    return { ok: false, reason }
  }
}
