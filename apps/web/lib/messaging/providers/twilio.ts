// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/providers/twilio.ts
// Twilio integration for WhatsApp and SMS.
// Only used when the clinic is on the CONECTA plan.
// ─────────────────────────────────────────────────────────────────────────────

import twilio from 'twilio'

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error(
      'Twilio credentials are not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'
    )
  }

  return twilio(accountSid, authToken)
}

/**
 * Sends a WhatsApp message via Twilio.
 * Requires a Twilio WhatsApp-enabled sender number (sandbox or approved).
 *
 * @param to      - Recipient phone number in E.164 format (e.g. +5511999999999)
 * @param message - Message body text
 */
export async function sendWhatsAppViaTwilio(to: string, message: string): Promise<void> {
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!from) {
    throw new Error('TWILIO_WHATSAPP_FROM environment variable is not set.')
  }

  const client = getTwilioClient()

  // Normalize number to WhatsApp format
  const normalizedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  await client.messages.create({
    from,
    to: normalizedTo,
    body: message,
  })
}

/**
 * Sends an SMS message via Twilio.
 *
 * @param to      - Recipient phone number in E.164 format (e.g. +5511999999999)
 * @param message - Message body text
 */
export async function sendSMSViaTwilio(to: string, message: string): Promise<void> {
  const from = process.env.TWILIO_SMS_FROM
  if (!from) {
    throw new Error('TWILIO_SMS_FROM environment variable is not set.')
  }

  const client = getTwilioClient()

  await client.messages.create({
    from,
    to,
    body: message,
  })
}
