// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/index.ts
// Provider abstraction layer for WhatsApp and SMS messaging.
// Selects the best available provider based on environment configuration.
// ─────────────────────────────────────────────────────────────────────────────

import { sendWhatsAppViaTwilio, sendSMSViaTwilio } from './providers/twilio'
import { sendWhatsAppViaZAPI, isZAPIConfigured } from './providers/zapi'
import { isMetaConfigured, sendWhatsAppTemplateViaMeta } from './providers/meta'

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
 * **Não use isto para recall.** Esta função manda texto livre, e texto livre só
 * chega dentro da janela de 24h da Cloud API oficial. Para lembrete iniciado
 * pela clínica, use `sendWhatsAppRecall`.
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

/** Texto do recall para os provedores que aceitam mensagem livre. */
export function buildRecallMessage(patientName: string): string {
  return (
    `Olá, ${patientName}! 👁️ Sua consulta de renovação de óculos está se aproximando. ` +
    'Agende já seu exame com nossa equipe!'
  )
}

/**
 * Envia o lembrete de recall, escolhendo o provedor E o formato.
 *
 * A escolha do formato é o ponto: a Cloud API da Meta exige **template
 * aprovado** para mensagem iniciada pelo negócio, enquanto Z-API e Twilio
 * aceitam texto livre. Deixar essa decisão no chamador espalharia um `if` de
 * provedor por dentro da lógica de alertas — que é onde ele menos deveria estar.
 *
 * Ordem de preferência:
 *   1. Meta Cloud API — oficial, sem taxa de intermediário, template
 *   2. Z-API — texto livre
 *   3. Twilio — texto livre
 */
export async function sendWhatsAppRecall(to: string, patientName: string): Promise<void> {
  if (isMetaConfigured()) {
    return sendWhatsAppTemplateViaMeta(to, [patientName])
  }

  return sendWhatsApp(to, buildRecallMessage(patientName))
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
