// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/products.ts
// Typed constants for Stripe product/price IDs.
// Add new plans here — never hardcode price IDs elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export const STRIPE_PRICES = {
  essencial_monthly: process.env.STRIPE_ESSENCIAL_MONTHLY_PRICE_ID!,
  conecta_monthly:   process.env.STRIPE_CONECTA_MONTHLY_PRICE_ID!,
} as const

export type StripePriceKey = keyof typeof STRIPE_PRICES

// Trial period in days for new paid subscriptions (Essencial and Conecta)
export const TRIAL_PERIOD_DAYS = 7
