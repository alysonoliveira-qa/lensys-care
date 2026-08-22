// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/providers/twilio.ts
// Twilio integration for WhatsApp and SMS.
// Only used when the clinic is on the CONECTA plan.
// ─────────────────────────────────────────────────────────────────────────────

import twilio from 'twilio'

/**
 * Cliente Twilio, preferindo API Key restrita ao Auth Token.
 *
 * O Auth Token e credencial mestra: quem o tem compra numero, gasta o credito e
 * apaga a conta. Uma API Key restrita ao recurso Messages so consegue enviar
 * mensagem — que e tudo o que este app faz.
 *
 * Os dois formatos de autenticacao da SDK sao diferentes de proposito:
 * `twilio(apiKeySid, apiKeySecret, { accountSid })` para API Key, e
 * `twilio(accountSid, authToken)` para o token. O fallback existe para nao
 * travar quem ainda esta com a configuracao antiga.
 */
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID

  if (!accountSid) {
    throw new Error('TWILIO_ACCOUNT_SID environment variable is not set.')
  }

  const apiKeySid = process.env.TWILIO_API_KEY_SID
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET

  if (apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, { accountSid })
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!authToken) {
    throw new Error(
      'Credenciais Twilio ausentes. Configure TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET ' +
        '(preferido) ou TWILIO_AUTH_TOKEN, junto de TWILIO_ACCOUNT_SID.'
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
