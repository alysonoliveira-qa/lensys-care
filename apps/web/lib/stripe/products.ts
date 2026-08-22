// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/products.ts
// Mapeamento entre planos internos e Prices do Stripe.
// Adicione novos planos aqui — nunca hardcode price IDs em outro lugar.
//
// O acesso a `process.env` é estático (não dinâmico por chave) para sobreviver
// ao bundler do Next, e a resolução plano↔price é feita em runtime: uma env var
// ausente vira `null` explícito, jamais um plano errado por engano.
// ─────────────────────────────────────────────────────────────────────────────

export const TRIAL_PERIOD_DAYS = 7

export type StripePlanId = 'ESSENTIAL' | 'CONECTA' | 'PROFESSIONAL'

export const STRIPE_PLAN_IDS: StripePlanId[] = ['ESSENTIAL', 'CONECTA', 'PROFESSIONAL']

const PRICE_ENV_NAME: Record<StripePlanId, string> = {
  ESSENTIAL: 'STRIPE_ESSENCIAL_MONTHLY_PRICE_ID',
  CONECTA: 'STRIPE_CONECTA_MONTHLY_PRICE_ID',
  PROFESSIONAL: 'STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID',
}

function readPriceId(plan: StripePlanId): string | undefined {
  switch (plan) {
    case 'ESSENTIAL':
      return process.env.STRIPE_ESSENCIAL_MONTHLY_PRICE_ID
    case 'CONECTA':
      return process.env.STRIPE_CONECTA_MONTHLY_PRICE_ID
    case 'PROFESSIONAL':
      return process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID
  }
}

/**
 * Price ID do plano. Lança se a env var não estiver configurada — melhor
 * falhar no checkout do que cobrar pelo preço errado.
 */
export function getPriceIdForPlan(plan: StripePlanId): string {
  const priceId = readPriceId(plan)

  if (!priceId) {
    throw new Error(
      `${PRICE_ENV_NAME[plan]} não está definida. Não é possível iniciar o checkout do plano ${plan}.`
    )
  }

  return priceId
}

/**
 * Plano correspondente a um price ID vindo do Stripe.
 * Retorna `null` quando o price é desconhecido (env ausente, price de outra
 * conta, ou plano novo ainda não mapeado) — quem chama decide o que fazer.
 * Nunca adivinha um plano.
 */
export function getPlanByPriceId(priceId: string | null | undefined): StripePlanId | null {
  if (!priceId) return null

  for (const plan of STRIPE_PLAN_IDS) {
    if (readPriceId(plan) === priceId) return plan
  }

  return null
}
