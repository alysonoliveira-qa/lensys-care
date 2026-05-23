// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/index.ts
// Provider abstraction layer for WhatsApp and SMS messaging.
// Selects the best available provider based on environment configuration.
// ─────────────────────────────────────────────────────────────────────────────

import { sendWhatsAppViaTwilio, sendSMSViaTwilio } from './providers/twilio'
import { sendWhatsAppViaZAPI, isZAPIConfigured } from './providers/zapi'

// ─── Custom error ─────────────────────────────────────────────────────────────

export class FeatureNotAvailableError extends Error {
  constructor(feature: string) {
    super(`Feature "${feature}" is not available on the current plan.`)
    this.name = 'FeatureNotAvailableError'
  }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

/**
 * Sends a WhatsApp message using the best available provider.
 *
 * Provider selection priority:
 *   1. Z-API — preferred for Brazilian numbers (lower latency, no sandbox)
 *   2. Twilio WhatsApp — international fallback
 *
 * @param to      - Recipient phone number (E.164 or Brazilian local format)
 * @param message - Plain text message body
 */
export async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (isZAPIConfigured()) {
    return sendWhatsAppViaZAPI(to, message)
  }

  return sendWhatsAppViaTwilio(to, message)
}

// ─── SMS ─────────────────────────────────────────────────────────────────────

/**
 * Sends an SMS message via Twilio.
 *
 * @param to      - Recipient phone number in E.164 format (e.g. +5511999999999)
 * @param message - Plain text message body (max 160 chars for single SMS)
 */
export async function sendSMS(to: string, message: string): Promise<void> {
  return sendSMSViaTwilio(to, message)
}
