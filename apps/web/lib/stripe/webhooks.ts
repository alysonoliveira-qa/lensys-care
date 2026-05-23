// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/webhooks.ts
// Stripe webhook signature verification helper.
// ─────────────────────────────────────────────────────────────────────────────

import { stripe } from './client'
import type Stripe from 'stripe'

/**
 * Verifies the Stripe webhook signature and returns the parsed event.
 * Must receive the raw request body (not parsed JSON).
 *
 * @throws Error if signature is invalid or STRIPE_WEBHOOK_SECRET is missing
 */
export async function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set.')
  }

  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}

// ─── Supported Stripe event types ────────────────────────────────────────────

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

/**
 * Checks if a Stripe event type is one we handle.
 */
export function isHandledEvent(type: string): type is HandledStripeEvent {
  return HANDLED_EVENTS.includes(type as HandledStripeEvent)
}
