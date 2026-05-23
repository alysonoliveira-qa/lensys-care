// ─────────────────────────────────────────────────────────────────────────────
// lib/email/resend.ts
// Resend SDK singleton and email dispatch helper.
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set.')
}

// Singleton instance — created once per cold start
export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@optotech.com.br'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

/**
 * Sends a transactional email via Resend.
 * Throws on API errors so callers can handle failures gracefully.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, replyTo } = options

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  })

  if (error) {
    throw new Error(`Resend API error: ${error.message}`)
  }
}
