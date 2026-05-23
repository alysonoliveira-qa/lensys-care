// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/products.ts
// Typed constants for Stripe product/price IDs.
// Add new plans here — never hardcode price IDs elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export const STRIPE_PRICES = {
  conecta_monthly: process.env.STRIPE_CONECTA_MONTHLY_PRICE_ID!,
  conecta_annual:  process.env.STRIPE_CONECTA_ANNUAL_PRICE_ID!,
} as const

export type StripePriceKey = keyof typeof STRIPE_PRICES

// Trial period in days for new Conecta subscriptions
export const TRIAL_PERIOD_DAYS = 7

// Plan display metadata (used on /planos page)
export const PLAN_METADATA = {
  essential: {
    name: 'Essencial',
    price: 'Grátis',
    description: 'Para clínicas que estão começando',
    features: [
      'Cadastro ilimitado de pacientes',
      'Prontuário refrativo completo',
      'Alertas por e-mail',
      'Dashboard e relatórios',
    ],
    unavailable: [
      'Alertas via WhatsApp',
      'Alertas via SMS',
      'Envio em massa (recall)',
    ],
  },
  conecta: {
    name: 'Conecta',
    description: 'Para clínicas que querem mais alcance',
    features: [
      'Tudo do plano Essencial',
      'Alertas via WhatsApp',
      'Alertas via SMS',
      'Envio em massa (recall)',
      'Suporte prioritário',
    ],
    unavailable: [],
  },
} as const
