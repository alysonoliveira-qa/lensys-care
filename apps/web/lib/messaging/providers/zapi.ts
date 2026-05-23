// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/providers/zapi.ts
// Z-API integration — Brazilian WhatsApp provider (alternative to Twilio).
// Used when ZAPI_INSTANCE_ID and ZAPI_TOKEN are configured.
// Docs: https://developer.z-api.io
// ─────────────────────────────────────────────────────────────────────────────

const ZAPI_BASE_URL = 'https://api.z-api.io'

interface ZAPIMessageResponse {
  zaapId: string
  messageId: string
  id: string
}

/**
 * Normalizes a Brazilian phone number for Z-API format.
 * Strips non-digits and ensures country code is present.
 */
function normalizePhoneForZAPI(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // If already has country code (55 for Brazil), use as-is
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }

  // Add Brazilian country code
  return `55${digits}`
}

/**
 * Sends a WhatsApp message via Z-API.
 *
 * @param to      - Recipient phone number (Brazilian format, e.g. +5511999999999)
 * @param message - Message body text
 */
export async function sendWhatsAppViaZAPI(to: string, message: string): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token      = process.env.ZAPI_TOKEN

  if (!instanceId || !token) {
    throw new Error(
      'Z-API credentials are not configured. Set ZAPI_INSTANCE_ID and ZAPI_TOKEN.'
    )
  }

  const phone = normalizePhoneForZAPI(to)
  const url   = `${ZAPI_BASE_URL}/instances/${instanceId}/token/${token}/send-text`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Z-API request failed (${response.status}): ${body}`)
  }

  const result = (await response.json()) as ZAPIMessageResponse
  console.log(`Z-API WhatsApp sent: messageId=${result.messageId}`)
}

/**
 * Checks if Z-API is configured in the current environment.
 * Used by the messaging abstraction to choose the right provider.
 */
export function isZAPIConfigured(): boolean {
  return Boolean(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN)
}
