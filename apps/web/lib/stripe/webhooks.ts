// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/webhooks.ts
// Verificação de assinatura dos webhooks do Stripe.
// ─────────────────────────────────────────────────────────────────────────────

import { getStripe } from './client'
import type Stripe from 'stripe'

/**
 * Verifica a assinatura do webhook e devolve o evento já parseado.
 * Precisa receber o corpo bruto da requisição (não o JSON parseado).
 *
 * @throws Error se a assinatura for inválida ou STRIPE_WEBHOOK_SECRET faltar
 */
export async function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set.')
  }

  return getStripe().webhooks.constructEvent(rawBody, signature, secret)
}

// ─── Eventos suportados ──────────────────────────────────────────────────────

export type HandledStripeEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'

export const HANDLED_EVENTS: HandledStripeEvent[] = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]

export function isHandledEvent(type: string): type is HandledStripeEvent {
  return HANDLED_EVENTS.includes(type as HandledStripeEvent)
}
